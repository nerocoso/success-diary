// Three.js-based Multi-Window 3D (inspired by bgstaal/multipleWindow3dScene)
// - Uses WindowManager(localStorage) to sync window shapes
// - Renders a hologram-like sphere with additive particles
// - Draws screen-space filaments between window centers on a 2D overlay

import WindowManager from './WindowManager.js';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.124/build/three.module.js';

// DOM
const overlay = document.getElementById('glow'); // 2D overlay
const octx = overlay.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 1.25);
let W = 0, H = 0;
function resizeOverlay() {
  W = overlay.clientWidth = window.innerWidth;
  H = overlay.clientHeight = window.innerHeight;
  overlay.width = Math.floor(W * DPR);
  overlay.height = Math.floor(H * DPR);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Create WebGL canvas (underlay)
const glCanvas = document.createElement('canvas');
Object.assign(glCanvas.style, { position:'fixed', inset:'0', width:'100%', height:'100%', display:'block', zIndex:'0' });
document.body.insertBefore(glCanvas, overlay); // place under overlay

// Three.js scene
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(DPR);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
camera.position.z = 420;

// Hologram sphere (points)
const hueSelf = (Math.random()*360)|0;
const color = new THREE.Color(`hsl(${hueSelf},100%,60%)`);
const PARTICLES = Math.min(18000, Math.floor((window.innerWidth*window.innerHeight) * 0.12));
const R = Math.min(window.innerWidth, window.innerHeight) * 0.28 + 120;

// Fibonacci sphere sampling
function fibSphere(n){
  const pts = [];
  const PHI = Math.PI * (3 - Math.sqrt(5));
  for (let i=0;i<n;i++){
    const y = 1 - (i/(n-1))*2;
    const r = Math.sqrt(1 - y*y);
    const theta = PHI * i;
    const x = Math.cos(theta)*r;
    const z = Math.sin(theta)*r;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return pts;
}

const geom = new THREE.BufferGeometry();
const basePts = fibSphere(Math.max(2000, Math.floor(PARTICLES/6)));
const positions = new Float32Array(basePts.length * 3);
for (let i=0;i<basePts.length;i++){
  positions[i*3+0] = basePts[i].x * R;
  positions[i*3+1] = basePts[i].y * R;
  positions[i*3+2] = basePts[i].z * R;
}
geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const uniforms = {
  uColor: { value: new THREE.Vector3(color.r, color.g, color.b) },
  uSize: { value: 6.0 * DPR },
  uTime: { value: 0.0 },
  uImpulse: { value: new THREE.Vector2(0,0) }
};

const vsh = `
  uniform float uSize; uniform float uTime; uniform vec2 uImpulse;
  varying float vAlpha; varying float vDepth;
  void main(){
    vec3 p = position;
    // tiny breathing noise based on position
    float n = sin(dot(p, vec3(0.002,0.003,0.001)) + uTime*2.0);
    p += normalize(p) * n * 2.2;
    // impulse streak in view space (screen-aligned)
    p.xy -= uImpulse * 20.0;
    vec4 mv = modelViewMatrix * vec4(p,1.0);
    gl_Position = projectionMatrix * mv;
    float dist = length(mv.xyz);
    gl_PointSize = uSize * clamp(400.0/dist, 0.5, 3.0);
    vAlpha = clamp(1.5 - dist/600.0, 0.0, 1.0);
    vDepth = dist;
  }
`;
const fsh = `
  precision mediump float; varying float vAlpha; varying float vDepth;
  uniform vec3 uColor;
  void main(){
    vec2 uv = gl_PointCoord*2.0-1.0; float r = dot(uv,uv);
    float a = exp(-3.0*r) * vAlpha; // soft glow falloff
    gl_FragColor = vec4(uColor, a);
  }
`;

const mat = new THREE.ShaderMaterial({
  uniforms, vertexShader: vsh, fragmentShader: fsh,
  blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
});
const points = new THREE.Points(geom, mat);
scene.add(points);

// Resize
function resize(){
  resizeOverlay();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Window manager sync
const wm = new WindowManager();
wm.setWinShapeChangeCallback(()=>{});
wm.setWinChangeCallback(()=>{});
wm.init({ hue: hueSelf });

// Scene motion & impulse (window move)
let sceneOffset = new THREE.Vector2();
let sceneOffsetTarget = new THREE.Vector2();
let lastOrigin = null; let impulse = new THREE.Vector2();
function screenOrigin(){
  const offX = (window.outerWidth - window.innerWidth) / 2;
  const offY = (window.outerHeight - window.innerHeight);
  return new THREE.Vector2(window.screenX + (offX||0), window.screenY + (offY||0));
}

// Pointer influences rotation
const pointer = new THREE.Vector2(window.innerWidth/2, window.innerHeight/2);
window.addEventListener('mousemove', (e)=>{ pointer.set(e.clientX, e.clientY); });

// Filament drawing on overlay
function drawFilaments(){
  octx.clearRect(0,0,W,H);
  const wins = wm.getWindows()||[];
  const me = wm.getThisWindowData();
  if (!me) return;
  const myCenter = { x: me.shape.x + me.shape.w/2, y: me.shape.y + me.shape.h/2 };
  // convert others centers into my canvas coordinates
  const myOrigin = screenOrigin();
  for (const w of wins){
    if (w.id === me.id) continue;
    const pc = { x: w.shape.x + w.shape.w/2, y: w.shape.y + w.shape.h/2 };
    const x1 = W/2, y1 = H/2;
    const x2 = pc.x - myOrigin.x, y2 = pc.y - myOrigin.y;
    const dx = x2 - x1, dy = y2 - y1; const dist = Math.hypot(dx,dy);
    const midx = x1 + dx*0.5, midy = y1 + dy*0.5; const nx = -dy, ny = dx;
    const curve = Math.min(200, 60 + dist*0.18); const safe = dist>0.001? curve/dist : 0;
    const cx1 = midx + nx*safe, cy1 = midy + ny*safe;
    const huePeer = (w.metaData && w.metaData.hue) || 0;
    const grd = octx.createLinearGradient(x1,y1,x2,y2);
    grd.addColorStop(0, `hsla(${hueSelf}, 90%, 60%, 0.9)`);
    grd.addColorStop(1, `hsla(${huePeer}, 90%, 60%, 0.9)`);
    octx.strokeStyle = grd;
    octx.shadowColor = `hsla(${(hueSelf+huePeer)/2}, 100%, 70%, 1)`;
    octx.shadowBlur = 22;
    for (let wLine=12; wLine>=2; wLine-=2){
      octx.lineWidth = wLine;
      octx.beginPath();
      octx.moveTo(x1,y1); octx.quadraticCurveTo(cx1,cy1,x2,y2); octx.stroke();
    }
    const merge = Math.max(0, 1 - dist / (Math.min(W,H)*0.9));
    if (merge>0){
      octx.globalCompositeOperation='lighter';
      octx.shadowBlur = 36*merge; octx.shadowColor = `hsla(${huePeer},100%,60%,${0.6*merge})`;
      octx.fillStyle = `hsla(${huePeer},100%,60%,${0.1*merge})`;
      octx.beginPath(); octx.arc(x2,y2, Math.min(W,H)*0.22*(0.9+0.3*merge), 0, Math.PI*2); octx.fill();
      octx.globalCompositeOperation='source-over';
    }
  }
}

// Render loop
let t0 = performance.now();
function tick(){
  const now = performance.now();
  const dt = Math.min(33, now - t0); t0 = now;
  wm.update();

  // smooth window offset & impulse
  const o = screenOrigin();
  if (lastOrigin){
    const dx = o.x - lastOrigin.x; const dy = o.y - lastOrigin.y;
    impulse.x += dx * 0.6; impulse.y += dy * 0.6;
    sceneOffsetTarget.set(-window.screenX, -window.screenY);
  } else {
    sceneOffset.set(-window.screenX, -window.screenY);
    sceneOffsetTarget.copy(sceneOffset);
  }
  lastOrigin = o;
  sceneOffset.lerp(sceneOffsetTarget, 0.08);
  impulse.multiplyScalar(0.9);
  if (Math.abs(impulse.x)<0.05) impulse.x=0; if (Math.abs(impulse.y)<0.05) impulse.y=0;

  // camera subtle rotation via pointer
  const dxp = (pointer.x - W/2) / W; const dyp = (pointer.y - H/2) / H;
  points.rotation.y += 0.003 + dxp * 0.04;
  points.rotation.z += -0.002 + dyp * -0.02;

  // apply offset to scene by moving camera
  scene.position.set(sceneOffset.x, sceneOffset.y, 0);

  uniforms.uTime.value = now*0.001;
  uniforms.uImpulse.value.set(impulse.x, impulse.y);

  renderer.render(scene, camera);
  drawFilaments();
  requestAnimationFrame(tick);
}

resizeOverlay();
tick();
