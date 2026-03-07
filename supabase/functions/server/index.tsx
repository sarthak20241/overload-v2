import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// ── Supabase clients ──────────────────────────────────────────────────────────
function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

function anonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
}

async function getUser(req: Request) {
  // The client sends the user's access_token as "Authorization: Bearer <token>".
  // We validate it with supabase.auth.getUser() so the server can identify the caller.
  const auth = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  if (!auth) return null;
  try {
    const { data } = await anonClient().auth.getUser(auth);
    return data.user ?? null;
  } catch {
    return null;
  }
}

// ── Path normalisation ────────────────────────────────────────────────────────
// Supabase may include the function name in the path. Strip it so we always
// route against a clean path like "/routines" or "/sessions".
function normPath(rawPath: string): string {
  // Remove /make-server-89faff51 prefix (and anything before it)
  const idx = rawPath.indexOf("/make-server-89faff51");
  if (idx !== -1) {
    const after = rawPath.slice(idx + "/make-server-89faff51".length);
    return after || "/";
  }
  return rawPath || "/";
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  // Always handle CORS preflight first — no auth required
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: CORS });
  }

  const path = normPath(new URL(req.url).pathname);
  const method = req.method;
  console.log(`[${method}] ${path}`);

  try {
    // ── Health ────────────────────────────────────────────────────────────────
    if (path === "/health" && method === "GET") {
      return json({ status: "ok" });
    }

    // ── Auth: sign up ─────────────────────────────────────────────────────────
    if (path === "/auth/signup" && method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { email, password, name } = body as Record<string, string>;
      if (!email || !password) {
        return json({ error: "email and password are required" }, 400);
      }
      const { data, error } = await adminClient().auth.admin.createUser({
        email,
        password,
        user_metadata: { name: name || email.split("@")[0] },
        email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ user: data.user }, 201);
    }

    // ── Auth: delete account ──────────────────────────────────────────────────
    if (path === "/auth/delete-account" && method === "DELETE") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);

      const [routines, sessions] = await Promise.all([
        kv.getByPrefix(`routine:${user.id}:`),
        kv.getByPrefix(`session:${user.id}:`),
      ]);

      const keysToDelete: string[] = [];
      for (const r of (routines as any[]) ?? []) {
        if (r?.id) keysToDelete.push(`routine:${user.id}:${r.id}`);
      }
      for (const s of (sessions as any[]) ?? []) {
        if (s?.id) keysToDelete.push(`session:${user.id}:${s.id}`);
      }
      if (keysToDelete.length > 0) await kv.mdel(keysToDelete);
      await adminClient().auth.admin.deleteUser(user.id);
      return json({ success: true });
    }

    // ── Routines: list ────────────────────────────────────────────────────────
    if (path === "/routines" && method === "GET") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const data = await kv.getByPrefix(`routine:${user.id}:`);
      return json((data as any[]) ?? []);
    }

    // ── Routines: create ──────────────────────────────────────────────────────
    if (path === "/routines" && method === "POST") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const now = new Date().toISOString();
      const routine = { ...body, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
      await kv.set(`routine:${user.id}:${routine.id}`, routine);
      return json(routine, 201);
    }

    // ── Routines: update / delete (by id) ─────────────────────────────────────
    const routineId = path.match(/^\/routines\/([^/]+)$/)?.[1];
    if (routineId) {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const key = `routine:${user.id}:${routineId}`;

      if (method === "PUT") {
        const existing = (await kv.get(key)) as Record<string, unknown> | null;
        if (!existing) return json({ error: "Not found" }, 404);
        const body = await req.json();
        const updated = { ...existing, ...body, id: routineId, updatedAt: new Date().toISOString() };
        await kv.set(key, updated);
        return json(updated);
      }
      if (method === "DELETE") {
        await kv.del(key);
        return json({ success: true });
      }
    }

    // ── Sessions: list ────────────────────────────────────────────────────────
    if (path === "/sessions" && method === "GET") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const data = ((await kv.getByPrefix(`session:${user.id}:`)) as any[]) ?? [];
      data.sort((a: any, b: any) => {
        return new Date(b?.startTime ?? 0).getTime() - new Date(a?.startTime ?? 0).getTime();
      });
      return json(data);
    }

    // ── Sessions: save ────────────────────────────────────────────────────────
    if (path === "/sessions" && method === "POST") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const body = await req.json();
      const session = { ...body, id: body.id || crypto.randomUUID() };
      await kv.set(`session:${user.id}:${session.id}`, session);
      return json(session, 201);
    }

    // ── Sessions: delete (by id) ──────────────────────────────────────────────
    const sessionId = path.match(/^\/sessions\/([^/]+)$/)?.[1];
    if (sessionId && method === "DELETE") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      await kv.del(`session:${user.id}:${sessionId}`);
      return json({ success: true });
    }

    // ── AI: generate routine ──────────────────────────────────────────────────
    if (path === "/ai/generate-routine" && method === "POST") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { prompt } = await req.json();
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) return json({ error: "Gemini API key not configured" }, 503);

      const systemPrompt = `You are a gym coach. Generate a workout routine based on: "${prompt}"

Return ONLY valid JSON with no markdown or code fences:
{
  "name": "Routine Name",
  "description": "Brief description",
  "exercises": [
    {
      "id": "1",
      "name": "Exercise Name",
      "muscleGroup": "Chest",
      "targetSets": 3,
      "targetReps": "8-12",
      "restSeconds": 90,
      "notes": ""
    }
  ]
}`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
          }),
        }
      );

      if (!geminiRes.ok) {
        return json({ error: `Gemini error: ${geminiRes.status}` }, 502);
      }
      const gData = await geminiRes.json();
      const text: string = gData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "Could not parse AI response" }, 502);
      const routine = JSON.parse(match[0]);
      if (Array.isArray(routine.exercises)) {
        routine.exercises = routine.exercises.map((ex: any) => ({
          ...ex,
          id: crypto.randomUUID(),
        }));
      }
      return json(routine);
    }

    // ── AI: coaching insights ─────────────────────────────────────────────────
    if (path === "/ai/coaching" && method === "POST") {
      const user = await getUser(req);
      if (!user) return json({ error: "Unauthorized" }, 401);
      const { sessions } = await req.json();
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) return json({ error: "Gemini API key not configured" }, 503);

      const summary = ((sessions as any[]) ?? []).slice(0, 10).map((s: any) => ({
        date: s.startTime,
        name: s.routineName,
        durationMin: Math.round((s.durationSeconds ?? 0) / 60),
        totalVolume: s.totalVolume ?? 0,
        exercises: (s.exercises ?? []).map((e: any) => ({
          name: e.name,
          completedSets: (e.sets ?? [])
            .filter((st: any) => st.completed)
            .map((st: any) => `${st.weight}kg×${st.reps}`),
        })),
      }));

      const prompt = `You are an expert strength coach. Analyse these recent workouts and give exactly 4 bullet-point insights:

${JSON.stringify(summary, null, 2)}

Cover: 1) progressive overload 2) consistency 3) one improvement tip 4) motivation.
Each bullet starts with •. Be specific, concise, and positive.`;

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 512 },
          }),
        }
      );

      if (!geminiRes.ok) return json({ error: `Gemini error: ${geminiRes.status}` }, 502);
      const gData = await geminiRes.json();
      const insights: string = gData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return json({ insights });
    }

  } catch (err) {
    console.error("Unhandled error:", err);
    return json({ error: String(err) }, 500);
  }

  return json({ error: "Not found" }, 404);
});