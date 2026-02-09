console.log("✅ script.js loaded");

document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("bg");
  if (!canvas) {
    console.error("❌ canvas#bg not found");
    return;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    console.error("❌ could not get 2D context");
    return;
  }

  const startOverlay = document.getElementById("startOverlay");
  const startBtn = document.getElementById("startBtn");

  const music = document.getElementById("music");
  const voice = document.getElementById("voice");
  const muteBtn = document.getElementById("muteBtn");
  const voiceBtn = document.getElementById("voiceBtn");

  const scrollHint = document.getElementById("scrollHint");
  const voicePage = document.getElementById("voicePage");
  const flowerBg = document.getElementById("flowerBg");

  const pages = Array.from(document.querySelectorAll("#pages .page"));
  const TOTAL_PAGES = pages.length || 0;

  let journeyStarted = false;
  if (startOverlay && startBtn) {
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
  }

  let W = 0,
    H = 0,
    DPR = 1;

  let sakuraForest = null;
  let sakuraSeed = 1337;

  function resize() {
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    sakuraForest = null;
  }
  window.addEventListener("resize", resize);
  resize();

  function showFlowers() {
    if (!flowerBg) return;
    flowerBg.classList.add("show");
    flowerBg.classList.remove("not-loaded");
  }

  function hideFlowers() {
    if (!flowerBg) return;
    flowerBg.classList.remove("show");
    flowerBg.classList.add("not-loaded");
  }

  let currentPage = 1;
  function sceneFromPage(p) {
    if (p >= 1 && p <= 6) return "stars";
    if (p >= 7 && p <= 13) return "sakura";
    if (p >= 14 && p <= 20) return "flower";
    return "heart";
  }

  const sceneW = { stars: 1, sakura: 0, flower: 0, heart: 0 };
  let activeScene = "stars";

  function stepSceneWeights(nextScene, speed = 0.12) {
    for (const k of Object.keys(sceneW)) {
      const target = k === nextScene ? 1 : 0;
      sceneW[k] += (target - sceneW[k]) * speed;
      if (sceneW[k] < 0.0005) sceneW[k] = 0;
      if (sceneW[k] > 0.9995) sceneW[k] = 1;
    }
  }

  if (pages.length > 0) {
    const pageObs = new IntersectionObserver(
      (entries) => {
        let best = null;
        for (const e of entries) {
          if (!best || e.intersectionRatio > best.intersectionRatio) best = e;
        }
        if (!best) return;

        const idx = pages.indexOf(best.target);
        if (idx >= 0) {
          currentPage = idx + 1;
          activeScene = sceneFromPage(currentPage);

          if (journeyStarted && activeScene === "flower") showFlowers();
          else hideFlowers();
        }
      },
      { threshold: [0.2, 0.35, 0.5, 0.65, 0.8] }
    );

    pages.forEach((p) => pageObs.observe(p));
  }

  let pointer = { x: 0.5, y: 0.5 };
  window.addEventListener("pointermove", (e) => {
    if (W <= 0 || H <= 0) return;
    pointer.x = e.clientX / W;
    pointer.y = e.clientY / H;
  });

  function getProgress() {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    return Math.min(1, Math.max(0, window.scrollY / max));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  const stars = Array.from({ length: 220 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.4 + 0.3,
    tw: Math.random() * 0.8 + 0.2,
    glow: Math.random() * 0.9 + 0.2,
  }));

  const petals = Array.from({ length: 60 }, () => ({
    x: Math.random(),
    y: Math.random(),
    s: Math.random() * 0.7 + 0.2,
    a: Math.random() * Math.PI * 2,
    w: Math.random() * 0.8 + 0.2,
  }));

  const shooters = Array.from({ length: 7 }, () => makeShooter(true));

  function makeShooter(initial) {
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -0.15 : 1.15;
    const y = Math.random() * 0.65;

    const vx = (fromLeft ? 1 : -1) * (0.25 + Math.random() * 0.35);
    const vy = (0.10 + Math.random() * 0.20) * (Math.random() < 0.6 ? 1 : -1);

    return {
      x: initial ? Math.random() * 1.2 - 0.1 : x,
      y: initial ? Math.random() * 0.7 : y,
      vx,
      vy,
      len: 0.08 + Math.random() * 0.10,
      w: 1.2 + Math.random() * 1.8,
      a: 0,
      life: initial ? Math.random() * 2 : 0,
      delay: initial ? Math.random() * 2 : 0.4 + Math.random() * 4.5,
    };
  }

  let cancelMusicRamp = null;

  function rampVolume(audioEl, target, ms = 700) {
    if (!audioEl) return () => {};
    if (cancelMusicRamp) cancelMusicRamp();

    let raf = 0;
    const startVol = Number.isFinite(audioEl.volume) ? audioEl.volume : 1;
    const endVol = Math.min(1, Math.max(0, target));
    const startT = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startT) / Math.max(1, ms));
      const eased = t * t * (3 - 2 * t);
      audioEl.volume = startVol + (endVol - startVol) * eased;
      if (t < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);

    cancelMusicRamp = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    return cancelMusicRamp;
  }

  function fadeVolume(audioEl, target, ms = 700) {
    if (!audioEl) return Promise.resolve();
    if (cancelMusicRamp) cancelMusicRamp();

    const startVol = Number.isFinite(audioEl.volume) ? audioEl.volume : 1;
    const endVol = Math.min(1, Math.max(0, target));
    const startT = performance.now();

    return new Promise((resolve) => {
      function step(now) {
        const t = Math.min(1, (now - startT) / Math.max(1, ms));
        const eased = t * t * (3 - 2 * t);
        audioEl.volume = startVol + (endVol - startVol) * eased;
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      }
      requestAnimationFrame(step);
    });
  }

  const isIOSSafari = (() => {
    const ua = navigator.userAgent || "";
    const isIOS = /iP(hone|ad|od)/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return isIOS && isSafari;
  })();

  let voiceGateActive = false;
  let voiceGateY = 0;
  let voiceGatePinning = false;

  let voiceGateTouchStartY = 0;
  window.addEventListener(
    "touchstart",
    (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      voiceGateTouchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  function pinToVoiceGate() {
    if (!voiceGateActive || voiceGatePinning) return;
    voiceGatePinning = true;
    window.scrollTo({ top: voiceGateY, behavior: "auto" });
    requestAnimationFrame(() => (voiceGatePinning = false));
  }

  function startVoiceGate() {
    voiceGateY = window.scrollY;
    voiceGateActive = true;
    pinToVoiceGate();
  }

  function stopVoiceGate() {
    voiceGateActive = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!voiceGateActive || voiceGatePinning) return;
      if (window.scrollY > voiceGateY + 1) pinToVoiceGate();
    },
    { passive: true }
  );

  function blockDownInputsWhileVoice(e) {
    if (!voiceGateActive) return;

    if (e.type === "wheel") {
      if ((e.deltaY || 0) > 0) {
        e.preventDefault();
        pinToVoiceGate();
      }
      return;
    }

    if (e.type === "keydown") {
      const keys = ["ArrowDown", "PageDown", "End", " ", "Spacebar"];
      if (keys.includes(e.key)) {
        e.preventDefault();
        pinToVoiceGate();
      }
      return;
    }

    if (e.type === "touchmove") {
      if (!e.touches || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const delta = voiceGateTouchStartY - y;
      if (delta > 0) {
        e.preventDefault();
        pinToVoiceGate();
      }
    }
  }

  window.addEventListener("wheel", blockDownInputsWhileVoice, { passive: false });
  window.addEventListener("touchmove", blockDownInputsWhileVoice, { passive: false });
  window.addEventListener("keydown", blockDownInputsWhileVoice, { passive: false });

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function bezier2(p0, p1, p2, t) {
    const u = 1 - t;
    return u * u * p0 + 2 * u * t * p1 + t * t * p2;
  }

  function buildSakuraForest() {
    const rand = mulberry32(sakuraSeed);
    const groundY = H * 0.72;

    const layers = [
      { count: 6, scale: 0.75, alpha: 0.28, y: groundY, spread: 1.1 },
      { count: 7, scale: 0.95, alpha: 0.42, y: groundY, spread: 1.05 },
      { count: 8, scale: 1.18, alpha: 0.58, y: groundY, spread: 1.0 },
    ];

    sakuraForest = layers.map((L, li) => {
      const trees = [];
      for (let i = 0; i < L.count; i++) {
        const x =
          ((i + 0.15 + rand() * 0.7) / L.count) * W * L.spread -
          W * (L.spread - 1) * 0.5;

        const trunkH = H * (0.38 * L.scale) * (0.82 + rand() * 0.28);
        const trunkW = (10 + rand() * 10) * L.scale;

        const sway = (rand() * 2 - 1) * (28 + 24 * L.scale);
        const x0 = x;
        const y0 = L.y;
        const x1 = x + sway * 0.25;
        const y1 = L.y - trunkH * 0.55;
        const x2 = x + sway;
        const y2 = L.y - trunkH;

        const branches = [];
        const branchCount = 10 + li * 5;
        for (let b = 0; b < branchCount; b++) {
          const tt = 0.35 + rand() * 0.55;
          const bx = bezier2(x0, x1, x2, tt);
          const by = bezier2(y0, y1, y2, tt);

          const dir = rand() < 0.5 ? -1 : 1;
          const len = (35 + rand() * 75) * L.scale * (0.7 + (1 - tt) * 0.6);
          const up = (0.35 + rand() * 0.5) * len;

          const ex = bx + dir * len;
          const ey = by - up;

          const cx = bx + dir * len * (0.35 + rand() * 0.2);
          const cy = by - up * (0.55 + rand() * 0.15);

          branches.push({
            bx,
            by,
            cx,
            cy,
            ex,
            ey,
            w: Math.max(1.6, trunkW * (0.18 + (1 - tt) * 0.22)),
            dir,
          });

          const subN = 1 + (rand() < 0.65 ? 1 : 0);
          for (let s = 0; s < subN; s++) {
            const t2 = 0.35 + rand() * 0.45;
            const sbx = bezier2(bx, cx, ex, t2);
            const sby = bezier2(by, cy, ey, t2);

            const sdir = dir * (rand() < 0.5 ? 1 : -1);
            const slen = len * (0.45 + rand() * 0.35);
            const sup = up * (0.45 + rand() * 0.35);

            branches.push({
              bx: sbx,
              by: sby,
              cx: sbx + sdir * slen * (0.38 + rand() * 0.25),
              cy: sby - sup * (0.55 + rand() * 0.2),
              ex: sbx + sdir * slen,
              ey: sby - sup,
              w: Math.max(1.1, trunkW * 0.12),
              dir: sdir,
            });
          }
        }

        const clusters = [];
        const clusterCount = 6 + li * 4;
        for (let c = 0; c < clusterCount; c++) {
          const pick = branches[Math.floor(rand() * branches.length)];
          const ax = pick ? pick.ex : x2;
          const ay = pick ? pick.ey : y2;

          const r = (42 + rand() * 58) * L.scale;
          const nDots = Math.floor((55 + rand() * 75) * (0.75 + li * 0.25));

          const dots = [];
          for (let k = 0; k < nDots; k++) {
            const ang = rand() * Math.PI * 2;
            const rr = Math.pow(rand(), 0.55) * r;
            dots.push({
              x: ax + Math.cos(ang) * rr,
              y: ay + Math.sin(ang) * rr * 0.72,
              s: 1.2 + rand() * 2.2 * L.scale,
              a: 0.08 + rand() * 0.18,
            });
          }

          clusters.push({ x: ax, y: ay, r, dots });
        }

        trees.push({
          x0,
          y0,
          x1,
          y1,
          x2,
          y2,
          trunkW,
          branches,
          clusters,
        });
      }

      return { ...L, trees };
    });
  }

  function drawSakuraForest(amount, t) {
    if (amount <= 0.001) return;
    if (!sakuraForest) buildSakuraForest();

    ctx.save();

    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, `rgba(8, 14, 44, ${0.95 * amount})`);
    sky.addColorStop(1, `rgba(18, 10, 32, ${0.9 * amount})`);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const fog = ctx.createRadialGradient(
      W * 0.55,
      H * 0.35,
      0,
      W * 0.55,
      H * 0.35,
      Math.min(W, H) * 0.85
    );
    fog.addColorStop(0, `rgba(255, 190, 220, ${0.14 * amount})`);
    fog.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, W, H);

    const groundY = H * 0.72;
    const ground = ctx.createLinearGradient(0, groundY, 0, H);
    ground.addColorStop(0, `rgba(6, 18, 20, ${0.78 * amount})`);
    ground.addColorStop(1, `rgba(2, 8, 10, ${0.92 * amount})`);
    ctx.fillStyle = ground;
    ctx.fillRect(0, groundY, W, H - groundY);

    const parX = (pointer.x - 0.5) * 18;
    const parY = (pointer.y - 0.5) * 10;

    for (let li = 0; li < sakuraForest.length; li++) {
      const L = sakuraForest[li];
      ctx.globalAlpha = amount * L.alpha;
      const layerPar = 0.35 + li * 0.35;

      for (const tree of L.trees) {
        ctx.strokeStyle = "rgba(18, 12, 18, 0.95)";
        ctx.lineCap = "round";
        ctx.lineWidth = tree.trunkW;

        ctx.beginPath();
        ctx.moveTo(tree.x0 + parX * layerPar, tree.y0 + parY * layerPar);
        ctx.quadraticCurveTo(
          tree.x1 + parX * layerPar,
          tree.y1 + parY * layerPar,
          tree.x2 + parX * layerPar,
          tree.y2 + parY * layerPar
        );
        ctx.stroke();

        ctx.strokeStyle = "rgba(18, 12, 18, 0.85)";
        for (const b of tree.branches) {
          ctx.lineWidth = b.w;
          ctx.beginPath();
          ctx.moveTo(b.bx + parX * layerPar, b.by + parY * layerPar);
          ctx.quadraticCurveTo(
            b.cx + parX * layerPar,
            b.cy + parY * layerPar,
            b.ex + parX * layerPar,
            b.ey + parY * layerPar
          );
          ctx.stroke();
        }

        for (const cl of tree.clusters) {
          const cx = cl.x + parX * layerPar;
          const cy = cl.y + parY * layerPar;

          const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cl.r);
          rg.addColorStop(0, `rgba(255, 175, 210, ${0.22 * amount})`);
          rg.addColorStop(0.45, `rgba(255, 145, 195, ${0.11 * amount})`);
          rg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = rg;

          ctx.beginPath();
          ctx.arc(cx, cy, cl.r, 0, Math.PI * 2);
          ctx.fill();

          for (const d of cl.dots) {
            ctx.fillStyle = `rgba(255, 195, 220, ${d.a * amount})`;
            ctx.beginPath();
            ctx.arc(
              d.x + parX * layerPar,
              d.y + parY * layerPar,
              d.s,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawBeatingHeart(amount, t) {
    if (amount <= 0.001) return;

    const time = t * 0.001;
    const b1 = Math.max(0, Math.sin(time * 2.2));
    const b2 = Math.max(0, Math.sin(time * 2.2 + 1.15)) * 0.55;
    const beat = Math.min(1, b1 + b2);

    const cx = W * 0.5;
    const cy = H * 0.52;

    const base = Math.min(W, H) * 0.22;
    const pulse = 1 + beat * 0.085;
    const size = base * pulse;

    ctx.save();

    ctx.fillStyle = `rgba(25, 0, 8, ${0.65 * amount})`;
    ctx.fillRect(0, 0, W, H);

    const haloR = size * 2.1;
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
    halo.addColorStop(0, `rgba(255, 60, 90, ${0.2 * amount})`);
    halo.addColorStop(0.35, `rgba(255, 20, 60, ${0.12 * amount})`);
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(cx, cy);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.shadowColor = "rgba(255, 40, 80, 0.55)";
    ctx.shadowBlur = 22 + 18 * beat;

    ctx.fillStyle = `rgba(255, 40, 80, ${(0.5 + 0.22 * beat) * amount})`;

    const s = size;

    ctx.beginPath();
    ctx.moveTo(0, -0.18 * s);

    ctx.bezierCurveTo(-0.28 * s, -0.46 * s, -0.72 * s, -0.26 * s, -0.66 * s, 0.1 * s);
    ctx.bezierCurveTo(-0.6 * s, 0.44 * s, -0.2 * s, 0.7 * s, 0.0 * s, 0.86 * s);
    ctx.bezierCurveTo(0.2 * s, 0.7 * s, 0.6 * s, 0.44 * s, 0.66 * s, 0.1 * s);
    ctx.bezierCurveTo(0.72 * s, -0.26 * s, 0.28 * s, -0.46 * s, 0.0 * s, -0.18 * s);

    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 130, 160, ${0.22 * amount})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  const endLockEl =
    document.getElementById("endLock") || document.querySelector("[data-end-lock]") || null;

  let endLockY = null;
  let endLockArmed = false;
  let endLockActive = false;
  let endLockPinning = false;

  function computeEndLockY() {
    if (!endLockEl) return null;
    const r = endLockEl.getBoundingClientRect();
    const center = window.innerHeight * 0.5;
    let y = window.scrollY + (r.top + r.height * 0.5 - center);

    const doc = document.documentElement;
    const max = Math.max(0, doc.scrollHeight - window.innerHeight);
    y = Math.max(0, Math.min(max, y));
    return y;
  }

  function pinToEndLock() {
    if (endLockY == null) endLockY = computeEndLockY();
    if (endLockY == null) return;

    endLockPinning = true;
    window.scrollTo({ top: endLockY, behavior: "auto" });
    requestAnimationFrame(() => (endLockPinning = false));
  }

  if (endLockEl) {
    const endObs = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        endLockArmed = e.isIntersecting && e.intersectionRatio >= 0.55;

        if (endLockArmed) {
          endLockY = computeEndLockY();
        } else {
          endLockActive = false;
        }
      },
      { threshold: [0.25, 0.55, 0.8] }
    );
    endObs.observe(endLockEl);

    window.addEventListener(
      "scroll",
      () => {
        if (!journeyStarted) return;
        if (!endLockArmed || endLockY == null || endLockPinning) return;

        if (window.scrollY < endLockY - 2) {
          endLockActive = false;
          return;
        }

        if (window.scrollY > endLockY + 1) {
          endLockActive = true;
          pinToEndLock();
        }
      },
      { passive: true }
    );

    function blockDownWheel(e) {
      if (!journeyStarted) return;
      if (!endLockActive || endLockY == null) return;
      if ((e.deltaY || 0) > 0) {
        e.preventDefault();
        pinToEndLock();
      }
    }

    let touchStartY = 0;
    function onTouchStart(e) {
      if (!e.touches || e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
    }
    function onTouchMove(e) {
      if (!journeyStarted) return;
      if (!endLockActive || endLockY == null) return;
      if (!e.touches || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const delta = touchStartY - y;
      if (delta > 0) {
        e.preventDefault();
        pinToEndLock();
      }
    }

    function onKeyDown(e) {
      if (!journeyStarted) return;
      if (!endLockActive || endLockY == null) return;
      const keys = ["ArrowDown", "PageDown", "End", " ", "Spacebar"];
      if (keys.includes(e.key)) {
        e.preventDefault();
        pinToEndLock();
      }
    }

    window.addEventListener("wheel", blockDownWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKeyDown, { passive: false });
  } else {
    console.warn("⚠️ endLock element not found. Add id='endLock' to last section.");
  }

  function drawBackground(p, t) {
    stepSceneWeights(activeScene, 0.12);

    const starsOn = sceneW.stars;
    const sakuraOn = sceneW.sakura;
    const flowerOn = sceneW.flower;
    const heartOn = sceneW.heart;

    const g = ctx.createLinearGradient(0, 0, 0, H);

    const warmMix = Math.min(1, 0.75 * flowerOn + 0.9 * heartOn);
    const topR = Math.floor(4 + 26 * warmMix);
    const topG = Math.floor(8 + 22 * warmMix);
    const topB = Math.floor(26 + 14 * warmMix);

    const botR = Math.floor(2 + 52 * warmMix);
    const botG = Math.floor(4 + 24 * warmMix);
    const botB = Math.floor(22 + 18 * warmMix);

    g.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
    g.addColorStop(1, `rgb(${botR}, ${botG}, ${botB})`);

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    if (starsOn > 0.001) {
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * 0.001 * s.tw + s.x * 10);
        const px = (s.x + (pointer.x - 0.5) * 0.02) * W;
        const py = (s.y + (pointer.y - 0.5) * 0.02) * H;

        const gr = s.r * (4.2 + 2.2 * s.glow);
        const a = starsOn * tw;

        const rg = ctx.createRadialGradient(px, py, 0, px, py, gr);
        rg.addColorStop(0, `rgba(255,236,160,${0.55 * a})`);
        rg.addColorStop(0.35, `rgba(255,210,90,${0.22 * a})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(px, py, gr, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,245,200,${0.9 * a})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (starsOn > 0.001) {
      const dt = Math.min(0.05, (t - (drawBackground._lastT || t)) / 1000);
      drawBackground._lastT = t;

      for (const sh of shooters) {
        sh.delay -= dt;
        if (sh.delay > 0) continue;

        sh.life += dt;
        sh.a = Math.min(1, sh.life / 0.15) * (1 - Math.min(1, (sh.life - 0.35) / 0.35));
        sh.a *= starsOn;

        sh.x += sh.vx * dt;
        sh.y += sh.vy * dt;

        const x1 = sh.x * W;
        const y1 = sh.y * H;

        const dx = sh.vx;
        const dy = sh.vy;
        const mag = Math.max(0.0001, Math.hypot(dx, dy));
        const nx = dx / mag;
        const ny = dy / mag;

        const tail = sh.len * Math.min(W, H);
        const x0 = x1 - nx * tail;
        const y0 = y1 - ny * tail;

        ctx.lineWidth = sh.w;
        ctx.lineCap = "round";

        const lg = ctx.createLinearGradient(x0, y0, x1, y1);
        lg.addColorStop(0, "rgba(0,0,0,0)");
        lg.addColorStop(0.45, `rgba(255,220,120,${0.18 * sh.a})`);
        lg.addColorStop(1, `rgba(255,245,210,${0.95 * sh.a})`);

        ctx.strokeStyle = lg;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();

        ctx.fillStyle = `rgba(255,250,220,${0.95 * sh.a})`;
        ctx.beginPath();
        ctx.arc(x1, y1, 2.2, 0, Math.PI * 2);
        ctx.fill();

        const off =
          sh.x < -0.25 ||
          sh.x > 1.25 ||
          sh.y < -0.25 ||
          sh.y > 1.25 ||
          sh.life > 1.0;

        if (off) {
          const fresh = makeShooter(false);
          sh.x = fresh.x;
          sh.y = fresh.y;
          sh.vx = fresh.vx;
          sh.vy = fresh.vy;
          sh.len = fresh.len;
          sh.w = fresh.w;
          sh.a = 0;
          sh.life = 0;
          sh.delay = fresh.delay;
        }
      }
    }

    if (sakuraOn > 0.001) {
      drawSakuraForest(sakuraOn, t);

      for (const f of petals) {
        const drift = t * 0.00005 * (0.6 + f.w);
        const x = ((f.x + drift) % 1) * W;
        const y = ((f.y + drift * 0.7) % 1) * H;
        const size = (8 + 18 * f.s) * (0.6 + 0.4 * sakuraOn);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(f.a + t * 0.0002);
        ctx.globalAlpha = 0.32 * sakuraOn;

        ctx.fillStyle = "rgba(255, 170, 200, 0.95)";
        ctx.beginPath();
        ctx.ellipse(0, 0, size * 0.55, size, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        ctx.globalAlpha = 1;
      }
    }

    if (heartOn > 0.001) {
      drawBeatingHeart(heartOn, t);
    }

    const vg = ctx.createRadialGradient(
      W / 2,
      H / 2,
      Math.min(W, H) * 0.2,
      W / 2,
      H / 2,
      Math.min(W, H) * 0.75
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  function loop(now) {
    const p = getProgress();
    drawBackground(p, now);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function showScrollHint() {
    if (!scrollHint) return;
    scrollHint.classList.remove("show");
    void scrollHint.offsetWidth;
    scrollHint.classList.add("show");
  }

  if (scrollHint) {
    scrollHint.addEventListener("animationend", () => {
      scrollHint.classList.remove("show");
    });
  }

  if (voiceBtn) {
    voiceBtn.classList.add("disabled");
    voiceBtn.style.display = "none";
  }

  if (voicePage && voiceBtn) {
    const obs = new IntersectionObserver(
      (entries) => {
        const onVoicePage = entries[0].isIntersecting;

        if (onVoicePage) {
          voiceBtn.style.display = "inline-flex";
          voiceBtn.classList.remove("disabled");
        } else {
          voiceBtn.classList.add("disabled");
          voiceBtn.style.display = "none";

          if (voice) {
            voice.pause();
            voice.currentTime = 0;
          }

          stopVoiceGate();

          if (cancelMusicRamp) cancelMusicRamp();

          if (music && music.paused && journeyStarted) {
            music.play().catch(() => {});
          }
        }
      },
      { threshold: 0.55 }
    );

    obs.observe(voicePage);
  }

  if (startBtn && startOverlay && music) {
    startBtn.addEventListener("click", async () => {
      console.log("✅ Start button clicked");

      journeyStarted = true;

      startOverlay.style.display = "none";
      document.documentElement.classList.remove("no-scroll");
      document.body.classList.remove("no-scroll");
      showScrollHint();

      if (activeScene === "flower") showFlowers();
      else hideFlowers();

      try {
        const targetVol = 0.35;

        music.volume = 0.0;
        music.muted = false;
        music.load();
        await music.play();

        rampVolume(music, targetVol, 1200);
        console.log("✅ Music is playing");
      } catch (e) {
        console.log("❌ Music failed to play:", e);
      }
    });
  } else {
    console.warn("⚠️ startBtn/startOverlay/music missing");
  }

  if (muteBtn && music) {
    muteBtn.addEventListener("click", () => {
      music.muted = !music.muted;
      muteBtn.textContent = music.muted ? "🔇" : "🔊";
    });
  }

  if (voiceBtn && voice && music) {
    let restoring = false;

    async function restoreMusic(savedVol, musicWasPlaying, iOSPausedMusic) {
      if (restoring) return;
      restoring = true;
      try {
        if (isIOSSafari && iOSPausedMusic && musicWasPlaying) {
          await music.play().catch(() => {});
          music.volume = 0.01; 
        }
        await fadeVolume(music, savedVol, 900);
      } finally {
        restoring = false;
        stopVoiceGate();
      }
    }

    voiceBtn.addEventListener("click", async () => {
      try {
        if (voiceBtn.classList.contains("disabled")) return;

        if (!voice.paused && !voice.ended) return;

        startVoiceGate();

        const savedVol = Number.isFinite(music.volume) ? music.volume : 0.35;
        const musicWasPlaying = !music.paused;
        let iOSPausedMusic = false;

        await fadeVolume(music, 0.01, 650);

        if (isIOSSafari && musicWasPlaying) {
          music.pause();
          iOSPausedMusic = true;
        }

        const onEnded = () => {
          restoreMusic(savedVol, musicWasPlaying, iOSPausedMusic).catch(() => {});
        };
        voice.addEventListener("ended", onEnded, { once: true });

        voice.pause();
        voice.currentTime = 0;
        voice.load();
        await voice.play();
      } catch (e) {
        console.log("❌ Voice failed to play:", e);

        stopVoiceGate();

        const fallbackVol = Number.isFinite(music.volume) ? music.volume : 0.35;
        fadeVolume(music, Math.max(0.2, fallbackVol), 500).catch(() => {});
        if (music.paused && journeyStarted) {
          music.play().catch(() => {});
        }
      }
    });
  }
  console.log(`✅ Pages detected: ${TOTAL_PAGES} (current page = ${currentPage})`);
});
