// ============================================================
// Prompt Intelligence Worker — Cloudflare Edge AI Refiner
// Receives vague prompt text → returns polished technical version
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

    return new Response(JSON.stringify({ refined }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
