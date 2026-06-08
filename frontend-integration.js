/* ============================================================
   PASE ARENA — frontend ↔ backend integration
   ------------------------------------------------------------
   Drop this into index.html (inside the existing <script>, near
   the demo logic) to make "Ring the bell" call the REAL engine
   instead of the random preview. The 3D animation stays the same;
   we just drive the damage/result from the API response.

   1. Set API_BASE to your Railway URL.
   2. Replace the body of fight() with callRealFight() below, OR
      keep both and use a flag.
   ============================================================ */

const API_BASE = "https://pase-api-production.up.railway.app"; // <- your Railway URL

async function callRealFight() {
  if (busy || !ring) return;
  const txt = document.getElementById("thesis").value.trim();
  if (!txt) { demoMsg.textContent = "type a thesis or hit random first"; return; }

  busy = true; reset(); demoMsg.textContent = "the judges are watching…"; roundFlash(1);

  let data;
  try {
    const res = await fetch(API_BASE + "/fight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thesis: txt, blue: bluePick, red: redPick }),
    });
    if (!res.ok) throw new Error("api " + res.status);
    data = await res.json();
  } catch (e) {
    busy = false;
    demoMsg.textContent = "the ring is busy — try again";
    return;
  }

  // Animate punches in sequence using real damage values from the judge.
  demoMsg.textContent = "“" + txt + "”";
  let i = 0;
  const punches = data.punches || [];
  const iv = setInterval(() => {
    if (i >= punches.length) {
      clearInterval(iv);
      // sync final HP + show result from server truth
      hpB = data.hpBlue; hpR = data.hpRed; setHP();
      setTimeout(() => {
        busy = false;
        showResult(data.winner);
        const wn = data.winner === "draw"
          ? "a draw"
          : (data.winner === "blue" ? FIGHTER_NAMES[bluePick] : FIGHTER_NAMES[redPick]);
        demoMsg.innerHTML = data.method === "KO"
          ? 'knockout — <span style="color:var(--lime)">' + wn + "</span>"
          : (data.method === "draw" ? "a draw"
             : 'decision — <span style="color:var(--lime)">' + wn + "</span>");
      }, 700);
      return;
    }
    const p = punches[i];
    if (p.round === 2 && (punches[i - 1]?.round === 1)) roundFlash(2);
    if (p.round === 3 && (punches[i - 1]?.round === 2)) roundFlash(3);
    ring.ps.active = true; ring.ps.who = p.attacker; ring.ps.phase = 0; ring.ps.hit = false;
    // override the random onHit damage with the real one for this punch:
    ring._nextDamage = p.damage;
    i++;
  }, 1150);
}

/* To use real damage in the 3D onHit, change buildRing's demo onHit to:
     onHit:function(who){
       const dmg = ring && ring._nextDamage != null ? ring._nextDamage : Math.round(7+Math.random()*20);
       if(who==='blue')hpR-=dmg; else hpB-=dmg; setHP(); dmgPop(who,dmg);
       if(ring) ring._nextDamage=null;
     }
*/

/* Waitlist example:
   fetch(API_BASE+"/waitlist",{method:"POST",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({email:"x@y.com"})});
*/
