import { FIGHTERS, FighterId, JUDGE_MODEL, ROUNDS, START_HP } from "./config.js";
import { chat, judgeScore } from "./openrouter.js";

export interface Punch {
  round: number;
  attacker: "blue" | "red";
  fighter: FighterId;
  argument: string;
  damage: number;
  note: string;
}

export interface FightResult {
  thesis: string;
  blue: FighterId;
  red: FighterId;
  punches: Punch[];
  hpBlue: number;
  hpRed: number;
  winner: "blue" | "red" | "draw";
  method: "KO" | "decision" | "draw";
  koRound: number | null;
}

// Build the per-turn prompt for a fighter, including prior arguments for context.
function buildMessages(
  fighter: FighterId,
  thesis: string,
  side: "for" | "against",
  history: Punch[]
) {
  const f = FIGHTERS[fighter];
  const sys =
    `${f.persona}\n\n` +
    `This is a boxing-style debate. You are arguing ${side.toUpperCase()} the thesis. ` +
    `Make ONE new argument that lands like a punch. Do not repeat earlier points. ` +
    `Reply with only the argument text — no preamble, no quotes, 2-3 sentences max.`;

  const transcript = history
    .map(
      (p) =>
        `${FIGHTERS[p.fighter].name} (${
          p.attacker === "blue" ? "for" : "against"
        }): ${p.argument}`
    )
    .join("\n");

  const user =
    `Thesis: "${thesis}"\n` +
    (transcript ? `\nDebate so far:\n${transcript}\n` : "") +
    `\nYour turn. Throw your next argument.`;

  return [
    { role: "system" as const, content: sys },
    { role: "user" as const, content: user },
  ];
}

export async function runFight(
  thesis: string,
  blue: FighterId,
  red: FighterId
): Promise<FightResult> {
  let hpBlue = START_HP;
  let hpRed = START_HP;
  const punches: Punch[] = [];
  let koRound: number | null = null;

  // blue argues FOR the thesis, red argues AGAINST.
  outer: for (let round = 1; round <= ROUNDS; round++) {
    for (const attacker of ["blue", "red"] as const) {
      const fighter = attacker === "blue" ? blue : red;
      const side = attacker === "blue" ? "for" : "against";

      const argument = await chat(
        FIGHTERS[fighter].model,
        buildMessages(fighter, thesis, side, punches),
        { temperature: 0.85, maxTokens: 200 }
      );

      const { damage, note } = await judgeScore(
        JUDGE_MODEL,
        thesis,
        side,
        argument
      );

      punches.push({ round, attacker, fighter, argument, damage, note });

      if (attacker === "blue") hpRed -= damage;
      else hpBlue -= damage;

      if (hpBlue <= 0 || hpRed <= 0) {
        koRound = round;
        break outer;
      }
    }
  }

  hpBlue = Math.max(0, hpBlue);
  hpRed = Math.max(0, hpRed);

  let winner: "blue" | "red" | "draw";
  let method: "KO" | "decision" | "draw";

  if (hpBlue <= 0 && hpRed > 0) {
    winner = "red";
    method = "KO";
  } else if (hpRed <= 0 && hpBlue > 0) {
    winner = "blue";
    method = "KO";
  } else if (hpBlue > hpRed) {
    winner = "blue";
    method = "decision";
  } else if (hpRed > hpBlue) {
    winner = "red";
    method = "decision";
  } else {
    winner = "draw";
    method = "draw";
  }

  return { thesis, blue, red, punches, hpBlue, hpRed, winner, method, koRound };
}
