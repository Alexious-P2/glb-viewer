import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
//import { Reflector } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ReflectorForSSRPass } from 'three/examples/jsm/objects/ReflectorForSSRPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSRPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/postprocessing/SSRPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
//import { MeshReflectorMaterial } from 'https://unpkg.com/three@0.155.0/examples/jsm/objects/MeshReflectorMaterial.js';
//import { EffectComposer, RenderPass, EffectPass, SSRPass} from 'https://cdn.jsdelivr.net/npm/postprocessing@6.30.2/+esm';

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
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// Enable VSM Soft Shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; //THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

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

/*
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
*/

// Load HDRI for realistic environment and GI lighting

let hdriRotation = 0;
let hdriIntensity = 1;
let skyMesh = null;

new RGBELoader().load('hdri/lightroom_14b_low.hdr', (hdrMap) => {
  hdrMap.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(hdrMap).texture;

  scene.environment = envMap;

  // Sky dome for visible HDRI background and rotation
  const skyGeo = new THREE.SphereGeometry(50, 60, 40);
  const skyMat = new THREE.MeshBasicMaterial({
    map: hdrMap,
    side: THREE.BackSide
  });
  skyMesh = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyMesh);

  const envSettings = {
    hdriIntensity: 5,
    hdriRotation: 0
  };

  gui.add(envSettings, 'hdriIntensity', 0, 5).step(0.1).name('HDRI Intensity').onChange(value => {
    hdriIntensity = value;
    renderer.toneMappingExposure = hdriIntensity;
  });

  gui.add(envSettings, 'hdriRotation', 0, Math.PI * 2).step(0.01).name('HDRI Rotation').onChange(value => {
    hdriRotation = value;
    if (skyMesh) skyMesh.rotation.y = hdriRotation;
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

dirLightA.shadow.mapSize.width = 4096;
dirLightA.shadow.mapSize.height = 4096;

dirLightA.shadow.camera.near = 0.1;
dirLightA.shadow.camera.far = 10;
dirLightA.shadow.camera.left = -10;
dirLightA.shadow.camera.right = 10;
dirLightA.shadow.camera.top = 10;
dirLightA.shadow.camera.bottom = -10;
//dirLightA.shadow.bias = -0.005; //-.0005
dirLightA.shadow.normalBias = 0.001; //.02 default //.05 extending // .01 good // Or try 0.01 to reduce jagginess
dirLightA.shadow.radius = 5;

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

// Ground Plane Default
const groundGeo = new THREE.PlaneGeometry(20, 20);
const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });

const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
ground.receiveShadow = true;
scene.add(ground);

// GUI Setup for shadow
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

groundFolder.add(dirLightA.shadow, 'radius', 0, 20).step(0.1).name('Blur Radius');
groundFolder.add(dirLightA.shadow, 'normalBias', 0, 0.2).step(0.001).name('Normal Bias');
//groundFolder.add(dirLightA.shadow, 'bias', -0.2, 0.2).step(0.001).name('Shadow Bias');

groundFolder.open();

// Create ground reflector geometry
const geometry = new THREE.PlaneGeometry(1, 1);

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

// Create ReflectorForSSRPass instance
const groundReflector = new ReflectorForSSRPass(geometry, {
  clipBias: 0.0001,           // fine, small bias to avoid z-fighting
  textureWidth: window.innerWidth,
  textureHeight: window.innerHeight,
  color: 0x888888,
  useDepthTexture: true,      // necessary for SSR to access depth info
});

// Optional: Disable depth write to prevent z-buffer overwrite by reflector
groundReflector.material.depthWrite = false;

// Rotate to horizontal plane
groundReflector.rotation.x = -Math.PI / 2;
groundReflector.position.y = 0.0001; // slightly above the ground

// Currently invisible - usually to avoid double rendering reflections in SSR pass
groundReflector.visible = false;

scene.add(groundReflector);

// Postprocessing SSR
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const reflectiveMesh = scene.getObjectByName('kbBase_Reflect');

const ssrPass = new SSRPass({
  renderer,
  scene,
  camera,
  width: window.innerWidth,
  height: window.innerHeight,
  groundReflector: groundReflector,
  selects: [groundReflector] // null You can specify reflective meshes if you want 
});  

ssrPass.maxDistance = 0.1;
composer.addPass(ssrPass);

// GUI
gui.add(ssrPass, 'maxDistance', 0, 1).step(0.01).onChange(() => {
  groundReflector.maxDistance = ssrPass.maxDistance;
});

gui.add(ssrPass, 'opacity', 0, 1).step(0.01).onChange(() => {
  groundReflector.opacity = ssrPass.opacity;
});

gui.add(ssrPass, 'fresnel', 0, 5).step(0.01).onChange(() => {
  groundReflector.fresnel = ssrPass.fresnel;
});

gui.add(ssrPass, 'distanceAttenuation')
  .name('Distance Attenuation')
  .onChange(() => {
    groundReflector.distanceAttenuation = ssrPass.distanceAttenuation;
  });

gui.add( ssrPass, 'blur' );

gui.add(ssrPass, 'bouncing').name('Enable Bouncing');

/*
// SSAO Ambient Occlusion
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 8;
composer.addPass(ssaoPass);

// GUI for SSAO
const aoFolder = gui.addFolder('Ambient Occlusion');
aoFolder.add(ssaoPass, 'kernelRadius', 0, 32).step(1).name('Kernel Radius');
aoFolder.add(ssaoPass, 'minDistance', 0.001, 0.02).step(0.001).name('Min Distance');
aoFolder.add(ssaoPass, 'maxDistance', 0.01, 0.3).step(0.01).name('Max Distance');
aoFolder.open();
*/

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
