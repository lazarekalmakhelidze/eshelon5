import {
  createExamResult,
  getExamRoomById,
  listExamRoomParticipants,
  resetExamRoomParticipants,
  updateExamRoom,
  upsertExamRoomParticipant,
} from "./d1";

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

export type Env = {
  DB: D1Database;
  BUCKET: R2Bucket;
  REALTIME: DurableObjectNamespace;
  INTERNAL_API_KEY: string;
  JWT_SECRET?: string;
  FIREBASE_SERVICE_ACCOUNT?: string;
  GEMINI_API_KEY?: string;
  OLLAMA_URL?: string;
  OLLAMA_MODEL?: string;
  OLLAMA_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;

  WRITER_API_KEY?: string;
  WRITER_BASE_URL?: string;
  WRITER_MODEL?: string;

  ADVISOR_API_KEY?: string;
  ADVISOR_BASE_URL?: string;
  ADVISOR_MODEL?: string;

  QA_API_KEY?: string;
  QA_BASE_URL?: string;
  QA_MODEL?: string;
};

export class RealtimeDO {
  private readonly attachments = new WeakMap<WebSocket, SocketAttachment & { token?: string }>();

  constructor(
    private readonly state: DurableObjectState,
    private readonly env: Env
  ) {}

  private getAttachment(ws: WebSocket) {
    const nativeAttachment = (ws as any).deserializeAttachment?.();
    if (nativeAttachment && typeof nativeAttachment === "object") {
      return nativeAttachment as SocketAttachment & { token?: string };
    }
    return this.attachments.get(ws);
  }

  private setAttachment(ws: WebSocket, attachment: SocketAttachment & { token?: string }) {
    this.attachments.set(ws, attachment);
    (ws as any).serializeAttachment?.(attachment);
  }

  private async getRoomInfo(roomId: string) {
    const room = await getExamRoomById(this.env.DB, roomId);
    if (!room) return null;
    return {
      id: room.id,
      hostUserId: String(room.host_user_id),
      questionCount: Number(room.question_count || 0),
      subject: room.subject ? String(room.subject) : null,
      status: room.status ? String(room.status) : null,
    };
  }

  private async upsertParticipant(roomId: string, userId: string, fields: { score?: number; status?: string }) {
    const score = Number.isFinite(fields.score as number) ? (fields.score as number) : 0;
    const status = fields.status || "joined";
    await upsertExamRoomParticipant(this.env.DB, roomId, userId, {
      score,
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if ((url.pathname.endsWith("/ws") || url.pathname.endsWith("/ws/")) && request.headers.get("upgrade")?.toLowerCase() === "websocket") {
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

      this.setAttachment(server, { ...attachment, token });

      // Socket.IO Handshake
      const sid = Math.random().toString(36).substring(2, 15);
      server.send(`0{"sid":"${sid}","upgrades":[],"pingInterval":25000,"pingTimeout":20000}`);
      server.send(`40{"sid":"${sid}"}`);

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
    const payload = `42${JSON.stringify([msg.event, msg.data])}`;
    for (const ws of sockets) {
      const attachment = this.getAttachment(ws);
      if (room) {
        const rooms = attachment?.rooms || [];
        if (!rooms.includes(room)) continue;
      }
      ws.send(payload);
    }
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (typeof message !== "string") return;

    if (message === "2" || message === "2probe") {
      ws.send("3");
      return;
    }

    if (message.startsWith("40")) {
      ws.send(`40{"sid":"123456"}`);
      return;
    }

    let payload: RealtimeMessage | null = null;
    
    // Parse Socket.IO message (e.g. 42["event", data])
    if (message.startsWith("42")) {
      try {
        const parsed = JSON.parse(message.slice(2));
        if (Array.isArray(parsed) && parsed.length > 0) {
          payload = { event: parsed[0], data: parsed[1] };
        }
      } catch {
        payload = null;
      }
    } else {
      // Fallback for standard JSON webSockets
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

    const attachment = this.getAttachment(ws) || {
      rooms: [],
    };

    const event = payload.event;
    const data = (payload as any).data;

    if (event === "join_user") {
      const id = typeof data === "string" || typeof data === "number" ? String(data) : null;
      if (id) {
        attachment.userId = id;
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `user:${id}`]));
        this.setAttachment(ws, attachment);
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
        this.setAttachment(ws, attachment);
        this.broadcast({ event: "user_joined", data: { userId: attachment.userId } }, `room:${roomKey}`);
      }
      return;
    }

    if (event === "leave_room") {
      const roomId = (data as any)?.roomId;
      const userId = (data as any)?.userId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) {
        attachment.rooms = (attachment.rooms || []).filter((r) => r !== `room:${roomKey}`);
        this.setAttachment(ws, attachment);
        this.broadcast({ event: "user_left", data: { userId } }, `room:${roomKey}`);
      }
      return;
    }

    if (event === "join_ticket") {
      const ticketId = toRoomKey(data);
      if (ticketId) {
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `ticket:${ticketId}`]));
        this.setAttachment(ws, attachment);
      }
      return;
    }

    if (event === "leave_ticket") {
      const ticketId = toRoomKey(data);
      if (ticketId) {
        attachment.rooms = (attachment.rooms || []).filter((r) => r !== `ticket:${ticketId}`);
        this.setAttachment(ws, attachment);
      }
      return;
    }

    if (event === "join_group") {
      const groupKey = toRoomKey(data) || toRoomKey((data as any)?.room) || toRoomKey((data as any)?.group);
      if (groupKey) {
        attachment.rooms = Array.from(new Set([...(attachment.rooms || []), `group:${groupKey}`]));
        this.setAttachment(ws, attachment);
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
            await updateExamRoom(this.env.DB, roomKey, {
              status: "in_progress",
              updated_at: new Date().toISOString(),
            });
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
      if (roomKey) {
        const payload = { questionIndex: (data as any)?.questionIndex };
        this.broadcast({ event: "navigate_question", data: payload }, `room:${roomKey}`);
        this.broadcast({ event: "tutor_navigate", data: payload }, `room:${roomKey}`);
      }
      return;
    }

    if (event === "tutor_show_answer") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) this.broadcast({ event: "tutor_show_answer", data: { questionIndex: (data as any)?.questionIndex } }, `room:${roomKey}`);
      return;
    }

    if (event === "tutor_player_answer") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      if (roomKey) this.broadcast({ event: "tutor_player_answered", data: { choice: (data as any)?.choice } }, `room:${roomKey}`);
      return;
    }

    if (event === "submit_progress") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      const userId = (data as any)?.userId;
      const questionIndex = (data as any)?.questionIndex;
      
      if (roomKey && userId !== undefined && userId !== null) {
        try {
          await upsertExamRoomParticipant(this.env.DB, roomKey, String(userId), {
            current_question_index: questionIndex,
            updated_at: new Date().toISOString(),
          });
          this.broadcast({ event: "progress_updated", data: { userId, questionIndex } }, `room:${roomKey}`);
        } catch {
          // ignore
        }
      }
      return;
    }

    if (event === "set_nickname") {
      const roomId = (data as any)?.roomId;
      const roomKey = toRoomKey(roomId);
      const userId = (data as any)?.userId;
      const nickname = (data as any)?.nickname;
      
      if (roomKey && userId !== undefined && userId !== null && nickname) {
        try {
          await upsertExamRoomParticipant(this.env.DB, roomKey, String(userId), {
            nickname: String(nickname),
            updated_at: new Date().toISOString(),
          });
          this.broadcast({ event: "nickname_updated", data: { userId, nickname } }, `room:${roomKey}`);
        } catch {
          // ignore
        }
      }
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

          await upsertExamRoomParticipant(this.env.DB, roomKey, String(userId), {
            score,
            status: "finished",
            time_taken: timeTaken,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          const info = await this.getRoomInfo(roomKey);
          if (info) {
            const subjectScores = info.subject ? JSON.stringify({ [info.subject]: score }) : null;
            await createExamResult(this.env.DB, {
              user_id: String(userId),
              classroom_id: roomKey,
              score,
              total_score: info.questionCount,
              mode: "classroom",
              subject_scores: subjectScores,
              skill_scores: null,
              questions: null,
              time_taken: timeTaken,
              taken_at: new Date().toISOString(),
            });

            const parts = await listExamRoomParticipants(this.env.DB, roomKey);

            const total = parts.length;
            const finished = parts.filter((p: any) => p.status === "finished").length;
            if (total > 0 && total === finished) {
              await updateExamRoom(this.env.DB, roomKey, {
                status: "finished",
                updated_at: new Date().toISOString(),
              });
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
            await updateExamRoom(this.env.DB, roomKey, {
              status: "finished",
              updated_at: new Date().toISOString(),
            });
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
          await resetExamRoomParticipants(this.env.DB, roomKey);
          this.broadcast({ event: "exam_reset" }, `room:${roomKey}`);
        } catch {
          return;
        }
      }
      return;
    }
  }
}
