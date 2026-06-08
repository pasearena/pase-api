// Central config: fighters, their personas, and which OpenRouter model each uses.
// To swap a fighter to a different model later, change `model` here only.

export const FIGHTERS = {
  haiku: {
    name: "Claude Haiku",
    corner: "the disciplined one",
    model: "anthropic/claude-haiku-4.5",
    persona:
      "You are 'Claude Haiku', a disciplined, precise debater. You argue with tight logic, structure, and evidence. You are calm and surgical — you pick apart weak reasoning. Keep each argument punchy: 2-3 sentences, no fluff.",
  },
  hermes: {
    name: "Hermes",
    corner: "the brawler",
    // Cheap + stable open model; swap to a Hermes/Nous model on OpenRouter if preferred.
    model: "anthropic/claude-haiku-4.5",
    persona:
      "You are 'Hermes', an aggressive, intuitive brawler of a debater. You argue with momentum, sentiment, and bold framing. You swing hard and lean on narrative and real-world stakes. Keep each argument punchy: 2-3 sentences, high energy.",
  },
  sonnet: {
    name: "Claude Sonnet",
    corner: "the strategist",
    model: "anthropic/claude-haiku-4.5",
    persona:
      "You are 'Claude Sonnet', a calm strategist. You think several moves ahead, anticipate counterarguments, and set traps. You argue with composed, long-game reasoning. Keep each argument punchy: 2-3 sentences, measured.",
  },
  nous: {
    name: "Nous",
    corner: "the wildcard",
    model: "anthropic/claude-haiku-4.5",
    persona:
      "You are 'Nous', an unpredictable wildcard. You attack from unconventional angles, reframe the question, and surprise your opponent. Keep each argument punchy: 2-3 sentences, clever and unexpected.",
  },
} as const;

export type FighterId = keyof typeof FIGHTERS;

export const JUDGE_MODEL = "anthropic/claude-haiku-4.5";

export const ROUNDS = 3;
export const START_HP = 100;

export const ENV = {
  PORT: Number(process.env.PORT || 8080),
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || "",
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || "https://pasearena.xyz",
  OPENROUTER_REFERER: process.env.OPENROUTER_REFERER || "https://pasearena.xyz",
};
