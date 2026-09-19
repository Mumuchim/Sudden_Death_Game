/* Sudden Death — drifting spores. Shared by both builds. */

/* ---------- motes ---------- */
export function motes(canvas) {
  const cv = canvas || document.getElementById('motes');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W, H;
  const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
  size(); addEventListener('resize', size);
  const n = reduced ? 16 : Math.min(42, Math.floor(innerWidth / 30));
  const parts = [];
  for (let i = 0; i < n; i++) parts.push({
    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
    r: Math.random() * 0.9 + 0.25, s: Math.random() * 0.2 + 0.04,
    d: Math.random() * 6.3, a: Math.random() * 0.16 + 0.05
  });
  (function frame() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (!reduced) { p.y -= p.s; p.d += 0.01; p.x += Math.sin(p.d) * 0.22; }
      if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; }
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, 'rgba(198,226,236,' + p.a + ')');
      g.addColorStop(1, 'rgba(121,200,219,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.3); ctx.fill();
    }
    if (!reduced) requestAnimationFrame(frame);
  })();
}

