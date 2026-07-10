import Stripe from "stripe";
import { RealtimeDO, type Env } from "./realtime";
import { requireUserId, signJwtHs256 } from "./auth";
import { hashPassword, verifyPassword } from "./password";
import { aiGeneratorState, runAIGenerator } from "./generator";
import {
  createAsset,
  createBookmark,
  createBusiness,
  createComment,
  createDirectMessage,
  completeActiveSeasons,
  createExamResult,
  createExamRoom,
  createNews,
  createPaymentPlan,
  createSeason,
  createSystemLog,
  createThread,
  createTicket,
  createTicketMessage,
  createTransaction,
  createUser,
  createQuestion,
  deleteExamRoom,
  deleteNews,
  deleteQuestion,
  deleteUser,
  adminListUserQuestions,
  adminUpdateUserQuestion,
  adminDeleteUserQuestion,
  deleteAsset,
  deleteBookmark,
  deleteBusiness,
  deleteFriend,
  deletePaymentPlan,
  deleteThread,
  findExamRoomByCode,
  getActiveSeason,
  getBookmarkById,
  getBusinessById,
  getBusinessByOwner,
  getCommentById,
  getExamResultById,
  getExamRoomById,
  getExamRoomParticipant,
  getNewsById,
  getPaymentPlanById,
  getQuestionById,
  getQuestionsByIds,
  getRankingById,
  getSeasonById,
  getSystemConfig,
  getThreadById,
  getTicketById,
  getUserByEmail,
  getUserById,
  listAllQuestions,
  listAssets,
  listBookmarksByUser,
  listBusinesses,
  listBusinessPosts,
  listCommentsByThread,
  listDirectMessagesForUser,
  listExamRoomParticipants,
  listExamResultsByUser,
  listExamRooms,
  listFriendsByUser,
  listNotificationsByUser,
  listPaymentPlans,
  listPayments,
  approvePayment,
  rejectPayment,
  listReceivedMessages,
  listRankingsBySeason,
  listSeasons,
  listThreads,
  listThreadsByUser,
  listTicketMessages,
  listTickets,
  listUsers,
  markAllNotificationsRead,
  markMessagesRead,
  markNotificationRead,
  resetExamRoomParticipants,
  touchUserLastActive,
  updateExamRoom,
  updateFriend,
  updateComment,
  updatePaymentPlan,
  updateQuestion,
  updateSeason,
  updateTicket,
  updateBusiness,
  toggleNewsFeatured,
  updateNews,
  updateUser,
  upsertSystemConfig,
  upsertRankingScore,
  upsertExamRoomParticipant,
  createFriendRequest,
  listUserQuestions,
  createUserQuestion,
  updateUserQuestion,
  deleteUserQuestion,
  getUserQuestionById,
  adminGetDashboardStats,
  adminGetPayments,
  adminApprovePayment,
  adminRejectPayment,
  adminGetUsers,
  adminUpdateUser,
  adminUpdateUserStatus,
  adminUpdateUserPermissions,
  getBusinessByOwner,
  createBusiness,
  updateBusiness,
  listBusinessAds,
  createAd,
  updateAd,
  deleteAd,
  listBusinessTransactions,
  listBookmarksByUser,
  createBookmark,
  deleteBookmark,
  createExamSet,
  updateExamSet,
  deleteExamSet,
  listExamSets,
  getUniqueCatalogs,
  getCatalogCounts,
  getArcadeGames,
  adminGetArcadeGames,
  adminCreateArcadeGame,
  adminUpdateArcadeGame,
  adminDeleteArcadeGame,
} from "./d1";

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
          await touchUserLastActive(env.DB, userId, new Date(now).toISOString());
      } catch (e) {
          console.error("Failed to update last active:", e);
      }
  }

  return { userId };
};

const requireAdmin = async (req: Request, env: Env) => {
  const auth = await requireAuthUserId(req, env);
  if ("error" in auth) return auth;
  const user = await getUserById(env.DB, auth.userId);
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
    premium_expiry: row.premium_expiry || null,
    status: row.status,
    guest_device_id: row.guest_device_id || null,
  };
};

const isGuestUser = (user: any) => {
  if (!user) return true;
  if (user.guest_device_id) return true;

  const email = typeof user.email === "string" ? user.email.toLowerCase() : "";
  return email.startsWith("guest_");
};

const isPremiumUser = (user: any) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.plan_type !== "premium") return false;

  if (!user.premium_expiry) return true;

  const expiryDate = new Date(user.premium_expiry);
  if (Number.isNaN(expiryDate.getTime())) return true;

  return expiryDate > new Date();
};

const getUserFeatures = (user: any) => {
  const featureSources = [
    user?.features,
    user?.plan_features,
    user?.package_features,
    user?.payment_plan_features,
  ];

  return featureSources.find(Array.isArray) || [];
};

const hasPackageFeature = (user: any, featureKey: string) => {
  return getUserFeatures(user).includes(featureKey);
};

const canCreateRooms = (user: any) => {
  if (!user) return false;
  if (!isGuestUser(user)) return true;

  return isPremiumUser(user) || hasPackageFeature(user, "create_rooms");
};

const normalizeQuestion = (q: any) => {
  if (!q) return q;
  const parsedChoices =
    typeof q.choices === "string"
      ? (() => {
          try {
            return JSON.parse(q.choices);
          } catch {
            return null;
          }
        })()
      : q.choices && typeof q.choices === "object"
        ? q.choices
        : null;

  const normalized = {
    ...q,
    choice_a: q.choice_a ?? parsedChoices?.A ?? "",
    choice_b: q.choice_b ?? parsedChoices?.B ?? "",
    choice_c: q.choice_c ?? parsedChoices?.C ?? "",
    choice_d: q.choice_d ?? parsedChoices?.D ?? "",
    choices: parsedChoices ?? q.choices ?? { A: "", B: "", C: "", D: "" },
  };

  const ans = String(normalized.correct_answer || "").trim();
  const lowerAns = ans.toLowerCase();
  if (lowerAns === "a" || lowerAns === "b" || lowerAns === "c" || lowerAns === "d") {
    return { ...normalized, correct_answer: ans.toUpperCase() };
  }
  
  let mapped = ans;
  if (lowerAns === String(normalized.choice_a || "").trim().toLowerCase()) mapped = "A";
  else if (lowerAns === String(normalized.choice_b || "").trim().toLowerCase()) mapped = "B";
  else if (lowerAns === String(normalized.choice_c || "").trim().toLowerCase()) mapped = "C";
  else if (lowerAns === String(normalized.choice_d || "").trim().toLowerCase()) mapped = "D";
  
  return { ...normalized, correct_answer: mapped.toUpperCase() };
};

const parseRoomSettings = (room: any) => {
  const raw = room?.settings;
  if (raw && typeof raw === "object") return { ...raw };
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return {};
};

const createEmptyAnswerCounts = () => ({ A: 0, B: 0, C: 0, D: 0 });

const createTutorState = (settings: any = {}) => ({
  current_question_index: Number(settings?.tutor_state?.current_question_index ?? 0),
  is_answer_revealed: Boolean(settings?.tutor_state?.is_answer_revealed ?? false),
  answer_counts: {
    ...createEmptyAnswerCounts(),
    ...(settings?.tutor_state?.answer_counts || {}),
  },
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    
        if ((url.pathname === "/api/webhooks/stripe" || url.pathname === "/api/payments/webhook") && request.method === "POST") {
          if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
             return new Response("Webhook error: Stripe secrets not configured", { status: 400 });
          }
          
          const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
            apiVersion: "2024-04-10" as any
          });
          
          const signature = request.headers.get("stripe-signature");
          if (!signature) {
             return new Response("Webhook error: No signature", { status: 400 });
          }

          let event;
          try {
            const bodyText = await request.text();
            event = await stripe.webhooks.constructEventAsync(bodyText, signature, env.STRIPE_WEBHOOK_SECRET);
          } catch (err: any) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
          }

          if (event.type === 'checkout.session.completed') {
            const session = event.data.object as any;
            const metadata = session.metadata;

            let receiptUrl = null;
            try {
               if (session.payment_intent) {
                 const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
                 if (pi.latest_charge) {
                   const charge = await stripe.charges.retrieve(pi.latest_charge as string);
                   receiptUrl = charge.receipt_url;
                 }
               }
            } catch (err) {
               console.error("Error fetching receipt_url:", err);
            }

            if (metadata && metadata.userId) {
              const { userId, type, durationDays } = metadata;
              const days = parseInt(durationDays || '30', 10);
              
              if (type === 'subscription' || type === 'PLAN_PURCHASE') {
                 // Update premium status
                 const expiryDate = new Date();
                 expiryDate.setDate(expiryDate.getDate() + days);
                 await env.DB.prepare("UPDATE users SET plan_type = 'premium', premium_start_date = ?, premium_expiry = ? WHERE id = ?")
                   .bind(new Date().toISOString(), expiryDate.toISOString(), userId).run();
              }
              
              // Update transaction
              await env.DB.prepare("UPDATE transactions SET status = 'approved', updated_at = ?, receipt_url = ? WHERE session_id = ?")
                .bind(new Date().toISOString(), receiptUrl, session.id).run();
            }
          }
          return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

      if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        status: "healthy",
        services: {
          d1: "configured",
          jwt: env.JWT_SECRET ? "configured" : "missing_config",
        },
      });
    }

    if (url.pathname.startsWith("/api/ws") || url.pathname.startsWith("/api/realtime")) {
      const id = env.REALTIME.idFromName("global");
      const stub = env.REALTIME.get(id);
      return stub.fetch(request);
    }


    if (url.pathname === '/api/upload' && request.method === 'POST') {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      if (!env.BUCKET) return json({ error: 'R2 bucket not configured' }, { status: 500 });

      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') return json({ error: 'No file provided' }, { status: 400 });

        const extension = file.name.split('.').pop() || 'bin';
        const exactName = formData.get('exactName');
        const key = exactName && typeof exactName === 'string' 
            ? `uploads/${exactName}` 
            : `uploads/${Date.now()}-${crypto.randomUUID()}.${extension}`;

        await env.BUCKET.put(key, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' }
        });

        return json({ success: true, url: `/api/media/${encodeURIComponent(key)}` }, { status: 201 });
      } catch (err) {
        return json({ error: 'Upload failed', details: err.message }, { status: 500 });
      }
    }

    const mediaMatch = url.pathname.match(/^\/api\/media\/(.*)$/);
    if (mediaMatch && request.method === 'GET') {
      if (!env.BUCKET) return new Response('R2 bucket not configured', { status: 500 });

      const key = decodeURIComponent(mediaMatch[1]);
      const object = await env.BUCKET.get(key);

      if (object === null) return new Response('Not Found', { status: 404 });

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      headers.set('access-control-allow-origin', '*');

      return new Response(object.body, { headers });
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

      const existingUser = await getUserByEmail(env.DB, email);
      if (existingUser) return json({ success: false, message: "Email already in use" }, { status: 409 });

      const passwordHash = await hashPassword(password);
      const user = await createUser(env.DB, {
        email,
        password_hash: passwordHash,
        display_name: displayName,
        role: "user",
        plan_type: "free",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        country: (request.cf?.country as string) || "NO",
      });

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: user.id, exp }, secret);
      return json({ success: true, token, user: sanitizeUser(user) });
    }

    // /api/auth/guest
    if (url.pathname === "/api/auth/guest" && request.method === "POST") {
      const userAgent = request.headers.get("user-agent") || "";
      if (/bot|crawler|spider|crawling|lighthouse/i.test(userAgent)) {
        return json({ success: false, message: "Bots not allowed" }, { status: 403 });
      }

      const body = (await readJson(request)) as any;
      if (!body || !body.deviceId) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const deviceId = body.deviceId;
      const email = `guest_${deviceId}@preexam.com`;

      const existing = await getUserByEmail(env.DB, email);

      let user = existing;
      if (existing) {
        try { 
          await touchUserLastActive(env.DB, user.id, new Date().toISOString()); 
          user.last_active_at = new Date().toISOString(); 
        } catch(e){}
      } else {
        const shortId = deviceId.slice(-5) + Math.floor(100 + Math.random() * 900);
        user = await createUser(env.DB, {
          email,
          display_name: `Guest-${shortId}`,
          role: "user",
          plan_type: "free",
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
          country: (request.cf?.country as string) || "NO",
        });
      }

      const token = await signJwtHs256({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET || "default_secret");
      
      try {
        await createSystemLog(env.DB, {
          action: existing ? "SYS_GUEST_LOGIN" : "SYS_GUEST_CREATE",
          details: {
            type: "auto",
            ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
            user_agent: request.headers.get("user-agent") || "unknown",
          },
          user_id: user.id,
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

      let user = await getUserByEmail(env.DB, email);
      if (user) {
        const updates: any = { last_active_at: new Date().toISOString() };
        if (picture && user.avatar !== picture) {
          updates.avatar = picture;
        }
        try { 
          user = await updateUser(env.DB, user.id, updates); 
          user.last_active_at = updates.last_active_at; 
        } catch(e){}
      } else {
        user = await createUser(env.DB, {
          email,
          display_name: name,
          avatar: picture,
          role: "user",
          plan_type: "free",
          status: "active",
          last_active_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          country: (request.cf?.country as string) || "NO",
        });
      }

      const token = await signJwtHs256({ id: user.id, email: user.email, role: user.role }, env.JWT_SECRET || "default_secret");
      
      try {
        await createSystemLog(env.DB, {
          action: "SYS_GOOGLE_LOGIN",
          details: {
            type: "auto",
            google_id: googleId,
            ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
            user_agent: request.headers.get("user-agent") || "unknown",
          },
          user_id: user.id,
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

      const user = await getUserByEmail(env.DB, email);
      if (!user || !user.password_hash) return json({ success: false, message: "Invalid credentials" }, { status: 401 });
      const ok = await verifyPassword(password, String(user.password_hash));
      if (!ok) return json({ success: false, message: "Invalid credentials" }, { status: 401 });

      try { await touchUserLastActive(env.DB, user.id, new Date().toISOString()); user.last_active_at = new Date().toISOString(); } catch(e){}

      const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const token = await signJwtHs256({ id: user.id, exp }, secret);

      try {
        await createSystemLog(env.DB, {
          action: "SYS_EMAIL_LOGIN",
          details: {
            type: "auto",
            ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
            user_agent: request.headers.get("user-agent") || "unknown",
          },
          user_id: user.id,
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
      let user = await getUserByEmail(env.DB, email);
      if (!user) {
        const displayName = `Guest-${deviceId.slice(0, 6)}`;
        user = await createUser(env.DB, {
          email,
          password_hash: null,
          display_name: displayName,
          role: "user",
          plan_type: "free",
          status: "active",
          guest_device_id: deviceId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          country: (request.cf?.country as string) || "NO",
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

      const user = await getUserById(env.DB, userId);
      if (!user) return json({ success: false, message: "Unauthorized" }, { status: 401 });
      return json({ success: true, user: sanitizeUser(user) });
    }

    if (url.pathname === "/api/rooms" && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 20)));

      const recentRooms = await listExamRooms(env.DB, 100);

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
        const participants = await listExamRoomParticipants(env.DB, rId);
        participantCounts.set(rId, participants.length);
      }

      const hostIds = Array.from(new Set(rooms.map((r) => r.host_user_id).filter(Boolean)));
      const hosts = new Map<string, string>();
      for (const hid of hostIds) {
        const u = await getUserById(env.DB, hid as string);
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

      const currentUser = await getUserById(env.DB, auth.userId);
      if (!currentUser) return json({ success: false, message: "Unauthorized" }, { status: 401 });
      if (!canCreateRooms(currentUser)) {
        return json(
          { success: false, message: "กรุณาสมัครสมาชิกเพื่อสร้างห้อง" },
          { status: 403 }
        );
      }

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const name = String((body as any).name || "").trim();
      const mode = String((body as any).mode || "").trim();
      if (!name || !["exam", "tutor", "event"].includes(mode)) {
        return json({ success: false, message: "invalid_params" }, { status: 400 });
      }

      const subject = (body as any).subject ? String((body as any).subject) : null;
      const category = (body as any).category ? String((body as any).category) : null;
      const maxParticipants = Math.min(20, Math.max(1, Number((body as any).max_participants || 20)));
      const questionCount = Math.max(1, Math.min(200, Number((body as any).question_count || 20)));
      const timeLimit = Math.max(5, Math.min(60, Number((body as any).time_limit || 60)));
      const password = (body as any).password ? String((body as any).password) : null;
      const customQuestions = (body as any).custom_questions;
      const theme = isPremiumUser(currentUser) ? (body as any).theme || null : null;

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const settings = JSON.stringify({ time_limit: timeLimit });

      let selectedIds: string[] = [];
      let customQuestionsPayload: any[] | null = null;
      
      if (customQuestions && Array.isArray(customQuestions) && customQuestions.length > 0) {
        customQuestionsPayload = customQuestions.map((q: any) => ({
          question_text: q.question_text || "",
          choices: q.choices || { A: "", B: "", C: "", D: "" },
          correct_answer: q.correct_answer || "A",
          explanation: q.explanation || "",
          category: "custom",
          subject: "custom",
          is_custom: true,
        }));
        selectedIds = [];
      } else {
        try {
          const whereParts: string[] = [];
          const params: any[] = [];
          if (subject) {
            whereParts.push("subject = ?");
            params.push(subject);
          }
          if (category) {
            whereParts.push("category = ?");
            params.push(category);
          }
          const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
          const { results } = await env.DB
            .prepare(`SELECT id FROM questions ${whereClause} ORDER BY RANDOM() LIMIT ?`)
            .bind(...params, questionCount)
            .all();
          selectedIds = (results || []).map((q: any) => String(q.id));
        } catch (e) {
          // Fallback
        }
      }

      if (selectedIds.length === 0 && !customQuestionsPayload?.length) {
        return json({ success: false, message: "No questions found." }, { status: 400 });
      }

      const room = await createExamRoom(env.DB, {
        code,
        name,
        mode,
        tutor_submode: (body as any).tutor_submode || "step",
        host_user_id: auth.userId,
        subject,
        category,
        max_participants: maxParticipants,
        question_count: customQuestionsPayload?.length ? customQuestionsPayload.length : (selectedIds.length > 0 ? selectedIds.length : questionCount),
        status: "waiting",
        settings,
        password,
        question_ids: selectedIds,
        custom_questions: customQuestionsPayload,
        theme,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await upsertExamRoomParticipant(env.DB, room.id, auth.userId, {
        user_id: auth.userId,
        score: 0,
        status: "joined",
        current_question_index: 0,
        joined_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

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

      const room = await findExamRoomByCode(env.DB, code);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      if (room.password) {
        if (!password) return json({ success: false, message: "Password required", requirePassword: true }, { status: 403 });
        if (password !== String(room.password)) return json({ success: false, message: "Invalid password" }, { status: 403 });
      }

      if (String(room.status) !== "waiting") {
        return json({ success: false, message: "Room is already in progress or finished" }, { status: 400 });
      }

      // Check if already joined
      const existingPart = await getExamRoomParticipant(env.DB, room.id, auth.userId);

      if (!existingPart) {
        await upsertExamRoomParticipant(env.DB, room.id, auth.userId, {
          user_id: auth.userId,
          score: 0,
          status: "joined",
          current_question_index: 0,
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return json({ success: true, data: { ...room, password: undefined } });
    }

    const roomIdMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)$/);
    if (roomIdMatch && request.method === "GET") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      const participants = await listExamRoomParticipants(env.DB, roomId);

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
        const userPromises = chunk.map((id: any) => getUserById(env.DB, String(id)));
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

      const questionIds = Array.isArray(room.question_ids) ? room.question_ids : [];
      const questionsMap = new Map();
      const missingQIds: string[] = [];

      for (const qid of questionIds) {
        const cachedQ = getCache(`q_${qid}`);
        if (cachedQ) questionsMap.set(String(qid), normalizeQuestion(cachedQ));
        else missingQIds.push(qid);
      }

      for (let i = 0; i < missingQIds.length; i += 30) {
        const chunk = missingQIds.slice(i, i + 30);
        const qs = await getQuestionsByIds(env.DB, chunk);
        for (const q of qs) {
          if (q && q.id) {
            questionsMap.set(String(q.id), normalizeQuestion(q));
            setCache(`q_${q.id}`, q, 24 * 60 * 60 * 1000); // 24 hours cache
          }
        }
      }
      const questions = room.custom_questions?.length
        ? room.custom_questions.map((q: any, idx: number) => normalizeQuestion({ ...q, id: q.id || `custom_${idx}` }))
        : questionIds.map((id: string) => questionsMap.get(String(id))).filter(Boolean);

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

    const roomStartMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/start$/);
    if (roomStartMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomStartMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized to start this room" }, { status: 403 });
      }

      const settings = parseRoomSettings(room);

      const updated = await updateExamRoom(env.DB, roomId, {
        status: "in_progress",
        settings: {
          ...settings,
          tutor_state: {
            current_question_index: 0,
            is_answer_revealed: false,
            answer_counts: createEmptyAnswerCounts(),
          },
        },
        updated_at: new Date().toISOString(),
      });
      return json({ success: true, data: updated });
    }

    const roomFinishMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/finish$/);
    if (roomFinishMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomFinishMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });

      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

      const score = Number((body as any).score || 0);
      const timeTaken = Number((body as any).timeTaken || 0);
      const answers = (body as any).answers && typeof (body as any).answers === "object" ? (body as any).answers : {};
      const totalScore = Array.isArray(room.question_ids) && room.question_ids.length
        ? room.question_ids.length
        : (Array.isArray(room.custom_questions) ? room.custom_questions.length : Number(room.question_count || 0));

      await upsertExamRoomParticipant(env.DB, roomId, auth.userId, {
        user_id: auth.userId,
        score,
        time_taken: timeTaken,
        status: "finished",
        current_question_index: totalScore,
        answers,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      await createExamResult(env.DB, {
        user_id: auth.userId,
        classroom_id: roomId,
        score,
        total_score: totalScore,
        mode: room.mode || "exam",
        questions: answers,
        time_taken: timeTaken,
        taken_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const participants = await listExamRoomParticipants(env.DB, roomId);
      const unfinished = participants.some((participant: any) => String(participant.status) !== "finished");
      const nextStatus = unfinished ? "in_progress" : "finished";

      const updated = await updateExamRoom(env.DB, roomId, {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      });

      return json({ success: true, data: updated });
    }

    const roomScoreMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/score$/);
    if (roomScoreMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomScoreMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

      await upsertExamRoomParticipant(env.DB, roomId, auth.userId, {
        user_id: auth.userId,
        score: Number((body as any).score || 0),
        status: (body as any).status || undefined,
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomProgressMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/progress$/);
    if (roomProgressMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomProgressMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      const body = await readJson(request);
      if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });

      await upsertExamRoomParticipant(env.DB, roomId, auth.userId, {
        user_id: auth.userId,
        current_question_index: Number((body as any).questionIndex || 0),
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomNicknameMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/nickname$/);
    if (roomNicknameMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomNicknameMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      const body = await readJson(request);
      const nickname = String((body as any)?.nickname || "").trim();
      if (!nickname) return json({ success: false, message: "invalid_nickname" }, { status: 400 });

      await upsertExamRoomParticipant(env.DB, roomId, auth.userId, {
        user_id: auth.userId,
        nickname,
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomChatMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/chat$/);
    if (roomChatMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomChatMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      const body = await readJson(request);
      const message = String((body as any)?.message || "").trim();
      const displayName = String((body as any)?.displayName || "").trim();
      if (!message) return json({ success: false, message: "invalid_message" }, { status: 400 });

      const settings = parseRoomSettings(room);
      const nextMessages = Array.isArray(settings.chat_messages) ? [...settings.chat_messages] : [];
      nextMessages.push({
        id: crypto.randomUUID(),
        userId: auth.userId,
        displayName: displayName || "ผู้ใช้",
        message,
        timestamp: new Date().toISOString(),
      });

      await updateExamRoom(env.DB, roomId, {
        settings: {
          ...settings,
          chat_messages: nextMessages.slice(-50),
        },
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomTutorNavigateMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/tutor\/navigate$/);
    if (roomTutorNavigateMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomTutorNavigateMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized" }, { status: 403 });
      }
      const body = await readJson(request);
      const settings = parseRoomSettings(room);
      const tutorState = createTutorState(settings);
      tutorState.current_question_index = Number((body as any)?.questionIndex || 0);
      tutorState.is_answer_revealed = false;
      tutorState.answer_counts = createEmptyAnswerCounts();

      await updateExamRoom(env.DB, roomId, {
        settings: {
          ...settings,
          tutor_state: tutorState,
        },
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomTutorRevealMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/tutor\/reveal$/);
    if (roomTutorRevealMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomTutorRevealMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized" }, { status: 403 });
      }

      const settings = parseRoomSettings(room);
      const tutorState = createTutorState(settings);
      tutorState.is_answer_revealed = true;

      await updateExamRoom(env.DB, roomId, {
        settings: {
          ...settings,
          tutor_state: tutorState,
        },
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomTutorAnswerMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/tutor\/answer$/);
    if (roomTutorAnswerMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomTutorAnswerMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      const body = await readJson(request);
      const choice = String((body as any)?.choice || "").trim().toUpperCase();
      if (!["A", "B", "C", "D"].includes(choice)) {
        return json({ success: false, message: "invalid_choice" }, { status: 400 });
      }

      const settings = parseRoomSettings(room);
      const tutorState = createTutorState(settings);
      tutorState.answer_counts = {
        ...createEmptyAnswerCounts(),
        ...tutorState.answer_counts,
        [choice]: Number(tutorState.answer_counts?.[choice] || 0) + 1,
      };

      await updateExamRoom(env.DB, roomId, {
        settings: {
          ...settings,
          tutor_state: tutorState,
        },
        updated_at: new Date().toISOString(),
      });

      return json({ success: true });
    }

    const roomCloseMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/close$/);
    if (roomCloseMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomCloseMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized" }, { status: 403 });
      }

      const updated = await updateExamRoom(env.DB, roomId, {
        status: "finished",
        updated_at: new Date().toISOString(),
      });

      return json({ success: true, data: updated });
    }

    const roomResetMatch = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9_-]+)\/reset$/);
    if (roomResetMatch && request.method === "POST") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomResetMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: false, message: "Room not found" }, { status: 404 });
      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized" }, { status: 403 });
      }

      const settings = parseRoomSettings(room);
      await resetExamRoomParticipants(env.DB, roomId);
      const updated = await updateExamRoom(env.DB, roomId, {
        status: "waiting",
        settings: {
          ...settings,
          tutor_state: {
            current_question_index: 0,
            is_answer_revealed: false,
            answer_counts: createEmptyAnswerCounts(),
          },
        },
        updated_at: new Date().toISOString(),
      });

      return json({ success: true, data: updated });
    }

    if (roomIdMatch && request.method === "DELETE") {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;

      const roomId = roomIdMatch[1];
      const room = await getExamRoomById(env.DB, roomId);
      if (!room) return json({ success: true, message: "Room already deleted or not found" });

      if (String(room.host_user_id) !== auth.userId) {
        return json({ success: false, message: "Not authorized to delete this room" }, { status: 403 });
      }

      await deleteExamRoom(env.DB, roomId);
      return json({ success: true, message: "Room deleted successfully" });
    }

    if (url.pathname.startsWith("/api/")) {
      try {
        if (url.pathname.startsWith("/api/admin/")) {
          const admin = await requireAdmin(request, env);
          if ("error" in admin) return admin.error;
        }

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
            created = await createSystemLog(env.DB, {
              action,
              details: {
                ...(typeof details === "object" && details ? details as Record<string, unknown> : { value: details }),
                ip_address: request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown",
                user_agent: request.headers.get("user-agent") || "unknown",
              },
              user_id: userId,
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
            const qs = await listAllQuestions(env.DB);
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
            const qs = await listAllQuestions(env.DB);
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
            const qs = await listAllQuestions(env.DB);
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
            let qs = await listAllQuestions(env.DB);
            if (subject && subject !== "undefined" && subject !== "null") qs = qs.filter((q: any) => q.subject === subject);
            const allTags = new Set<string>();
            const categoryMap: Record<string, string> = {
              "พ.ร.ฎ.กิจการบ้านเมืองที่ดี": "พ.ร.ฎ.การบริหารกิจการบ้านเมืองที่ดี",
              "พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่ พ.ศ. 2539": "พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่",
              "พ.ร.บ.บริหารราชการแผ่นดิน": "พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน",
              "พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน พ.ศ. 2534": "พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน",
              "มาตรฐานจริยธรรม": "พ.ร.บ.มาตรฐานทางจริยธรรม"
            };

            const processTag = (tag: string) => {
              const t = tag.trim();
              if (t) {
                allTags.add(categoryMap[t] || t);
              }
            };

            for (const q of qs) {
              if (q.category) {
                q.category.split(",").forEach(processTag);
              }
              if (q.catalogs && Array.isArray(q.catalogs)) {
                q.catalogs.forEach((tag: string) => {
                  if (tag) processTag(tag);
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
          const q = await getQuestionById(env.DB, qIdMatch[1]);
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

          const cacheKey = `qs_list_${JSON.stringify({ subject, exam_year, exam_set })}`;
          let allQs = getCache(cacheKey);
          if (!allQs) {
            allQs = await listAllQuestions(env.DB);
            if (subject && subject !== "undefined" && subject !== "null") allQs = allQs.filter((q: any) => q.subject === subject);
            if (exam_year && exam_year !== "undefined" && exam_year !== "null") allQs = allQs.filter((q: any) => String(q.exam_year) === String(exam_year));
            let isDynamicSet = false;
            if (exam_set && exam_set !== "undefined" && exam_set !== "null") {
              const examSetsMeta = await listExamSets(env.DB);
              const dynamicSet = examSetsMeta.find((s: any) => String(s.name) === String(exam_set));
              
              if (dynamicSet && dynamicSet.rules) {
                let rulesStr = dynamicSet.rules;
                let rulesObj: any = null;
                try {
                  rulesObj = typeof rulesStr === 'string' ? JSON.parse(rulesStr) : rulesStr;
                } catch (e) { }

                if (rulesObj && rulesObj.catalogs && Array.isArray(rulesObj.catalogs)) {
                  isDynamicSet = true;
                  let dynamicQs: any[] = [];
                  for (const catalog of rulesObj.catalogs) {
                    const count = parseInt(rulesObj.catalog_counts?.[catalog] || "0", 10);
                    if (count > 0) {
                      const catStr = catalog.toLowerCase();
                      const availableQs = allQs.filter((q: any) => {
                        const qCat = (q.category || "").toLowerCase();
                        const qCatalogs = Array.isArray(q.catalogs) ? q.catalogs.join(",").toLowerCase() : (q.catalogs || "").toLowerCase();
                        return qCat === catStr || qCat.includes(catStr) || qCatalogs.includes(catStr);
                      });
                      
                      const shuffled = [...availableQs].sort(() => Math.random() - 0.5);
                      dynamicQs.push(...shuffled.slice(0, count));
                    }
                  }
                  allQs = dynamicQs;
                } else {
                  allQs = allQs.filter((q: any) => String(q.exam_set) === String(exam_set));
                }
              } else {
                allQs = allQs.filter((q: any) => String(q.exam_set) === String(exam_set));
              }
            }
            setCache(cacheKey, allQs, isDynamicSet ? 1000 : 60 * 1000); // 1 sec cache for dynamic sets, 1 min for static
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
              const catMapReversed: Record<string, string[]> = {
                "พ.ร.ฎ.การบริหารกิจการบ้านเมืองที่ดี": ["พ.ร.ฎ.การบริหารกิจการบ้านเมืองที่ดี", "พ.ร.ฎ.กิจการบ้านเมืองที่ดี"],
                "พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่": ["พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่", "พ.ร.บ.ความรับผิดทางละเมิดของเจ้าหน้าที่ พ.ศ. 2539"],
                "พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน": ["พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน", "พ.ร.บ.บริหารราชการแผ่นดิน", "พ.ร.บ.ระเบียบบริหารราชการแผ่นดิน พ.ศ. 2534"],
                "พ.ร.บ.มาตรฐานทางจริยธรรม": ["พ.ร.บ.มาตรฐานทางจริยธรรม", "มาตรฐานจริยธรรม"]
              };
              const searchCats = catMapReversed[category] || [category];

              const qCat = (data.category || "").toLowerCase();
              const qCatalogs = Array.isArray(data.catalogs) ? data.catalogs.join(",").toLowerCase() : (data.catalogs || "").toLowerCase();
              
              let foundCatMatch = false;
              for (const c of searchCats) {
                const catStr = c.toLowerCase();
                if (qCat.includes(catStr) || qCatalogs.includes(catStr)) {
                  foundCatMatch = true;
                  break;
                }
              }
              if (!foundCatMatch) match = false;
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
          let actualLimit = limit;
          if (exam_set && !url.searchParams.has("limit")) {
            actualLimit = count; // Bypass default 50 limit for exam sets
          }
          rows = rows.slice(offset, offset + actualLimit);

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
          const userDoc = await getUserById(env.DB, auth.userId);
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
             const allDocs = await listAllQuestions(env.DB);
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
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
          };
          
          const createdQuestion = await createQuestion(env.DB, newQuestion);
          return json({ success: true, data: createdQuestion }, { status: 201 });
        }

        // /api/questions/:id (Update)
        if (qIdMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await getUserById(env.DB, auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const body: any = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
          
          const doc = await getQuestionById(env.DB, qIdMatch[1]);
          if (!doc) return json({ success: false, message: "Question not found" }, { status: 404 });
          
          const updateData = { ...body, updated_at: new Date().toISOString() };
          const updated = await updateQuestion(env.DB, qIdMatch[1], updateData);
          return json({ success: true, data: normalizeQuestion(updated) });
        }

        // /api/questions/:id (Delete)
        if (qIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await getUserById(env.DB, auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const doc = await getQuestionById(env.DB, qIdMatch[1]);
          if (!doc) return json({ success: false, message: "Question not found" }, { status: 404 });
          
          await deleteQuestion(env.DB, qIdMatch[1]);
          return json({ success: true, message: "Question deleted" });
        }

        // =======================
        // ADMIN DASHBOARD ROUTES
        // =======================

        
        // /api/exam-sets
        if (url.pathname === "/api/exam-sets" && request.method === "GET") {
          const sets = await listExamSets(env.DB);
          return json({ success: true, data: sets });
        }
        
if (url.pathname === "/api/admin/reports" && request.method === "GET") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const { results } = await env.DB.prepare("SELECT * FROM reported_content ORDER BY created_at DESC").all();
          return json(results || []);
        }

        const resolveReportMatch = url.pathname.match(/^\/api\/admin\/reports\/([^/]+)\/resolve$/);
        if (resolveReportMatch && request.method === "POST") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reportId = resolveReportMatch[1];
          await env.DB.prepare("UPDATE reported_content SET status = 'resolved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(reportId).run();
          return json({ success: true, message: "Report resolved" });
        }

        if (url.pathname === "/api/admin/stats" && request.method === "GET") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const stats = await adminGetDashboardStats(env.DB);
          return json(stats);
        }

        // =======================
        // ADMIN USER ROUTES
        // =======================

        
        // /api/admin/exam-sets
        if (url.pathname === "/api/admin/exam-sets" && request.method === "GET") {
          const sets = await listExamSets(env.DB);
          return json({ success: true, data: sets });
        }
        if (url.pathname === "/api/admin/catalogs" && request.method === "GET") {
          const catalogs = await getUniqueCatalogs(env.DB);
          return json({ success: true, data: catalogs });
        }
        if (url.pathname === "/api/admin/catalogs/counts" && request.method === "GET") {
          const counts = await getCatalogCounts(env.DB);
          return json({ success: true, data: counts });
        }
        if (url.pathname === "/api/admin/exam-sets" && request.method === "POST") {
          const body = await request.json();
          const result = await createExamSet(env.DB, body);
          return json({ success: true, data: result }, { status: 201 });
        }
        if (url.pathname.startsWith("/api/admin/exam-sets/")) {
          const setId = url.pathname.split("/")[4];
          if (request.method === "PUT") {
            const body = await request.json();
            const result = await updateExamSet(env.DB, setId, body);
            return json({ success: true, data: result });
          }
          if (request.method === "DELETE") {
            await deleteExamSet(env.DB, setId);
            return json({ success: true });
          }
        }
        
if (url.pathname === "/api/admin/users" && request.method === "GET") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const users = await adminGetUsers(env.DB);
          return json(users);
        }

        const adminUserIdMatch = url.pathname.match(/^\/api\/admin\/users\/([^\/]+)$/);
        if (adminUserIdMatch && request.method === "PUT") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          await adminUpdateUser(env.DB, adminUserIdMatch[1], reqBody || {});
          return json({ success: true, message: "User updated" });
        }

        const adminUserStatusMatch = url.pathname.match(/^\/api\/admin\/users\/([^\/]+)\/status$/);
        if (adminUserStatusMatch && request.method === "PUT") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          if (reqBody?.status) await adminUpdateUserStatus(env.DB, adminUserStatusMatch[1], reqBody.status);
          return json({ success: true, message: "User status updated" });
        }

        const adminUserPermissionsMatch = url.pathname.match(/^\/api\/admin\/users\/([^\/]+)\/permissions$/);
        if (adminUserPermissionsMatch && request.method === "PUT") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          if (reqBody?.permissions) await adminUpdateUserPermissions(env.DB, adminUserPermissionsMatch[1], reqBody.permissions);
          return json({ success: true, message: "User permissions updated" });
        }

        // =======================
        // ADMIN PAYMENT ROUTES
        // =======================

        if (url.pathname === "/api/admin/payments" && request.method === "GET") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const payments = await adminGetPayments(env.DB);
          return json(payments);
        }

        const adminApprovePaymentMatch = url.pathname.match(/^\/api\/admin\/payments\/([^\/]+)\/approve$/);
        if (adminApprovePaymentMatch && request.method === "POST") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          await adminApprovePayment(env.DB, adminApprovePaymentMatch[1], reqBody?.type);
          return json({ success: true, message: "Payment approved" });
        }

        const adminRejectPaymentMatch = url.pathname.match(/^\/api\/admin\/payments\/([^\/]+)\/reject$/);
        if (adminRejectPaymentMatch && request.method === "POST") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          await adminRejectPayment(env.DB, adminRejectPaymentMatch[1]);
          return json({ success: true, message: "Payment rejected" });
        }

        // =======================
        // ADMIN ARCADE ROUTES
        // =======================
        if (url.pathname === "/api/admin/arcade" && request.method === "GET") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const games = await adminGetArcadeGames(env.DB);
          return json({ success: true, data: games });
        }

        if (url.pathname === "/api/admin/arcade" && request.method === "POST") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          const game = await adminCreateArcadeGame(env.DB, reqBody || {});
          return json({ success: true, game });
        }

        const adminArcadeIdMatch = url.pathname.match(/^\/api\/admin\/arcade\/([^\/]+)$/);
        if (adminArcadeIdMatch && request.method === "PUT") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          await adminUpdateArcadeGame(env.DB, adminArcadeIdMatch[1], reqBody || {});
          return json({ success: true });
        }

        if (adminArcadeIdMatch && request.method === "DELETE") {
          const auth = await requireAdmin(request, env);
          if ("error" in auth) return auth.error;
          await adminDeleteArcadeGame(env.DB, adminArcadeIdMatch[1]);
          return json({ success: true });
        }

        // =======================
        // ADMIN USER QUESTIONS ROUTES
        // =======================

        const adminUqIdMatch = url.pathname.match(/^\/api\/admin\/user-questions\/([^\/]+)$/);

        // /api/admin/user-questions (List)
        if (url.pathname === "/api/admin/user-questions" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await getUserById(env.DB, auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const userQs = await adminListUserQuestions(env.DB, 500);
          return json({ success: true, data: userQs });
        }

        // /api/admin/user-questions/:id (Update)
        if (adminUqIdMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await getUserById(env.DB, auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          const body: any = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
          
          const updated = await adminUpdateUserQuestion(env.DB, adminUqIdMatch[1], body);
          return json({ success: true, data: updated });
        }

        // /api/admin/user-questions/:id (Delete)
        if (adminUqIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userDoc = await getUserById(env.DB, auth.userId);
          if (!userDoc || userDoc.role !== "admin") return json({ success: false, message: "Forbidden: Admin access required" }, { status: 403 });
          
          await adminDeleteUserQuestion(env.DB, adminUqIdMatch[1]);
          return json({ success: true, message: "Deleted" });
        }

        // =======================
        // USER QUESTIONS ROUTES
        // =======================

        const uqIdMatch = url.pathname.match(/^\/api\/user\/questions\/([^\/]+)$/);

        // /api/user/questions (List)
        if (url.pathname === "/api/user/questions" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userQs = await listUserQuestions(env.DB, auth.userId);
          return json({ success: true, data: userQs.map(normalizeQuestion) });
        }

        // /api/user/questions/bulk (Create Multiple)
        if (url.pathname === "/api/user/questions/bulk" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await readJson(request);
          if (!body || !Array.isArray((body as any).questions)) return json({ success: false, message: "Invalid payload" }, { status: 400 });
          const questions = (body as any).questions;
          const created = [];
          for (const q of questions) {
            const newQ = await createUserQuestion(env.DB, { ...q, user_id: auth.userId, host_user_id: auth.userId, is_custom: 1 });
            created.push(normalizeQuestion(newQ));
          }
          return json({ success: true, data: created });
        }

        // /api/user/questions (Create Single)
        if (url.pathname === "/api/user/questions" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await readJson(request);
          if (!body) return json({ success: false, message: "Invalid payload" }, { status: 400 });
          const newQ = await createUserQuestion(env.DB, { ...(body as any), user_id: auth.userId, host_user_id: auth.userId, is_custom: 1 });
          return json({ success: true, data: normalizeQuestion(newQ) });
        }

        // /api/user/questions/:id (Get Single)
        if (uqIdMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const doc = await getUserQuestionById(env.DB, uqIdMatch[1], auth.userId);
          if (!doc) return json({ success: false, message: "Not found" }, { status: 404 });
          return json({ success: true, data: normalizeQuestion(doc) });
        }

        // /api/user/questions/:id (Update)
        if (uqIdMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await readJson(request);
          if (!body) return json({ success: false, message: "invalid_body" }, { status: 400 });
          const updated = await updateUserQuestion(env.DB, uqIdMatch[1], auth.userId, body as any);
          return json({ success: true, data: normalizeQuestion(updated) });
        }

        // /api/user/questions/:id (Delete)
        if (uqIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const doc = await getUserQuestionById(env.DB, uqIdMatch[1], auth.userId);
          if (!doc) return json({ success: false, message: "Not found" }, { status: 404 });
          await deleteUserQuestion(env.DB, uqIdMatch[1], auth.userId);
          return json({ success: true, message: "Deleted" });
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
            const qs = await getQuestionsByIds(env.DB, chunk);
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

          const examResult = await createExamResult(env.DB, {
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
            const activeSeason = await getActiveSeason(env.DB);
            if (activeSeason) {
              await upsertRankingScore(env.DB, activeSeason.id, auth.userId, score);
            }
          } catch(e) {
            console.error("Failed to update ranking:", e);
          }

          // XP System Calculation
          const xpGained = (total_score * 10) + 50;
          try {
            const userDoc = await getUserById(env.DB, auth.userId);
            if (userDoc) {
              const currentXp = (Number(userDoc.xp) || 0) + xpGained;
              
              // Progressive Level Calculation
              const currentLevel = userDoc.level || 1;
              const newLevel = Math.floor((1 + Math.sqrt(1 + 4 * (currentXp / 1000))) / 2);

              const updates: any = { xp: currentXp };
              if (newLevel > currentLevel) {
                updates.level = newLevel;
              }
              await updateUser(env.DB, auth.userId, updates);
              
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

          const activeSeason = await getActiveSeason(env.DB);
          if (!activeSeason) return json({ success: true, data: { total_score: 0, exams_taken: 0 } });
          
          const rankingId = `${activeSeason.id}_${auth.userId}`;
          const ranking = await getRankingById(env.DB, rankingId);
          return json({ success: true, data: ranking || { total_score: 0, exams_taken: 0 } });
        }

        // /api/rankings
        if (url.pathname === "/api/rankings" && request.method === "GET") {
          const activeSeason = await getActiveSeason(env.DB);
          if (!activeSeason) return json({ success: true, data: [] });
          const activeSeasonId = activeSeason.id;
          
          const cacheKey = `rankings_${activeSeasonId}`;
          let rankings = getCache(cacheKey);
          if (!rankings) {
            rankings = await listRankingsBySeason(env.DB, activeSeasonId, 50);
            // Fetch users for rankings
            for (const r of rankings) {
              const u = await getUserById(env.DB, String(r.user_id));
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
            const results = await listExamResultsByUser(env.DB, auth.userId);
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
                
                await createTicket(env.DB, ticketData);
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
                const bookmarks = await listBookmarksByUser(env.DB, auth.userId);
                return json({ success: true, data: bookmarks });
            }

            if (request.method === "POST") {
                try {
                    const body = await request.json() as any;
                    const { target_type, target_id, title } = body;
                    
                    if (!target_type || !target_id) {
                        return json({ success: false, message: "Missing required fields" }, { status: 400 });
                    }

                    const existing = await listBookmarksByUser(env.DB, auth.userId);

                    if (existing && existing.some((b: any) => String(b.target_id) === String(target_id) && b.target_type === target_type)) {
                        return json({ success: false, message: "Already bookmarked" }, { status: 400 });
                    }

                    const bookmark = await createBookmark(env.DB, {
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
                const bookmark = await getBookmarkById(env.DB, bookmarkId);
                if (!bookmark) return notFound();
                if (bookmark.user_id !== auth.userId) {
                    return json({ success: false, message: "Unauthorized" }, { status: 403 });
                }
                
                await deleteBookmark(env.DB, bookmarkId);
                return json({ success: true });
            }
        }

        if (url.pathname.startsWith("/api/chat")) {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const myId = auth.userId;

          if (url.pathname === "/api/chat/unread-count" && request.method === "GET") {
              const received = await listReceivedMessages(env.DB, myId);
              const unreadCount = received.filter((m: any) => !m.is_read).length;
              return json({ success: true, data: { unread: unreadCount } });
          }

          if (url.pathname === "/api/chat/inbox/conversations" && request.method === "GET") {
              const allMsgs = await listDirectMessagesForUser(env.DB, myId);
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
                  const friendDoc = await getUserById(env.DB, friendId);
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
              
              const newMsg = await createDirectMessage(env.DB, {
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
              await markMessagesRead(env.DB, myId, friendId);
              return json({ success: true });
          }

          const chatMatch = url.pathname.match(/^\/api\/chat\/([a-zA-Z0-9_-]+)$/);
          if (chatMatch && request.method === "GET") {
              const friendId = chatMatch[1];
              const allMsgs = await listDirectMessagesForUser(env.DB, myId);
              const chatHistory = allMsgs.filter((m: any) => (m.sender_id === myId && m.receiver_id === friendId) || (m.sender_id === friendId && m.receiver_id === myId));
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
                const notifications = await listNotificationsByUser(env.DB, myId, parseInt(limitStr, 10));
                return json({ success: true, data: notifications });
            }

            if (url.pathname === "/api/notifications/unread-count" && request.method === "GET") {
                const notifications = await listNotificationsByUser(env.DB, myId, 1000);
                const unreadCount = notifications.filter((n: any) => !n.is_read).length;
                return json({ success: true, data: { unread: unreadCount } });
            }

            if (url.pathname === "/api/notifications/read" && request.method === "POST") {
                const body = await readJson(request) as any;
                if (body.id) {
                    await markNotificationRead(env.DB, body.id);
                } else {
                    await markAllNotificationsRead(env.DB, myId);
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

          let allThreads = await listThreads(env.DB, 200);
          if (category && category !== "all" && category !== "undefined" && category !== "null") {
            allThreads = allThreads.filter((t: any) => t.category === category);
          }
          
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
            const users = await Promise.all(chunk.map(id => getUserById(env.DB, String(id))));
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
            image_url: body.image_url || body.image_base64 || null,
            likes: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          };

          const created = await createThread(env.DB, threadData);
          return json({ success: true, data: created }, { status: 201 });
        }

        // /api/exams/:id
        const examIdMatch = url.pathname.match(/^\/api\/exams\/([a-zA-Z0-9_-]+)$/);
        if (examIdMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const result = await getExamResultById(env.DB, examIdMatch[1]);
          if (!result) return json({ success: false, message: "Result not found" }, { status: 404 });

          return json({ success: true, data: result });
        }

        // /api/community/threads/:id (GET)
        const threadIdMatch = url.pathname.match(/^\/api\/community\/threads\/([a-zA-Z0-9_-]+)$/);
        if (threadIdMatch && request.method === "GET") {
          const threadDoc = await getThreadById(env.DB, threadIdMatch[1]);
          if (!threadDoc) return notFound();
          
          if (!threadDoc.stats) threadDoc.stats = { views: threadDoc.views || 0, likes: threadDoc.likes || 0, comments_count: 0 };
          
          const u = await getUserById(env.DB, String(threadDoc.user_id));
          if (u) {
            threadDoc.User = { id: u.id, display_name: u.display_name || "Unknown User", avatar: u.avatar || null, plan_type: u.plan_type || "free" };
          }
          
          return json(threadDoc); // Note: frontend expects raw thread data here
        }

        // /api/community/threads/user/:userId (GET)
        const userThreadsMatch = url.pathname.match(/^\/api\/community\/threads\/user\/([a-zA-Z0-9_-]+)$/);
        if (userThreadsMatch && request.method === "GET") {
          const userId = userThreadsMatch[1];
          const threads = await listThreadsByUser(env.DB, userId);
          threads.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          return json({ success: true, data: threads });
        }

        // /api/community/threads/:id (DELETE)
        if (threadIdMatch && request.method === "DELETE") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const threadDoc = await getThreadById(env.DB, threadIdMatch[1]);
          if (!threadDoc) return notFound();
          
          if (threadDoc.user_id !== auth.userId) {
              return json({ success: false, message: "Unauthorized" }, { status: 403 });
          }
          
          await deleteThread(env.DB, threadIdMatch[1]);
          return json({ success: true });
        }

        // /api/community/comments/:threadId (GET)
        const commentsMatch = url.pathname.match(/^\/api\/community\/comments\/([a-zA-Z0-9_-]+)$/);
        if (commentsMatch && request.method === "GET") {
          const threadId = commentsMatch[1];
          // Fetch comments
          let comments = await listCommentsByThread(env.DB, threadId);
          
          // Fetch users for comments
          const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
          const usersMap = new Map();
          for (let i = 0; i < userIds.length; i += 30) {
            const chunk = userIds.slice(i, i + 30);
            const users = await Promise.all(chunk.map(id => getUserById(env.DB, String(id))));
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
          
          const created = await createComment(env.DB, commentData);
          
          return json({ success: true, data: created });
        }
        
        // /api/community/comments/:id/like (POST)
        const commentLikeMatch = url.pathname.match(/^\/api\/community\/comments\/([a-zA-Z0-9_-]+)\/like$/);
        if (commentLikeMatch && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          const commentId = commentLikeMatch[1];
          const comment = await getCommentById(env.DB, commentId);
          if (!comment) return notFound();
          
          const currentLikes = comment.likes || 0;
          await updateComment(env.DB, commentId, { likes: currentLikes + 1 });
          
          return json({ success: true, likes: currentLikes + 1 });
        }

        // /api/arcade
        if (url.pathname === "/api/arcade" && request.method === "GET") {
          const mode = url.searchParams.get("mode") || undefined;
          const games = await getArcadeGames(env.DB, mode);
          return json({ success: true, data: games });
        }

        // /api/arcade/score (POST)
        if (url.pathname === "/api/arcade/score" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          const body = await readJson(request) as any;
          if (!body || !body.game_id || typeof body.score !== "number") {
            return json({ success: false, message: "Invalid parameters" }, { status: 400 });
          }

          const existingScore = await env.DB.prepare("SELECT score FROM arcade_scores WHERE user_id = ? AND game_id = ?")
            .bind(auth.userId, body.game_id).first<{ score: number }>();
          
          if (!existingScore) {
             const newId = globalThis.crypto.randomUUID();
             await env.DB.prepare("INSERT INTO arcade_scores (id, user_id, game_id, score, created_at) VALUES (?, ?, ?, ?, ?)")
                .bind(newId, auth.userId, body.game_id, body.score, new Date().toISOString())
                .run();
          } else if (body.score > existingScore.score) {
             await env.DB.prepare("UPDATE arcade_scores SET score = ?, created_at = ? WHERE user_id = ? AND game_id = ?")
                .bind(body.score, new Date().toISOString(), auth.userId, body.game_id)
                .run();
          }
          return json({ success: true, message: "Score saved" });
        }

        // /api/arcade/:game_id/leaderboard (GET)
        const leaderboardMatch = url.pathname.match(/^\/api\/arcade\/([a-zA-Z0-9_-]+)\/leaderboard$/);
        if (leaderboardMatch && request.method === "GET") {
          const gameId = leaderboardMatch[1];
          const { results } = await env.DB.prepare(`
             SELECT s.score, s.created_at, u.display_name, u.avatar 
             FROM arcade_scores s 
             JOIN users u ON s.user_id = u.id 
             WHERE s.game_id = ? 
             ORDER BY s.score DESC 
             LIMIT 10
          `).bind(gameId).all();
          return json({ success: true, data: results });
        }

        // /api/news
        if (url.pathname === "/api/news" && request.method === "GET") {
          try {
            const agency = url.searchParams.get("agency");
            const search = url.searchParams.get("search");
            const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 100").all();
            const news = results.map((r: any) => {
              const metadata = r.metadata ? JSON.parse(r.metadata) : {};
              return {
                ...r,
                metadata,
                summary: metadata?.summary || null,
                is_featured: !!metadata?.is_featured,
                recruitment_type: metadata?.recruitment_type || null,
                published_date: metadata?.published_date || null,
                views: metadata?.views || 0,
              };
            });
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
            
            const created = await createNews(env.DB, body);
            return json({ success: true, data: created });
        }

        // /api/news/agency-stats
        if (url.pathname === "/api/news/agency-stats" && request.method === "GET") {
            try {
                const typeFilter = url.searchParams.get("type");
                const { results } = await env.DB.prepare("SELECT * FROM news ORDER BY created_at DESC LIMIT 100").all();
                const news = results.map((r: any) => {
                    const metadata = r.metadata ? JSON.parse(r.metadata) : {};
                    return {
                      ...r,
                      metadata,
                      recruitment_type: metadata?.recruitment_type || null,
                      published_date: metadata?.published_date || null,
                    };
                });
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
                const doc = await getNewsById(env.DB, id);
                if (!doc) return json({ success: false, message: "not_found" }, { status: 404 });
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
            const updated = await updateNews(env.DB, id, body);
            if (!updated) return json({ success: false, message: "not_found" }, { status: 404 });
            return json({ success: true, data: updated });
        }

        if (newsIdMatch && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsIdMatch[1];
            await deleteNews(env.DB, id);
            return json({ success: true, message: "Deleted" });
        }

        const newsFeatureMatch = url.pathname.match(/^\/api\/news\/([a-zA-Z0-9_-]+)\/feature$/);
        if (newsFeatureMatch && request.method === "PUT") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsFeatureMatch[1];
            const updated = await toggleNewsFeatured(env.DB, id);
            if (!updated) return json({ success: false, message: "Not found" }, { status: 404 });
            return json({ success: true, data: updated });
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
              const { results: sources } = await env.DB.prepare("SELECT * FROM news_sources ORDER BY name ASC").all();
              return json({ success: true, data: sources });
            } catch(e) {
              return json({ success: true, data: [] });
            }
        }

        // /api/news/sources
        if (url.pathname === "/api/news/sources" && request.method === "POST") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const body = await readJson(request);
            if (!body || !body.name) return json({ success: false, message: "name is required" }, { status: 400 });
            
            const id = "src_" + Date.now() + Math.random().toString(36).substr(2, 5);
            const name = String(body.name).trim();
            const url_str = String(body.url || "").trim();
            const created_at = new Date().toISOString();

            try {
                await env.DB.prepare(
                    "INSERT INTO news_sources (id, name, url, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
                ).bind(id, name, url_str, 1, created_at, created_at).run();
                return json({ success: true, data: { id, name, url: url_str, is_active: 1, created_at, updated_at: created_at } });
            } catch (e) {
                return json({ success: false, message: "failed to create source" }, { status: 500 });
            }
        }

        const newsSourceIdMatch = url.pathname.match(/^\/api\/news\/sources\/([a-zA-Z0-9_-]+)$/);
        if (newsSourceIdMatch && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            const id = newsSourceIdMatch[1];
            try {
                await env.DB.prepare("DELETE FROM news_sources WHERE id = ?").bind(id).run();
                return json({ success: true, message: "Deleted" });
            } catch (e) {
                return json({ success: false, message: "failed to delete source" }, { status: 500 });
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
            jobData.created_at = new Date().toISOString();
            jobData.published_at = new Date().toISOString();
            const created = await createNews(env.DB, jobData);
            return json({ success: true, data: created });
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
            const user = await getUserById(env.DB, auth.userId);
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
            await updateUser(env.DB, auth.userId, updates);
            
            const updatedUser = await getUserById(env.DB, auth.userId);
            return json({ success: true, data: sanitizeUser(updatedUser) });
        }

        if (url.pathname === "/api/users/profile" && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            await deleteUser(env.DB, auth.userId);
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
            await updateUser(env.DB, auth.userId, updates);
            
            const updatedUser = await getUserById(env.DB, auth.userId);
            return json({ success: true, data: sanitizeUser(updatedUser) });
        }

        // Stub missing routes to prevent 404 crashes
        if (url.pathname === "/api/users/stats" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          try {
            const results = await listExamResultsByUser(env.DB, auth.userId);

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
            const results = await listExamResultsByUser(env.DB, auth.userId);
            
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
            const results = await listExamResultsByUser(env.DB, auth.userId);
            
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
             
             const relations = await listFriendsByUser(env.DB, myId);
             
             const exists = relations.find((r: any) => (r.requester_id === myId && r.target_id === friendId) || (r.target_id === myId && r.requester_id === friendId));
             
             if (exists) return json({ success: false, message: "Request already exists or already friends" }, { status: 400 });
             
             const newReq = await createFriendRequest(env.DB, myId, friendId);
             return json({ success: true, data: newReq });
          }
          
          if (url.pathname === "/api/friends/accept" && request.method === "POST") {
             const body = await readJson(request) as any;
             const friendId = body.friendId;
             
             const tgts = await listFriendsByUser(env.DB, myId);
             const req = tgts.find((r: any) => r.requester_id === friendId && r.status === "pending");
             
             if (!req) return json({ success: false, message: "Request not found" }, { status: 404 });
             
             await updateFriend(env.DB, req.id, { status: "accepted" });
             return json({ success: true });
          }
          
          const removeMatch = url.pathname.match(/^\/api\/friends\/remove\/(.+)$/);
          if (removeMatch && request.method === "DELETE") {
             const friendId = removeMatch[1];
             const relations = await listFriendsByUser(env.DB, myId);
             
             const toDelete = [
                 ...relations.filter((r: any) => r.target_id === friendId || r.requester_id === friendId)
             ];
             
             for (const doc of toDelete) {
                 await deleteFriend(env.DB, doc.id);
             }
             return json({ success: true });
          }
          
          if (url.pathname === "/api/friends/list" && request.method === "GET") {
             const relations = await listFriendsByUser(env.DB, myId);
             
             const friendsList = [
                 ...relations.filter((r: any) => r.status === "accepted")
             ];
             const friendIds = friendsList.map((f: any) => f.requester_id === myId ? f.target_id : f.requester_id);
             
             const friendProfiles = await Promise.all(friendIds.map(async (fid: string) => {
                 const doc = await getUserById(env.DB, fid);
                 if (!doc) return null;
                 return { id: fid, display_name: doc.display_name, avatar: doc.avatar, level: doc.level };
             }));
             
             return json({ success: true, data: friendProfiles.filter(Boolean) });
          }
          
          if (url.pathname === "/api/friends/pending" && request.method === "GET") {
             const tgts = await listFriendsByUser(env.DB, myId);
             const pendingList = tgts.filter((r: any) => r.status === "pending");
             
             const pendingProfiles = await Promise.all(pendingList.map(async (f: any) => {
                 const doc = await getUserById(env.DB, f.requester_id);
                 if (!doc) return null;
                 return { id: f.requester_id, display_name: doc.display_name, avatar: doc.avatar, level: doc.level, request_id: f.id };
             }));
             
             return json({ success: true, data: pendingProfiles.filter(Boolean) });
          }
          
          const checkMatch = url.pathname.match(/^\/api\/friends\/check\/(.+)$/);
          if (checkMatch && request.method === "GET") {
             const friendId = checkMatch[1];
             const relations = await listFriendsByUser(env.DB, myId);
             
             const r1 = relations.find((r: any) => r.requester_id === myId && r.target_id === friendId);
             const r2 = relations.find((r: any) => r.target_id === myId && r.requester_id === friendId);
             
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
            const userDoc = await getUserById(env.DB, auth.userId);
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

            await updateUser(env.DB, auth.userId, updates);

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
            const results = await listPaymentPlans(env.DB);
            results.sort((a: any, b: any) => (a.price || 0) - (b.price || 0));
            return json({ success: true, plans: results });
          } catch (e) {
            return json({ success: false, plans: [] });
          }
        }

        
        if (url.pathname === "/api/payments/create-checkout-session" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          if (!env.STRIPE_SECRET_KEY) {
             return json({ success: false, message: "Stripe not configured" }, { status: 500 });
          }

          try {
            const body = await request.json() as any;
            const { planId, amount, type } = body;

            // Optional: verify plan
            const planDoc: any = await getPaymentPlanById(env.DB, planId);
            if (!planDoc) {
              return json({ success: false, message: "Plan not found" }, { status: 404 });
            }

            const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
              apiVersion: "2024-04-10" as any
            });

            // Calculate duration
            const durationDays = planDoc.duration_days || 30; // Default to 30 if missing

            // Fetch user for email autofill
            const userDoc: any = await getUserById(env.DB, auth.userId);
            let userEmail = userDoc?.email;
            if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
                userEmail = `user_${auth.userId}@preexam.online`;
            }

            const session = await stripe.checkout.sessions.create({
              customer_email: userEmail,
              payment_method_types: ['promptpay'],
              line_items: [
                {
                  price_data: {
                    currency: 'thb',
                    product_data: {
                      name: planDoc.name,
                      description: `Subscription for ${durationDays} days`,
                    },
                    unit_amount: Math.round(planDoc.price * 100), // Stripe expects amount in smallest currency unit (satang)
                  },
                  quantity: 1,
                },
              ],
              mode: 'payment',
              success_url: `${url.origin}/pricing?success=true`,
              cancel_url: `${url.origin}/pricing?canceled=true`,
              metadata: {
                userId: auth.userId,
                planId: planId,
                durationDays: String(durationDays),
                type: type || 'subscription'
              }
            });

            // Create pending transaction to track
            const transactionData = {
              id: crypto.randomUUID(),
              user_id: auth.userId,
              plan_id: planId,
              amount: planDoc.price,
              payment_method: 'promptpay',
              status: 'pending',
              type: type || 'subscription',
              session_id: session.id,
              created_at: new Date().toISOString()
            };
            await createTransaction(env.DB, transactionData);

            return json({ url: session.url });
          } catch (e: any) {
            console.error("Stripe error:", e);
            return json({ success: false, message: e.message }, { status: 500 });
          }
        }

        if (url.pathname === "/api/payments/history" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          try {
             const history = await listPayments(env.DB, auth.userId, 50);
             return json({ success: true, history });
          } catch (e: any) {
             return json({ success: false, message: e.message }, { status: 500 });
          }
        }

        if (url.pathname === "/api/payments/checkout" && request.method === "POST") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          
          try {
            const body = await request.json();
            const { plan_id, payment_method } = body as any;
            
            const planDoc: any = await getPaymentPlanById(env.DB, plan_id);
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

            await createTransaction(env.DB, transactionData);

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
            await updatePaymentPlan(env.DB, id, { ...(body as any), updated_at: new Date().toISOString() });
            return json({ success: true });
          }
          if (request.method === "DELETE") {
            await deletePaymentPlan(env.DB, id);
            return json({ success: true });
          }
        } else if (url.pathname === "/api/admin/payments/plans") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;

          if (request.method === "GET") {
            try {
              const results = await listPaymentPlans(env.DB);
              return json({ success: true, plans: results });
            } catch(e) {
              return json({ success: true, plans: [] });
            }
          }
          if (request.method === "POST") {
            const body = await request.json() as any;
            const planData = await createPaymentPlan(env.DB, { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            return json({ success: true, plan: planData });
          }
        }

const assetMatch = url.pathname.match(/^\/api\/assets\/([^\/]+)$/);
if (assetMatch) {
  const id = decodeURIComponent(assetMatch[1]);
  if (request.method === "DELETE") {
    const auth = await requireAuthUserId(request, env);
    if ("error" in auth) return auth.error;
    await deleteAsset(env.DB, id);
    return json({ success: true });
  }
  if (request.method === "PUT") {
    const auth = await requireAuthUserId(request, env);
    if ("error" in auth) return auth.error;
    const body = await request.json() as any;
    const assetData = await updateAsset(env.DB, id, body);
    return json({ success: true, data: assetData });
  }
} else if (url.pathname === "/api/assets") {
  if (request.method === "GET") {
    try {
      const results = await listAssets(env.DB);
      return json({ success: true, data: results });
    } catch(e) {
      return json({ success: true, data: [] });
    }
  }
  if (request.method === "POST") {
    const auth = await requireAuthUserId(request, env);
    if ("error" in auth) return auth.error;
    const body = await request.json() as any;
    const assetData = await createAsset(env.DB, { ...body, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return json({ success: true, data: assetData });
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
      const settings = await getSystemConfig(env.DB, "general_settings");
      return json({ success: true, settings: settings || {} });
    } catch (e) {
      return json({ success: true, settings: {} });
    }
  }
  if (request.method === "PUT") {
    const body = await request.json() as any;
    await upsertSystemConfig(env.DB, "general_settings", body);
    return json({ success: true, settings: body });
  }
}

if (url.pathname === "/api/public/settings") {
  if (request.method === "GET") {
    try {
      const settings = await getSystemConfig(env.DB, "general_settings");
      return json({ success: true, settings: settings || {} });
    } catch (e) {
      return json({ success: true, settings: {} });
    }
  }
}

if (url.pathname === "/api/legal/policy") {
  if (request.method === "GET") {
    try {
      const policy = await getSystemConfig(env.DB, "privacy_policy");
      return json({ success: true, content: policy?.content || "" });
    } catch (e: any) {
      return json({ success: false, error: e.message || String(e) }, { status: 500 });
    }
  }
  if (request.method === "PUT" || request.method === "POST") {
    try {
      const auth = await requireAuthUserId(request, env);
      if ("error" in auth) return auth.error;
      const body: any = await request.json();
      await upsertSystemConfig(env.DB, "privacy_policy", { content: body.content });
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

                let businesses = await listBusinesses(env.DB, 50);

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
        
        if (cleanPathname === "/api/business" && (request.method === "POST" || request.method === "PUT")) {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                const body: any = await request.json();
                
                // Check if user already has a business page
                const business = await getBusinessByOwner(env.DB, auth.userId);
                
                if (request.method === "POST") {
                    if (business) {
                        return json({ success: false, message: 'User already has a business page.' }, { status: 400 });
                    }
                    
                    const businessData: any = {
                        owner_uid: auth.userId,
                        name: body.name || '',
                        tagline: body.tagline || null,
                        category: body.category || null,
                        contact_link: body.contact_link || null,
                        contact_line_id: body.contact_line_id || null,
                        contact_facebook_url: body.contact_facebook_url || null,
                        status: 'approved',
                        stats: { followers: 0, views: 0, rating_avg: 0, rating_count: 0 },
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    
                    const createdBusiness = await createBusiness(env.DB, businessData);
                    return json({ success: true, business: createdBusiness }, { status: 201 });
                } else {
                    // PUT request
                    if (!business) {
                        return json({ success: false, message: 'Business not found.' }, { status: 404 });
                    }
                    
                    const docId = business.id;
                    const updateData: any = { updated_at: new Date().toISOString() };
                    if (body.name !== undefined) updateData.name = body.name;
                    if (body.tagline !== undefined) updateData.tagline = body.tagline;
                    if (body.about !== undefined) updateData.about = body.about;
                    if (body.category !== undefined) updateData.category = body.category;
                    if (body.contact_link !== undefined) updateData.contact_link = body.contact_link;
                    if (body.contact_line_id !== undefined) updateData.contact_line_id = body.contact_line_id;
                    if (body.contact_facebook_url !== undefined) updateData.contact_facebook_url = body.contact_facebook_url;
                    if (body.logo_image !== undefined) updateData.logo_image = body.logo_image;
                    if (body.cover_image !== undefined) updateData.cover_image = body.cover_image;
                    
                    const updated = await updateBusiness(env.DB, docId, updateData);
                    return json({ success: true, message: "Business updated successfully", business: updated });
                }
            } catch (err) {
                return json({ success: false, message: "Error processing business.", error: String(err) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/business/feed" && request.method === "GET") {
            try {
                // Fetch recent posts
                const posts = await listBusinessPosts(env.DB, undefined, 50);

                // Attach business details (name, logo_image)
                const businessIds = Array.from(new Set(posts.map((p: any) => p.business_id).filter(Boolean)));
                const businessesMap = new Map();
                for (const bid of businessIds) {
                    const b = await getBusinessById(env.DB, String(bid));
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
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                const business = await getBusinessByOwner(env.DB, auth.userId);
                if (!business) {
                    return json({ success: false, message: 'Business not found.' }, { status: 404 });
                }
                
                return json({ success: true, business });
            } catch (err) {
                return json({ success: false, message: "Error fetching business.", error: String(err) }, { status: 500 });
            }
        }
        if (url.pathname === "/api/business/my-business" && request.method === "DELETE") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                // Find the business owned by the user
                const business = await getBusinessByOwner(env.DB, auth.userId);
                if (business) await deleteBusiness(env.DB, business.id);
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
                const posts = await listBusinessPosts(env.DB, businessId, 50);

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
                const business = await getBusinessById(env.DB, id);
                if (!business) {
                    return json({ success: false, message: 'Business not found.' }, { status: 404 });
                }
                return json({ success: true, business });
            } catch (err) {
                return json({ success: false, message: 'Error fetching business.', error: String(err) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/users/leaderboard") return json({ success: true, leaderboard: [] });
                                        
        if (url.pathname === "/api/ads/admin/stats" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                // Total revenue from ad_transactions
                const { results: revRes } = await env.DB.prepare("SELECT SUM(amount) as total FROM ad_transactions WHERE type='topup'").all();
                const totalRevenue = revRes[0]?.total || 0;
                
                // Active sponsors
                const { results: sponsorRes } = await env.DB.prepare("SELECT COUNT(*) as count FROM businesses WHERE status='approved'").all();
                const activeSponsors = sponsorRes[0]?.count || 0;
                
                // Total views
                const { results: viewRes } = await env.DB.prepare("SELECT SUM(views) as total FROM ads").all();
                const totalViews = viewRes[0]?.total || 0;
                
                // Revenue trend (mocking daily trend based on last 7 days of transactions if possible, or fallback)
                const revenueTrend = [
                    { date: 'Mon', revenue: 0 },
                    { date: 'Tue', revenue: 0 },
                    { date: 'Wed', revenue: 0 },
                    { date: 'Thu', revenue: 0 },
                    { date: 'Fri', revenue: 0 },
                    { date: 'Sat', revenue: 0 },
                    { date: 'Sun', revenue: totalRevenue }
                ];
                
                return json({ success: true, totalRevenue, activeSponsors, totalViews, revenueTrend });
            } catch(e) {
                return json({ success: false, error: String(e) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/ads/admin/sponsors" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                const { results } = await env.DB.prepare(`
                    SELECT b.id, b.name as businessName, b.contact_line_id as contact, b.balance, b.total_spent as totalSpent, b.status, b.created_at as joinDate,
                    (SELECT COUNT(*) FROM ads WHERE business_id = b.id AND status='active') as activeAds
                    FROM businesses b ORDER BY b.created_at DESC
                `).all();
                return json(results);
            } catch(e) {
                return json({ success: false, error: String(e) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/ads/admin/pending" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            
            try {
                const { results } = await env.DB.prepare(`
                    SELECT a.id, b.name as sponsorName, a.title, a.content, a.target_url as targetUrl, a.placement as type, a.budget, a.cpc, a.max_views as maxViews, a.created_at as submittedAt, a.status 
                    FROM ads a
                    LEFT JOIN businesses b ON a.business_id = b.id
                    WHERE a.status = 'pending'
                `).all();
                return json(results);
            } catch(e) {
                return json({ success: false, error: String(e) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/ads/admin/config" && request.method === "GET") {
            try {
                const { results } = await env.DB.prepare("SELECT value FROM system_config WHERE key = 'ads_config'").all();
                if (results.length > 0 && results[0].value) {
                    return json(JSON.parse(results[0].value));
                }
                return json({ communityViewCost: 0.1, communityClickCost: 5.0, newsViewCost: 0.15, newsClickCost: 6.0, resultViewCost: 0.2, resultClickCost: 8.0, inFeedFrequency: 10, adSenseBackupId: '', examResultSlotId: '', homeSlotId: '' });
            } catch(e) {
                return json({ success: false, error: String(e) }, { status: 500 });
            }
        }

        if (url.pathname === "/api/support/admin/tickets") {
            try {
                const results = await listTickets(env.DB);
                return json({ success: true, data: results });
            } catch (e) {
                return json({ success: false, data: [] });
            }
        }
        if (url.pathname === "/api/admin/backups") return json([]);
        if (url.pathname === "/api/admin/backups/logs") return json([]);
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
                    attachment_url: body?.attachment_url || null,
                    status: 'open',
                    user_id: userId,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                const created = await createTicket(env.DB, ticketData);
                return json({ success: true, data: created });
            } catch (e) {
                return json({ success: false, message: "Failed to create ticket" }, { status: 500 });
            }
        }

        if (url.pathname === "/api/support/tickets/my" && request.method === "GET") {
            try {
                const auth = await requireAuthUserId(request, env);
                if ("error" in auth) return auth.error;
                
                const results = await listTickets(env.DB, auth.userId);
                
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
                const ticket = await getTicketById(env.DB, ticketId);
                if (!ticket) return json({ success: false, message: "Ticket not found" }, { status: 404 });
                
                const messages = await listTicketMessages(env.DB, ticketId);
                
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
                
                await updateTicket(env.DB, ticketId, {
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
                
                const created = await createTicketMessage(env.DB, ticketId, messageData);
                
                // Update ticket updated_at
                await updateTicket(env.DB, ticketId, {
                    updated_at: new Date().toISOString()
                });
                
                return json({ success: true, data: created });
            } catch (e) {
                console.error("Add message error:", e);
                return json({ success: false, message: "Failed to add message" }, { status: 500 });
            }
        }
        if (url.pathname === "/api/admin/payments") return json(await listPayments(env.DB, undefined, 100));
        if (url.pathname === "/api/admin/ads/pending") return json([]);
        if (url.pathname === "/api/news/sources/all") {
            const { results } = await env.DB.prepare("SELECT * FROM news_sources ORDER BY name ASC").all();
            return json({ success: true, data: results || [] });
        }


        const adminUserLogsMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/logs$/);
        if (adminUserLogsMatch && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const userId = adminUserLogsMatch[1];

          const fetchLogs = async (value: any) => {
            const rawUserId = value?.stringValue ?? value?.integerValue ?? value;
            const { results: results1 } = await env.DB
              .prepare("SELECT * FROM system_logs WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 10")
              .bind(String(rawUserId))
              .all();
              
            const { results: results2 } = await env.DB
              .prepare("SELECT doc_id as id, json_extract(data, '$.action') as action, json_extract(data, '$.user_id') as user_id, json_extract(data, '$.details') as details, json_extract(data, '$.created_at') as created_at FROM firestore_documents WHERE collection_path = 'system_logs' AND json_extract(data, '$.user_id') = ? ORDER BY datetime(created_at) DESC LIMIT 10")
              .bind(String(rawUserId))
              .all();

            const combined = [...(results1 || []), ...(results2 || [])].sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 10);
            return combined;
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
          const userDoc = await getUserById(env.DB, id);
          if (!userDoc) return json({ message: "User not found" }, { status: 404 });
          const examHistory = await listExamResultsByUser(env.DB, id, 20);
          const paymentHistory = await listPayments(env.DB, id, 10);
          return json({ success: true, user: userDoc, examHistory, paymentHistory });
        }

        const adminUserStatusMatch2 = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/status$/);
        if (adminUserStatusMatch2 && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await updateUser(env.DB, adminUserStatusMatch2[1], { status: body.status });
          return json({ success: true });
        }

        const adminUserPermMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/permissions$/);
        if (adminUserPermMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await updateUser(env.DB, adminUserPermMatch[1], { admin_permissions: body.permissions });
          return json({ success: true });
        }

        const adminUserUpdateMatch = url.pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)$/);
        if (adminUserUpdateMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const body = await request.json() as any;
          await updateUser(env.DB, adminUserUpdateMatch[1], body);
          return json({ success: true });
        }

        if (url.pathname === "/api/admin/messages" && request.method === "GET") {
            const auth = await requireAuthUserId(request, env);
            if ("error" in auth) return auth.error;
            try {
                const { results: messages } = await env.DB.prepare("SELECT * FROM contact_messages ORDER BY datetime(created_at) DESC LIMIT 50").all();
                
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
                    const { results: messages } = await env.DB.prepare("SELECT * FROM contact_messages LIMIT 50").all();
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

          const users = await listUsers(env.DB, 10000);
          return json(users);
        }

        if (url.pathname === "/api/admin/seasons" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          try {
            const seasons = await listSeasons(env.DB);
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
          await completeActiveSeasons(env.DB, new Date().toISOString());

          const id = body.id || String(new Date().getFullYear());
          const newSeason = await createSeason(env.DB, {
            id,
            name: body.name || `Season ${id}`,
            start_date: new Date().toISOString(),
            status: "active",
            responsible_admin_id: body.responsible_admin_id || auth.userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
          return json({ success: true, data: newSeason });
        }

        const seasonMatch = url.pathname.match(/^\/api\/admin\/seasons\/([a-zA-Z0-9_-]+)$/);
        if (seasonMatch && request.method === "PUT") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const id = seasonMatch[1];
          const body = (await readJson(request)) as any;
          const season = await getSeasonById(env.DB, id);
          if (!season) return json({ success: false, message: "Season not found" }, { status: 404 });
          await updateSeason(env.DB, id, { ...body, updated_at: new Date().toISOString() });
          return json({ success: true });
        }
        if (url.pathname === "/api/admin/businesses" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const businesses = await listBusinesses(env.DB, 100);
          businesses.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
          return json(businesses);
        }
        if (url.pathname === "/api/admin/payments" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const payments = await listPayments(env.DB, undefined, 100);
          return json(payments);
        }
        if (url.pathname === "/api/admin/threads" && request.method === "GET") {
          const auth = await requireAuthUserId(request, env);
          if ("error" in auth) return auth.error;
          const threads = await listThreads(env.DB, 100);
          return json({ threads, pagination: { page: 1, totalPages: 1, total: threads.length } });
        }
        if (url.pathname === "/api/admin/migrate-news" && request.method === "POST") {
            const auth = await requireAdmin(request, env);
            if ("error" in auth) return auth.error;
            return json({ success: true, message: "News already runs on D1." });
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
                const doc = await getSystemConfig(env.DB, "generator_status");
                if (doc) statusDoc = doc;
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

        // =======================
        // BOOKMARK ROUTES
        // =======================

        if (url.pathname === "/api/bookmarks" && request.method === "GET") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const bookmarks = await listBookmarksByUser(env.DB, auth.userId);
          return json(bookmarks);
        }

        if (url.pathname === "/api/bookmarks" && request.method === "POST") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          const bm = await createBookmark(env.DB, { user_id: auth.userId, ...reqBody });
          return json(bm);
        }

        const bookmarkMatch = url.pathname.match(/^\/api\/bookmarks\/([^\/]+)$/);
        if (bookmarkMatch && request.method === "DELETE") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          await deleteBookmark(env.DB, bookmarkMatch[1]);
          return json({ success: true });
        }

        // =======================
        // BUSINESS & ADS ROUTES
        // =======================

        if (url.pathname === "/api/business/my-business" && request.method === "GET") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const business = await getBusinessByOwner(env.DB, auth.userId);
          return json(business || { success: false, message: "No business profile" }, { status: business ? 200 : 404 });
        }

        if (url.pathname === "/api/business" && request.method === "POST") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          const business = await createBusiness(env.DB, { owner_uid: auth.userId, ...reqBody });
          return json({ success: true, business });
        }

        if (url.pathname === "/api/business" && request.method === "PUT") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          const existing = await getBusinessByOwner(env.DB, auth.userId);
          if (!existing) return json({ success: false, message: "Business not found" }, { status: 404 });
          await updateBusiness(env.DB, existing.id, reqBody);
          return json({ success: true });
        }

        if (url.pathname === "/api/business/ads" && request.method === "GET") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const existing = await getBusinessByOwner(env.DB, auth.userId);
          if (!existing) return json([]);
          const ads = await listBusinessAds(env.DB, existing.id);
          return json(ads);
        }

        if (url.pathname === "/api/business/ads" && request.method === "POST") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const existing = await getBusinessByOwner(env.DB, auth.userId);
          if (!existing) return json({ success: false, message: "Business not found" }, { status: 404 });
          const reqBody = await readJson(request);
          const ad = await createAd(env.DB, existing.id, reqBody);
          return json({ success: true, ad });
        }

        const businessAdMatch = url.pathname.match(/^\/api\/business\/ads\/([^\/]+)$/);
        if (businessAdMatch && request.method === "PUT") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const reqBody = await readJson(request);
          await updateAd(env.DB, businessAdMatch[1], reqBody);
          return json({ success: true });
        }
        if (businessAdMatch && request.method === "DELETE") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          await deleteAd(env.DB, businessAdMatch[1]);
          return json({ success: true });
        }

        if (url.pathname === "/api/business/transactions" && request.method === "GET") {
          const auth = requireAuth(request);
          if ("error" in auth) return auth.error;
          const existing = await getBusinessByOwner(env.DB, auth.userId);
          if (!existing) return json([]);
          const txs = await listBusinessTransactions(env.DB, existing.id);
          return json(txs);
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
    await cleanupExpiredPremium(env);
  }
};

async function cleanupExpiredJobs(env: Env) {
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
        const { results: news } = await env.DB.prepare("SELECT id, category, status, application_end FROM news LIMIT 500").all();
        const now = new Date();
        let expiredCount = 0;
        
        for (const job of (news || []) as any[]) {
            if (job.category === "งานราชการ" && job.status !== "expired" && job.application_end) {
                const endD = parseThaiDate(job.application_end);
                if (endD && endD < now) {
                    await env.DB.prepare("UPDATE news SET status = ?, updated_at = ? WHERE id = ?")
                      .bind("expired", new Date().toISOString(), job.id)
                      .run();
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
    try {
        const rooms = await listExamRooms(env.DB, 1000);
        const now = new Date().getTime();
        let deletedCount = 0;
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        for (const room of rooms) {
            const createdAt = new Date(String(room.created_at || room.updated_at || Date.now())).getTime();
            if (now - createdAt > oneDayMs) {
                await deleteExamRoom(env.DB, room.id);
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


async function cleanupExpiredPremium(env: Env) {
  const now = new Date().toISOString();
  // Set users back to free if their premium_expiry is in the past
  await env.DB.prepare("UPDATE users SET plan_type = 'free', premium_expiry = NULL, premium_start_date = NULL WHERE plan_type = 'premium' AND premium_expiry < ?").bind(now).run();
}


