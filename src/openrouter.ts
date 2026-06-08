import { ENV } from "./config.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Single chat completion call to OpenRouter. Returns plain text.
export async function chat(
  model: string,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!ENV.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": ENV.OPENROUTER_REFERER,
      "X-Title": "Pase Arena",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.maxTokens ?? 220,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as any;
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") {
    throw new Error("OpenRouter returned no content");
  }
  return text.trim();
}

// Ask the judge model for a strict JSON damage score. Robust to stray prose.
export async function judgeScore(
  model: string,
  thesis: string,
  side: "for" | "against",
  argument: string
): Promise<{ damage: number; note: string }> {
  const sys =
    "You are a strict, neutral debate judge scoring a single argument in a boxing-style debate. " +
    "Score ONLY on logic, evidence, and how directly it addresses the thesis. " +
    "You do NOT know which debater made it. " +
    "Respond with ONLY a JSON object, no markdown, no prose: " +
    '{"damage": <integer 4-30>, "note": "<max 8 words>"}. ' +
    "Stronger arguments deal more damage.";

  const user = `Thesis: "${thesis}"\nThis argument is arguing ${side} the thesis.\nArgument: "${argument}"\nScore it.`;

  const raw = await chat(model, [
    { role: "system", content: sys },
    { role: "user", content: user },
  ], { temperature: 0.3, maxTokens: 60 });

  // Extract JSON defensively
  const match = raw.match(/\{[\s\S]*\}/);
  let damage = 12;
  let note = "";
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (typeof parsed.damage === "number") damage = parsed.damage;
      if (typeof parsed.note === "string") note = parsed.note;
    } catch {
      /* fall through to default */
    }
  }
  // Clamp to sane range
  damage = Math.max(4, Math.min(30, Math.round(damage)));
  return { damage, note: note.slice(0, 60) };
}
