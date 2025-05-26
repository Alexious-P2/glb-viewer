import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { PMREMGenerator } from 'three';


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(2, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// GUI setup (if not already)
const gui = new GUI();

// Directional Light Setup
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);
const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
scene.add(lightHelper);

const lightParams = {
  angle: 0,
  radius: 5,
  height: 2
};

const dirFolder = gui.addFolder('Directional Light Orbit');
dirFolder.add(lightParams, 'angle', 0, 360).onChange(updateLightPosition);
dirFolder.add(lightParams, 'radius', 1, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'height', -5, 10).onChange(updateLightPosition);
dirFolder.open();

function updateLightPosition() {
  const rad = THREE.MathUtils.degToRad(lightParams.angle);
  directionalLight.position.set(
    Math.cos(rad) * lightParams.radius,
    lightParams.height,
    Math.sin(rad) * lightParams.radius
  );
  directionalLight.lookAt(0, 0, 0);
  lightHelper.update();
}
updateLightPosition();

// Ambient Light Setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const ambientFolder = gui.addFolder('Ambient Light');
ambientFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Intensity');
ambientFolder.open();

// HDRI
// PMREM Generator for HDRI
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let envMap;
const hdriRotation = { angle: 0 };

const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
  (texture) => {
    envMap = pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    scene.environment = envMap;
    scene.background = envMap;

    updateHDRIRotation();
  }
);

// Function to rotate HDRI
function updateHDRIRotation() {
  if (!envMap) return;
  envMap.mapping = THREE.EquirectangularReflectionMapping;

  const rotationMatrix = new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(hdriRotation.angle));
  envMap.matrixAutoUpdate = false;
  envMap.matrix.identity().multiply(rotationMatrix);
}

// Simple geometry to see effect
const geometry = new THREE.SphereGeometry(1, 64, 64);
const material = new THREE.MeshStandardMaterial({ metalness: 1, roughness: 0 });
const sphere = new THREE.Mesh(geometry, material);
sphere.position.y = 1;
scene.add(sphere);

// HDRI GUI
const hdriFolder = gui.addFolder('HDRI Environment');
hdriFolder.add(hdriRotation, 'angle', 0, 360).name('Rotation Y').onChange(updateHDRIRotation);
hdriFolder.open();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();

// Handle resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// GLB Load
const loader = new GLTFLoader();
loader.load('model.glb', function (gltf) {
    scene.add(gltf.scene);
}, undefined, function (error) {
    console.error(error);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
