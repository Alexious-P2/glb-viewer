import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

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

dirLightA.shadow.camera.near = 0.25;
dirLightA.shadow.camera.far = 30;
dirLightA.shadow.camera.left = -10;
dirLightA.shadow.camera.right = 10;
dirLightA.shadow.camera.top = 10;
dirLightA.shadow.camera.bottom = -10;
dirLightA.shadow.bias = -0.00025; //.0005
dirLightA.shadow.normalBias = 0.02; //.02

scene.add(dirLightA);
const helperA = new THREE.DirectionalLightHelper(dirLightA, 0.3);
scene.add(helperA);

// Directional Light B (45° offset)
const dirLightB = new THREE.DirectionalLight(0xe4f0ff, lightParams.intensity * 0.8);
dirLightB.castShadow = false;

dirLightB.shadow.mapSize.width = 2048;
dirLightB.shadow.mapSize.height = 2048;

dirLightB.shadow.camera.near = 0.5;
dirLightB.shadow.camera.far = 20;
dirLightB.shadow.camera.left = -10;
dirLightB.shadow.camera.right = 10;
dirLightB.shadow.camera.top = 10;
dirLightB.shadow.camera.bottom = -10;

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

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// Responsive resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
