import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { SSREffect } from 'screen-space-reflections';
//import { SSRPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/SSRPass.js';
import { Reflector } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js';
import { ReflectorForSSRPass } from 'three/examples/jsm/objects/ReflectorForSSRPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Scene
//const scene = new THREE.Scene();
//scene.background = new THREE.Color(0x202020);
const sceneParams = {
  backgroundColor: '#8f8f8f',
  enableReflector: true
};
const scene = new THREE.Scene();
scene.background = new THREE.Color(sceneParams.backgroundColor);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 5);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// GUI
const gui = new GUI();

// Scene background color GUI control
const sceneFolder = gui.addFolder('Scene Settings');

sceneFolder.addColor(sceneParams, 'backgroundColor')
  .name('Background Color')
  .onChange((value) => {
    scene.background.set(value);
  });

sceneFolder.open();

// Load HDRI for lighting and reflections
const hdriPath = 'hdri/lightroom_14b_low.hdr'; // Make sure the file is in your GitHub repo
const rgbeLoader = new RGBELoader();

rgbeLoader.load(hdriPath, (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;

  // Use for lighting and reflections
  scene.environment = hdrTexture;

  // Do NOT set: scene.background = hdrTexture;
  // This keeps your solid background color visible
});

const envSettings = {
  intensity: 1
};

gui.add(envSettings, 'intensity', 0, 5, 0.1).name('HDRI Intensity').onChange(() => {
  scene.traverse((child) => {
    if (child.isMesh && child.material && child.material.envMapIntensity !== undefined) {
      child.material.envMapIntensity = envSettings.intensity;
      child.material.needsUpdate = true;
    }
  });
});

// Lights
const lightParams = {
  angle: 90,
  radius: 5,
  height: 2,
  intensity: 1
};

// Directional Light A
const dirLightA = new THREE.DirectionalLight(0xffffff, lightParams.intensity);
dirLightA.castShadow = true;

dirLightA.shadow.mapSize.width = 8192;
dirLightA.shadow.mapSize.height = 8192;

dirLightA.shadow.camera.near = 0.1;
dirLightA.shadow.camera.far = 10;
dirLightA.shadow.camera.left = -5;
dirLightA.shadow.camera.right = 5;
dirLightA.shadow.camera.top = 5;
dirLightA.shadow.camera.bottom = -5;
//dirLightA.shadow.bias = -0.05; //-.0005
dirLightA.shadow.normalBias = 0.01; //.02 default //.05 extending // .01 good // Or try 0.01 to reduce jagginess

scene.add(dirLightA);
const helperA = new THREE.DirectionalLightHelper(dirLightA, 0.3);
scene.add(helperA);

// Directional Light B (45° offset)
const dirLightB = new THREE.DirectionalLight(0xe4f0ff, lightParams.intensity * 0.8);

scene.add(dirLightB);
const helperB = new THREE.DirectionalLightHelper(dirLightB, 0.3);
scene.add(helperB);

function updateLights() {
  const radA = THREE.MathUtils.degToRad(lightParams.angle);
  const radB = THREE.MathUtils.degToRad(lightParams.angle + 45);

  dirLightA.position.set(Math.cos(radA) * lightParams.radius, lightParams.height, Math.sin(radA) * lightParams.radius);
  dirLightB.position.set(Math.cos(radB) * lightParams.radius, lightParams.height, Math.sin(radB) * lightParams.radius);

  dirLightA.intensity = lightParams.intensity;
  dirLightB.intensity = lightParams.intensity * 0.8;

  dirLightA.lookAt(0, 0, 0);
  dirLightB.lookAt(0, 0, 0);

  helperA.update();
  helperB.update();
}
updateLights();

// GUI Controls
const lightFolder = gui.addFolder('Dual Directional Light');
lightFolder.add(lightParams, 'angle', 0, 360).onChange(updateLights);
lightFolder.add(lightParams, 'radius', 1, 10).onChange(updateLights);
lightFolder.add(lightParams, 'height', -5, 10).onChange(updateLights);
lightFolder.add(lightParams, 'intensity', 0, 5, 0.01).onChange(updateLights);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const ambientFolder = gui.addFolder('Ambient Light');
ambientFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Intensity');
ambientFolder.open();

// Ground Plane
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// GUI Setup
const groundFolder = gui.addFolder('Ground Shadow');

const groundSettings = {
  showShadow: true,
  shadowOpacity: 0.3,
};

groundFolder.add(groundSettings, 'showShadow').name('Enable Shadow').onChange((val) => {
  ground.visible = val;
});

groundFolder.add(groundSettings, 'shadowOpacity', 0, 1).step(0.01).name('Shadow Opacity').onChange((val) => {
  ground.material.opacity = val;
});

groundFolder.open();

// Create ground reflector geometry
const geometry = new THREE.PlaneGeometry(1, 1);

// Create ReflectorForSSRPass instance
const groundReflector = new ReflectorForSSRPass(geometry, {
  clipBias: 0.0003,           // fine, small bias to avoid z-fighting
  textureWidth: window.innerWidth,
  textureHeight: window.innerHeight,
  color: 0x888888,
  useDepthTexture: true,      // necessary for SSR to access depth info
});

// Optional: Disable depth write to prevent z-buffer overwrite by reflector
groundReflector.material.depthWrite = false;

// Rotate to horizontal plane
groundReflector.rotation.x = -Math.PI / 2;
groundReflector.position.y = 0.001; // slightly above the ground

// Currently invisible - usually to avoid double rendering reflections in SSR pass
groundReflector.visible = false;

scene.add(groundReflector);

/*
// Default Reflective Plane (slightly above ground to avoid z-fighting)
const reflector = new Reflector(new THREE.PlaneGeometry(10, 10), {
  color: new THREE.Color(0x444444),
  textureWidth: window.innerWidth * window.devicePixelRatio,
  textureHeight: window.innerHeight * window.devicePixelRatio,
  clipBias: 0.003
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.y = 0.001; // slightly above the ground
reflector.material.transparent = true; // Make reflector transparent
reflector.material.opacity = 0.05; // ← adjust this for the desired blend of reflection vs background
scene.add(reflector);

// Reflector GUI toggle control
const sceneFolder = gui.addFolder('Scene Settings');
sceneFolder.addColor(sceneParams, 'backgroundColor').name('Background').onChange((value) => {
  scene.background.set(value);
});
sceneFolder.add(sceneParams, 'enableReflector').name('Enable Reflector').onChange((enabled) => {
  reflector.visible = enabled;
});
sceneFolder.open();



/*
// Reflective ground plane MeshReflectorMaterial
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new MeshReflectorMaterial({
  color: 0x111111,
  metalness: 0.8,
  roughness: 0.3,
  blur: [0.02, 0.02],
  resolution: 512,
  mixBlur: 0.5,
  mixStrength: 1,
  depthScale: 0.01,
  minDepthThreshold: 0.8,
  maxDepthThreshold: 1,
  transparent: true,
  opacity: 0.6,
});

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0.001;
ground.receiveShadow = true;
scene.add(ground);
*/

// Load GLB model
/*
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  console.log('Model loaded:', gltf);  // ✅ Check this logs something
  scene.add(gltf.scene);
}, undefined, error => {
  console.error('GLB Load Error:', error);
});
*/

// Load GLB model with shadow
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  console.log('Model loaded:', gltf);  // ✅ Check this logs something

  // Enable shadows for all meshes in the model
  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = true;     // Mesh will cast shadows
      node.receiveShadow = true;  // Optional: receives shadows if needed
    }
  });

  scene.add(gltf.scene);
}, undefined, (error) => {
  console.error('GLB Load Error:', error);
});

// Postprocessing SSR
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const ssrEffect = new SSREffect(scene, camera, {
  intensity: 1,
  roughnessFade: 1,
  thickness: 10,
  maxRoughness: 1,
  resolutionScale: 1,
  blur: true,
  blurKernel: 3,
  distance: 5,
  distanceScale: 1,
});
const ssrPass = new EffectPass(camera, ssrEffect);
composer.addPass(ssrPass);

// dat.GUI controls
const gui = new dat.GUI();
const ssrFolder = gui.addFolder('SSR Settings');

ssrFolder.add(ssrEffect, 'intensity', 0, 5).step(0.1);
ssrFolder.add(ssrEffect, 'roughnessFade', 0, 5).step(0.1);
ssrFolder.add(ssrEffect, 'thickness', 0, 20).step(0.1);
ssrFolder.add(ssrEffect, 'maxRoughness', 0, 1).step(0.01);
ssrFolder.add(ssrEffect, 'distance', 0, 20).step(0.1);
ssrFolder.add(ssrEffect, 'distanceScale', 0, 5).step(0.1);
ssrFolder.add(ssrEffect, 'resolutionScale', 0.1, 2).step(0.1);
ssrFolder.add(ssrEffect, 'blur');
ssrFolder.add(ssrEffect, 'blurKernel', 1, 8).step(1);
ssrFolder.open();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  //renderer.render(scene, camera);
  composer.render();
}
animate();

// Responsive resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  
});
