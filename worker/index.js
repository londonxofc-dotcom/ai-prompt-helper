// ============================================================
// Prompt Intelligence Worker — Cloudflare Edge AI Refiner
// Rate limited: 20 requests per IP per day via KV
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const DAILY_LIMIT = 20;

// ── Rate Limiter ────────────────────────────────────────────
async function checkRateLimit(env, ip) {
  const today = new Date().toISOString().slice(0, 10); // "2026-03-30"
  const key = `rl:${ip}:${today}`;

  const current = await env.RATE_LIMITS.get(key);
  const count = current ? parseInt(current) : 0;

  if (count >= DAILY_LIMIT) {
    return { allowed: false, count, remaining: 0 };
  }

  // Increment with 25hr TTL (covers timezone edge cases)
  await env.RATE_LIMITS.put(key, String(count + 1), { expirationTtl: 90000 });
  return { allowed: true, count: count + 1, remaining: DAILY_LIMIT - count - 1 };
}

// ── Main Handler ────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "POST only" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Get client IP
    const ip = request.headers.get("CF-Connecting-IP") ||
                request.headers.get("X-Forwarded-For") ||
                "unknown";

    // Check rate limit
    const { allowed, remaining } = await checkRateLimit(env, ip);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "Daily limit reached",
          message: `You've used all ${DAILY_LIMIT} AI refinements for today. Resets at midnight UTC.`,
        }),
        {
          status: 429,
          headers: {
            ...CORS_HEADERS,
            "Content-Type": "application/json",
            "X-RateLimit-Limit": String(DAILY_LIMIT),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    // Parse body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const { prompt } = body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: "No prompt provided" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Call Anthropic Claude API
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: `You are a prompt engineering assistant. Your job is to take vague, informal descriptions of UI/UX or frontend development goals and rewrite them as precise, technical prompts that a developer or AI coding assistant can act on immediately.

Rules:
- Keep it concise (1-3 sentences max)
- Use exact technical terminology (CSS properties, library names, API names)
- Be specific about implementation approach
- Do NOT add explanations or caveats — just the refined prompt
- Output the refined prompt only, no preamble`,
        messages: [
          {
            role: "user",
            content: `Rewrite this as a precise technical prompt:\n\n"${prompt.trim()}"`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      return new Response(JSON.stringify({ error: "AI API error", detail: err }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await anthropicRes.json();
    const refined = data?.content?.[0]?.text?.trim() || "";

    return new Response(JSON.stringify({ refined, remaining }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(DAILY_LIMIT),
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  },
};
