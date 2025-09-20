// Three.js-based Multi-Window 3D matching bgstaal/multipleWindow3dScene style
// - WindowManager(localStorage) to sync window shapes
// - Orthographic camera, world offset smoothing, one wireframe cube per window

import WindowManager from './WindowManager.js';
// THREE is provided globally by three.min.js included in mw3d.html

// DOM
const t = THREE;
let camera, scene, renderer, world;
let cubes = [];
let sceneOffsetTarget = {x: 0, y: 0};
let sceneOffset = {x: 0, y: 0};

// Setup Three.js scene (orthographic)
function setupScene(){
  camera = new t.OrthographicCamera(0, 0, window.innerWidth, window.innerHeight, -10000, 10000);
  camera.position.z = 2.5;
  scene = new t.Scene();
  scene.background = new t.Color(0x000000);
  scene.add(camera);

  renderer = new t.WebGLRenderer({antialias:true, depthBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.5));

  world = new t.Object3D();
  scene.add(world);

  renderer.domElement.setAttribute('id','scene');
  document.body.appendChild(renderer.domElement);
}

// Window manager
let wm;
function setupWindowManager(){
  wm = new WindowManager();
  wm.setWinShapeChangeCallback(updateWindowShape);
  wm.setWinChangeCallback(windowsUpdated);
  wm.init({ foo:'bar' });
  windowsUpdated();
}

function windowsUpdated(){
  updateNumberOfCubes();
}

function updateNumberOfCubes(){
  const wins = wm.getWindows() || [];
  // remove all
  cubes.forEach(c=>world.remove(c));
  cubes = [];
  // add per window
  for (let i=0;i<wins.length;i++){
    const win = wins[i];
    const c = new t.Color(); c.setHSL(i*0.1, 1.0, 0.5);
    const s = 100 + i*50;
    const cube = new t.Mesh(
      new t.BoxGeometry(s,s,s),
      new t.MeshBasicMaterial({ color:c, wireframe:true })
    );
    cube.position.x = win.shape.x + (win.shape.w*0.5);
    cube.position.y = win.shape.y + (win.shape.h*0.5);
    world.add(cube); cubes.push(cube);
  }
}

function updateWindowShape(easing = true){
  sceneOffsetTarget = { x: -window.screenX, y: -window.screenY };
  if (!easing) sceneOffset = sceneOffsetTarget;
}

function render(){
  wm.update();
  // smooth world offset
  const falloff = 0.05;
  sceneOffset.x = sceneOffset.x + ((sceneOffsetTarget.x - sceneOffset.x) * falloff);
  sceneOffset.y = sceneOffset.y + ((sceneOffsetTarget.y - sceneOffset.y) * falloff);
  world.position.x = sceneOffset.x;
  world.position.y = sceneOffset.y;

  const wins = wm.getWindows() || [];
  const tsec = (Date.now()%60000)/1000;
  for (let i=0;i<cubes.length;i++){
    const cube = cubes[i];
    const win = wins[i];
    if (!win) continue;
    const posTarget = { x: win.shape.x + (win.shape.w*0.5), y: win.shape.y + (win.shape.h*0.5) };
    cube.position.x = cube.position.x + (posTarget.x - cube.position.x) * falloff;
    cube.position.y = cube.position.y + (posTarget.y - cube.position.y) * falloff;
    cube.rotation.x = tsec * 0.5;
    cube.rotation.y = tsec * 0.3;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function resize(){
  const width = window.innerWidth; const height = window.innerHeight;
  camera = new t.OrthographicCamera(0, width, 0, height, -10000, 10000);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// init guarded for prerender
let initialized = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'hidden' && !initialized) init();
});
window.onload = () => { if (document.visibilityState !== 'hidden') init(); };

function init(){
  initialized = true;
  setTimeout(()=>{
    setupScene();
    setupWindowManager();
    resize();
    updateWindowShape(false);
    render();
    window.addEventListener('resize', resize);
  }, 500);
}
