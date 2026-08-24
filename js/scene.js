// SwiftLoop hero — particle torus-knot "loop": theme-aware, draggable,
// mouse-reactive and scroll-parallaxed.
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Two completely different lighting problems share one geometry. On ink the
// knot is light emitting into darkness, so the particles add up. On cream
// there is nothing to add to — additive blending would bleach the knot off the
// page — so on cream the particles are dark, opaque, hard-edged discs that sit
// ON the paper rather than glowing out of it.
const THEMES = {
  dark: {
    fog: 0x0a0a0c,
    blending: THREE.AdditiveBlending,
    alpha: 0.85,
    depthFade: 0.25, // additive already reads as depth on ink
    sizeScale: 0.8,  // additive glow adds its own weight
    soft: 0.05,      // wide falloff: every particle is a little light source
    twinkle: 0.35,
    ring: { color: 0xff4d1f, opacity: 0.22 },
    // accent · mid · base, picked per particle by a stored roll
    palette: [0xff4d1f, 0x6b4a3a, 0xece8df],
    mix: [0.18, 0.45], // < first = accent, < second = mid, else base
  },
  light: {
    fog: 0xece8df,
    blending: THREE.NormalBlending,
    alpha: 0.98,
    depthFade: 0.42, // enough to read as depth, not enough to wash the far side out
    sizeScale: 0.72,
    soft: 0.4,       // near-solid dot with a one-pixel edge — a mark, not a mist
    twinkle: 0.16,   // ink cannot afford to flicker down to a third of itself
    ring: { color: 0xc4380f, opacity: 0.5 },
    palette: [0xff4d1f, 0xb8360f, 0x14131a],
    mix: [0.34, 0.56], // a third of the loop is signal orange on cream
  },
};

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function initScene() {
  const isMobile = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  // The hero is sized in svh, which is shorter than window.innerHeight on
  // mobile — measuring the canvas itself keeps the knot from stretching.
  const size = () => {
    const r = canvas.getBoundingClientRect();
    return { w: Math.max(1, r.width), h: Math.max(1, r.height) };
  };

  let { w, h } = size();
  // gl_PointSize is in DEVICE pixels, so without this the knot renders at half
  // thickness on a 2x screen — invisible once the particles are dark on cream
  const pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(THEMES[currentTheme()].fog, 0.012);

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);

  // The canvas now genuinely fills the hero, so the framing is solved from the
  // viewport rather than guessed at breakpoints. `h` and `w` are the share of
  // the hero's height and width the knot's diameter may take; whichever binds
  // first sets the camera distance. `centre` is where it sits, measured down
  // from the top of the hero.
  const KNOT_R = 5.2; // world half-extent: the ring, plus the particle scatter
  const FRAMING = {
    // wide: the loop is the headline's backdrop at full bleed — half again
    // taller than the hero, so it is cropped top and bottom and the headline
    // sits inside the arc rather than beside it.
    wide: { h: 1.56, w: 1.56, centre: 0.4 },
    // narrow: same idea, but the loop has to be twice the width of the screen
    // to cover a column of type, so it deliberately bleeds past both edges.
    // It rides high because the headline is anchored near the top here.
    mobile: { h: 1.6, w: 1.6, centre: 0.33 },
  };
  const MOBILE_AT = 768;
  // On-screen particle diameter in CSS pixels. Because gl_PointSize falls off
  // with distance, tying it to baseZ keeps the dots the same size no matter how
  // the framing moves — the knot can grow without the dots turning to gravel.
  const DOT = 3.6;

  const tanHalfFov = () => Math.tan((camera.fov * Math.PI) / 360);
  let baseZ = 12;
  let visH = 11;

  const dotSize = () =>
    DOT * pixelRatio * baseZ * (THEMES[currentTheme()].sizeScale || 1);

  const frame = () => {
    // read off the live width, not an init-time flag, so a rotation re-frames
    const f = w < MOBILE_AT ? FRAMING.mobile : FRAMING.wide;
    const tanH = tanHalfFov();
    baseZ = Math.max(KNOT_R / (f.h * tanH), KNOT_R / (f.w * tanH * camera.aspect));
    visH = 2 * baseZ * tanH;
    const lift = (0.5 - f.centre) * visH;
    points.position.y = lift;
    ring.position.y = lift;
    mat.uniforms.uSize.value = dotSize();
    // the depth fade is expressed around wherever the camera ended up
    mat.uniforms.uNear.value = baseZ - KNOT_R;
    mat.uniforms.uFar.value = baseZ + KNOT_R;
  };

  camera.position.set(0, 0, baseZ);

  // --- particles along a torus knot, with radial scatter ---
  const COUNT = isMobile ? 7500 : 20000;
  const curve = new THREE.Curve();
  curve.getPoint = function (t) {
    // (2,3) torus knot
    const p = 2, q = 3, R = 3.2;
    const phi = t * Math.PI * 2 * p;
    const r = R + 1.15 * Math.cos((q / p) * phi);
    return new THREE.Vector3(
      r * Math.cos(phi),
      1.15 * Math.sin((q / p) * phi),
      r * Math.sin(phi)
    );
  };

  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  // the colour roll is kept so a theme swap recolours the *same* particles
  // instead of reshuffling which ones are orange
  const rolls = new Float32Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    const base = curve.getPoint(t);
    const scatter = 0.16 + Math.pow(Math.random(), 3) * 0.85;
    positions[i * 3] = base.x + (Math.random() - 0.5) * scatter;
    positions[i * 3 + 1] = base.y + (Math.random() - 0.5) * scatter;
    positions[i * 3 + 2] = base.z + (Math.random() - 0.5) * scatter;
    seeds[i] = Math.random();
    rolls[i] = Math.random();
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THEMES[currentTheme()].blending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 24 },
      uNear: { value: 7 },
      uFar: { value: 19 },
      uAlpha: { value: THEMES[currentTheme()].alpha },
      uSoft: { value: THEMES[currentTheme()].soft },
      uTwinkle: { value: THEMES[currentTheme()].twinkle },
      uDepthFade: { value: THEMES[currentTheme()].depthFade },
    },
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      uniform float uDepthFade;
      uniform float uTwinkle;
      uniform float uNear;
      uniform float uFar;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vColor = color;
        vec3 p = position;
        // gentle breathing drift per-particle
        p.x += sin(uTime * 0.6 + aSeed * 31.4) * 0.06;
        p.y += cos(uTime * 0.5 + aSeed * 21.7) * 0.06;
        p.z += sin(uTime * 0.4 + aSeed * 11.3) * 0.06;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float twinkle = (1.0 - uTwinkle) + uTwinkle * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 50.0);
        float depthFade = 1.0 - smoothstep(uNear, uFar, -mv.z) * uDepthFade;
        vFade = twinkle * depthFade;
        gl_PointSize = uSize * twinkle * (1.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uAlpha;
      uniform float uSoft;
      varying vec3 vColor;
      varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, uSoft, d) * uAlpha * vFade;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });

  const points = new THREE.Points(geo, mat);
  points.rotation.x = 0.55;
  scene.add(points);

  // faint wire ring behind, echoes the logo mark
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.011, 8, 220), ringMat);
  ring.rotation.x = Math.PI / 2.3;
  scene.add(ring);

  // --- theme ---
  const c = new THREE.Color();
  function applyTheme(name) {
    const th = THEMES[name] || THEMES.light;
    for (let i = 0; i < COUNT; i++) {
      const roll = rolls[i];
      c.setHex(roll < th.mix[0] ? th.palette[0] : roll < th.mix[1] ? th.palette[1] : th.palette[2]);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.attributes.color.needsUpdate = true;
    mat.blending = th.blending;
    mat.uniforms.uAlpha.value = th.alpha;
    mat.uniforms.uDepthFade.value = th.depthFade;
    mat.uniforms.uSize.value = dotSize();
    mat.uniforms.uSoft.value = th.soft;
    mat.uniforms.uTwinkle.value = th.twinkle;
    mat.needsUpdate = true;
    ringMat.color.setHex(th.ring.color);
    ringMat.opacity = th.ring.opacity;
    scene.fog.color.setHex(th.fog);
  }

  applyTheme(currentTheme());
  frame();
  window.addEventListener("sl:themechange", (e) => {
    applyTheme(e.detail && e.detail.theme ? e.detail.theme : currentTheme());
  });

  // --- pointer parallax (mouse only — a finger has no hover) ---
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // --- drag to spin, on every input ---
  // Touch is the awkward case: the canvas fills the hero, so claiming every
  // gesture would trap the page. #scene carries touch-action: pan-y, which
  // hands vertical swipes back to the scroller; a horizontal swipe is not
  // claimed by the browser, so the first few pixels decide the axis and the
  // gesture is either a spin or a scroll for its whole life.
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const drag = { id: null, spinning: false, x: 0, y: 0, sx: 0, sy: 0, offX: 0, offY: 0, vx: 0, vy: 0 };
  const SENS = 0.005;
  const RELEASE = 0.55; // the throw carries, it does not launch
  const FRICTION = 0.9;

  function begin(e) {
    drag.id = e.pointerId;
    drag.spinning = false;
    drag.x = drag.sx = e.clientX;
    drag.y = drag.sy = e.clientY;
    drag.vx = drag.vy = 0;
    if (e.pointerType === "mouse") claim(e);
  }

  function claim(e) {
    drag.spinning = true;
    canvas.classList.add("is-dragging");
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function move(e) {
    if (e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    if (!drag.spinning) {
      const tx = Math.abs(e.clientX - drag.sx);
      const ty = Math.abs(e.clientY - drag.sy);
      if (tx < 6 && ty < 6) return;
      // a mostly-vertical first move belongs to the page, not the knot
      if (ty > tx) { drag.id = null; return; }
      claim(e);
    }

    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.vx = dx * SENS;
    drag.vy = dy * SENS;
    drag.offY += drag.vx;
    drag.offX = clamp(drag.offX + drag.vy, -1.1, 1.1);
    if (e.cancelable) e.preventDefault();
  }

  function end(e) {
    if (e.pointerId !== drag.id) return;
    drag.id = null;
    drag.spinning = false;
    drag.vx *= RELEASE;
    drag.vy *= RELEASE;
    canvas.classList.remove("is-dragging");
  }

  canvas.addEventListener("pointerdown", begin);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);

  let scrollY = 0;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  const resize = () => {
    const next = size();
    if (next.w === w && next.h === h) return; // mobile URL-bar scroll churn
    w = next.w;
    h = next.h;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame();
    renderer.setSize(w, h, false);
  };

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener("resize", resize);
  }

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0 })
    .observe(canvas);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = clock.getElapsedTime();
    mat.uniforms.uTime.value = t;

    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;

    // a released drag keeps its momentum and coasts back to the idle spin
    if (!drag.spinning) {
      drag.offY += drag.vx;
      drag.offX = clamp(drag.offX + drag.vy, -1.1, 1.1);
      drag.vx *= FRICTION;
      drag.vy *= FRICTION;
      drag.offX *= 0.985; // the tilt eases home; the spin is free to stay put
    }

    points.rotation.y = t * 0.08 + mouse.x * 0.25 + drag.offY;
    points.rotation.x = 0.55 + mouse.y * 0.18 + drag.offX;
    ring.rotation.z = t * 0.05 + drag.offY * 0.4;

    // the parallax is expressed as a share of the frame so it reads the same
    // whatever distance the framing settled on
    const drift = Math.min(scrollY / h, 1);
    camera.position.y = -drift * visH * 0.22;
    camera.position.z = baseZ * (1 + drift * 0.16);
    camera.lookAt(0, -drift * visH * 0.12, 0);

    renderer.render(scene, camera);
  });
}

if (canvas && !reduceMotion) initScene();
