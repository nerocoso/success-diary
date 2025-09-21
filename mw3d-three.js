// Three.js-based Multi-Window 3D — Hologram sphere version (GPU-friendly, smooth)
// - Keeps WindowManager(localStorage) sync (bgstaal style)
// - Replaces cube demo with a neon hologram sphere using Points + ShaderMaterial
// - Overlay 2D canvas draws filaments/merge blending between window centers

import WindowManager from './WindowManager.js';
// THREE is provided globally by three.min.js included in mw3d.html

// DOM & overlay (for filaments)
const t = THREE;
const overlay = document.getElementById('glow');
const octx = overlay.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 1.25);
let W = 0, H = 0;
function resizeOverlay(){
  W = window.innerWidth; H = window.innerHeight;
  overlay.width = Math.floor(W * DPR);
  overlay.height = Math.floor(H * DPR);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Three.js scene (Perspective for nicer depth)
let camera, scene, renderer, world;
let sceneOffsetTarget = { x: 0, y: 0 };
let sceneOffset = { x: 0, y: 0 };
function setupScene(){
  camera = new t.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.z = 420;
  scene = new t.Scene();
  scene.background = new t.Color(0x000000);
  world = new t.Object3D();
  scene.add(world);
  renderer = new t.WebGLRenderer({ antialias:true, alpha:false, preserveDrawingBuffer:false });
  renderer.setPixelRatio(DPR);
  document.body.appendChild(renderer.domElement);
}

// Hologram sphere (GPU points)
const hueSelf = (Math.random()*360)|0;
const color = new t.Color(`hsl(${hueSelf},100%,60%)`);
let points; let uniforms; let R;
function buildHologram(){
  // Smaller radius for tighter, more readable sphere
  R = Math.min(window.innerWidth, window.innerHeight) * 0.24;
  const area = window.innerWidth * window.innerHeight;
  // Increase particle count slightly for perceived density at smaller size
  const N = Math.min(22000, Math.max(8000, Math.floor(area * 0.03))); // adaptive
  const PHI = Math.PI * (3 - Math.sqrt(5));
  const pos = new Float32Array(N*3);
  for (let i=0;i<N;i++){
    const y = 1 - (i/(N-1))*2; const r = Math.sqrt(1 - y*y); const th = PHI*i;
    pos[i*3+0] = Math.cos(th)*r * R;
    pos[i*3+1] = y * R;
    pos[i*3+2] = Math.sin(th)*r * R;
  }
  const geom = new t.BufferGeometry();
  geom.setAttribute('position', new t.BufferAttribute(pos, 3));
  uniforms = {
    uColor: { value: new t.Vector3(color.r, color.g, color.b) },
    uSize: { value: 4.0 * DPR },
    uTime: { value: 0.0 },
    uImpulse: { value: new t.Vector2(0,0) }
  };
  const vsh = `
    uniform float uSize; uniform float uTime; uniform vec2 uImpulse;
    varying float vA;
    float hash(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
    void main(){
      vec3 p = position;
      float n = hash(normalize(p)*0.7 + uTime*0.12);
      p += normalize(p) * (n-0.5) * 6.0;  // subtle surface jitter
      p.xy -= uImpulse * 18.0;           // window-move impulse
      vec4 mv = modelViewMatrix * vec4(p,1.0);
      gl_Position = projectionMatrix * mv;
      float d = length(mv.xyz);
      gl_PointSize = uSize * clamp(420.0/d, 0.6, 3.2);
      vA = clamp(1.4 - d/580.0, 0.0, 1.0);
    }`;
  const fsh = `
    precision mediump float; varying float vA; uniform vec3 uColor;
    void main(){ vec2 uv = gl_PointCoord*2.0-1.0; float r=dot(uv,uv);
      float a = exp(-3.2*r) * vA; gl_FragColor = vec4(uColor, a);
    }`;
  const mat = new t.ShaderMaterial({
    uniforms, vertexShader:vsh, fragmentShader:fsh,
    blending:t.AdditiveBlending, transparent:true, depthWrite:false
  });
  points = new t.Points(geom, mat);
  world.add(points);
}

// Window manager
let wm;
function setupWindowManager(){
  wm = new WindowManager();
  wm.setWinShapeChangeCallback(updateWindowShape);
  wm.setWinChangeCallback(()=>{});
  wm.init({ hue: hueSelf });
}

function updateWindowShape(easing=true){
  sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
  if (!easing) sceneOffset = sceneOffsetTarget;
}

// Filaments on overlay between window centers
function drawFilaments(){
  octx.clearRect(0,0,W,H);
  const wins = wm.getWindows()||[]; const me = wm.getThisWindowData(); if (!me) return;
  const myOriginX = window.screenX + (window.outerWidth - window.innerWidth)/2;
  const myOriginY = window.screenY + (window.outerHeight - window.innerHeight);
  for (const w of wins){ if (w.id===me.id) continue;
    const x1=W/2, y1=H/2; const x2 = w.shape.x + w.shape.w/2 - myOriginX; const y2 = w.shape.y + w.shape.h/2 - myOriginY;
    const dx=x2-x1, dy=y2-y1; const dist=Math.hypot(dx,dy);
    const midx=x1+dx*0.5, midy=y1+dy*0.5; const nx=-dy, ny=dx; const curve=Math.min(200,60+dist*0.18);
    const safe=dist>0.001? curve/dist:0; const cx1=midx+nx*safe, cy1=midy+ny*safe;
    const huePeer=(w.metaData&&w.metaData.hue)||0; const grd=octx.createLinearGradient(x1,y1,x2,y2);
    grd.addColorStop(0,`hsla(${hueSelf},90%,60%,0.9)`); grd.addColorStop(1,`hsla(${huePeer},90%,60%,0.9)`);
    octx.strokeStyle=grd; octx.shadowColor=`hsla(${(hueSelf+huePeer)/2},100%,70%,1)`; octx.shadowBlur=22;
    for(let lw=12; lw>=2; lw-=2){ octx.lineWidth=lw; octx.beginPath(); octx.moveTo(x1,y1); octx.quadraticCurveTo(cx1,cy1,x2,y2); octx.stroke(); }
    const merge=Math.max(0,1-dist/(Math.min(W,H)*0.9)); if(merge>0){ octx.globalCompositeOperation='lighter'; octx.shadowBlur=36*merge; octx.shadowColor=`hsla(${huePeer},100%,60%,${0.6*merge})`; octx.fillStyle=`hsla(${huePeer},100%,60%,${0.1*merge})`; octx.beginPath(); octx.arc(x2,y2, Math.min(W,H)*0.22*(0.9+0.3*merge),0,Math.PI*2); octx.fill(); octx.globalCompositeOperation='source-over'; }
  }
}

// Render loop
let lastOrigin=null; const impulse=new t.Vector2();
function render(){
  wm.update();
  // smooth world offset & impulse from window move
  const falloff=0.06; sceneOffset.x += (sceneOffsetTarget.x-sceneOffset.x)*falloff; sceneOffset.y += (sceneOffsetTarget.y-sceneOffset.y)*falloff; world.position.set(sceneOffset.x,sceneOffset.y,0);
  const oX = window.screenX + (window.outerWidth - window.innerWidth)/2; const oY = window.screenY + (window.outerHeight - window.innerHeight);
  if(lastOrigin){ impulse.x = (oX-lastOrigin.x)*0.6 + impulse.x*0.9; impulse.y = (oY-lastOrigin.y)*0.6 + impulse.y*0.9; } lastOrigin={x:oX,y:oY};
  uniforms.uTime.value = performance.now()*0.001; uniforms.uImpulse.value.set(impulse.x, impulse.y);

  // gentle rotation with pointer
  const dxp=(W/2 - 0)/W, dyp=(H/2 - 0)/H; // center bias; could hook to mouse if needed
  if(points){ points.rotation.y += 0.003; points.rotation.z += -0.002; }

  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  drawFilaments();
  requestAnimationFrame(render);
}

function resize(){ resizeOverlay(); }

// init
let initialized=false; function init(){ if(initialized) return; initialized=true; setTimeout(()=>{ setupScene(); buildHologram(); setupWindowManager(); resize(); updateWindowShape(false); render(); window.addEventListener('resize', resize); }, 300); }
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState!=='hidden') init(); }); window.onload=()=>{ if(document.visibilityState!=='hidden') init(); };
