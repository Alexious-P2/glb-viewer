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
scene.add(dirLightA);
const helperA = new THREE.DirectionalLightHelper(dirLightA, 0.3);
scene.add(helperA);

// Directional Light B (45° offset)
const dirLightB = new THREE.DirectionalLight(0xe4f0ff, lightParams.intensity * 0.8);
dirLightB.castShadow = true;
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
lightFolder.open();

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const ambientFolder = gui.addFolder('Ambient Light');
ambientFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Intensity');
ambientFolder.open();

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

// Load GLB model
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
}, undefined, error => {
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
