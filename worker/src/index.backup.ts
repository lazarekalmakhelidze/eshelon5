import { RealtimeDO, type Env } from "./realtime";
import { requireUserId, signJwtHs256 } from "./auth";
import { hashPassword, verifyPassword } from "./password";
import { FirestoreClient, parseServiceAccount } from "./firestore";
import { aiGeneratorState, runAIGenerator } from "./generator";

export { RealtimeDO };

const withCors = (res: Response) => {
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("access-control-allow-headers", "content-type,authorization");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};

let mockScraperRunning = false;
let mockScraperLogs: string[] = [];

const globalCache: Record<string, { data: any, exp: number }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
function getCache(key: string) {
  const item = globalCache[key];
  if (item && item.exp > Date.now()) return item.data;
  return null;
}
function setCache(key: string, data: any, ttl = CACHE_TTL) {
  globalCache[key] = { data, exp: Date.now() + ttl };
}

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

const lastActiveUpdateCache = new Map<string, number>();

const requireAuthUserId = async (req: Request, env: Env) => {
  const secret = requireJwtSecret(env);
  if (!secret) return { error: json({ error: "missing_jwt_secret" }, { status: 500 }) };
  const userId = await requireUserId(req, secret);
  if (!userId) return { error: json({ error: "unauthorized" }, { status: 401 }) };

  const now = Date.now();
  const lastUpdated = lastActiveUpdateCache.get(userId) || 0;
  if (now - lastUpdated > 5 * 60 * 1000) {
      lastActiveUpdateCache.set(userId, now);
      try {
          const config = parseServiceAccount(env);
          if (config) {
              const firestore = new FirestoreClient(config);
              await firestore.updateDocument("users", userId, { last_active_at: new Date(now).toISOString() });
          }
      } catch (e) {
          console.error("Failed to update last active:", e);
      }
  }

  return { userId };
};

const requireAdmin = async (req: Request, env: Env) => {
  const auth = await requireAuthUserId(req, env);
  if ("error" in auth) return auth;
  const config = parseServiceAccount(env);
  if (!config) return { error: json({ error: "missing_firestore_config" }, { status: 500 }) };
  const firestore = new FirestoreClient(config);
  const user = await firestore.getDocument("users", auth.userId);
  if (!user || user.role !== "admin") return { error: json({ error: "forbidden" }, { status: 403 }) };
  return { userId: auth.userId };
};

const oneDayAgoIso = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const sanitizeUser = (row: any) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    avatar: row.avatar || null,
    role: row.role,
    plan_type: row.plan_type,
    status: row.status,
  };
};

const normalizeQuestion = (q: any) => {
  if (!q) return q;
  const ans = String(q.correct_answer || "").trim();
  const lowerAns = ans.toLowerCase();
  if (lowerAns === "a" || lowerAns === "b" || lowerAns === "c" || lowerAns === "d") {
    return { ...q, correct_answer: ans.toUpperCase() };
  }
  
  let mapped = ans;
  if (lowerAns === String(q.choice_a || "").trim().toLowerCase()) mapped = "A";
  else if (lowerAns === String(q.choice_b || "").trim().toLowerCase()) mapped = "B";
  else if (lowerAns === String(q.choice_c || "").trim().toLowerCase()) mapped = "C";
  else if (lowerAns === String(q.choice_d || "").trim().toLowerCase()) mapped = "D";
  
  return { ...q, correct_answer: mapped.toUpperCase() };
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/health") {
      const saConfig = parseServiceAccount(env);
      if (!saConfig) {
        return json({
          ok: false,
          status: "error",
          services: {
            firebase: "missing_config",
            jwt: env.JWT_SECRET ? "configured" : "missing_config",
          },
        }, { status: 500 });
      }

      return json({
        ok: true,
        status: "healthy",
        services: {
          firebase: "configured",
          jwt: env.JWT_SECRET ? "configured" : "missing_config",
        },
      });
    }

    if (url.pathname.startsWith("/api/ws") || url.pathname.startsWith("/api/realtime")) {
      const id = env.REALTIME.idFromName("global");
      const stub = env.REALTIME.get(id);
      return stub.fetch(request);
    }

    const saConfig = parseServiceAccount(env);
    if (!saConfig) return json({ error: "missing_firebase_config" }, { status: 500 });
    const firestore = new FirestoreClient(saConfig);

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

      const existingUsers = await firestore.runQuery({
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
        limit: 1,
      });

      if (existingUsers.length > 0) return json({ success: false, message: "Email already in use" }, { status: 409 });

      const passwordHash = await hashPassword(password);
      const user = await firestore.createDocument("users", {
        email,
        password_hash: passwordHash,
        display_name: displayName,
        role: "user",
        plan_type: "free",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: user.id, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    // /api/auth/guest
    if (url.pathname === "/api/auth/guest" && request.method === "POST") {
      const body = (await readJson(request)) as any;
      if (!body || !body.deviceId) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const deviceId = body.deviceId;
      const email = `guest_${deviceId}@preexam.com`;

      const existing = await firestore.runQuery({
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
        limit: 1
      });

      let user;
      if (existing.length > 0) {
        user = existing[0];
        try { 
          await firestore.updateDocument("users", user.id, { last_active_at: new Date().toISOString() }); 
          user.last_active_at = new Date().toISOString(); 
        } catch(e){}
      } else {
        const shortId = deviceId.slice(-5) + Math.floor(100 + Math.random() * 900);
        user = await firestore.createDocument("users", {
          email,
          display_name: `Guest-${shortId}`,
          role: "user",
          plan_type: "free",
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        });
      }

      const token = await signJwtHs256({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET || "default_secret");
      
      try {
        await firestore.createDocument("system_logs", {
          action: existing.length > 0 ? "SYS_GUEST_LOGIN" : "SYS_GUEST_CREATE",
          details: JSON.stringify({ type: "auto" }),
          user_id: user.id,
          ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
          created_at: new Date().toISOString()
        });
      } catch (e) {}

      return json({ success: true, token, user: sanitizeUser(user) });
    }

    // /api/auth/google
    if (url.pathname === "/api/auth/google" && request.method === "POST") {
      const body = (await readJson(request)) as any;
      if (!body || !body.token) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const tokenStr = body.token;

      // Verify token using Google tokeninfo endpoint
      const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenStr}`);
      if (!googleRes.ok) return json({ success: false, message: "Google login failed" }, { status: 400 });

      const ticket = await googleRes.json() as any;
      const { email, name, sub: googleId, picture } = ticket;

      if (!email) return json({ success: false, message: "Email not provided by Google" }, { status: 400 });

      let user;
      const existingByGoogleId = await firestore.runQuery({
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "google_id" }, op: "EQUAL", value: { stringValue: googleId } } },
        limit: 1
      });

      if (existingByGoogleId.length > 0) {
        user = existingByGoogleId[0];
        const updates: any = { last_active_at: new Date().toISOString() };
        if (picture && user.avatar !== picture) {
          updates.avatar = picture;
        }
        try { 
          await firestore.updateDocument("users", user.id, updates); 
          user.last_active_at = updates.last_active_at; 
        } catch(e){}
      } else {
        const existingByEmail = await firestore.runQuery({
          from: [{ collectionId: "users" }],
          where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
          limit: 1
        });
        if (existingByEmail.length > 0) {
          user = existingByEmail[0];
          const updates: any = { google_id: googleId };
          if (picture) updates.avatar = picture;
          await firestore.updateDocument("users", user.id, updates);
        } else {
          user = await firestore.createDocument("users", {
            email,
            display_name: name,
            google_id: googleId,
            avatar: picture,
            role: "user",
            plan_type: "free",
            created_at: new Date().toISOString()
          });
        }
      }

      const token = await signJwtHs256({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET || "default_secret");
      
      try {
        await firestore.createDocument("system_logs", {
          action: "SYS_GOOGLE_LOGIN",
          details: JSON.stringify({ type: "auto" }),
          user_id: user.id,
          ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
          created_at: new Date().toISOString()
        });
      } catch (e) {}

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

      const users = await firestore.runQuery({
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
        limit: 1,
      });

      const user = users[0];
      if (!user || !user.password_hash) return json({ success: false, message: "Invalid credentials" }, { status: 401 });
      const ok = await verifyPassword(password, String(user.password_hash));
      if (!ok) return json({ success: false, message: "Invalid credentials" }, { status: 401 });

      try { await firestore.updateDocument("users", user.id, { last_active_at: new Date().toISOString() }); user.last_active_at = new Date().toISOString(); } catch(e){}

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: user.id, exp }, secret);

      try {
        await firestore.createDocument("system_logs", {
          action: "SYS_EMAIL_LOGIN",
          details: JSON.stringify({ type: "auto" }),
          user_id: user.id,
          ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
          user_agent: request.headers.get("user-agent") || "unknown",
          created_at: new Date().toISOString()
        });
      } catch (e) {}

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
      const users = await firestore.runQuery({
        from: [{ collectionId: "users" }],
        where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: email } } },
        limit: 1,
      });

      let user = users[0];
      if (!user) {
        const displayName = `Guest-${deviceId.slice(0, 6)}`;
        user = await firestore.createDocument("users", {
          email,
          password_hash: null,
          display_name: displayName,
          role: "user",
          plan_type: "free",
          status: "active",
          guest_device_id: deviceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: user.id, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const secret = requireJwtSecret(env);
      if (!secret) return json({ error: "missing_jwt_secret" }, { status: 500 });
      const userId = await requireUserId(request, secret);
      if (!userId) return json({ success: false, message: "Unauthorized" }, { status: 401 });

      const user = await firestore.getDocument("users", userId);
      if (!user) return json({ success: false, message: "Unauthorized" }, { status: 401 });
      return json({ success: true, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/rooms" && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));

      const recentRooms = await firestore.runQuery({
        from: [{ collectionId: "exam_rooms" }],
        orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
        limit: 100, // Fetch up to 100 to filter in memory
      });

      const oneDayAgo = oneDayAgoIso();
      const filteredRooms = recentRooms.filter((r) => {
        if (!r.created_at || r.created_at < oneDayAgo) return false;
        return r.status === "waiting" || r.status === "in_progress" || (r.status === "finished" && r.updated_at >= oneDayAgo);
      });

      const total = filteredRooms.length;
      const offset = (page - 1) * limit;
      const rooms = filteredRooms.slice(offset, offset + limit);

      if (rooms.length === 0) {
        return json({ success: true, data: [], pagination: { total, page, totalPages: Math.ceil(total / limit) } });
      }

      // Fetch participants to count
      const roomIds = rooms.map((r) => r.id);
      const participantCounts = new Map<string, number>();

      for (const rId of roomIds) {
        // Use runCountQuery instead of fetching all documents
        const count = await firestore.runCountQuery(
          { from: [{ collectionId: "participants" }] },
          `exam_rooms/${rId}`
        );
        participantCounts.set(rId, count);
      }

      const hostIds = Array.from(new Set(rooms.map((r) => r.host_user_id).filter(Boolean)));
      const hosts = new Map<string, string>();
      for (const hid of hostIds) {
        const u = await firestore.getDocument("users", hid as string);
        if (u) {
            hosts.set(hid as string, u.display_name || u.username || 'Unknown');
        }
      }

      const data = rooms.map((r) => ({
        ...r,
        password: undefined,
        participant_count: participantCounts.get(r.id) || 0,
        host_name: r.host_name || hosts.get(r.host_user_id) || 'Unknown',
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
      const customQuestions = (body as any).custom_questions;

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const settings = JSON.stringify({ time_limit: timeLimit });

      let selectedIds: string[] = [];
      
      if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
        // Save custom questions
        const insertPromises = customQuestions.map((q: any) => {
          return firestore.createDocument("questions", {
            question_text: q.question_text || "",
            choices: q.choices || { A: "", B: "", C: "", D: "" },
            correct_answer: q.correct_answer || "A",
            explanation: q.explanation || "",
            category: "custom",
            subject: "custom",
            difficulty: 50,
            is_custom: true,
            host_user_id: auth.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        });
        try {
          const createdDocs = await Promise.all(insertPromises);
          selectedIds = createdDocs.map((d: any) => d.id);
        } catch (e) {
          return json({ success: false, message: "Failed to save custom questions." }, { status: 500 });
        }
      } else {
        // Fetch random questions based on criteria
        const filters: any[] = [];
        if (subject) filters.push({ fieldFilter: { field: { fieldPath: "subject" }, op: "EQUAL", value: { stringValue: subject } } });
        if (category) filters.push({ fieldFilter: { field: { fieldPath: "category" }, op: "EQUAL", value: { stringValue: category } } });

        let query: any = { from: [{ collectionId: "questions" }] };
        if (filters.length === 1) query.where = filters[0];
        else if (filters.length > 1) query.where = { compositeFilter: { op: "AND", filters } };

        try {
          const allQs = await firestore.runQuery(query);
          const shuffled = allQs.sort(() => Math.random() - 0.5);
          selectedIds = shuffled.slice(0, questionCount).map((q: any) => q.id);
        } catch (e) {
          // Fallback
        }
      }

      if (selectedIds.length === 0) {
        return json({ success: false, message: "No questions found." }, { status: 400 });
      }

      const room = await firestore.createDocument("exam_rooms", {
        code,
        name,
        mode,
        host_user_id: auth.userId,
        subject,
        category,
        max_participants: maxParticipants,
        question_count: selectedIds.length > 0 ? selectedIds.length : questionCount,
        status: "waiting",
        settings,
        password,
        question_ids: JSON.stringify(selectedIds),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await firestore.createDocument(`exam_rooms/${room.id}/participants`, {
        user_id: auth.userId,
        score: 0,
        status: "joined",
        current_question_index: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, auth.userId);

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

      const rooms = await firestore.runQuery({
        from: [{ collectionId: "exam_rooms" }],
        where: { fieldFilter: { field: { fieldPath: "code" }, op: "EQUAL", value: { stringValue: code } } },
        limit: 1,
      });

      const room = rooms[0];
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      if (room.password) {
        if (!password) return json({ success: false, message: "Password required", requirePassword: true }, { status: 403 });
        if (password !== String(room.password)) return json({ success: false, message: "Invalid password" }, { status: 403 });
      }

      if (String(room.status) !== "waiting") {
        return json({ success: false, message: "Room is already in progress or finished" }, { status: 400 });
      }

      // Check if already joined
      const existingPart = await firestore.getDocument(`exam_rooms/${room.id}/participants`, auth.userId);

      if (!existingPart) {
        await firestore.createDocument(`exam_rooms/${room.id}/participants`, {
          user_id: auth.userId,
          score: 0,
          status: "joined",
          current_question_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, auth.userId);
      }

      return json({ success: true, data: { ...room, password: undefined } });
    }

    const roomIdMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)$/);
    if (roomIdMatch && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await firestore.getDocument("exam_rooms", roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      const participants = await firestore.listDocuments(`exam_rooms/${roomId}/participants`);

      // Fetch users for participants using cache
      const userIds = participants.map((p: any) => p.user_id);
      const uniqueUserIds = Array.from(new Set(userIds));
      const usersMap = new Map();
      const missingUserIds: string[] = [];

      for (const uid of uniqueUserIds) {
        const cachedU = getCache(`u_${uid}`);
        if (cachedU) usersMap.set(String(uid), cachedU);
        else missingUserIds.push(String(uid));
      }
      
      for (let i = 0; i < missingUserIds.length; i += 30) {
        const chunk = missingUserIds.slice(i, i + 30);
        const userPromises = chunk.map((id: any) => firestore.getDocument("users", String(id)));
        const users = await Promise.all(userPromises);
        for (const u of users) {
          if (u && u.id) {
            usersMap.set(String(u.id), u);
            setCache(`u_${u.id}`, u, 5 * 60 * 1000); // 5 mins cache
          }
        }
      }

      const populatedParticipants = participants.map((p: any) => ({
        ...p,
        User: usersMap.get(String(p.user_id)) ? sanitizeUser(usersMap.get(String(p.user_id))) : { display_name: "Unknown", avatar: null }
      }));

      const questionIds = room.question_ids ? JSON.parse(String(room.question_ids)) : [];
      const questionsMap = new Map();
      const missingQIds: string[] = [];

      for (const qid of questionIds) {
        const cachedQ = getCache(`q_${qid}`);
        if (cachedQ) questionsMap.set(String(qid), normalizeQuestion(cachedQ));
        else missingQIds.push(qid);
      }

      for (let i = 0; i < missingQIds.length; i += 30) {
        const chunk = missingQIds.slice(i, i + 30);
        const qPromises = chunk.map((id: string) => firestore.getDocument("questions", String(id)));
        const qs = await Promise.all(qPromises);
        for (const q of qs) {
          if (q && q.id) {
            questionsMap.set(String(q.id), normalizeQuestion(q));
            setCache(`q_${q.id}`, q, 24 * 60 * 60 * 1000); // 24 hours cache
          }
        }
      }
      const questions = questionIds.map((id: string) => questionsMap.get(String(id))).filter(Boolean);

      return json({
        success: true,
        data: {
          ...room,
          password: undefined,
          Host: usersMap.get(String(room.host_user_id)) ? sanitizeUser(usersMap.get(String(room.host_user_id))) : { id: room.host_user_id, display_name: null },
          RoomParticipants: populatedParticipants,
          questions: questions,
        },
      });
    }

    if (roomIdMatch && request.method === "DELETE") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await firestore.getDocument("exam_rooms", roomId);
      if (!room) return json({ success: true, message: "Room already deleted or not found" });

      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized to delete this room" }, { status: 403 });
      }

      const participants = await firestore.listDocuments(`exam_rooms/${roomId}/participants`);

      for (const p of participants) {
        await firestore.deleteDocument(`exam_rooms/${roomId}/participants`, p.id);
      }
      await firestore.deleteDocument("exam_rooms", roomId);
      return json({ success: true, message: "Room deleted successfully" });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        const saConfig = parseServiceAccount(env);
        if (!saConfig) return json({ error: "missing_firebase_config" }, { status: 500 });
        const firestore = new FirestoreClient(saConfig);

        // /api/public/log
        if (url.pathname === "/api/public/log" && request.method === "POST") {
          const body = await readJson(request);
          if (!body || !(body as any).action) return json({ success: false, message: "Action required" }, { status: 400 });

          const action = String((body as any).action);
          const details = (body as any).details || {};
          
          let userId = null;
          const authHeader = request.headers.get("authorization") || "";
          const secret = requireJwtSecret(env) || "default_secret";
          try {
            const id = await requireUserId(request, secret);
            if (id) userId = id;
          } catch (e) {}

          let created: any = null;
          try {
            created = await firestore.createDocument("system_logs", {
              action,
              details,
              user_id: userId,
              ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
              user_agent: request.headers.get("user-agent") || "unknown",
              created_at: new Date().toISOString()
            });
          } catch (e: any) {
            const msg = e?.message ? String(e.message) : "firestore_write_failed";
            return json(
              {
                success: false,
                stored: false,
                error: msg.slice(0, 200),
                auth_present: Boolean(authHeader),
                user_id: userId
              },
              { status: 500 }
            );
          }

          return json({
            success: true,
            stored: true,
            doc_id: created?.id || null,
            auth_present: Boolean(authHeader),
            user_id: userId
          });
        }

        // /api/questions/subjects
        if (url.pathname === "/api/questions/subjects" && request.method === "GET") {
          const cacheKey = "qs_subjects";
          let cached = getCache(cacheKey);
          if (!cached) {
            const qs = await firestore.runQuery({ from: [{ collectionId: "questions" }] });
            const subjects = new Set<string>();
            for (const q of qs) if (q.subject) subjects.add(q.subject);
            cached = Array.from(subjects).sort();
            setCache(cacheKey, cached);
          }
          return json({ success: true, data: cached });
        }

        // /api/questions/years
        if (url.pathname === "/api/questions/years" && request.method === "GET") {
          const cacheKey = "qs_years";
          let cached = getCache(cacheKey);
          if (!cached) {
            const qs = await firestore.runQuery({ from: [{ collectionId: "questions" }] });
            const years = new Set<string>();
            for (const q of qs) if (q.exam_year) years.add(String(q.exam_year));
            cached = Array.from(years).sort((a: any, b: any) => b.localeCompare(a));
            setCache(cacheKey, cached);
          }
          return json({ success: true, data: cached });
        }

        // /api/questions/sets
        if (url.pathname === "/api/questions/sets" && request.method === "GET") {
          const cacheKey = "qs_sets";
          let cached = getCache(cacheKey);
          if (!cached) {
            const qs = await firestore.runQuery({ from: [{ collectionId: "questions" }] });
            const sets = new Set<string>();
            for (const q of qs) if (q.exam_set) sets.add(q.exam_set);
            cached = Array.from(sets).sort();
            setCache(cacheKey, cached);
          }
          return json({ success: true, data: cached });
        }

        // /api/questions/categories
        if (url.pathname === "/api/questions/categories" && request.method === "GET") {
          const subject = url.searchParams.get("subject");
          const cacheKey = `qs_cats_${subject || 'all'}`;
          let cached = getCache(cacheKey);
          if (!cached) {
            const query: any = { from: [{ collectionId: "questions" }] };
            if (subject && subject !== "undefined" && subject !== "null") {
              query.where = { fieldFilter: { field: { fieldPath: "subject" }, op: "EQUAL", value: { stringValue: subject } } };
            }
            const qs = await firestore.runQuery(query);
            const allTags = new Set<string>();
            for (const q of qs) {
              if (q.category) {
                q.category.split(",").forEach((tag: string) => {
                  const t = tag.trim();
                  if (t) allTags.add(t);
                });
              }
              if (q.catalogs && Array.isArray(q.catalogs)) {
                q.catalogs.forEach((tag: string) => {
                  if (tag) allTags.add(tag.trim());
                });
              }
            }
            cached = Array.from(allTags).sort();
            setCache(cacheKey, cached);
          }
          return json({ success: true, data: cached });
        }

        // /api/questions/:id
        const qIdMatch = url.pathname.match(/^\/api\/questions\/([a-zA-Z0-9_-]+)$/);
        if (qIdMatch && request.method === "GET") {
          const q = await firestore.getDocument("questions", qIdMatch[1]);
          if (!q) return json({ success: false, message: "Question not found" }, { status: 404 });
          return json({ success: true, data: normalizeQuestion(q) });
        }

        // /api/questions (List)
        if (url.pathname === "/api/questions" && request.method === "GET") {
          const category = url.searchParams.get("category");
          const subject = url.searchParams.get("subject");
          const exam_year = url.searchParams.get("exam_year");
          const exam_set = url.searchParams.get("exam_set");
          const limitStr = url.searchParams.get("limit") || "50";
          const pageStr = url.searchParams.get("page") || "1";
          const orderBy = url.searchParams.get("orderBy");
          const search = url.searchParams.get("search");
          const orderDir = url.searchParams.get("orderDir") || "desc";

          const limit = parseInt(limitStr, 10);
          const page = parseInt(pageStr, 10);
          const offset = (page - 1) * limit;

          const filters: any[] = [];
          if (subject && subject !== "undefined" && subject !== "null") {
            filters.push({ fieldFilter: { field: { fieldPath: "subject" }, op: "EQUAL", value: { stringValue: subject } } });
          }
          if (exam_year && exam_year !== "undefined" && exam_year !== "null") {
            filters.push({ fieldFilter: { field: { fieldPath: "exam_year" }, op: "EQUAL", value: { stringValue: exam_year } } });
          }
          if (exam_set && exam_set !== "undefined" && exam_set !== "null") {
            filters.push({ fieldFilter: { field: { fieldPath: "exam_set" }, op: "EQUAL", value: { stringValue: exam_set } } });
          }

          let query: any = { from: [{ collectionId: "questions" }] };
          if (filters.length === 1) {
            query.where = filters[0];
          } else if (filters.length > 1) {
            query.where = { compositeFilter: { op: "AND", filters } };
          }

          const cacheKey = `qs_list_${JSON.stringify(query)}`;
          let allQs = getCache(cacheKey);
          if (!allQs) {
            allQs = await firestore.runQuery(query);
            setCache(cacheKey, allQs, 60 * 1000); // 1 minute cache
          }

          let rows: any[] = [];

          for (const data of allQs) {
            let match = true;
            if (search) {
              const searchStr = search.toLowerCase();
              const qText = (data.question_text || "").toLowerCase();
              if (!qText.includes(searchStr)) match = false;
            }
            if (match && category && category !== "undefined" && category !== "null") {
              const catStr = category.toLowerCase();
              const qCat = (data.category || "").toLowerCase();
              const qCatalogs = Array.isArray(data.catalogs) ? data.catalogs.join(",").toLowerCase() : (data.catalogs || "").toLowerCase();
              if (!qCat.includes(catStr) && !qCatalogs.includes(catStr)) match = false;
            }
            if (match) rows.push(normalizeQuestion(data));
          }

          if (orderBy === "random") {
            rows.sort(() => Math.random() - 0.5);
          } else {
            rows.sort((a, b) => {
              const numA = Number(a.id);
              const numB = Number(b.id);
              const isNumA = !isNaN(numA);
              const isNumB = !isNaN(numB);
              
              if (isNumA && isNumB) {
                return orderDir === "desc" ? numB - numA : numA - numB;
              }
              if (isNumA && !isNumB) return orderDir === "desc" ? 1 : -1;
              if (!isNumA && isNumB) return orderDir === "desc" ? -1 : 1;
              
              const strCompare = String(a.id).localeCompare(String(b.id));
              return orderDir === "desc" ? -strCompare : strCompare;
            });
          }

          const count = rows.length;
          rows = rows.slice(offset, offset + limit);

          return json({
            success: true,
            data: {
              rows,
              total: count,
              page,
              totalPages: Math.ceil(count / limit) || 1,
            },
          });
        }

        // /api/questions (Create)
        if (url.pathname === "/api/questions" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await firestore.getDocument("users", auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const body: any = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
          
          const { catalogs, category, skill, exam_year, exam_set, ...rest } = body;
          
          let finalCatalogs = catalogs || [];
          if (category && !finalCatalogs.includes(category)) {
              finalCatalogs.push(category);
          }
          if (typeof finalCatalogs === "string") {
              try { finalCatalogs = JSON.parse(finalCatalogs); } catch (e) { finalCatalogs = [finalCatalogs]; }
          }
          
          let maxId = 0;
          try {
             const allDocs = await firestore.runQuery({ from: [{ collectionId: "questions" }] });
             for (const doc of allDocs) {
                 const num = Number(doc.id);
                 if (!isNaN(num) && num > maxId) {
                     maxId = num;
                 }
             }
          } catch(e) {
             console.error("Failed to fetch max ID", e);
          }
          
          const newDocRef = (maxId + 1).toString();
          
          const newQuestion = {
              id: newDocRef,
              ...rest,
              category: category || (finalCatalogs.length > 0 ? finalCatalogs[0] : 'General'),
              catalogs: finalCatalogs,
              skill: skill || null,
              exam_year: exam_year || null,
              exam_set: exam_set || null,
              created_at: new Date().toISOString()
          };
          
          await firestore.createDocument("questions", newQuestion, newDocRef);
          return json({ success: true, data: newQuestion }, { status: 201 });
        }

        // /api/questions/:id (Update)
        if (qIdMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await firestore.getDocument("users", auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const body: any = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
          
          const doc = await firestore.getDocument("questions", qIdMatch[1]);
          if (!doc) return json({ success: false, message: "Question not found" }, { status: 404 });
          
          const updateData = { ...body, updated_at: new Date().toISOString() };
          await firestore.updateDocument("questions", qIdMatch[1], updateData);
          
          const updated = await firestore.getDocument("questions", qIdMatch[1]);
          return json({ success: true, data: normalizeQuestion(updated) });
        }

        // /api/questions/:id (Delete)
        if (qIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await firestore.getDocument("users", auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const doc = await firestore.getDocument("questions", qIdMatch[1]);
          if (!doc) return json({ success: false, message: "Question not found" }, { status: 404 });
          
          await firestore.deleteDocument("questions", qIdMatch[1]);
          return json({ success: true, message: "Question deleted" });
        }

        // /api/exams/submit
        if (url.pathname === "/api/exams/submit" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const body = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

          const { answers, mode, classroom_id, total_time } = body as any;
          if (!answers || typeof answers !== "object") return json({ success: false, message: "invalid_params" }, { status: 400 });

          const questionIds = Object.keys(answers);
          if (questionIds.length === 0) return json({ success: false, message: "No answers provided" }, { status: 400 });

          // Fetch questions. Check cache first.
          const questionsMap = new Map();
          const missingIds: string[] = [];
          for (const id of questionIds) {
            const cachedQ = getCache(`q_${id}`);
            if (cachedQ) questionsMap.set(String(id), cachedQ);
            else missingIds.push(String(id));
          }

          for (let i = 0; i < missingIds.length; i += 30) {
            const chunk = missingIds.slice(i, i + 30);
            const qPromises = chunk.map(id => firestore.getDocument("questions", String(id)));
            const qs = await Promise.all(qPromises);
            for (const q of qs) {
              if (q && q.id) {
                questionsMap.set(String(q.id), q);
                setCache(`q_${q.id}`, q, 24 * 60 * 60 * 1000); // cache for 24h
              }
            }
          }

          let score = 0;
          let total_score = 0;
          const subject_scores: Record<string, any> = {};
          const skill_scores: Record<string, any> = {};
          const questionsDetail: any[] = [];

          for (const qId of questionIds) {
            const rawQ = questionsMap.get(String(qId));
            if (!rawQ) continue;
            const q = normalizeQuestion(rawQ);

            total_score++;
            const userAnswer = answers[qId];
            const correctNormalized = q.correct_answer ? String(q.correct_answer).trim().toLowerCase() : "";
            const userNormalized = userAnswer ? String(userAnswer).trim().toLowerCase() : "";
            const isCorrect = userNormalized === correctNormalized;

            if (isCorrect) score++;

            if (q.subject) {
              if (!subject_scores[q.subject]) subject_scores[q.subject] = { score: 0, total: 0 };
              subject_scores[q.subject].total++;
              if (isCorrect) subject_scores[q.subject].score++;
            }

            if (q.skill) {
              if (!skill_scores[q.skill]) skill_scores[q.skill] = { score: 0, total: 0 };
              skill_scores[q.skill].total++;
              if (isCorrect) skill_scores[q.skill].score++;
            }

            questionsDetail.push({
              question_id: q.id,
              question_text: q.question_text,
              user_answer: userAnswer,
              correct_answer: q.correct_answer,
              is_correct: isCorrect,
              explanation: q.explanation,
              choice_a: q.choice_a,
              choice_b: q.choice_b,
              choice_c: q.choice_c,
              choice_d: q.choice_d,
              category: q.category,
              subject: q.subject,
              skill: q.skill
            });
          }

          const examResult = await firestore.createDocument("exam_results", {
            user_id: auth.userId,
            classroom_id: classroom_id || null,
            score,
            total_score,
            mode: mode || "solo",
            subject_scores: subject_scores,
            skill_scores: skill_scores,
            questions: questionsDetail,
            time_taken: total_time || 0,
            taken_at: new Date().toISOString()
          });

          // Update ranking
          try {
            const activeSeasons = await firestore.runQuery({ from: [{ collectionId: "seasons" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } }, limit: 1 });
            if (activeSeasons.length > 0) {
              const seasonId = activeSeasons[0].id;
              const rankingId = `${seasonId}_${auth.userId}`;
              const existingRanking = await firestore.getDocument("rankings", rankingId);
              
              if (existingRanking) {
                const newTotalScore = (Number(existingRanking.total_score) || 0) + score;
                const newExamsTaken = (Number(existingRanking.exams_taken) || 0) + 1;
                await firestore.updateDocument("rankings", rankingId, {
                  total_score: newTotalScore,
                  exams_taken: newExamsTaken,
                  updated_at: new Date().toISOString()
                });
              } else {
                await firestore.createDocument("rankings", {
                  season_id: seasonId,
                  user_id: auth.userId,
                  total_score: score,
                  exams_taken: 1,
                  updated_at: new Date().toISOString()
                }, rankingId);
              }
            }
          } catch(e) {
            console.error("Failed to update ranking:", e);
          }

          // XP System Calculation
          const xpGained = (total_score * 10) + 50;
          try {
            const userDoc = await firestore.getDocument("users", auth.userId);
            if (userDoc) {
              const currentXp = (Number(userDoc.xp) || 0) + xpGained;
              
              // Progressive Level Calculation
              const currentLevel = userDoc.level || 1;
              const newLevel = Math.floor((1 + Math.sqrt(1 + 4 * (currentXp / 1000))) / 2);

              const updates: any = { xp: currentXp };
              if (newLevel > currentLevel) {
                updates.level = newLevel;
              }
              await firestore.updateDocument("users", auth.userId, updates);
              
              // Add to examResult for frontend display
              examResult.xpGained = xpGained;
              examResult.newTotalXp = currentXp;
              examResult.levelUp = newLevel > currentLevel ? newLevel : null;
            }
          } catch(e) {
            console.error("Failed to update user XP:", e);
          }

          return json({ success: true, data: examResult }, { status: 201 });
        }

        // /api/rankings/me
        if (url.pathname === "/api/rankings/me" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const seasons = await firestore.runQuery({ from: [{ collectionId: "seasons" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } }, limit: 1 });
          if (seasons.length === 0) return json({ success: true, data: { total_score: 0, exams_taken: 0 } });
          const activeSeasonId = seasons[0].id;
          
          const rankingId = `${activeSeasonId}_${auth.userId}`;
          const ranking = await firestore.getDocument("rankings", rankingId);
          return json({ success: true, data: ranking || { total_score: 0, exams_taken: 0 } });
        }

        // /api/rankings
        if (url.pathname === "/api/rankings" && request.method === "GET") {
          const seasons = await firestore.runQuery({ from: [{ collectionId: "seasons" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } }, limit: 1 });
          if (seasons.length === 0) return json({ success: true, data: [] });
          const activeSeasonId = seasons[0].id;
          
          const cacheKey = `rankings_${activeSeasonId}`;
          let rankings = getCache(cacheKey);
          if (!rankings) {
            rankings = await firestore.runQuery({ 
              from: [{ collectionId: "rankings" }], 
              where: { fieldFilter: { field: { fieldPath: "season_id" }, op: "EQUAL", value: { stringValue: activeSeasonId } } },
              orderBy: [{ field: { fieldPath: "total_score" }, direction: "DESCENDING" }], 
              limit: 50 
            });
            // Fetch users for rankings
            for (const r of rankings) {
              const u = await firestore.getDocument("users", String(r.user_id));
              if (u) {
                r.user_name = u.display_name;
                r.user_avatar = u.avatar;
              }
            }
            setCache(cacheKey, rankings, 5 * 60 * 1000); // cache 5 min
          }
          return json({ success: true, data: rankings });
        }

        // /api/exams/history
        if (url.pathname === "/api/exams/history" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          try {
            const results = await firestore.runQuery({
              from: [{ collectionId: "exam_results" }],
              where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
            });

            // Sort in JavaScript to avoid composite index requirements
            results.sort((a: any, b: any) => {
              const tA = a.taken_at ? new Date(a.taken_at).getTime() : 0;
              const tB = b.taken_at ? new Date(b.taken_at).getTime() : 0;
              return tB - tA;
            });

            return json({ success: true, data: results });
          } catch (e) {
            return json({ success: false, data: [] });
          }
        }

        // Handled below in catch-all stats section
        // if (url.pathname === "/api/users/stats/radar") return json({ success: true, data: [] });
        // if (url.pathname === "/api/users/stats/heatmap") return json({ success: true, data: [] });
        if (url.pathname === "/api/reports" && request.method === "POST") {
            try {
                const body = await readJson(request) as any;
                const auth = await requireAuthUserId(request, env);
                const userId = ("error" in auth) ? 'anonymous' : auth.userId;
                
                const ticket_id = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const ticketData = {
                    id: ticket_id,
                    ticket_id: ticket_id,
                    subject: `แจ้งปัญหาข้อสอบ: ${body?.question_id}`,
                    description: body?.reason || 'No reason provided',
                    category: 'content',
                    status: 'open',
                    user_id: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                await firestore.createDocument("tickets", ticketData);
                return json({ success: true, message: "Report submitted successfully" });
            } catch (e) {
                return json({ success: false, message: "Failed to submit report" }, { status: 500 });
            }
        }

        const bookmarksMatch = url.pathname.match(/^\/api\/bookmarks(?:\/([a-zA-Z0-9_-]+))?$/);
        if (bookmarksMatch) {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;

            if (request.method === "GET") {
                const bookmarks = await firestore.runQuery({
                    from: [{ collectionId: "bookmarks" }],
                    where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
                });
                bookmarks.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                return json({ success: true, data: bookmarks });
            }

            if (request.method === "POST") {
                try {
                    const body = await request.json() as any;
                    const { target_type, target_id, title } = body;
                    
                    if (!target_type || !target_id) {
                        return json({ success: false, message: "Missing required fields" }, { status: 400 });
                    }

                    const existing = await firestore.runQuery({
                        from: [{ collectionId: "bookmarks" }],
                        where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
                    });

                    if (existing && existing.some((b: any) => String(b.target_id) === String(target_id) && b.target_type === target_type)) {
                        return json({ success: false, message: "Already bookmarked" }, { status: 400 });
                    }

                    const bookmark = await firestore.createDocument("bookmarks", {
                        user_id: auth.userId,
                        target_type,
                        target_id: String(target_id),
                        title: title ? String(title).substring(0, 200) : 'Untitled',
                        created_at: new Date().toISOString()
                    });

                    return json({ success: true, data: bookmark });
                } catch (e: any) {
                    return json({ success: false, message: e.message || "Internal Error", stack: e.stack }, { status: 500 });
                }
            }

            if (request.method === "DELETE" && bookmarksMatch[1]) {
                const bookmarkId = bookmarksMatch[1];
                const bookmark = await firestore.getDocument("bookmarks", bookmarkId);
                if (!bookmark) return notFound();
                if (bookmark.user_id !== auth.userId) {
                    return json({ success: false, message: "Unauthorized" }, { status: 403 });
                }
                
                await firestore.deleteDocument("bookmarks", bookmarkId);
                return json({ success: true });
            }
        }

        if (url.pathname.startsWith("/api/chat")) {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const myId = auth.userId;

          if (url.pathname === "/api/chat/unread-count" && request.method === "GET") {
              const received = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "receiver_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              const unreadCount = received.filter((m: any) => !m.is_read).length;
              return json({ success: true, data: { unread: unreadCount } });
          }

          if (url.pathname === "/api/chat/inbox/conversations" && request.method === "GET") {
              const sent = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "sender_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              const received = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "receiver_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              
              const allMsgs = [...sent, ...received];
              const convsMap = new Map();
              for (const m of allMsgs) {
                  const friendId = m.sender_id === myId ? m.receiver_id : m.sender_id;
                  const current = convsMap.get(friendId);
                  const mDate = new Date(m.created_at).getTime();
                  if (!current || mDate > new Date(current.created_at).getTime()) {
                      convsMap.set(friendId, m);
                  }
              }

              const conversations = await Promise.all(Array.from(convsMap.entries()).map(async ([friendId, lastMessage]) => {
                  const friendDoc = await firestore.getDocument("users", friendId);
                  const isRead = lastMessage.sender_id === myId || lastMessage.is_read;
                  return {
                      friend: friendDoc ? { id: friendId, display_name: friendDoc.display_name, avatar: friendDoc.avatar } : { id: friendId, display_name: 'Unknown User' },
                      lastMessage,
                      isRead
                  };
              }));

              conversations.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
              return json({ success: true, data: conversations });
          }
          
          if (url.pathname === "/api/chat/send" && request.method === "POST") {
              const body = await readJson(request) as any;
              if (!body.friendId || !body.message) return json({ success: false, message: "Missing fields" }, { status: 400 });
              
              const newMsg = await firestore.createDocument("messages", {
                  sender_id: myId,
                  receiver_id: body.friendId,
                  content: body.message,
                  is_read: false,
                  created_at: new Date().toISOString()
              });
              return json({ success: true, data: newMsg });
          }
          
          if (url.pathname === "/api/chat/read" && request.method === "POST") {
              const body = await readJson(request) as any;
              const friendId = body.friendId;
              const received = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "receiver_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              const unreadFromFriend = received.filter((m: any) => m.sender_id === friendId && !m.is_read);
              
              for (const m of unreadFromFriend) {
                  await firestore.updateDocument("messages", m.id, { is_read: true });
              }
              return json({ success: true });
          }

          const chatMatch = url.pathname.match(/^\/api\/chat\/([a-zA-Z0-9_-]+)$/);
          if (chatMatch && request.method === "GET") {
              const friendId = chatMatch[1];
              const sent = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "sender_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              const received = await firestore.runQuery({ from: [{ collectionId: "messages" }], where: { fieldFilter: { field: { fieldPath: "receiver_id" }, op: "EQUAL", value: { stringValue: myId } } } });
              
              const chatHistory = [...sent.filter((m: any) => m.receiver_id === friendId), ...received.filter((m: any) => m.sender_id === friendId)];
              chatHistory.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              
              return json({ success: true, data: chatHistory });
          }
        }

        // Notifications
        if (url.pathname.startsWith("/api/notifications")) {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const myId = auth.userId;

            if (url.pathname === "/api/notifications" && request.method === "GET") {
                const limitStr = url.searchParams.get("limit") || "50";
                const notifications = await firestore.runQuery({
                    from: [{ collectionId: "notifications" }],
                    where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: myId } } },
                });
                // Sort descending manually (or through firestore query if supported)
                notifications.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                return json({ success: true, data: notifications.slice(0, parseInt(limitStr, 10)) });
            }

            if (url.pathname === "/api/notifications/unread-count" && request.method === "GET") {
                const notifications = await firestore.runQuery({
                    from: [{ collectionId: "notifications" }],
                    where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: myId } } }
                });
                const unreadCount = notifications.filter((n: any) => !n.is_read).length;
                return json({ success: true, data: { unread: unreadCount } });
            }

            if (url.pathname === "/api/notifications/read" && request.method === "POST") {
                const body = await readJson(request) as any;
                if (body.id) {
                    await firestore.updateDocument("notifications", body.id, { is_read: true });
                } else {
                    // Mark all as read
                    const notifications = await firestore.runQuery({
                        from: [{ collectionId: "notifications" }],
                        where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: myId } } }
                    });
                    const unread = notifications.filter((n: any) => !n.is_read);
                    for (const n of unread) {
                        await firestore.updateDocument("notifications", n.id, { is_read: true });
                    }
                }
                return json({ success: true });
            }
        }

        // /api/community/threads (GET)
        if (url.pathname === "/api/community/threads" && request.method === "GET") {
          const category = url.searchParams.get("category");
          const search = url.searchParams.get("search");
          const limitStr = url.searchParams.get("limit") || "10";
          const limit = parseInt(limitStr, 10);
          
          let query: any = { 
            from: [{ collectionId: "threads" }],
            orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
            limit: { value: limit } // FirestoreREST limit expects integer or object? The struct is usually { value: limit } for Protobuf Int32Value. 
            // Wait, firestore REST API `limit` is just an integer in the query object!
          };
          query.limit = limit;

          const filters: any[] = [];
          if (category && category !== "all" && category !== "undefined" && category !== "null") {
            filters.push({ fieldFilter: { field: { fieldPath: "category" }, op: "EQUAL", value: { stringValue: category } } });
          }
          if (filters.length === 1) {
            query.where = filters[0];
          } else if (filters.length > 1) {
            query.where = { compositeFilter: { op: "AND", filters } };
          }

          let allThreads = await firestore.runQuery(query);
          
          // Client-side search filtering
          if (search && search !== "undefined") {
             const searchLower = search.toLowerCase();
             allThreads = allThreads.filter((t: any) => {
               if (t.title && t.title.toLowerCase().includes(searchLower)) return true;
               if (t.tags && Array.isArray(t.tags) && t.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))) return true;
               return false;
             });
          }

          // Fetch authors for threads
          const userIds = [...new Set(allThreads.map((t: any) => t.user_id).filter(Boolean))];
          const usersMap = new Map();
          for (let i = 0; i < userIds.length; i += 30) {
            const chunk = userIds.slice(i, i + 30);
            const userPromises = chunk.map(id => firestore.getDocument("users", String(id)));
            const users = await Promise.all(userPromises);
            for (const u of users) {
              if (u && u.id) usersMap.set(String(u.id), u);
            }
          }

          allThreads = allThreads.map((t: any) => {
            const u = usersMap.get(String(t.user_id));
            if (u) {
              t.User = {
                id: u.id,
                display_name: u.display_name || "Unknown User",
                avatar: u.avatar || null,
                plan_type: u.plan_type || "free"
              };
            } else {
              t.User = { id: t.user_id, display_name: "Unknown User" };
            }
            if (!t.stats) {
              t.stats = { views: t.views || 0, likes: t.likes || 0, comments_count: 0 };
            }
            return t;
          });

          let nextCursor = null;
          if (allThreads.length > 0) {
             nextCursor = allThreads[allThreads.length - 1].id;
          }

          return json({ success: true, threads: allThreads, nextCursor });
        }

        // /api/community/threads (POST)
        if (url.pathname === "/api/community/threads" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const body: any = await readJson(request);
          if (!body || !body.title) {
            return json({ success: false, error: "Title is required" }, { status: 400 });
          }

          const threadData = {
            user_id: auth.userId,
            title: body.title,
            content: body.content || "",
            category: body.category || "general",
            background_style: body.background_style || null,
            tags: body.tags || [],
            image_url: body.image_base64 || null,
            likes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };

          const created = await firestore.createDocument("threads", threadData);
          return json({ success: true, data: created }, { status: 201 });
        }

        // /api/exams/:id
        const examIdMatch = url.pathname.match(/^\/api\/exams\/([a-zA-Z0-9_-]+)$/);
        if (examIdMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const result = await firestore.getDocument("exam_results", examIdMatch[1]);
          if (!result) return json({ success: false, message: "Result not found" }, { status: 404 });

          return json({ success: true, data: result });
        }

        // /api/community/threads/:id (GET)
        const threadIdMatch = url.pathname.match(/^\/api\/community\/threads\/([a-zA-Z0-9_-]+)$/);
        if (threadIdMatch && request.method === "GET") {
          const threadDoc = await firestore.getDocument("threads", threadIdMatch[1]);
          if (!threadDoc) return notFound();
          
          if (!threadDoc.stats) threadDoc.stats = { views: threadDoc.views || 0, likes: threadDoc.likes || 0, comments_count: 0 };
          
          const u = await firestore.getDocument("users", String(threadDoc.user_id));
          if (u) {
            threadDoc.User = { id: u.id, display_name: u.display_name || "Unknown User", avatar: u.avatar || null, plan_type: u.plan_type || "free" };
          }
          
          return json(threadDoc); // Note: frontend expects raw thread data here
        }

        // /api/community/threads/user/:userId (GET)
        const userThreadsMatch = url.pathname.match(/^\/api\/community\/threads\/user\/([a-zA-Z0-9_-]+)$/);
        if (userThreadsMatch && request.method === "GET") {
          const userId = userThreadsMatch[1];
          const threads = await firestore.runQuery({
            from: [{ collectionId: "threads" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "user_id" },
                op: "EQUAL",
                value: { stringValue: userId }
              }
            }
          });
          threads.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return json({ success: true, data: threads });
        }

        // /api/community/threads/:id (DELETE)
        if (threadIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const threadDoc = await firestore.getDocument("threads", threadIdMatch[1]);
          if (!threadDoc) return notFound();
          
          if (threadDoc.user_id !== auth.userId) {
              return json({ success: false, message: "Unauthorized" }, { status: 403 });
          }
          
          await firestore.deleteDocument("threads", threadIdMatch[1]);
          return json({ success: true });
        }

        // /api/community/comments/:threadId (GET)
        const commentsMatch = url.pathname.match(/^\/api\/community\/comments\/([a-zA-Z0-9_-]+)$/);
        if (commentsMatch && request.method === "GET") {
          const threadId = commentsMatch[1];
          // Fetch comments
          let comments = await firestore.runQuery({
            from: [{ collectionId: "comments" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "thread_id" },
                op: "EQUAL",
                value: { stringValue: threadId }
              }
            }
          });
          
          // Fetch users for comments
          const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
          const usersMap = new Map();
          for (let i = 0; i < userIds.length; i += 30) {
            const chunk = userIds.slice(i, i + 30);
            const userPromises = chunk.map(id => firestore.getDocument("users", String(id)));
            const users = await Promise.all(userPromises);
            for (const u of users) {
              if (u && u.id) usersMap.set(String(u.id), u);
            }
          }
          
          comments = comments.map((c: any) => {
            const u = usersMap.get(String(c.user_id));
            if (u) {
              c.User = { id: u.id, display_name: u.display_name || "Unknown User", avatar: u.avatar || null, plan_type: u.plan_type || "free" };
            } else {
              c.User = { id: c.user_id, display_name: "Unknown User" };
            }
            c.likes = c.likes || 0;
            return c;
          });
          
          return json(comments); // Raw array
        }

        // /api/community/comments (POST)
        if (url.pathname === "/api/community/comments" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const body = (await request.json()) as any;
          const commentData = {
             thread_id: body.thread_id,
             content: body.content,
             parent_id: body.parent_id || null,
             user_id: auth.userId,
             likes: 0,
             created_at: new Date().toISOString(),
             updated_at: new Date().toISOString()
          };
          
          const created = await firestore.createDocument("comments", commentData);
          
          return json({ success: true, data: created });
        }
        
        // /api/community/comments/:id/like (POST)
        const commentLikeMatch = url.pathname.match(/^\/api\/community\/comments\/([a-zA-Z0-9_-]+)\/like$/);
        if (commentLikeMatch && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const commentId = commentLikeMatch[1];
          const comment = await firestore.getDocument("comments", commentId);
          if (!comment) return notFound();
          
          const currentLikes = comment.likes || 0;
          await firestore.updateDocument("comments", commentId, { likes: currentLikes + 1 });
          
          return json({ success: true, likes: currentLikes + 1 });
        }

        // /api/news
        if (url.pathname === "/api/news" && request.method === "GET") {
          try {
            const agency = url.searchParams.get("agency");
            const search = url.searchParams.get("search");
            const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 100").all();
            const news = results.map((r: any) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
            const category = url.searchParams.get("category");
            let filteredNews = news.filter((n: any) => n.status !== 'expired');
            if (category && category !== 'undefined') {
                if (category === '!งานราชการ') {
                    filteredNews = filteredNews.filter((n: any) => n.category !== 'งานราชการ');
                } else {
                    filteredNews = filteredNews.filter((n: any) => n.category === category);
                }
            }
            const ministry = url.searchParams.get('ministry');
            if (ministry && ministry !== 'undefined') {
                filteredNews = filteredNews.filter((n: any) => ((n.metadata && n.metadata.ministry) || "ไม่ระบุกระทรวง") === ministry);
            }
            if (agency && agency !== 'undefined') {
                filteredNews = filteredNews.filter((n: any) => ((n.metadata && n.metadata.department) || n.agency || "ไม่ระบุกรม") === agency);
            }
            if (search && search !== 'undefined') {
                const sLower = search.toLowerCase();
                filteredNews = filteredNews.filter((n: any) => n.title?.toLowerCase().includes(sLower) || n.summary?.toLowerCase().includes(sLower));
            }
            filteredNews.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
            return json({ success: true, data: filteredNews });
          } catch(e) {
            return json({ success: true, data: [] });
          }
        }

        if (url.pathname === "/api/news" && request.method === "POST") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const body = await readJson(request) as any;
            if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
            body.created_at = new Date().toISOString();
            body.updated_at = new Date().toISOString();
            body.views = 0;
            
            const metadataStr = body.metadata ? JSON.stringify(body.metadata) : null;
            await env.DB.prepare(`
                INSERT INTO news (id, title, content, category, agency, author, external_link, status, application_start, application_end, metadata, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                body.id || crypto.randomUUID(), body.title || '', body.content || '', body.category || '', body.agency || '', body.author || '',
                body.external_link || '', body.status || 'active', body.application_start || '', body.application_end || '', metadataStr,
                body.created_at, body.updated_at
            ).run();
            
            return json({ success: true, data: body });
        }

        // /api/news/agency-stats
        if (url.pathname === "/api/news/agency-stats" && request.method === "GET") {
            try {
                const typeFilter = url.searchParams.get("type");
                const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 100").all();
                const news = results.map((r: any) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
                const govNews = news.filter((n: any) => n.category === "งานราชการ" && n.status !== "expired");
                const statsMap: any = {};
                
                let countCivil = 0;
                let countEmployee = 0;
                let countOther = 0;
                
                govNews.forEach((job: any) => {
                    const ministry = (job.metadata && job.metadata.ministry) || "ไม่ระบุกระทรวง";
                    const department = (job.metadata && job.metadata.department) || job.agency || "ไม่ระบุกรม";
                    
                    let jobCount = (job.metadata && job.metadata.vacancy_count) ? parseInt(job.metadata.vacancy_count) : 1;
                    if (isNaN(jobCount)) jobCount = 1;
                    const pType = (job.metadata && job.metadata.position_type) || job.recruitment_type || "";
                    const isCivil = pType.includes("ข้าราชการ");
                    const isEmployee = pType.includes("พนักงานราชการ");
                    const isOther = !isCivil && !isEmployee;

                    if (isCivil) countCivil += jobCount;
                    else if (isEmployee) countEmployee += jobCount;
                    else countOther += jobCount;

                    if (typeFilter === 'civil' && !isCivil) return;
                    if (typeFilter === 'employee' && !isEmployee) return;
                    if (typeFilter === 'other' && !isOther) return;
                    
                    if (!statsMap[ministry]) {
                        statsMap[ministry] = { ministry, departments: {} };
                    }
                    
                    const jobDate = job.published_date || job.created_at || new Date().toISOString();
                    
                    if (!statsMap[ministry].departments[department]) {
                        statsMap[ministry].departments[department] = { department, count: 0, logo: (job.metadata && job.metadata.agency_logo) || null, lastUpdated: jobDate };
                    } else {
                        const currDate = statsMap[ministry].departments[department].lastUpdated;
                        if (new Date(jobDate) > new Date(currDate)) {
                            statsMap[ministry].departments[department].lastUpdated = jobDate;
                        }
                    }
                    statsMap[ministry].departments[department].count += jobCount;
                });
                
                const formattedStats = Object.values(statsMap).map((m: any) => {
                    const depts = Object.values(m.departments) as any[];
                    const latestDate = depts.reduce((latest, d) => {
                        return (!latest || new Date(d.lastUpdated) > new Date(latest)) ? d.lastUpdated : latest;
                    }, null);
                    return {
                        ministry: m.ministry,
                        logo: depts.find((d: any) => d.logo)?.logo || null,
                        totalCount: depts.reduce((sum: any, d: any) => sum + d.count, 0),
                        lastUpdated: latestDate,
                        departments: depts.sort((a: any, b: any) => b.count - a.count)
                    };
                }).sort((a: any, b: any) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
                
                return json({ 
                    success: true, 
                    data: formattedStats,
                    jobTypes: { civil: countCivil, employee: countEmployee, other: countOther }
                });
            } catch (e) {
                return json({ success: false, data: [] });
            }
        }

        const ocscJobMatch = url.pathname.match(/^\/api\/news\/ocsc-job\/(\d+)$/);
        if (ocscJobMatch && request.method === "GET") {
            try {
                const id = ocscJobMatch[1];
                const response = await fetch(`https://jobapp.ocsc.go.th/jobapi/portal/jobs/${id}`);
                if (!response.ok) {
                    return json({ success: false, message: "failed_to_fetch_ocsc" }, { status: response.status });
                }
                const data = await response.json();
                return json({ success: true, data });
            } catch (e) {
                return json({ success: false, message: "error" }, { status: 500 });
            }
        }

        const newsIdMatch = url.pathname.match(/^\/api\/news\/([a-zA-Z0-9_-]+)$/);
        if (newsIdMatch && request.method === "GET") {
            try {
                const id = newsIdMatch[1];
                const doc: any = await env.DB.prepare("SELECT * FROM news WHERE id = ?").bind(id).first();
                if (!doc) return json({ success: false, message: "not_found" }, { status: 404 });
                doc.is_featured = doc.is_featured === 1;
                return json({ success: true, data: doc });
            } catch (e) {
                return json({ success: false, message: "error" }, { status: 500 });
            }
        }

        if (newsIdMatch && request.method === "PUT") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsIdMatch[1];
            const body = await readJson(request) as any;
            body.updated_at = new Date().toISOString();
            
            const sets: string[] = [];
            const values: any[] = [];
            for (const key in body) {
                sets.push(`${key} = ?`);
                values.push(typeof body[key] === "boolean" ? (body[key] ? 1 : 0) : body[key]);
            }
            if (sets.length > 0) {
                values.push(id);
                await env.DB.prepare(`UPDATE news SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
            }
            return json({ success: true, data: body });
        }

        if (newsIdMatch && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsIdMatch[1];
            await env.DB.prepare("DELETE FROM news WHERE id = ?").bind(id).run();
            return json({ success: true, message: "Deleted" });
        }

        const newsFeatureMatch = url.pathname.match(/^\/api\/news\/([a-zA-Z0-9_-]+)\/feature$/);
        if (newsFeatureMatch && request.method === "PUT") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsFeatureMatch[1];
            const item: any = await env.DB.prepare("SELECT is_featured FROM news WHERE id = ?").bind(id).first();
            if (!item) return json({ success: false, message: "Not found" }, { status: 404 });
            const newFeatureStatus = item.is_featured === 1 ? 0 : 1;
            await env.DB.prepare("UPDATE news SET is_featured = ? WHERE id = ?").bind(newFeatureStatus, id).run();
            return json({ success: true, data: { is_featured: newFeatureStatus === 1 } });
        }

        if (url.pathname === "/api/news/scrape" && request.method === "POST") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const body = await readJson(request) as any;
            const targetUrl = body?.url || "";
            
            let scrapeData: any = {
                title: "ข้อมูลดึงอัตโนมัติ",
                summary: "ดึงเนื้อหาจาก " + targetUrl,
                agency: "อ้างอิงจาก URL",
                external_link: targetUrl,
                metadata: {
                    announcement_url: targetUrl
                }
            };
            
            const ocscNewsMatch = targetUrl.match(/job\.ocsc\.go\.th\/portal\/news\/(\d+)/);
            if (ocscNewsMatch) {
                try {
                    const id = ocscNewsMatch[1];
                    const response = await fetch(`https://jobapp.ocsc.go.th/jobapi/portal/pressreleases/${id}`);
                    if (response.ok) {
                        const data = await response.json() as any;
                        if (data.headline) scrapeData.title = data.headline;
                        if (data.text1 || data.text2) {
                             const rawHtml = (data.text1 || "") + "\n" + (data.text2 || "");
                             scrapeData.summary = rawHtml
                                 .replace(/<br\s*[\/]?>/gi, '\n')
                                 .replace(/<\/p>/gi, '\n\n')
                                 .replace(/<\/h[1-6]>/gi, '\n\n')
                                 .replace(/<\/li>/gi, '\n')
                                 .replace(/<li>/gi, '- ')
                                 .replace(/<[^>]+>/g, '')
                                 .replace(/\n\s*\n/g, '\n\n')
                                 .trim();
                        }
                        scrapeData.agency = "สำนักงาน ก.พ.";
                        
                        if (data.image1) {
                             scrapeData.image_url = data.image1.startsWith("http") ? data.image1 : `https://job.ocsc.go.th/upload2/${data.image1}`;
                        } else if (data.banner) {
                             scrapeData.image_url = data.banner.startsWith("http") ? data.banner : `https://job.ocsc.go.th/upload2/${data.banner}`;
                        }
                    }
                } catch (e) {
                    // Ignore errors, return default
                }
            }

            return json({ success: true, data: scrapeData });
        }


        // /api/news/agency-stats (duplicate route, updated)
        if (url.pathname === "/api/news/agency-stats" && request.method === "GET") {
          try {
            const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 50").all();
            const news = results.map((r: any) => ({ ...r, metadata: r.metadata ? JSON.parse(r.metadata) : null }));
            const agencies = new Map();
            news.forEach((item: any) => {
              const agency = item.agency || (item.metadata && item.metadata.organization);
              if (agency) {
                  agencies.set(agency, (agencies.get(agency) || 0) + 1);
              }
            });
            const stats = Array.from(agencies.entries()).map(([name, count]) => ({ name, job_count: count }));
            return json({ success: true, data: stats });
          } catch(e) {
            return json({ success: true, data: [] });
          }
        }

        // /api/news/popular-keywords
        if (url.pathname === "/api/news/popular-keywords" && request.method === "GET") {
            return json({ success: true, data: [] });
        }

        // /api/news/sources/all
        if (url.pathname === "/api/news/sources/all" && request.method === "GET") {
            try {
              const sources = await firestore.runQuery({ from: [{ collectionId: "news_sources" }] });
              return json({ success: true, data: sources });
            } catch(e) {
              return json({ success: true, data: [] });
            }
        }



        // /api/scraper/jobs
        if (url.pathname === "/api/scraper/jobs" && request.method === "POST") {
            const body = await readJson(request);
            if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
            
            // Check API Key
            const apiKey = request.headers.get("x-api-key");
            if (apiKey !== "dev_scraper_key") {
                return json({ success: false, message: "Unauthorized" }, { status: 401 });
            }

            const jobData: any = body;
            const id = crypto.randomUUID();
            jobData.created_at = new Date().toISOString();
            jobData.published_at = new Date().toISOString();
            
            await env.DB.prepare(`
                INSERT INTO news (id, title, url, source, source_name, category, sub_category, tags, is_featured, views, application_start, application_end, status, created_at, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                id,
                jobData.title || '',
                jobData.url || '',
                jobData.source || 'scraper',
                jobData.source_name || '',
                jobData.category || 'งานราชการ',
                jobData.sub_category || '',
                jobData.tags ? JSON.stringify(jobData.tags) : '[]',
                jobData.is_featured ? 1 : 0,
                jobData.views || 0,
                jobData.application_start || null,
                jobData.application_end || null,
                jobData.status || 'open',
                jobData.created_at,
                jobData.published_at
            ).run();
            
            return json({ success: true, data: { ...jobData, id } });
        }

        // /api/ads/serve
        const adsServeMatch = url.pathname.match(/^\/api\/ads\/serve/);
        if (adsServeMatch && request.method === "GET") {
            // We just return served: false to force fallback House Ads on frontend
            return json({ success: true, served: false });
        }

        // /api/ads/admin/config
        if (url.pathname === "/api/ads/admin/config" && request.method === "GET") {
            return json({ 
                success: true, 
                houseAdTitle: "เตรียมสอบ ก.พ. ผ่านฉลุย",
                houseAdDescription: "เข้ากลุ่มติวฟรี แจกข้อสอบแม่นๆ ติวเตอร์อันดับ 1",
                houseAdImage: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60",
                houseAdUrl: "/lobby"
            });
        }

        // User Profile & Settings
        if (url.pathname === "/api/users/profile" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const user = await firestore.getDocument("users", auth.userId);
            return json({ success: true, data: sanitizeUser(user) });
        }

        if (url.pathname === "/api/users/profile" && request.method === "PUT") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const body = await readJson(request) as any;
            if (!body || !body.username) return json({ success: false, message: "Username is required" }, { status: 400 });
            
            const updates = {
                display_name: String(body.username).trim(),
                updated_at: new Date().toISOString()
            };
            await firestore.updateDocument("users", auth.userId, updates);
            
            const updatedUser = await firestore.getDocument("users", auth.userId);
            return json({ success: true, data: sanitizeUser(updatedUser) });
        }

        if (url.pathname === "/api/users/profile" && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            await firestore.deleteDocument("users", auth.userId);
            return json({ success: true, message: "Account deleted successfully" });
        }

        if (url.pathname === "/api/users/settings" && request.method === "PUT") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const body = await readJson(request) as any;
            if (!body) return json({ success: false, message: "Invalid payload" }, { status: 400 });

            const updates = {
                settings_friends_online: !!body.friends_online,
                settings_streak_reminder: !!body.streak_reminder,
                settings_new_message: !!body.new_message,
                updated_at: new Date().toISOString()
            };
            await firestore.updateDocument("users", auth.userId, updates);
            
            const updatedUser = await firestore.getDocument("users", auth.userId);
            return json({ success: true, data: sanitizeUser(updatedUser) });
        }

        // Stub missing routes to prevent 404 crashes
        if (url.pathname === "/api/users/stats" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          try {
            const results = await firestore.runQuery({
              from: [{ collectionId: "exam_results" }],
              where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
            });

            const totalExams = results.length;
            const totalScore = results.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0);
            const totalQuestions = results.reduce((acc: number, curr: any) => acc + (Number(curr.total_score) || 0), 0);
            const timeTaken = results.reduce((acc: number, curr: any) => acc + (Number(curr.time_taken) || 0), 0);

            const gamesWon = results.filter((r: any) => {
              const sc = Number(r.score) || 0;
              const ts = Number(r.total_score) || 10;
              return sc >= ts * 0.8;
            }).length;

            const accuracy = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
            const avgAnswerTime = totalQuestions > 0 ? (timeTaken / totalQuestions).toFixed(1) : "0";
            
            const uniqueDays = new Set(results.map((r: any) => r.taken_at?.split('T')[0]).filter(Boolean)).size;

            return json({
              success: true,
              data: {
                totalExams,
                totalQuestions,
                totalScore,
                timeTaken,
                gamesWon,
                accuracy,
                avgAnswerTime,
                badgesEarned: 0,
                friendsCount: 0,
                daysActive: uniqueDays
              }
            });
          } catch (e) {
            return json({ success: false, message: "Server error" }, { status: 500 });
          }
        }

        // /api/users/stats/heatmap
        if (url.pathname === "/api/users/stats/heatmap" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const urlObj = new URL(request.url);
          const periodStr = urlObj.searchParams.get("period");
          const period = periodStr === "all" ? 9999 : parseInt(periodStr || "7", 10);
          
          try {
            const results = await firestore.runQuery({
              from: [{ collectionId: "exam_results" }],
              where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
            });
            
            const now = new Date();
            const cutoff = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);
            
            // Map dates to counts
            const dateCounts: Record<string, number> = {};
            
            results.forEach((r: any) => {
              if (r.taken_at) {
                const dateObj = new Date(r.taken_at);
                if (dateObj >= cutoff) {
                  const dateStr = r.taken_at.split('T')[0];
                  dateCounts[dateStr] = (dateCounts[dateStr] || 0) + 1;
                }
              }
            });
            
            // Generate array for the last X days to fill missing dates with 0
            const heatmapData = [];
            const daysToGenerate = period === 9999 ? 365 : period; // Max 1 year for 'all'
            
            for (let i = daysToGenerate - 1; i >= 0; i--) {
              const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
              const dateStr = d.toISOString().split('T')[0];
              heatmapData.push({
                date: dateStr,
                value: dateCounts[dateStr] || 0
              });
            }

            return json({ success: true, data: heatmapData });
          } catch (e) {
            return json({ success: false, message: "Server error" }, { status: 500 });
          }
        }

        // /api/users/stats/radar
        if (url.pathname === "/api/users/stats/radar" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          try {
            const results = await firestore.runQuery({
              from: [{ collectionId: "exam_results" }],
              where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
            });
            
            const subjectStats: Record<string, { score: number, full: number }> = {};
            
            results.forEach((r: any) => {
              try {
                if (r.subject_scores && typeof r.subject_scores === 'object') {
                  Object.keys(r.subject_scores).forEach(subj => {
                    if (!subjectStats[subj]) subjectStats[subj] = { score: 0, full: 0 };
                    subjectStats[subj].score += Number(r.subject_scores[subj]) || 0;
                  });
                }
                
                if (r.questions && Array.isArray(r.questions)) {
                  r.questions.forEach((q: any) => {
                     if (q && typeof q === 'object' && q.subject) {
                       if (!subjectStats[q.subject]) subjectStats[q.subject] = { score: 0, full: 0 };
                       subjectStats[q.subject].full += 1;
                     }
                  });
                }
              } catch (innerError) {
                console.error("Radar aggregation error for result", r, innerError);
              }
            });
            
            const radarData = Object.keys(subjectStats).map(subj => {
               const stat = subjectStats[subj];
               const fullMark = Math.max(stat.full, 1);
               const percentage = Math.round((stat.score / fullMark) * 100);
               return {
                 subject: subj,
                 score: percentage,
                 fullMark: 100
               };
            });

            return json({ success: true, data: radarData });
          } catch (e) {
            return json({ success: false, message: "Server error" }, { status: 500 });
          }
        }
        // --- FRIENDS API ---
        if (url.pathname.startsWith("/api/friends")) {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const myId = auth.userId;
          

          if (url.pathname === "/api/friends/request" && request.method === "POST") {
             const body = await readJson(request) as any;
             const friendId = body.friendId;
             if (!friendId || friendId === myId) return json({ success: false, message: "Invalid friend ID" }, { status: 400 });
             
             const reqs = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "requester_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             
             const exists = reqs.find((r: any) => r.target_id === friendId) || tgts.find((r: any) => r.requester_id === friendId);
             
             if (exists) return json({ success: false, message: "Request already exists or already friends" }, { status: 400 });
             
             const newReq = await firestore.createDocument("friends", {
                 requester_id: myId,
                 target_id: friendId,
                 status: "pending",
                 created_at: new Date().toISOString()
             });
             return json({ success: true, data: newReq });
          }
          
          if (url.pathname === "/api/friends/accept" && request.method === "POST") {
             const body = await readJson(request) as any;
             const friendId = body.friendId;
             
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const req = tgts.find((r: any) => r.requester_id === friendId && r.status === "pending");
             
             if (!req) return json({ success: false, message: "Request not found" }, { status: 404 });
             
             await firestore.updateDocument("friends", req.id, { status: "accepted" });
             return json({ success: true });
          }
          
          const removeMatch = url.pathname.match(/^\/api\/friends\/remove\/(.+)$/);
          if (removeMatch && request.method === "DELETE") {
             const friendId = removeMatch[1];
             const reqs = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "requester_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             
             const toDelete = [
                 ...reqs.filter((r: any) => r.target_id === friendId),
                 ...tgts.filter((r: any) => r.requester_id === friendId)
             ];
             
             for (const doc of toDelete) {
                 await firestore.deleteDocument("friends", doc.id);
             }
             return json({ success: true });
          }
          
          if (url.pathname === "/api/friends/list" && request.method === "GET") {
             const reqs = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "requester_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             
             const friendsList = [
                 ...reqs.filter((r: any) => r.status === "accepted"),
                 ...tgts.filter((r: any) => r.status === "accepted")
             ];
             const friendIds = friendsList.map((f: any) => f.requester_id === myId ? f.target_id : f.requester_id);
             
             const friendProfiles = await Promise.all(friendIds.map(async (fid: string) => {
                 const doc = await firestore.getDocument("users", fid);
                 if (!doc) return null;
                 return { id: fid, display_name: doc.display_name, avatar: doc.avatar, level: doc.level };
             }));
             
             return json({ success: true, data: friendProfiles.filter(Boolean) });
          }
          
          if (url.pathname === "/api/friends/pending" && request.method === "GET") {
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const pendingList = tgts.filter((r: any) => r.status === "pending");
             
             const pendingProfiles = await Promise.all(pendingList.map(async (f: any) => {
                 const doc = await firestore.getDocument("users", f.requester_id);
                 if (!doc) return null;
                 return { id: f.requester_id, display_name: doc.display_name, avatar: doc.avatar, level: doc.level, request_id: f.id };
             }));
             
             return json({ success: true, data: pendingProfiles.filter(Boolean) });
          }
          
          const checkMatch = url.pathname.match(/^\/api\/friends\/check\/(.+)$/);
          if (checkMatch && request.method === "GET") {
             const friendId = checkMatch[1];
             const reqs = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "requester_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             const tgts = await firestore.runQuery({ from: [{ collectionId: "friends" }], where: { fieldFilter: { field: { fieldPath: "target_id" }, op: "EQUAL", value: { stringValue: myId } } } });
             
             const r1 = reqs.find((r: any) => r.target_id === friendId);
             const r2 = tgts.find((r: any) => r.requester_id === friendId);
             
             if (r1) {
                 return json({ success: true, status: r1.status === "accepted" ? "friends" : "sent" });
             } else if (r2) {
                 return json({ success: true, status: r2.status === "accepted" ? "friends" : "received" });
             } else {
                 return json({ success: true, status: "none" });
             }
          }
          
          return json({ success: false, message: "Not found in friends API" }, { status: 404 });
        }

        // /api/users/claim-streak
        if (url.pathname === "/api/users/claim-streak" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          try {
            const userDoc = await firestore.getDocument("users", auth.userId);
            if (!userDoc) return json({ success: false, message: "User not found" }, { status: 404 });

            const now = new Date();
            const todayStr = now.toISOString().split("T")[0];
            
            const lastClaimDateStr = userDoc.last_claim_date;
            
            if (lastClaimDateStr === todayStr) {
              return json({ success: false, message: "Already claimed today", data: { xpGained: 0 } });
            }

            let newStreak = 1;
            if (lastClaimDateStr) {
              const yesterday = new Date(now);
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split("T")[0];
              
              if (lastClaimDateStr === yesterdayStr) {
                newStreak = (Number(userDoc.streak_count) || 0) + 1;
              }
            }

            const xpGained = (newStreak % 7 === 0) ? 100 : 10;
            const currentXp = (Number(userDoc.xp) || 0) + xpGained;
            const currentLevel = userDoc.level || 1;
            const newLevel = Math.floor((1 + Math.sqrt(1 + 4 * (currentXp / 1000))) / 2);

            const updates: any = {
              streak_count: newStreak,
              last_claim_date: todayStr,
              xp: currentXp
            };

            if (newLevel > currentLevel) {
              updates.level = newLevel;
            }

            await firestore.updateDocument("users", auth.userId, updates);

            return json({
              success: true,
              data: {
                xpGained,
                newStreak,
                newTotalXp: currentXp,
                levelUp: newLevel > currentLevel ? newLevel : null
              }
            });
          } catch (e) {
            return json({ success: false, message: "Server error" }, { status: 500 });
          }
        }
        
        if (url.pathname === "/api/payments/plans" && request.method === "GET") {
          try {
            const results = await firestore.runQuery({
              from: [{ collectionId: "payment_plans" }]
            });
            results.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
            return json({ success: true, plans: results });
          } catch (e) {
            return json({ success: false, plans: [] });
          }
        }

        if (url.pathname === "/api/payments/checkout" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          try {
            const body = await request.json();
            const { plan_id, payment_method } = body as any;
            
            const planDoc = await firestore.getDocument("payment_plans", plan_id);
            if (!planDoc) {
              return json({ success: false, message: "Plan not found" }, { status: 404 });
            }

            const transactionData = {
              id: crypto.randomUUID(),
              user_id: auth.userId,
              plan_id,
              amount: planDoc.price,
              payment_method: payment_method || 'transfer_slip',
              status: 'pending',
              type: 'subscription',
              created_at: new Date().toISOString()
            };

            await firestore.createDocument("transactions", transactionData, transactionData.id);

            return json({ success: true, transaction: transactionData });
          } catch (e: any) {
            return json({ success: false, message: e.message }, { status: 500 });
          }
        }

        const adminPlanMatch = url.pathname.match(/^\/api\/admin\/payments\/plans\/([^\/]+)$/);
        if (adminPlanMatch) {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const id = decodeURIComponent(adminPlanMatch[1]);
          if (request.method === "PUT") {
            const body = await request.json();
            await firestore.updateDocument("payment_plans", id, { ...(body as any), updated_at: new Date().toISOString() });
            return json({ success: true });
          }
          if (request.method === "DELETE") {
            await firestore.deleteDocument("payment_plans", id);
            return json({ success: true });
          }
        } else if (url.pathname === "/api/admin/payments/plans") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          if (request.method === "GET") {
            try {
              const results = await firestore.runQuery({ from: [{ collectionId: "payment_plans" }] });
              return json({ success: true, plans: results });
            } catch(e) {
              return json({ success: true, plans: [] });
            }
          }
          if (request.method === "POST") {
            const body = await request.json() as any;
            const id = crypto.randomUUID();
            const planData = { ...body, id, created_at: new Date().toISOString() };
            await firestore.createDocument("payment_plans", planData, id);
            return json({ success: true, plan: planData });
          }
        }

const assetMatch = url.pathname.match(/^\/api\/assets\/([^\/]+)$/);
if (assetMatch) {
  const id = decodeURIComponent(assetMatch[1]);
  if (request.method === "DELETE") {
    const auth = await requireAuthUserId(request, env);
    if ("error" in auth) return auth.error;
    await env.DB.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
    return json({ success: true });
  }
} else if (url.pathname === "/api/assets") {
  if (request.method === "GET") {
    try {
      const results = await env.DB.prepare("SELECT * FROM assets ORDER BY created_at DESC").all();
      const assetsList = results.results.map((r: any) => ({
        ...r,
        is_premium: r.is_premium === 1 || r.is_premium === true
      }));
      return json({ success: true, data: assetsList });
    } catch(e) {
      return json({ success: true, data: [] });
    }
  }
  if (request.method === "POST") {
    const auth = await requireAuthUserId(request, env);
    if ("error" in auth) return auth.error;
    const body = await request.json() as any;
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    
    await env.DB.prepare(
        "INSERT INTO assets (id, name, type, url, is_premium, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(
        id, body.name || '', body.type || '', body.url || '', body.is_premium ? 1 : 0, created_at
    ).run();

    return json({ success: true, data: { ...body, id, created_at } });
  }
} else if (url.pathname === "/api/migrate-assets" && request.method === "POST") {
    const auth = await requireAdmin(request, env);
    if ("error" in auth) return auth.error;
    
    try {
        const fbAssets = await firestore.runQuery({ from: [{ collectionId: "assets" }] });
        
        let imported = 0;
        const stmt = env.DB.prepare("INSERT OR REPLACE INTO assets (id, name, type, url, is_premium, created_at) VALUES (?, ?, ?, ?, ?, ?)");
        const batch = [];
        for (const item of fbAssets) {
            batch.push(stmt.bind(
                item.id || crypto.randomUUID(),
                item.name || '',
                item.type || '',
                item.url || '',
                item.is_premium ? 1 : 0,
                item.created_at || new Date().toISOString()
            ));
            imported++;
        }
        
        if (batch.length > 0) {
            await env.DB.batch(batch);
        }
        
        return json({ success: true, imported });
    } catch (e: any) {
        return json({ error: "Migrate failed: " + e.message }, { status: 500 });
    }
}

if (url.pathname === "/api/upload" && request.method === "POST") {
  const auth = await requireAuthUserId(request, env);
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) return json({ error: "No file provided" }, { status: 400 });

    const key = `${crypto.randomUUID()}-${file.name.replace(/\s+/g, '-')}`;
    await env.BUCKET.put(key, await file.arrayBuffer(), {
        httpMetadata: { contentType: file.type }
    });

    const publicUrl = `https://pub-a55d7fce531d45129ff228a0edcc7c89.r2.dev/${key}`; // Replace with your actual R2.dev or custom domain url
    
    return json({ success: true, key: key, url: publicUrl });
  } catch (e: any) {
    return json({ error: "Upload failed: " + e.message }, { status: 500 });
  }
}

if (url.pathname === "/api/proxy") {
  if (request.method === "GET") {
    const targetUrl = url.searchParams.get("url");
    if (!targetUrl) return json({ error: "Missing URL" }, { status: 400 });
    
    try {
      const response = await fetch(targetUrl);
      const data = await response.text();
      return new Response(data, {
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "*"
        }
      });
    } catch (e) {
      return json({ error: "Failed to fetch" }, { status: 500 });
    }
  }
}


if (url.pathname === "/api/admin/settings") {
  const auth = await requireAuthUserId(request, env);
  if ("error" in auth) return auth.error;
  if (request.method === "GET") {
    try {
      const row: any = await env.DB.prepare("SELECT value FROM system_config WHERE id = 'general_settings'").first();
      return json({ success: true, settings: row ? JSON.parse(row.value) : {} });
    } catch (e) {
      return json({ success: true, settings: {} });
    }
  }
  if (request.method === "PUT") {
    const body = await request.json() as any;
    const bodyStr = JSON.stringify(body);
    const existing: any = await env.DB.prepare("SELECT id FROM system_config WHERE id = 'general_settings'").first();
    if (existing) {
      await env.DB.prepare("UPDATE system_config SET value = ? WHERE id = 'general_settings'").bind(bodyStr).run();
    } else {
      await env.DB.prepare("INSERT INTO system_config (id, value) VALUES ('general_settings', ?)").bind(bodyStr).run();
    }
    return json({ success: true, settings: body });
  }
}

if (url.pathname === "/api/public/settings") {
  if (request.method === "GET") {
    try {
      const row: any = await env.DB.prepare("SELECT value FROM system_config WHERE id = 'general_settings'").first();
      return json({ success: true, settings: row ? JSON.parse(row.value) : {} });
    } catch (e) {
      return json({ success: true, settings: {} });
    }
  }
}

if (url.pathname === "/api/legal/policy") {
  if (request.method === "GET") {
    try {
      const row: any = await env.DB.prepare("SELECT value FROM system_config WHERE id = 'privacy_policy'").first();
      return json({ success: true, content: row ? JSON.parse(row.value).content : "" });
    } catch (e: any) {
      return json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
  }
  if (request.method === "PUT" || request.method === "POST") {
    try {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;
      const body: any = await request.json();
      const bodyStr = JSON.stringify({ content: body.content });
      const existing: any = await env.DB.prepare("SELECT id FROM system_config WHERE id = 'privacy_policy'").first();
      if (existing) {
        await env.DB.prepare("UPDATE system_config SET value = ? WHERE id = 'privacy_policy'").bind(bodyStr).run();
      } else {
        await env.DB.prepare("INSERT INTO system_config (id, value) VALUES ('privacy_policy', ?)").bind(bodyStr).run();
      }
      return json({ success: true, message: "Policy updated" });
    } catch (e: any) {
      return json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
  }
}
        if (url.pathname === "/api/groups") return json({ success: true, groups: [] });
        if (url.pathname === "/api/community/tags/trending") return json([]);
        const cleanPathname = url.pathname.replace(/\/$/, "");
        if (cleanPathname === "/api/business" && request.method === "GET") {
            try {
                const search = url.searchParams.get("search");
                const category = url.searchParams.get("category");

                let businesses = await firestore.runQuery({
                    from: [{ collectionId: "businesses" }],
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
                    limit: 50
                });

                if (category) {
                    businesses = businesses.filter((b: any) => b.category === category);
                }
                if (search) {
                    const searchLower = search.toLowerCase();
                    businesses = businesses.filter((b: any) => 
                        (b.name && b.name.toLowerCase().includes(searchLower)) || 
                        (b.tagline && b.tagline.toLowerCase().includes(searchLower))
                    );
                }

                return json({ success: true, businesses });
            } catch (err) {
                return json({ success: false, message: 'Error fetching businesses.', error: String(err) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/business/feed" && request.method === "GET") {
            try {
                // Fetch recent posts
                const posts = await firestore.runQuery({
                    from: [{ collectionId: "business_posts" }],
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
                    limit: 50
                });

                // Attach business details (name, logo_image)
                const businessIds = Array.from(new Set(posts.map((p: any) => p.business_id).filter(Boolean)));
                const businessesMap = new Map();
                for (const bid of businessIds) {
                    const b = await firestore.getDocument("businesses", String(bid));
                    if (b) businessesMap.set(String(bid), b);
                }

                const feed = posts.map((p: any) => {
                    const b = businessesMap.get(p.business_id);
                    return {
                        ...p,
                        business_name: b ? b.name : 'Unknown Business',
                        business_logo: b ? b.logo_image : null
                    };
                });

                return json({ success: true, feed });
            } catch (err) {
                return json({ success: true, feed: [] }); // Fallback to empty if table missing
            }
        }

        if (url.pathname === "/api/business/my-business" && request.method === "GET") {
            return json({ success: true, data: null });
        }
        if (url.pathname === "/api/business/my-business" && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                // Find the business owned by the user
                const businesses = await firestore.runQuery({
                    from: [{ collectionId: "businesses" }],
                    where: { compositeFilter: { op: "AND", filters: [{ fieldFilter: { field: { fieldPath: "owner_uid" }, op: "EQUAL", value: { stringValue: auth.userId } } }] } },
                    limit: 1
                });
                if (businesses && businesses.length > 0) {
                    await firestore.deleteDocument("businesses", businesses[0].id);
                }
                return json({ success: true, message: "Business page deleted" });
            } catch (err) {
                return json({ success: false, message: "Error deleting business", error: String(err) }, { status: 500 });
            }
        }
        if (url.pathname === "/api/ads/stats/daily-burn" && request.method === "GET") {
            return json([]);
        }
        if (url.pathname === "/api/ads/dashboard" && request.method === "GET") {
            return json({ activeAds: 0, totalViews: 0, totalClicks: 0, totalSpent: 0, dailyStats: [] });
        }
        if (url.pathname === "/api/ads/wallet" && request.method === "GET") {
            return json({ balance: 0, currency: 'THB', businessName: 'Business Name' });
        }
        if (url.pathname === "/api/business/inbox" && request.method === "GET") {
            return json({ success: true, conversations: [] }); // Inbox was new api shape
        }
        if (url.pathname === "/api/ads/my-ads" && request.method === "GET") {
            return json([]);
        }
        if (url.pathname === "/api/ads/wallet/transactions" && request.method === "GET") {
            return json([]);
        }

        if (url.pathname === "/api/business/posts" && request.method === "GET") {
            try {
                const businessId = url.searchParams.get("business_id");
                if (!businessId) return json({ success: false, message: 'business_id is required' }, { status: 400 });

                // Try fetching from business_posts collection, fallback to empty
                const posts = await firestore.runQuery({
                    from: [{ collectionId: "business_posts" }],
                    where: {
                        compositeFilter: {
                            op: "AND",
                            filters: [
                                { fieldFilter: { field: { fieldPath: "business_id" }, op: "EQUAL", value: { stringValue: businessId } } }
                            ]
                        }
                    },
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
                    limit: 50
                });

                return json({ success: true, posts });
            } catch (err) {
                // If collection doesn't exist or fails, return empty array
                return json({ success: true, posts: [] });
            }
        }

        const businessMatch = url.pathname.match(/^\/api\/business\/([a-zA-Z0-9_:-]+)$/);
        if (businessMatch && request.method === "GET") {
            try {
                const id = businessMatch[1];
                const business = await firestore.getDocument("businesses", id);
                if (!business) {
                    return json({ success: false, message: 'Business not found.' }, { status: 404 });
                }
                return json({ success: true, business });
            } catch (err) {
                return json({ success: false, message: 'Error fetching business.', error: String(err) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/users/leaderboard") return json({ success: true, leaderboard: [] });
        if (url.pathname === "/api/ads/admin/stats") return json({ totalRevenue: 0, activeSponsors: 0, totalViews: 0, revenueTrend: [] });
        if (url.pathname === "/api/ads/admin/sponsors") return json([]);
        if (url.pathname === "/api/ads/admin/pending") return json([]);
        if (url.pathname === "/api/ads/admin/config") return json({ communityViewCost: 0.1, communityClickCost: 5.0, newsViewCost: 0.15, newsClickCost: 6.0, resultViewCost: 0.2, resultClickCost: 8.0, inFeedFrequency: 10, adSenseBackupId: '', examResultSlotId: '', homeSlotId: '' });
        if (url.pathname === "/api/support/admin/tickets") {
            try {
                const results = await firestore.runQuery({
                    from: [{ collectionId: "tickets" }],
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }]
                });
                return json({ success: true, data: results });
            } catch (e) {
                return json({ success: false, data: [] });
            }
        }
        if (url.pathname === "/api/admin/backups") return json([]);
        if (url.pathname === "/api/admin/backups/logs") return json([]);
        if (url.pathname === "/api/admin/messages") return json([]);
        if (url.pathname === "/api/admin/reports") return json([]);
        if (url.pathname === "/api/support/tickets" && request.method === "POST") {
            try {
                const body = await readJson(request) as any;
                const auth = await requireAuthUserId(request, env);
                const userId = ("error" in auth) ? 'anonymous' : auth.userId;
                
                const ticket_id = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
                const ticketData = {
                    id: ticket_id,
                    ticket_id: ticket_id,
                    subject: body?.subject || 'แจ้งปัญหา',
                    description: body?.description || 'ไม่มีรายละเอียด',
                    category: body?.category || 'general',
                    status: 'open',
                    user_id: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                const created = await firestore.createDocument("tickets", ticketData);
                return json({ success: true, data: created });
            } catch (e) {
                return json({ success: false, message: "Failed to create ticket" }, { status: 500 });
            }
        }

        if (url.pathname === "/api/support/tickets/my" && request.method === "GET") {
            try {
                const auth = await requireAuthUserId(request, env);
                if ("error" in auth) return auth.error;
                
                const results = await firestore.runQuery({
                    from: [{ collectionId: "tickets" }],
                    where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: auth.userId } } }
                });
                
                results.sort((a: any, b: any) => {
                  const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
                  const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
                  return tB - tA;
                });
                
                return json({ success: true, data: results });
            } catch (e) {
                return json({ success: false, data: [] });
            }
        }

        const ticketMatch = url.pathname.match(/^\/api\/support\/tickets\/([a-zA-Z0-9_-]+)$/);
        if (ticketMatch && request.method === "GET") {
            try {
                const ticketId = ticketMatch[1];
                const ticket = await firestore.getDocument("tickets", ticketId);
                if (!ticket) return json({ success: false, message: "Ticket not found" }, { status: 404 });
                
                // Get messages for ticket
                const messages = await firestore.runQuery({
                    from: [{ collectionId: "messages" }],
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "ASCENDING" }]
                }, `tickets/${ticketId}`);
                
                ticket.messages = messages || [];
                return json({ success: true, data: ticket });
            } catch (e) {
                return json({ success: false, message: "Server error" }, { status: 500 });
            }
        }

        const ticketStatusMatch = url.pathname.match(/^\/api\/support\/tickets\/([a-zA-Z0-9_-]+)\/status$/);
        if (ticketStatusMatch && request.method === "PATCH") {
            try {
                const auth = await requireAuthUserId(request, env);
                if ("error" in auth) return auth.error;
                
                const ticketId = ticketStatusMatch[1];
                const body = await readJson(request) as any;
                
                await firestore.updateDocument("tickets", ticketId, {
                    status: body.status,
                    updated_at: new Date().toISOString()
                });
                
                return json({ success: true, message: "Status updated" });
            } catch (e) {
                return json({ success: false, message: "Failed to update status" }, { status: 500 });
            }
        }

        const ticketMessageMatch = url.pathname.match(/^\/api\/support\/tickets\/([a-zA-Z0-9_-]+)\/messages$/);
        if (ticketMessageMatch && request.method === "POST") {
            try {
                const auth = await requireAuthUserId(request, env);
                const userId = ("error" in auth) ? 'anonymous' : auth.userId;
                const ticketId = ticketMessageMatch[1];
                const body = await readJson(request) as any;
                
                const messageData = {
                    message: body.message,
                    user_id: userId,
                    is_admin: body.is_admin || body.is_internal_note || false,
                    is_internal_note: body.is_internal_note || false,
                    created_at: new Date().toISOString()
                };
                
                const created = await firestore.createDocument(`tickets/${ticketId}/messages`, messageData);
                
                // Update ticket updated_at
                await firestore.updateDocument("tickets", ticketId, {
                    updated_at: new Date().toISOString()
                });
                
                return json({ success: true, data: created });
            } catch (e) {
                console.error("Add message error:", e);
                return json({ success: false, message: "Failed to add message" }, { status: 500 });
            }
        }
        if (url.pathname === "/api/admin/payments") return json([]);
        if (url.pathname === "/api/admin/ads/pending") return json([]);
        if (url.pathname === "/api/news/sources/all") return json({ success: true, data: [] });
        if (url.pathname === "/api/assets") return json({ success: true, data: [] });

        // Admin and System Stubs / Simple Implementation
        if (url.pathname === "/api/admin/stats" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;

            try {
                // Use COUNT API for users to save Firestore Read Quota
                const totalUsers = await firestore.runCountQuery({ from: [{ collectionId: "users" }] });
                const premiumUsers = await firestore.runCountQuery({ 
                    from: [{ collectionId: "users" }],
                    where: { fieldFilter: { field: { fieldPath: "plan_type" }, op: "EQUAL", value: { stringValue: "premium" } } }
                });

                const now = new Date();
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);

                let realActiveUsers = Math.floor(totalUsers * 0.1); // Fallback
                try {
                    realActiveUsers = await firestore.runCountQuery({
                        from: [{ collectionId: "users" }],
                        where: {
                            fieldFilter: {
                                field: { fieldPath: "last_active_at" },
                                op: "GREATER_THAN_OR_EQUAL",
                                value: { stringValue: startOfDay.toISOString() }
                            }
                        }
                    });
                } catch (e) {
                    console.error("Error querying active users:", e);
                }

                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                // Fetch recent payments for trend map only (Limit to 200 to prevent massive reads)
                const payments = await firestore.runQuery({ from: [{ collectionId: "payments" }], limit: 200, orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }] });
                
                const trendMap: any = {};
                for (let i = 5; i >= 0; i--) {
                    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    const monthName = d.toLocaleString('default', { month: 'short' });
                    trendMap[`${d.getFullYear()}-${d.getMonth()}`] = { name: monthName, value: 0 };
                }

                payments.forEach((doc: any) => {
                    const amount = Number(doc.amount) || 0;
                    const status = (doc.status || 'unknown').toLowerCase();
                    let created_at = new Date();
                    if (doc.created_at) {
                        if (typeof doc.created_at === 'string') created_at = new Date(doc.created_at);
                        else if (doc.created_at._seconds) created_at = new Date(doc.created_at._seconds * 1000);
                    }

                    if (status === 'approved' || status === 'completed' || status === 'success') {
                        const key = `${created_at.getFullYear()}-${created_at.getMonth()}`;
                        if (trendMap[key]) {
                            trendMap[key].value += amount;
                        }
                    }
                });

                const startOfYear = new Date(currentYear, 0, 1).toISOString();
                const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
                const successStatuses = ["approved", "completed", "success"];

                const revenueQuery = async (statusOp: string, statusValue: any, dateStart?: string) => {
                    const filters: any[] = [];
                    if (Array.isArray(statusValue)) {
                        filters.push({ fieldFilter: { field: { fieldPath: "status" }, op: "IN", value: { arrayValue: { values: statusValue.map(v => ({ stringValue: v })) } } } });
                    } else {
                        filters.push({ fieldFilter: { field: { fieldPath: "status" }, op: statusOp, value: { stringValue: statusValue } } });
                    }
                    if (dateStart) {
                        filters.push({ fieldFilter: { field: { fieldPath: "created_at" }, op: "GREATER_THAN_OR_EQUAL", value: { stringValue: dateStart } } });
                    }
                    
                    const query = filters.length > 1 ? { compositeFilter: { op: "AND", filters } } : filters[0];
                    const aggregations = [{ alias: "total", sum: { field: { fieldPath: "amount" } } }];
                    
                    try {
                        const res = await firestore.runAggregationQuery({ from: [{ collectionId: "payments" }], where: query }, aggregations);
                        const val = res?.total?.integerValue || res?.total?.doubleValue || 0;
                        return Number(val);
                    } catch (e) {
                        return 0; // Fallback or missing index
                    }
                };

                const [pendingRevenue, totalRevenue, yearlyRevenue, monthlyRevenue] = await Promise.all([
                    revenueQuery("EQUAL", "pending"),
                    revenueQuery("IN", successStatuses),
                    revenueQuery("IN", successStatuses, startOfYear),
                    revenueQuery("IN", successStatuses, startOfMonth)
                ]);

                return json({
                    revenue: { 
                        total: totalRevenue, 
                        monthly: monthlyRevenue, 
                        yearly: yearlyRevenue, 
                        pending: pendingRevenue, 
                        trend: Object.values(trendMap) 
                    },
                    conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : 0,
                    activeUsers: realActiveUsers,
                    commercialViability: [
                        { name: 'Jan', value: 65 }, { name: 'Feb', value: 75 }, { name: 'Mar', value: 85 }
                    ],
                    painPoints: [
                        { subject: 'Math', score: 45 }, { subject: 'Physics', score: 55 }
                    ],
                    communityHealth: {
                        engagement: 85,
                        sentiment: 'Positive'
                    }
                });
            } catch (err: any) {
                console.error("Admin stats error:", err);
                // If we hit Firestore Quota (429) or other errors, return gracefully so the dashboard doesn't crash
                return json({ 
                    revenue: { total: 0, monthly: 0, yearly: 0, pending: 0, trend: [] },
                    conversionRate: 0,
                    activeUsers: 0,
                    commercialViability: [],
                    painPoints: [],
                    communityHealth: { engagement: 0, sentiment: 'Neutral' },
                    error: "failed to fetch stats", 
                    details: err.message 
                });
            }
        }
        const adminUserLogsMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/logs$/);
        if (adminUserLogsMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userId = adminUserLogsMatch[1];

          const fetchLogs = async (value: any) => {
            return firestore.runQuery({
              from: [{ collectionId: "system_logs" }],
              where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value } },
              orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
              limit: 10
            }).catch(async () => {
              const allLogs = await firestore.runQuery({
                from: [{ collectionId: "system_logs" }],
                where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value } },
                limit: 50
              });
              allLogs.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
              return allLogs.slice(0, 10);
            });
          };

          const logsA = await fetchLogs({ stringValue: userId });
          const numericId = /^[0-9]+$/.test(userId) ? userId : null;
          const logsB = numericId ? await fetchLogs({ integerValue: numericId }) : [];

          const merged = new Map<string, any>();
          for (const l of [...logsA, ...logsB]) {
            const key = String((l as any).doc_id || (l as any).id || "");
            if (!key) continue;
            merged.set(key, l);
          }
          const logs = Array.from(merged.values()).sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10);
          
          return json({ success: true, logs });
        }

        const adminUserHistoryMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/history$/);
        if (adminUserHistoryMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const id = adminUserHistoryMatch[1];
          const userDoc = await firestore.getDocument("users", id);
          if (!userDoc) return json({ message: "User not found" }, { status: 404 });
          const examHistory = await firestore.runQuery({ from: [{ collectionId: "exam_results" }], where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: id } } }, limit: 20 });
          const paymentHistory = await firestore.runQuery({ from: [{ collectionId: "payments" }], where: { fieldFilter: { field: { fieldPath: "user_id" }, op: "EQUAL", value: { stringValue: id } } }, limit: 10 });
          return json({ success: true, user: userDoc, examHistory, paymentHistory });
        }

        const adminUserStatusMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/status$/);
        if (adminUserStatusMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await firestore.updateDocument("users", adminUserStatusMatch[1], { status: body.status });
          return json({ success: true });
        }

        const adminUserPermMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/permissions$/);
        if (adminUserPermMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await firestore.updateDocument("users", adminUserPermMatch[1], { admin_permissions: body.permissions });
          return json({ success: true });
        }

        const adminUserUpdateMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)$/);
        if (adminUserUpdateMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await firestore.updateDocument("users", adminUserUpdateMatch[1], body);
          return json({ success: true });
        }

        if (url.pathname === "/api/admin/messages" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            try {
                const messages = await firestore.runQuery({
                    from: [{ collectionId: "contact_messages" }],
                    orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }],
                    limit: 50
                });
                
                const formattedMessages = messages.map((doc: any) => ({
                    id: doc.id,
                    type: doc.type || (doc.user_id ? 'User' : 'Visitor'),
                    subject: doc.subject || 'No Subject',
                    from: doc.email || doc.name || 'Unknown',
                    content: doc.message || doc.content || '',
                    is_read: doc.is_read || false,
                    created_at: doc.created_at
                }));
                return json(formattedMessages);
            } catch (e: any) {
                // If missing index, fetch without order
                try {
                    const messages = await firestore.runQuery({
                        from: [{ collectionId: "contact_messages" }],
                        limit: 50
                    });
                    const formattedMessages = messages.map((doc: any) => ({
                        id: doc.id,
                        type: doc.type || (doc.user_id ? 'User' : 'Visitor'),
                        subject: doc.subject || 'No Subject',
                        from: doc.email || doc.name || 'Unknown',
                        content: doc.message || doc.content || '',
                        is_read: doc.is_read || false,
                        created_at: doc.created_at
                    }));
                    return json(formattedMessages.sort((a: any, b: any) => {
                        const aSec = a.created_at?._seconds || 0;
                        const bSec = b.created_at?._seconds || 0;
                        return bSec - aSec;
                    }));
                } catch (err) {
                    return json({ error: "failed to fetch messages" }, { status: 500 });
                }
            }
        }

        if (url.pathname === "/api/admin/messages/broadcast" && request.method === "POST") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            return json({ success: true, message: 'Broadcast sent' });
        }

        if (url.pathname === "/api/admin/users" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const users = await firestore.runQuery({ from: [{ collectionId: "users" }], orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }], limit: 100 });
          return json(users);
        }

        if (url.pathname === "/api/admin/seasons" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          try {
            const seasons = await firestore.runQuery({ from: [{ collectionId: "seasons" }], orderBy: [{ field: { fieldPath: "start_date" }, direction: "DESCENDING" }] });
            return json({ success: true, data: seasons });
          } catch(e) {
            // If the collection doesn't exist or missing index, return empty array
            return json({ success: true, data: [] });
          }
        }

        if (url.pathname === "/api/admin/seasons" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = (await readJson(request)) as any;
          
          // Deactivate all old seasons
          const oldSeasons = await firestore.runQuery({ from: [{ collectionId: "seasons" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "active" } } } });
          for (const s of oldSeasons) {
            await firestore.updateDocument("seasons", s.id, { status: "completed", end_date: new Date().toISOString() });
          }

          const id = body.id || String(new Date().getFullYear());
          const newSeason = await firestore.createDocument("seasons", {
            name: body.name || `Season ${id}`,
            start_date: new Date().toISOString(),
            status: "active",
            responsible_admin_id: body.responsible_admin_id || auth.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, id);
          
          return json({ success: true, data: newSeason });
        }

        const seasonMatch = url.pathname.match(/^\/api\/admin\/seasons\/([a-zA-Z0-9_-]+)$/);
        if (seasonMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const id = seasonMatch[1];
          const body = (await readJson(request)) as any;
          await firestore.updateDocument("seasons", id, { ...body, updated_at: new Date().toISOString() });
          return json({ success: true });
        }
        if (url.pathname === "/api/admin/businesses" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const businesses = await firestore.runQuery({ from: [{ collectionId: "businesses" }], limit: 100 });
          businesses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          return json(businesses);
        }
        if (url.pathname === "/api/admin/payments" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const payments = await firestore.runQuery({ from: [{ collectionId: "payments" }], orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }], limit: 100 });
          return json(payments);
        }
        if (url.pathname === "/api/admin/threads" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const threads = await firestore.runQuery({ from: [{ collectionId: "threads" }], orderBy: [{ field: { fieldPath: "created_at" }, direction: "DESCENDING" }], limit: 100 });
          return json({ threads, pagination: { page: 1, totalPages: 1, total: threads.length } });
        }
        if (url.pathname === "/api/admin/migrate-news" && request.method === "POST") {
            const auth = await requireAdmin(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                // Fetch from Firestore
                const firestoreNews = await firestore.runQuery({ from: [{ collectionId: "news" }], limit: 5000 });
                if (!firestoreNews || firestoreNews.length === 0) {
                    return json({ success: true, message: "No news found in Firestore to migrate." });
                }

                // Batch insert to D1
                const stmt = env.DB.prepare(`
                    INSERT OR IGNORE INTO news (id, title, content, category, agency, author, external_link, status, application_start, application_end, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);
                
                const batch = firestoreNews.map((doc: any) => stmt.bind(
                    doc.id || crypto.randomUUID(),
                    doc.title || '',
                    doc.content || '',
                    doc.category || '',
                    doc.agency || '',
                    doc.author || '',
                    doc.external_link || '',
                    doc.status || 'active',
                    doc.application_start || '',
                    doc.application_end || '',
                    doc.metadata ? JSON.stringify(doc.metadata) : null,
                    doc.created_at || new Date().toISOString(),
                    doc.updated_at || new Date().toISOString()
                ));
                
                await env.DB.batch(batch);
                return json({ success: true, message: `Migrated ${firestoreNews.length} news items to D1.` });
            } catch (error: any) {
                return json({ success: false, message: error.message }, { status: 500 });
            }
        }
        if (url.pathname === "/api/admin/scraper/start" && request.method === "POST") {
            mockScraperRunning = true;
            const addLog = (msg: string) => {
                const now = new Date().toLocaleString("en-GB", { timeZone: "Asia/Bangkok" });
                mockScraperLogs.push(`[${now}] ${msg}`);
            };
            mockScraperLogs = [];
            addLog('[System] Initiating Real OCSC Scraper job...');
            addLog('[System] Connecting to data source (job.ocsc.go.th)...');
            
            const runScraper = async () => {
                try {
                    addLog('[Network] Fetching latest announcements from OCSC...');
                    
                    // target the real JSON API from OCSC instead of the HTML page
                    const targetUrl = "https://jobapp.ocsc.go.th/jobapi/portal/jobs";
                    console.log("Fetching URL:", targetUrl);
                    const res = await fetch(targetUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                        }
                    });
                    
                    if (!res.ok) {
                        addLog(`[Error] OCSC API returned status ${res.status}.`);
                        mockScraperRunning = false;
                        return;
                    }

                    const jsonResponse = await res.json();
                    addLog('[Data] Parsing JSON elements...');
                    
                    if (!Array.isArray(jsonResponse) || jsonResponse.length === 0) {
                        console.log("Warning: No jobs found or API structure changed.");
                        addLog('[Warning] No jobs found or API structure changed.');
                        mockScraperRunning = false;
                        return;
                    }

                    let parsedJobs = [];
                    for (const item of jsonResponse) {
                        parsedJobs.push({
                            id: item.id,
                            category: 'งานราชการ', // Force this category
                            position: item.position,
                            department: item.department,
                            ministry: item.ministry,
                            recruitment_type: item.jobCategoryId === 1 ? 'ข้าราชการพลเรือน' : 'พนักงานราชการ',
                            agency_logo: item.seal,
                            location: item.address,
                            vacancy_count: item.positionAmount,
                            start_date: item.applicationStartPrint,
                            end_date: item.applicationEndPrint,
                            vacancy: item.positionAmount ? `${item.positionAmount} อัตรา` : 'ไม่ระบุ'
                        });
                    }

                    addLog(`[Data] Extracted ${parsedJobs.length} jobs. Checking for duplicates in Database...`);
                    
                    let addedCount = 0;
                    let skipCount = 0;

                    // Fetch all existing OCSC links to avoid N+1 queries
                    const { results } = await env.DB.prepare("SELECT external_link FROM news WHERE author = 'ระบบอัตโนมัติ (OCSC)'").all();
                    const existingLinks = new Set(results.map((j: any) => j.external_link).filter(Boolean));

                    const newDocs = [];

                    for (const job of parsedJobs) {
                        const externalLink = "https://job.ocsc.go.th/portal/jobs/" + job.id;
                        
                        if (existingLinks.has(externalLink)) {
                            skipCount++;
                            continue;
                        }

                        const newDoc = {
                            id: crypto.randomUUID(),
                            title: job.position,
                            content: `รับสมัคร ${job.vacancy}`,
                            category: job.category,
                            agency: job.department,
                            author: "ระบบอัตโนมัติ (OCSC)",
                            external_link: externalLink,
                            status: "published",
                            application_start: job.start_date,
                            application_end: job.end_date,
                            metadata: {
                                ministry: job.ministry,
                                department: job.department,
                                organization: job.department,
                                position_type: job.recruitment_type,
                                agency_logo: job.agency_logo,
                                location: job.location,
                                vacancy_count: job.vacancy_count
                            },
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        };

                        newDocs.push(newDoc);
                        existingLinks.add(externalLink); // Prevent dupes within the same run
                    }
                    
                    if (newDocs.length > 0) {
                        addLog(`[System] Batch inserting ${newDocs.length} new jobs...`);
                        const stmt = env.DB.prepare(`
                            INSERT INTO news (id, title, content, category, agency, author, external_link, status, application_start, application_end, metadata, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `);
                        
                        const batch = newDocs.map((doc: any) => stmt.bind(
                            doc.id, doc.title, doc.content, doc.category, doc.agency, doc.author, doc.external_link,
                            doc.status, doc.application_start, doc.application_end, JSON.stringify(doc.metadata),
                            doc.created_at, doc.updated_at
                        ));
                        
                        await env.DB.batch(batch);
                        addedCount = newDocs.length;
                    }
                    
                    console.log(`Saved ${addedCount} new announcements. Skipped ${skipCount} duplicates.`);
                    addLog(`[Data] Saved ${addedCount} new announcements. Skipped ${skipCount} duplicates.`);
                    mockScraperRunning = false;
                    addLog('[System] Scraper job completed successfully.');
                } catch (e) {
                    console.error("Scraper Error Caught:", e);
                    addLog('[Error] Failed to process scraper job: ' + String(e));
                    mockScraperRunning = false;
                }
            };
            
            // Start in background without awaiting
            ctx.waitUntil(runScraper());

            return json({ success: true, message: "Scraper started" });
        }
        if (url.pathname === "/api/admin/scraper/status") {
            return json({ success: true, data: { isRunning: mockScraperRunning, logs: mockScraperLogs } });
        }
        if (url.pathname === "/api/admin/scraper/schedule" && request.method === "POST") {
            const body = await request.json() as any;
            return json({ success: true, message: 'Schedule updated to ' + (body.frequency || 'unknown') });
        }
        
        if (url.pathname === "/api/admin/generator/start" && request.method === "POST") {
            if (aiGeneratorState.isRunning) {
                return json({ success: false, message: "Generator is already running" }, { status: 400 });
            }
            
            const prompt = "สร้างข้อสอบแบบสุ่ม 10 ข้อ"; // Default prompt for the generic start button
            ctx.waitUntil(runAIGenerator(prompt, env));
            return json({ success: true, message: "Generator started" });
        }
        if (url.pathname === "/api/admin/generator/status") {
            let statusDoc = { isRunning: aiGeneratorState.isRunning, logs: aiGeneratorState.logs };
            try {
                const config = parseServiceAccount(env);
                if (config) {
                    const firestore = new FirestoreClient(config);
                    const doc = await firestore.getDocument("system", "generator_status");
                    if (doc) {
                        statusDoc = doc;
                    }
                }
            } catch (e) {}
            return json({ success: true, data: statusDoc });
        }
        if (url.pathname === "/api/terminal/status") return json({ status: 'online' });
        if (url.pathname === "/api/terminal/command" && request.method === "POST") {
            const body = await request.json() as any;
            const cmd = body.command?.trim() || "";
            
            if (cmd === "status") {
                return json({ message: ">>> Status: Ready (Active Provider: Google Gemini)" });
            }
            
            if (cmd.startsWith("gen ")) {
                if (aiGeneratorState.isRunning) {
                    return json({ message: ">>> Error: Generator is already running. Please wait." });
                }
                const prompt = cmd.substring(4).trim();
                ctx.waitUntil(runAIGenerator(prompt, env));
                return json({ message: `>>> Initiating AI generation for prompt: "${prompt}"... Check the status panel for progress.` });
            }
            
            return json({ message: `>>> Unknown command: ${cmd}` });
        }

        if (url.pathname === "/api/admin/jobs/cleanup" && request.method === "POST") {
            const result = await cleanupExpiredJobs(env);
            return json({ success: true, count: result });
        }


      } catch (err: any) {
        return json({ success: false, message: err.message }, { status: 500 });
      }
    }

    return fetch(request);
  },
  
  async scheduled(event: any, env: Env, ctx: ExecutionContext) {
    console.log("Running scheduled job cleanup at", new Date().toISOString());
    await cleanupExpiredJobs(env);
    await cleanupExpiredRooms(env);
  }
};

async function cleanupExpiredJobs(env: Env) {
    const config = parseServiceAccount(env);
    if (!config) return 0;
    const firestore = new FirestoreClient(config);
    
    // Helper to parse Thai date e.g. "15 มิ.ย. 2569"
    const parseThaiDate = (dateStr: string) => {
        if (!dateStr) return null;
        const parts = dateStr.split(' ');
        if (parts.length < 3) return null;
        const day = parseInt(parts[0], 10);
        const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const monthIndex = months.findIndex(m => parts[1].includes(m));
        if (monthIndex === -1) return null;
        let year = parseInt(parts[2], 10);
        if (year > 2500) year -= 543;
        
        const d = new Date();
        d.setFullYear(year, monthIndex, day);
        d.setHours(23, 59, 59, 999);
        return d;
    };
    
    try {
        const news = await env.DB.prepare("SELECT * FROM news LIMIT 50").all();
        const now = new Date();
        let expiredCount = 0;
        
        for (const job of news.results as any[]) {
            if (job.category === "งานราชการ" && job.status !== "expired" && job.application_end) {
                const endD = parseThaiDate(job.application_end);
                if (endD && endD < now) {
                    await env.DB.prepare("UPDATE news SET status = 'expired' WHERE id = ?").bind(job.id).run();
                    expiredCount++;
                }
            }
        }
        console.log(`Job cleanup completed. Marked ${expiredCount} jobs as expired.`);
        return expiredCount;
    } catch (e) {
        console.error("Scheduled job cleanup failed", e);
        return 0;
    }
}

async function cleanupExpiredRooms(env: Env) {
    const config = parseServiceAccount(env);
    if (!config) return 0;
    const firestore = new FirestoreClient(config);
    try {
        const rooms = await firestore.runQuery({ from: [{ collectionId: "exam_rooms" }], limit: 1000 });
        const now = new Date().getTime();
        let deletedCount = 0;
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        for (const room of rooms) {
            const createdAt = new Date(String(room.created_at || room.updated_at || Date.now())).getTime();
            if (now - createdAt > oneDayMs) {
                const participants = await firestore.listDocuments(`exam_rooms/${room.id}/participants`);
                for (const p of participants) {
                    await firestore.deleteDocument(`exam_rooms/${room.id}/participants`, p.id);
                }
                await firestore.deleteDocument("exam_rooms", room.id);
                deletedCount++;
            }
        }
        console.log(`Room cleanup completed. Deleted ${deletedCount} expired rooms.`);
        return deletedCount;
    } catch (e) {
        console.error("Scheduled room cleanup failed", e);
        return 0;
    }
}
