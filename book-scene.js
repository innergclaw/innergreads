import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const viewer = document.querySelector("[data-book-viewer]");
const canvas = document.querySelector("#book-canvas");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (viewer && canvas) {
  initializeBookViewer().catch(() => {
    viewer.classList.remove("is-loading");
    viewer.classList.add("is-fallback");
    viewer.querySelector(".book-loading")?.setAttribute(
      "aria-label",
      "The interactive book could not load. Showing the cover image.",
    );
  });
}

async function initializeBookViewer() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0.12, 0.05, 11.6);
  camera.lookAt(0, 0, 0);

  const textureLoader = new THREE.TextureLoader();
  const [frontTexture, backTexture, spineTexture] = await Promise.all([
    loadTexture(textureLoader, "./assets/final-frequency-front-3d.jpg"),
    loadTexture(textureLoader, "./assets/final-frequency-back-3d.jpg"),
    loadTexture(textureLoader, "./assets/final-frequency-spine-3d.jpg"),
  ]);

  [frontTexture, backTexture, spineTexture].forEach((texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  });

  const bookRoot = new THREE.Group();
  const presentation = new THREE.Group();
  bookRoot.add(presentation);
  scene.add(bookRoot);

  const dimensions = {
    width: 4,
    height: 6,
    depth: 0.293,
    coverDepth: 0.045,
  };

  const book = createBook({
    ...dimensions,
    frontTexture,
    backTexture,
    spineTexture,
  });
  presentation.add(book);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 2.25),
    new THREE.ShadowMaterial({ color: 0x080404, opacity: 0.34 }),
  );
  shadow.position.set(0.4, -3.26, 0.2);
  shadow.rotation.x = -Math.PI / 2;
  shadow.receiveShadow = true;
  scene.add(shadow);

  const hemisphere = new THREE.HemisphereLight(0xfff2dc, 0x281519, 1.7);
  scene.add(hemisphere);

  const key = new THREE.DirectionalLight(0xffe7c0, 3.35);
  key.position.set(-4.4, 7.2, 8.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.00045;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xc5b6ff, 1.1);
  fill.position.set(5.5, 1.4, 5.2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xb52b25, 1.7);
  rim.position.set(2.5, 3.2, -5.5);
  scene.add(rim);

  const state = {
    dragging: false,
    moved: false,
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
    dragStartY: 0,
    dragStartX: 0,
    targetX: -0.065,
    targetY: -0.34,
    targetZ: -0.025,
    currentX: reducedMotion.matches ? -0.065 : 0.82,
    currentY: reducedMotion.matches ? -0.34 : -1.18,
    currentZ: reducedMotion.matches ? -0.025 : 1.38,
    face: 0,
    frame: 0,
    visible: true,
  };

  function resize() {
    const rect = viewer.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);

    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < 520 ? 36 : 30;
    camera.position.z = width < 520 ? 12.8 : 11.6;
    camera.updateProjectionMatrix();
  }

  function setPointer(event) {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  }

  function handlePointerDown(event) {
    state.dragging = true;
    state.moved = false;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.dragStartX = state.targetY;
    state.dragStartY = state.targetX;
    canvas.setPointerCapture(event.pointerId);
    viewer.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    setPointer(event);
    if (!state.dragging) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 5) state.moved = true;

    state.targetY = state.dragStartX + deltaX * 0.009;
    state.targetX = THREE.MathUtils.clamp(
      state.dragStartY + deltaY * 0.007,
      -0.72,
      0.72,
    );
  }

  function handlePointerUp(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    state.dragging = false;
    viewer.classList.remove("is-dragging");

    if (!state.moved) {
      state.face = (state.face + 1) % 3;
      const faceRotations = [-0.34, Math.PI / 2, Math.PI + 0.34];
      state.targetY = faceRotations[state.face];
      state.targetX = -0.065;
      state.targetZ = -0.025;
    }
  }

  function handlePointerLeave() {
    if (state.dragging) return;
    state.pointerX = 0;
    state.pointerY = 0;
  }

  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("keydown", (event) => {
    const isForward = event.key === "ArrowRight" || event.key === "Enter" || event.key === " ";
    const isBackward = event.key === "ArrowLeft";
    if (!isForward && !isBackward) return;

    event.preventDefault();
    state.face = (state.face + (isForward ? 1 : 2)) % 3;
    const faceRotations = [-0.34, Math.PI / 2, Math.PI + 0.34];
    state.targetY = faceRotations[state.face];
    state.targetX = -0.065;
    state.targetZ = -0.025;
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewer);

  const visibilityObserver = new IntersectionObserver((entries) => {
    state.visible = entries.some((entry) => entry.isIntersecting);
  });
  visibilityObserver.observe(viewer);

  function render(time) {
    state.frame = window.requestAnimationFrame(render);
    if (!state.visible && document.visibilityState !== "visible") return;

    const elapsed = time * 0.001;
    const idleX = state.dragging ? 0 : state.pointerY * 0.055;
    const idleY = state.dragging ? 0 : state.pointerX * 0.085;
    const lift = reducedMotion.matches ? 0 : Math.sin(elapsed * 0.75) * 0.035;

    state.currentX = THREE.MathUtils.damp(
      state.currentX,
      state.targetX + idleX,
      7.5,
      1 / 60,
    );
    state.currentY = THREE.MathUtils.damp(
      state.currentY,
      state.targetY + idleY,
      7.5,
      1 / 60,
    );
    state.currentZ = THREE.MathUtils.damp(
      state.currentZ,
      state.targetZ,
      7.5,
      1 / 60,
    );

    presentation.rotation.set(state.currentX, state.currentY, state.currentZ);
    presentation.position.y = lift;
    shadow.material.opacity = 0.31 - lift * 0.8;
    shadow.scale.setScalar(1 - lift * 0.7);

    renderer.render(scene, camera);
  }

  resize();
  viewer.classList.remove("is-loading");
  viewer.classList.add("is-ready");
  viewer.querySelector(".book-loading")?.setAttribute(
    "aria-label",
    "Interactive book ready.",
  );
  render(0);

  const getDiagnostics = () => ({
    calls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
    dpr: renderer.getPixelRatio(),
    shadowMap: "PCFShadowMap",
    postProcessingPasses: 0,
  });
  window.__INNERGREADS_BOOK_STATS__ = getDiagnostics;
  viewer.dataset.renderDiagnostics = JSON.stringify(getDiagnostics());

  window.addEventListener(
    "pagehide",
    () => {
      window.cancelAnimationFrame(state.frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      renderer.dispose();
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      });
      frontTexture.dispose();
      backTexture.dispose();
      spineTexture.dispose();
      delete window.__INNERGREADS_BOOK_STATS__;
    },
    { once: true },
  );
}

function loadTexture(loader, path) {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}

function createBook({
  width,
  height,
  depth,
  coverDepth,
  frontTexture,
  backTexture,
  spineTexture,
}) {
  const group = new THREE.Group();

  const paperTexture = createPaperEdgeTexture();
  paperTexture.colorSpace = THREE.SRGBColorSpace;
  paperTexture.wrapS = THREE.RepeatWrapping;
  paperTexture.wrapT = THREE.RepeatWrapping;
  paperTexture.repeat.set(1, 5);

  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9dfc9,
    map: paperTexture,
    roughness: 0.92,
    metalness: 0,
  });

  const pageBlock = new THREE.Mesh(
    new RoundedBoxGeometry(
      width - 0.105,
      height - 0.12,
      depth - coverDepth * 1.25,
      6,
      0.045,
    ),
    paperMaterial,
  );
  pageBlock.position.x = 0.026;
  pageBlock.castShadow = true;
  pageBlock.receiveShadow = true;
  group.add(pageBlock);

  const coverEdgeMaterial = new THREE.MeshStandardMaterial({
    color: 0xb9a58e,
    roughness: 0.72,
    metalness: 0,
  });

  const coverGeometry = new RoundedBoxGeometry(
    width,
    height,
    coverDepth,
    6,
    0.045,
  );

  const frontBoard = new THREE.Mesh(coverGeometry, coverEdgeMaterial);
  frontBoard.position.z = depth / 2;
  frontBoard.castShadow = true;
  frontBoard.receiveShadow = true;
  group.add(frontBoard);

  const backBoard = new THREE.Mesh(coverGeometry, coverEdgeMaterial);
  backBoard.position.z = -depth / 2;
  backBoard.castShadow = true;
  backBoard.receiveShadow = true;
  group.add(backBoard);

  const frontMaterial = new THREE.MeshStandardMaterial({
    map: frontTexture,
    roughness: 0.8,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.035, height - 0.035),
    frontMaterial,
  );
  front.position.z = depth / 2 + coverDepth / 2 + 0.001;
  front.castShadow = true;
  group.add(front);

  const backMaterial = new THREE.MeshStandardMaterial({
    map: backTexture,
    roughness: 0.82,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const back = new THREE.Mesh(
    new THREE.PlaneGeometry(width - 0.035, height - 0.035),
    backMaterial,
  );
  back.position.z = -depth / 2 - coverDepth / 2 - 0.001;
  back.rotation.y = Math.PI;
  back.castShadow = true;
  group.add(back);

  const spineMaterial = new THREE.MeshStandardMaterial({
    map: spineTexture,
    roughness: 0.74,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const spine = new THREE.Mesh(
    new THREE.PlaneGeometry(depth + 0.018, height - 0.035),
    spineMaterial,
  );
  spine.position.x = -width / 2 - 0.008;
  spine.rotation.y = -Math.PI / 2;
  spine.castShadow = true;
  group.add(spine);

  const hingeMaterial = new THREE.MeshStandardMaterial({
    color: 0x8f201c,
    roughness: 0.86,
    metalness: 0,
  });
  const hingeGeometry = new THREE.CylinderGeometry(
    0.028,
    0.028,
    height - 0.11,
    12,
  );
  [-width / 2 + 0.045, -width / 2 + 0.095].forEach((x, index) => {
    const hinge = new THREE.Mesh(hingeGeometry, hingeMaterial);
    hinge.position.set(x, 0, index === 0 ? depth / 2 + 0.025 : -depth / 2 - 0.025);
    hinge.castShadow = true;
    group.add(hinge);
  });

  return group;
}

function createPaperEdgeTexture() {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const context = textureCanvas.getContext("2d");

  context.fillStyle = "#e9dfc9";
  context.fillRect(0, 0, 256, 256);

  for (let y = 2; y < 256; y += 3) {
    const shade = 185 + ((y * 17) % 22);
    context.strokeStyle = `rgba(${shade}, ${shade - 6}, ${shade - 18}, 0.28)`;
    context.lineWidth = y % 9 === 0 ? 1.2 : 0.55;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(256, y + ((y % 7) - 3) * 0.12);
    context.stroke();
  }

  return new THREE.CanvasTexture(textureCanvas);
}
