type RealtimeMessage =
  | { event: string; data?: unknown }
  | { type: "ping" }
  | { type: "pong" };

type SocketAttachment = {
  userId?: string | number;
  rooms?: string[];
};

const toRoomKey = (raw: unknown) => {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
};

const parseJson = async (req: Request) => {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
};

export class RealtimeDO {
  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  private async getRoomInfo(roomId: string) {
    const row = await this.env.DB.prepare(
      "SELECT id, host_user_id, question_count, subject, status FROM rooms WHERE id = ?"
    )
      .bind(roomId)
      .first();
    if (!row) return null;
    return {
      id: String((row as any).id),
      hostUserId: String((row as any).host_user_id),
      questionCount: Number((row as any).question_count ?? 0),
      subject: (row as any).subject ? String((row as any).subject) : null,
      status: (row as any).status ? String((row as any).status) : null,
    };
  }

  private async upsertParticipant(roomId: string, userId: string, fields: { score?: number; status?: string }) {
    const score = Number.isFinite(fields.score as number) ? (fields.score as number) : 0;
    const status = fields.status || "joined";

    await this.env.DB.prepare(
      "INSERT INTO room_participants (room_id, user_id, score, status, current_question_index, created_at, updated_at) VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now')) ON CONFLICT(room_id, user_id) DO UPDATE SET score = excluded.score, status = excluded.status, updated_at = datetime('now')"
    )
      .bind(roomId, userId, score, status)
      .run();
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ws") && request.headers.get("upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];

      this.state.acceptWebSocket(server);

      const token = url.searchParams.get("token") || undefined;
      const userId = url.searchParams.get("userId") || undefined;

      const attachment: SocketAttachment = {
        userId,
        rooms: [],
      };

      server.serializeAttachment({ ...attachment, token });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname.endsWith("/broadcast") && request.method === "POST") {
      const auth = request.headers.get("authorization") || "";
      const key = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
      if (!key || key !== this.env.INTERNAL_API_KEY) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }

      const body = await parseJson(request);
      if (!body || typeof body !== "object") {
        return Response.json({ error: "invalid_body" }, { status: 400 });
      }

      const event = (body as any).event;
      const data = (body as any).data;
      const room = toRoomKey((body as any).room);
      if (typeof event !== "string" || !event) {
        return Response.json({ error: "invalid_event" }, { status: 400 });
      }

      this.broadcast({ event, data }, room);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "not_found" }, { status: 404 });
  }

  private broadcast(msg: { event: string; data?: unknown }, room: string | null) {
    const sockets = this.state.getWebSockets();
    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as SocketAttachment | undefined;
      if (room) {
        const rooms = attachment?.rooms || [];
        if (!rooms.includes(room)) continue;
      }
      ws.send(JSON.stringify(msg));
    }
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    let payload: RealtimeMessage | null = null;
    if (typeof message === "string") {
      try {
        payload = JSON.parse(message);
      } catch {
        payload = null;
      }
    }

    if (!payload) return;

    if ((payload as any).type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    if (!("event" in payload) || typeof payload.event !== "string") return;

    const attachment = (ws.deserializeAttachment() as SocketAttachment | undefined) || {
      rooms: [],
    };

    const event = payload.event;
    const data = (payload as any).data;

    if (event === "join_user") {
      const id = typeof data === "string" || typeof data === "number" ? String(data) : null;
      if (id) {
        attachment.userId = id;
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `user:${id}`]));
        ws.serializeAttachment(attachment);
      }
      return;
    }

    if (event === "join_room") {
      const roomId = (data as any)?.roomId;
      const userId = (data as any)?.userId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) {
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `room:${roomKey}`]));
        if (userId !== undefined && userId !== null) attachment.userId = String(userId);
        ws.serializeAttachment(attachment);
        this.broadcast({ event: "user_joined", data: { userId: attachment.userId } }, `room:${roomKey}`);
      }
      return;
    }

    if (event === "join_ticket") {
      const ticketId = toRoomKey(data);
      if (ticketId) {
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `ticket:${ticketId}`]));
        ws.serializeAttachment(attachment);
      }
      return;
    }

    if (event === "leave_ticket") {
      const ticketId = toRoomKey(data);
      if (ticketId) {
        attachment.rooms = (attachment.rooms || []).filter((r) => r !== `ticket:${ticketId}`);
        ws.serializeAttachment(attachment);
      }
      return;
    }

    if (event === "join_group") {
      const groupKey = toRoomKey(data) || toRoomKey((data as any)?.room) || toRoomKey((data as any)?.group);
      if (groupKey) {
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `group:${groupKey}`]));
        ws.serializeAttachment(attachment);
      }
      return;
    }

    if (event === "send_message") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) this.broadcast({ event: "receive_message", data }, `room:${roomKey}`);
      return;
    }

    if (event === "start_exam") {
      const roomId = (data as any)?.roomId;
      const userId = (data as any)?.userId;
      const roomKey = toRoomKey(roomId);
      if (roomKey && userId !== undefined && userId !== null) {
        try {
          const info = await this.getRoomInfo(roomKey);
          if (info && info.hostUserId === String(userId)) {
            await this.env.DB.prepare("UPDATE rooms SET status = 'in_progress', updated_at = datetime('now') WHERE id = ?")
              .bind(roomKey)
              .run();
            this.broadcast({ event: "exam_started" }, `room:${roomKey}`);
          }
        } catch {
          return;
        }
      }
      return;
    }

    if (event === "submit_score") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) {
        try {
          const userId = (data as any)?.userId;
          const score = Number((data as any)?.score ?? 0);
          if (userId !== undefined && userId !== null) {
            await this.upsertParticipant(roomKey, String(userId), { score, status: (data as any)?.status });
            this.broadcast({ event: "score_updated", data: { userId, score } }, `room:${roomKey}`);
          }
        } catch {
          return;
        }
      }
      return;
    }

    if (event === "tutor_navigate") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) this.broadcast({ event: "navigate_question", data: { questionIndex: (data as any)?.questionIndex } }, `room:${roomKey}`);
      return;
    }

    if (event === "finish_exam") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) {
        try {
          const userId = (data as any)?.userId;
          const score = Number((data as any)?.score ?? 0);
          const timeTaken = Number((data as any)?.timeTaken ?? 0);
          if (userId === undefined || userId === null) return;

          await this.upsertParticipant(roomKey, String(userId), { score, status: "finished" });

          const info = await this.getRoomInfo(roomKey);
          if (info) {
            const subjectScores = info.subject ? JSON.stringify({ [info.subject]: score }) : null;
            await this.env.DB.prepare(
              "INSERT INTO exam_results (user_id, classroom_id, score, total_score, mode, subject_scores, skill_scores, questions, time_taken, taken_at) VALUES (?, NULL, ?, ?, 'classroom', ?, NULL, NULL, ?, datetime('now'))"
            )
              .bind(String(userId), score, info.questionCount, subjectScores, timeTaken)
              .run();

            const counts = await this.env.DB.prepare(
              "SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'finished' THEN 1 ELSE 0 END) AS finished FROM room_participants WHERE room_id = ?"
            )
              .bind(roomKey)
              .first();

            const total = Number((counts as any)?.total ?? 0);
            const finished = Number((counts as any)?.finished ?? 0);
            if (total > 0 && total === finished) {
              await this.env.DB.prepare("UPDATE rooms SET status = 'finished', updated_at = datetime('now') WHERE id = ?")
                .bind(roomKey)
                .run();
            }
          }

          this.broadcast({ event: "score_updated", data: { userId, score } }, `room:${roomKey}`);
        } catch {
          return;
        }
      }
      return;
    }

    if (event === "close_room") {
      const roomId = (data as any)?.roomId;
      const userId = (data as any)?.userId;
      const roomKey = toRoomKey(roomId);
      if (roomKey && userId !== undefined && userId !== null) {
        try {
          const info = await this.getRoomInfo(roomKey);
          if (info && info.hostUserId === String(userId)) {
            await this.env.DB.prepare("UPDATE rooms SET status = 'finished', updated_at = datetime('now') WHERE id = ?")
              .bind(roomKey)
              .run();
            this.broadcast({ event: "room_closed_by_host" }, `room:${roomKey}`);
          }
        } catch {
          return;
        }
      }
      return;
    }

    if (event === "reset_exam" || event === "exam_reset") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) {
        try {
          await this.env.DB.prepare(
            "UPDATE room_participants SET score = 0, status = 'joined', current_question_index = 0, updated_at = datetime('now') WHERE room_id = ?"
          )
            .bind(roomKey)
            .run();
          this.broadcast({ event: "exam_reset" }, `room:${roomKey}`);
        } catch {
          return;
        }
      }
      return;
    }
  }
}

export type Env = {
  DB: D1Database;
  REALTIME: DurableObjectNamespace;
  INTERNAL_API_KEY: string;
  JWT_SECRET?: string;
};
