/* Multi-Window 3D Hologram Scene (2D canvas projection)
   - Rotating hologram sphere with neon glow
   - BroadcastChannel sync between windows
   - Filament connection between peers
*/
(() => {
  const canvas = document.getElementById('glow');
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 1.25);
  function resize() {
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  // Parameters
  const POINTS = Math.min(1800, Math.floor((W*H) * 0.0016)); // dense points on sphere
  const R = Math.min(W, H) * 0.32; // sphere radius
  const hueSelf = (Math.random() * 360) | 0; // each window own hue
  function contentScreenOrigin(){
    // best-effort: map canvas(0,0) to screen coords using chrome-like metrics
    const offX = (window.outerWidth - window.innerWidth) / 2;
    const offY = (window.outerHeight - window.innerHeight); // titlebar + toolbar height
    return { x: window.screenX + (offX||0), y: window.screenY + (offY||0) };
  }
  let rotY = 0, rotZ = 0;
  let targetVelY = 0.0025, targetVelZ = -0.0013; // idle spin
  let velY = targetVelY, velZ = targetVelZ;

  // Window movement impulse (for dust burst)
  let lastOrigin = null;
  let impulseX = 0, impulseY = 0; // in canvas px/frame
  function updateImpulse() {
    const o = contentScreenOrigin();
    if (lastOrigin) {
      const dx = o.x - lastOrigin.x;
      const dy = o.y - lastOrigin.y;
      // 큰 이동 시 즉각적인 임펄스
      impulseX += dx * 0.7;
      impulseY += dy * 0.7;
    }
    lastOrigin = o;
    // 서서히 감쇠
    impulseX *= 0.9;
    impulseY *= 0.9;
    if (Math.abs(impulseX) < 0.02) impulseX = 0;
    if (Math.abs(impulseY) < 0.02) impulseY = 0;
  }

  // Pointer rotate control
  const pointer = { x: W/2, y: H/2, down:false };
  window.addEventListener('mousemove', (e)=>{ pointer.x=e.clientX; pointer.y=e.clientY; });
  window.addEventListener('mousedown', ()=>{ pointer.down = true; });
  window.addEventListener('mouseup', ()=>{ pointer.down = false; });

  // Fibonacci sphere sampling
  const pts = [];
  const PHI = Math.PI * (3 - Math.sqrt(5));
  const n = POINTS;
  for (let i=0;i<n;i++){
    const y = 1 - (i / (n-1)) * 2; // y from 1 to -1
    const radius = Math.sqrt(1 - y*y);
    const theta = PHI * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    pts.push({x, y, z});
  }

  function rotateAndProject(p){
    // rotate around Y then Z
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = p.x * cosY - p.z * sinY;
    const z1 = p.x * sinY + p.z * cosY;
    const cosZ = Math.cos(rotZ), sinZ = Math.sin(rotZ);
    const x2 = x1 * cosZ - p.y * sinZ;
    const y2 = x1 * sinZ + p.y * cosZ;
    const fov = 500;
    const scale = fov / (fov + z1 * 500);
    return { sx: W/2 + x2 * R * scale, sy: H/2 + y2 * R * scale, s: scale, z: z1 };
  }

  // Multi-window sync (BroadcastChannel with localStorage fallback)
  const id = Math.random().toString(36).slice(2);
  const peers = new Map(); // id -> {x,y,hue,last}
  let useBC = false;
  let channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('mw3d-demo');
      useBC = true;
    }
  } catch {}

  function receiveMsg(m){
    if (!m || m.id === id) return;
    peers.set(m.id, { x: m.x, y: m.y, hue: m.hue, last: performance.now() });
  }

  if (useBC) {
    channel.onmessage = (ev)=> receiveMsg(ev.data || {});
  } else {
    window.addEventListener('storage', (e) => {
      if (e.key !== 'mw3d-demo') return;
      try { const data = JSON.parse(e.newValue || '{}'); receiveMsg(data); } catch{}
    });
  }

  function broadcast(){
    const o = contentScreenOrigin();
    const payload = { id,
      x: pointer.x/Math.max(1,W), y: pointer.y/Math.max(1,H),
      hue: hueSelf, t: performance.now(),
      sx: o.x, sy: o.y, iw: window.innerWidth, ih: window.innerHeight
    };
    if (useBC && channel) channel.postMessage(payload);
    else try { localStorage.setItem('mw3d-demo', JSON.stringify(payload)); } catch{}
  }
  setInterval(broadcast, 80);

  function cleanupPeers(){
    const now = performance.now();
    for (const [k,v] of peers) if (now - v.last > 5000) peers.delete(k);
  }

  function peerCenterOnMyCanvas(peer){
    // map peer window center to my canvas coordinates
    const my = contentScreenOrigin();
    const px = peer.sx + peer.iw/2 - my.x;
    const py = peer.sy + peer.ih/2 - my.y;
    return { x: px, y: py };
  }

  function drawFilamentToPeer(peer){
    const x1 = W/2, y1 = H/2; // my center
    // peer pointer as fallback, but prefer window center if available
    const pc = peer.sx!=null ? peerCenterOnMyCanvas(peer) : { x: peer.x * W, y: peer.y * H };
    const x2 = pc.x, y2 = pc.y;
    const dx = x2 - x1, dy = y2 - y1, dist = Math.hypot(dx, dy);
    const midx = x1 + dx * 0.5, midy = y1 + dy * 0.5;
    const nx = -dy, ny = dx;
    const curve = Math.min(160, 40 + dist * 0.18);
    const safe = dist > 0.0001 ? (curve/dist) : 0;
    const cx1 = midx + nx * safe;
    const cy1 = midy + ny * safe;

    const grd = ctx.createLinearGradient(x1, y1, x2, y2);
    grd.addColorStop(0, `hsla(${hueSelf}, 90%, 60%, 0.9)`);
    grd.addColorStop(1, `hsla(${peer.hue}, 90%, 60%, 0.9)`);

    ctx.strokeStyle = grd;
    ctx.shadowColor = `hsla(${(hueSelf+peer.hue)/2}, 100%, 70%, 1)`;
    ctx.shadowBlur = 24;
    for (let w=12; w>=2; w-=2){
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx1, cy1, x2, y2);
      ctx.stroke();
    }

    // When windows overlap (centers close), boost blending/merge
    const merge = Math.max(0, 1 - dist / (R*2.2));
    if (merge > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.shadowBlur = 40 * merge;
      ctx.shadowColor = `hsla(${peer.hue}, 100%, 60%, ${0.6*merge})`;
      ctx.fillStyle = `hsla(${peer.hue}, 100%, 60%, ${0.12*merge})`;
      ctx.beginPath(); ctx.arc(x1, y1, R*(0.9+0.3*merge), 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, R*(0.9+0.3*merge), 0, Math.PI*2); ctx.fill();
    }
  }

  function frame(){
    // tiny debug overlay (shows peer count)
    ctx.save();
    cleanupPeers();
    updateImpulse();

    // inertia & rotation target from pointer
    const dx = (pointer.x - W/2) / W;
    const dy = (pointer.y - H/2) / H;
    targetVelY = 0.003 + dx * 0.01;
    targetVelZ = -0.002 + dy * -0.004;
    velY += (targetVelY - velY) * 0.08;
    velZ += (targetVelZ - velZ) * 0.08;
    rotY += velY;
    rotZ += velZ;

    // fade trail
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2,2,2,0.25)';
    ctx.fillRect(0,0,W,H);

    // hologram points with additive glow
    ctx.globalCompositeOperation = 'lighter';
    const t = performance.now() * 0.001;
    for (let i=0; i<pts.length; i+=2){ // 절반만 찍어 성능 절약
      const p = rotateAndProject(pts[i]);
      const a = Math.max(0, Math.min(1, (1 - (p.z+1)/2)));
      const r = 1.2 + 2.2 * p.s;
      // 노이즈를 섞은 임펄스 방향으로 미세 오프셋을 적용해 가루가 튀는 느낌
      const n = Math.sin(i*12.9898 + t*5.233) * 0.5 + 0.5; // 0..1
      const ox = impulseX * (0.06 + 0.14*n) * (0.6 + 0.6*p.s);
      const oy = impulseY * (0.06 + 0.14*(1-n)) * (0.6 + 0.6*p.s);
      // 다중 패스로 잔상 느낌 강화
      for (let k=0; k<2; k++) {
        const fade = k===0 ? 0.7 : 0.35;
        const sx = p.sx - ox * (k+1);
        const sy = p.sy - oy * (k+1);
        ctx.shadowBlur = 10 * p.s * (1.0 - 0.25*k);
        ctx.shadowColor = `hsla(${hueSelf}, 100%, 60%, ${0.55*a*fade})`;
        ctx.fillStyle = `hsla(${hueSelf}, 100%, 60%, ${0.45*a*fade})`;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI*2); ctx.fill();
      }
    }

    // sphere rim
    ctx.lineWidth = 1.1;
    ctx.shadowBlur = 20;
    ctx.shadowColor = `hsla(${hueSelf}, 100%, 65%, .8)`;
    ctx.strokeStyle = `hsla(${hueSelf}, 100%, 65%, .35)`;
    ctx.beginPath(); ctx.arc(W/2, H/2, R, 0, Math.PI*2); ctx.stroke();

    // filaments to peers
    for (const peer of peers.values()) drawFilamentToPeer(peer);

    // debug text
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,255,.5)';
    ctx.font = '12px system-ui';
    ctx.fillText(`${useBC? 'BC':'LS'} peers:${peers.size}`, 10, 16);
    ctx.restore();

    requestAnimationFrame(frame);
  }
  frame();
})();
