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

// Directional Light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
scene.add(directionalLight);
const lightHelper = new THREE.DirectionalLightHelper(directionalLight, 0.5);
scene.add(lightHelper);

const lightParams = {
  angle: 0,
  radius: 5,
  height: 2,
  intensity: 1
};

const dirFolder = gui.addFolder('Directional Light Orbit');
dirFolder.add(lightParams, 'angle', 0, 360).onChange(updateLightPosition);
dirFolder.add(lightParams, 'radius', 1, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'height', -5, 10).onChange(updateLightPosition);
dirFolder.add(lightParams, 'intensity', 0, 5, 0.01).name('Intensity').onChange(value => {
  directionalLight.intensity = value;
});
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

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const ambientFolder = gui.addFolder('Ambient Light');
ambientFolder.add(ambientLight, 'intensity', 0, 2, 0.01).name('Intensity');
ambientFolder.open();

// HDRI Setup
// HDRI parameters and resources
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

let originalHDRTexture = null;
let envMap = null;

const hdriParams = {
  rotation: 0,
  intensity: 1
};

// Create scene & camera for offscreen rendering (to rotate HDRI)
const orthoCamera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const quadScene = new THREE.Scene();

let renderTarget = null;

// Shader material to rotate equirectangular HDR texture
const rotateHDRMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTexture: { value: null },
    uRotation: { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D uTexture;
    uniform float uRotation;
    varying vec2 vUv;

    vec2 rotateUV(vec2 uv, float angle) {
      vec2 centered = uv - 0.5;
      float cosA = cos(angle);
      float sinA = sin(angle);
      return vec2(
        cosA * centered.x - sinA * centered.y,
        sinA * centered.x + cosA * centered.y
      ) + 0.5;
    }

    void main() {
      vec2 uv = rotateUV(vUv, uRotation);
      gl_FragColor = texture2D(uTexture, uv);
    }
  `,
  depthWrite: false,
  depthTest: false
});

const quadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2,2), rotateHDRMaterial);
quadScene.add(quadMesh);

function updateEnvMap() {
  if(!originalHDRTexture) return;

  // Dispose previous RT if exists
  if(renderTarget){
    renderTarget.dispose();
    renderTarget = null;
  }

  // Create render target for rotated HDRI
  renderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    type: THREE.HalfFloatType,
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
  });

  // Update shader uniform
  rotateHDRMaterial.uniforms.uTexture.value = originalHDRTexture;
  rotateHDRMaterial.uniforms.uRotation.value = THREE.MathUtils.degToRad(hdriParams.rotation);

  // Render rotated HDRI to renderTarget
  renderer.setRenderTarget(renderTarget);
  renderer.render(quadScene, orthoCamera);
  renderer.setRenderTarget(null);

  // Generate PMREM env map from rotated texture
  envMap = pmremGenerator.fromEquirectangular(renderTarget.texture).texture;

  // Assign env map and update renderer exposure for intensity
  scene.environment = envMap;
  renderer.toneMappingExposure = hdriParams.intensity;
}

// HDRI GUI
const hdriFolder = gui.addFolder('HDRI Environment');
hdriFolder.add(hdriParams, 'rotation', 0, 360).name('Rotation Y').onChange(updateEnvMap);
hdriFolder.add(hdriParams, 'intensity', 0, 5, 0.01).name('Intensity').onChange(value => {
  hdriParams.intensity = value;
  renderer.toneMappingExposure = value;
});
hdriFolder.open();

// Load HDRI and initialize environment
const rgbeLoader = new RGBELoader();
rgbeLoader.load(
  'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
  (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    originalHDRTexture = texture;
    updateEnvMap();
  }
);


// Load GLB model
const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  console.log('Model loaded:', gltf);  // ✅ Check this logs something
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
