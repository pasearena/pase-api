import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { ENV, FIGHTERS, FighterId } from "./config.js";
import { runFight } from "./fight.js";
import { saveFight, getLeaderboard, addToWaitlist } from "./db.js";

const app = Fastify({ logger: true, bodyLimit: 1024 * 16 });

await app.register(cors, {
  origin: [ENV.ALLOWED_ORIGIN, "http://localhost:3000", "http://127.0.0.1:5500"],
  methods: ["GET", "POST"],
});

await app.register(rateLimit, {
  global: false,
  max: 30,
  timeWindow: "1 minute",
});

const VALID = Object.keys(FIGHTERS) as FighterId[];
const isFighter = (x: unknown): x is FighterId =>
  typeof x === "string" && (VALID as string[]).includes(x);

// Health check (Railway)
app.get("/", async () => ({ ok: true, service: "pase-arena-api" }));
app.get("/health", async () => ({ ok: true }));

// Roster info for the frontend
app.get("/fighters", async () => ({
  fighters: VALID.map((id) => ({
    id,
    name: FIGHTERS[id].name,
    corner: FIGHTERS[id].corner,
  })),
}));

// Core fight engine — tighter limit because it costs OpenRouter tokens.
app.post(
  "/fight",
  { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
  async (req, reply) => {
    const body = (req.body ?? {}) as {
      thesis?: string;
      blue?: string;
      red?: string;
    };
    const thesis = (body.thesis ?? "").trim();

    if (thesis.length < 4 || thesis.length > 240) {
      return reply.code(400).send({ error: "thesis must be 4-240 chars" });
    }
    if (!isFighter(body.blue) || !isFighter(body.red)) {
      return reply.code(400).send({ error: "invalid blue/red fighter id" });
    }
    if (body.blue === body.red) {
      return reply.code(400).send({ error: "pick two different fighters" });
    }

    try {
      const result = await runFight(thesis, body.blue, body.red);
      let id: string | undefined;
      try {
        id = (await saveFight(result)) ?? undefined;
      } catch (e) {
        req.log.warn({ e }, "saveFight failed (continuing)");
      }
      return { id, ...result };
    } catch (e: any) {
      req.log.error({ e }, "fight failed");
      return reply.code(502).send({ error: "fight engine error" });
    }
  }
);

// Leaderboard
app.get("/leaderboard", async (_req, reply) => {
  try {
    const rows = await getLeaderboard(10);
    return { leaderboard: rows };
  } catch (e: any) {
    return reply.code(500).send({ error: "leaderboard error" });
  }
});

// Waitlist
app.post(
  "/waitlist",
  { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
  async (req, reply) => {
    const body = (req.body ?? {}) as { email?: string; wallet?: string };
    const email = body.email?.trim();
    const wallet = body.wallet?.trim();

    if (!email && !wallet) {
      return reply.code(400).send({ error: "email or wallet required" });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply.code(400).send({ error: "invalid email" });
    }
    if (wallet && (wallet.length < 32 || wallet.length > 64)) {
      return reply.code(400).send({ error: "invalid wallet" });
    }

    try {
      await addToWaitlist({ email, wallet });
      return { ok: true };
    } catch (e: any) {
      req.log.error({ e }, "waitlist error");
      return reply.code(500).send({ error: "waitlist error" });
    }
  }
);

app
  .listen({ port: ENV.PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`pase-arena-api on :${ENV.PORT}`))
  .catch((e) => {
    app.log.error(e);
    process.exit(1);
  });
