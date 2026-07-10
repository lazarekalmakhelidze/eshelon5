import { RealtimeDO, type Env } from "./realtime";
import { requireUserId, signJwtHs256 } from "./auth";
import { hashPassword, verifyPassword } from "./password";

export { RealtimeDO };

const withCors = (res: Response) => {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization");
  return new Response(res.body, { ...res, headers });
};

const json = (body: unknown, init?: ResponseInit) => withCors(Response.json(body, init));

const readJson = async (req: Request) => {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await req.json();
  } catch {
    return null;
  }
};

const notFound = () => json({ error: "not_found" }, { status: 404 });

const requireJwtSecret = (env: Env) => {
  const secret = (env as any).JWT_SECRET as string | undefined;
  if (!secret) return null;
  return secret;
};

const requireAuthUserId = async (req: Request, env: Env) => {
  const secret = requireJwtSecret(env);
  if (!secret) return { error: json({ error: "missing_jwt_secret" }, { status: 500 }) };
  const userId = await requireUserId(req, secret);
  if (!userId) return { error: json({ error: "unauthorized" }, { status: 401 }) };
  return { userId };
};

const oneDayAgoIso = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const sanitizeUser = (row: any) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    role: row.role,
    plan_type: row.plan_type,
    status: row.status,
  };
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/health") {
      return json({ ok: true });
    }

    if (url.pathname.startsWith("/api/ws") || url.pathname.startsWith("/api/realtime")) {
      const id = env.REALTIME.idFromName("global");
      const stub = env.REALTIME.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      const secret = requireJwtSecret(env);
      if (!secret) return json({ error: "missing_jwt_secret" }, { status: 500 });

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
      const email = String((body as any).email || "").trim().toLowerCase();
      const password = String((body as any).password || "");
      const displayName = String((body as any).display_name || (body as any).displayName || "").trim();
      if (!email || !password || password.length < 6 || !displayName) {
        return json({ success: false, message: "invalid_params" }, { status: 400 });
      }

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
      if (existing) return json({ success: false, message: "Email already in use" }, { status: 409 });

      const passwordHash = await hashPassword(password);
      const ins = await env.DB.prepare(
        "INSERT INTO users (email, password_hash, display_name, role, plan_type, status, guest_device_id, created_at, updated_at) VALUES (?, ?, ?, 'user', 'free', 'active', NULL, datetime('now'), datetime('now'))"
      )
        .bind(email, passwordHash, displayName)
        .run();

      const userId = Number(ins.meta.last_row_id);
      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: userId, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      const secret = requireJwtSecret(env);
      if (!secret) return json({ error: "missing_jwt_secret" }, { status: 500 });

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
      const email = String((body as any).email || "").trim().toLowerCase();
      const password = String((body as any).password || "");
      if (!email || !password) return json({ success: false, message: "invalid_params" }, { status: 400 });

      const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
      if (!user || !(user as any).password_hash) return json({ success: false, message: "Invalid credentials" }, { status: 401 });
      const ok = await verifyPassword(password, String((user as any).password_hash));
      if (!ok) return json({ success: false, message: "Invalid credentials" }, { status: 401 });

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: (user as any).id, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/auth/guest" && request.method === "POST") {
      const secret = requireJwtSecret(env);
      if (!secret) return json({ error: "missing_jwt_secret" }, { status: 500 });

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
      const deviceId = String((body as any).deviceId || "").trim();
      if (!deviceId) return json({ success: false, message: "invalid_params" }, { status: 400 });

      const email = `guest_${deviceId}@guest.local`;
      let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();

      if (!user) {
        const displayName = `Guest-${deviceId.slice(0, 6)}`;
        const ins = await env.DB.prepare(
          "INSERT INTO users (email, password_hash, display_name, role, plan_type, status, guest_device_id, created_at, updated_at) VALUES (?, NULL, ?, 'user', 'free', 'active', ?, datetime('now'), datetime('now'))"
        )
          .bind(email, displayName, deviceId)
          .run();
        const userId = Number(ins.meta.last_row_id);
        user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      }

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: (user as any).id, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const secret = requireJwtSecret(env);
      if (!secret) return json({ error: "missing_jwt_secret" }, { status: 500 });
      const userId = await requireUserId(request, secret);
      if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

      const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first();
      if (!user) return json({ success: false, message: "Unauthorized" }, { status: 401 });
      return json({ success: true, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/rooms" && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));
      const offset = (page - 1) * limit;

      const countRes = await env.DB.prepare(
        "SELECT COUNT(*) AS total FROM rooms WHERE status IN ('waiting','in_progress') OR (status = 'finished' AND updated_at >= ?)"
      )
        .bind(oneDayAgoIso())
        .first();
      const total = Number((countRes as any)?.total ?? 0);

      const roomsRes = await env.DB.prepare(
        "SELECT * FROM rooms WHERE status IN ('waiting','in_progress') OR (status = 'finished' AND updated_at >= ?) ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
        .bind(oneDayAgoIso(), limit, offset)
        .all();

      const rooms = (roomsRes.results || []) as any[];
      if (rooms.length === 0) {
        return json({ success: true, data: [], pagination: { total, page, totalPages: Math.ceil(total / limit) } });
      }

      const ids = rooms.map((r) => r.id);
      const placeholders = ids.map(() => "?").join(",");
      const counts = await env.DB.prepare(
        `SELECT room_id, COUNT(*) AS cnt FROM room_participants WHERE room_id IN (${placeholders}) GROUP BY room_id`
      )
        .bind(...ids)
        .all();

      const map = new Map<string, number>();
      for (const row of (counts.results || []) as any[]) map.set(String(row.room_id), Number(row.cnt || 0));

      const data = rooms.map((r) => ({
        ...r,
        password: undefined,
        participant_count: map.get(String(r.id)) || 0,
        RoomParticipants: [],
      }));

      return json({
        success: true,
        data,
        pagination: { total, page, totalPages: Math.ceil(total / limit) },
      });
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const name = String((body as any).name || "").trim();
      const mode = String((body as any).mode || "").trim();
      if (!name || !["exam", "tutor", "event"].includes(mode)) {
        return json({ success: false, message: "invalid_params" }, { status: 400 });
      }

      const subject = (body as any).subject ? String((body as any).subject) : null;
      const category = (body as any).category ? String((body as any).category) : null;
      const maxParticipants = Math.min(20, Math.max(2, Number((body as any).max_participants || 20)));
      const questionCount = Math.max(1, Math.min(200, Number((body as any).question_count || 20)));
      const timeLimit = Math.max(5, Math.min(60, Number((body as any).time_limit || 60)));
      const password = (body as any).password ? String((body as any).password) : null;

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const settings = JSON.stringify({ time_limit: timeLimit });

      const insert = await env.DB.prepare(
        "INSERT INTO rooms (code, name, mode, host_user_id, subject, category, max_participants, question_count, status, settings, password, question_ids, theme, theme_color, background_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, NULL, NULL, NULL, datetime('now'), datetime('now'))"
      )
        .bind(code, name, mode, auth.userId, subject, category, maxParticipants, questionCount, settings, password, "[]")
        .run();

      const roomId = Number(insert.meta.last_row_id);

      await env.DB.prepare(
        "INSERT INTO room_participants (room_id, user_id, score, status, current_question_index, answers, created_at, updated_at) VALUES (?, ?, 0, 'joined', 0, NULL, datetime('now'), datetime('now'))"
      )
        .bind(roomId, auth.userId)
        .run();

      const room = await env.DB.prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first();
      return json({ success: true, data: room }, { status: 201 });
    }

    if (url.pathname === "/api/rooms/join" && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
      const code = String((body as any).code || "").trim().toUpperCase();
      const password = (body as any).password ? String((body as any).password) : null;
      if (!code) return json({ success: false, message: "invalid_params" }, { status: 400 });

      const room = await env.DB.prepare("SELECT * FROM rooms WHERE code = ?").bind(code).first();
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      if ((room as any).password) {
        if (!password) return json({ success: false, message: "Password required", requirePassword: true }, { status: 403 });
        if (password !== String((room as any).password)) return json({ success: false, message: "Invalid password" }, { status: 403 });
      }

      if (String((room as any).status) !== "waiting") {
        return json({ success: false, message: "Room is already in progress or finished" }, { status: 400 });
      }

      await env.DB.prepare(
        "INSERT INTO room_participants (room_id, user_id, score, status, current_question_index, answers, created_at, updated_at) VALUES (?, ?, 0, 'joined', 0, NULL, datetime('now'), datetime('now')) ON CONFLICT(room_id, user_id) DO NOTHING"
      )
        .bind((room as any).id, auth.userId)
        .run();

      return json({ success: true, data: { ...room, password: undefined } });
    }

    const roomIdMatch = url.pathname.match(/^\/api\/rooms\/(\d+)$/);
    if (roomIdMatch && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await env.DB.prepare("SELECT * FROM rooms WHERE id = ?").bind(roomId).first();
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      const participants = await env.DB.prepare("SELECT * FROM room_participants WHERE room_id = ? ORDER BY score DESC, updated_at ASC")
        .bind(roomId)
        .all();

      return json({
        success: true,
        data: {
          ...room,
          password: undefined,
          Host: { id: (room as any).host_user_id, display_name: null },
          RoomParticipants: participants.results || [],
          questions: [],
        },
      });
    }

    if (roomIdMatch && request.method === "DELETE") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await env.DB.prepare("SELECT id, host_user_id FROM rooms WHERE id = ?").bind(roomId).first();
      if (!room) return json({ success: true, message: "Room already deleted or not found" });

      if (String((room as any).host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized to delete this room" }, { status: 403 });
      }

      await env.DB.prepare("DELETE FROM room_participants WHERE room_id = ?").bind(roomId).run();
      await env.DB.prepare("DELETE FROM rooms WHERE id = ?").bind(roomId).run();
      return json({ success: true, message: "Room deleted successfully" });
    }
    // --- FIREBASE REST API INTEGRATION ---
    if (url.pathname === "/api/questions" && request.method === "GET") {
      try {
        const saJsonStr = (env as any).FIREBASE_SERVICE_ACCOUNT;
        if (!saJsonStr) return json({ success: false, message: "Missing FIREBASE_SERVICE_ACCOUNT in Cloudflare environment" }, { status: 500 });
        const sa = JSON.parse(saJsonStr);
        
        // Generate JWT
        const header = { alg: "RS256", typ: "JWT" };
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          iss: sa.client_email,
          scope: "https://www.googleapis.com/auth/datastore",
          aud: "https://oauth2.googleapis.com/token",
          exp: now + 3600,
          iat: now
        };
        const strHeader = btoa(JSON.stringify(header));
        const strPayload = btoa(JSON.stringify(payload));
        const signatureInput = `${strHeader}.${strPayload}`;

        const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
        const binaryDerString = atob(pem);
        const binaryDer = new Uint8Array(binaryDerString.length);
        for (let i = 0; i < binaryDerString.length; i++) binaryDer[i] = binaryDerString.charCodeAt(i);

        const key = await crypto.subtle.importKey("pkcs8", binaryDer.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
        const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signatureInput));
        const strSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        
        const jwt = `${signatureInput}.${strSignature}`;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        });
        const tokenData: any = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) return json({ success: false, message: "Failed to get access token" }, { status: 500 });

        // Fetch from Firestore
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/questions?pageSize=100`;
        const fsRes = await fetch(firestoreUrl, {
          headers: { "Authorization": `Bearer ${accessToken}` }
        });
        const fsData: any = await fsRes.json();

        if (fsData.error) {
          return json({ success: false, message: fsData.error.message }, { status: 500 });
        }

        const rows = (fsData.documents || []).map((doc: any) => {
          const fields = doc.fields || {};
          const res: any = { id: doc.name.split('/').pop() };
          for (const [k, v] of Object.entries(fields)) {
            const val: any = v;
            if (val.stringValue !== undefined) res[k] = val.stringValue;
            else if (val.integerValue !== undefined) res[k] = parseInt(val.integerValue, 10);
            else if (val.booleanValue !== undefined) res[k] = val.booleanValue;
            else if (val.arrayValue !== undefined) {
              res[k] = (val.arrayValue.values || []).map((arrVal: any) => arrVal.stringValue || arrVal.integerValue);
            }
          }
          return res;
        });

        return json({
          success: true,
          data: {
            rows: rows,
            total: rows.length,
            page: 1,
            totalPages: 1
          }
        });

      } catch (err: any) {
        return json({ success: false, message: err.message }, { status: 500 });
      }
    }

    return notFound();
  },
};
