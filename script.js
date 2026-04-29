/* ============================================================
   만화 뷰어 — script.js
   ============================================================ */

/* ★ 이미지 목록 (여기만 수정) */
const IMAGES = [
  { src: "images/page01.jpg", title: "1화 — 시작" },
  { src: "images/page02.jpg", title: "1화 — 2페이지" },
];

const MIN_ZOOM  = 0.3;
const MAX_ZOOM  = 4.0;
const ZOOM_STEP = 0.2;

let currentIdx     = 0;
let zoomLevel      = 1.0;
let isPinching     = false;
let pinchDist0     = 0;
let pinchZoom0     = 1;
let scrollEndTimer = null;

const strip       = document.getElementById("imageStrip");
const container   = document.getElementById("scrollContainer");
const navLeft     = document.getElementById("navLeft");
const navRight    = document.getElementById("navRight");
const curPageEl   = document.getElementById("currentPage");
const totPageEl   = document.getElementById("totalPages");
const zoomLabel   = document.getElementById("zoomLabel");
const zoomInBtn   = document.getElementById("zoomIn");
const zoomOutBtn  = document.getElementById("zoomOut");
const zoomReset   = document.getElementById("zoomReset");
const thumbTrack  = document.getElementById("thumbTrack");
const progressBar = document.getElementById("progressBar");

/* ────────────────────────────────────────────────────────────
   초기화
   ──────────────────────────────────────────────────────────── */
function init() {
  totPageEl.textContent = IMAGES.length;

  IMAGES.forEach((item, i) => {
    const slide = document.createElement("div");
    slide.className = "page-slide";
    slide.dataset.index = i;

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || `page ${i + 1}`;
    img.draggable = false;
    img.onload  = () => sizeImg(slide, img);
    img.onerror = () => {
      const ph = document.createElement("div");
      ph.style.cssText = "width:220px;height:300px;background:#1e1e1e;border:1px dashed #444;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#555;font-size:13px;gap:8px;flex-shrink:0;";
      ph.innerHTML = `<span style="font-size:32px">🖼️</span><span>이미지 ${i+1}</span>`;
      slide.style.width = "220px";
      slide.appendChild(ph);
    };
    slide.appendChild(img);
    strip.appendChild(slide);

    /* 썸네일 */
    const thumb = document.createElement("div");
    thumb.className = "thumb-item";
    thumb.setAttribute("data-index", i + 1);
    thumb.title = item.title || `${i + 1}페이지`;
    const tImg = document.createElement("img");
    tImg.src = item.src; tImg.alt = ""; tImg.draggable = false;
    thumb.appendChild(tImg);
    thumb.addEventListener("click", () => goTo(i));
    thumbTrack.appendChild(thumb);
  });

  bindEvents();
  updateUI();
}

/* ────────────────────────────────────────────────────────────
   이미지 크기 세팅 — viewH × 비율 × zoom
   슬라이드 너비도 동일하게 맞춤 → scroll-snap이 정확히 작동
   ──────────────────────────────────────────────────────────── */
function sizeImg(slide, img) {
  const viewH = container.clientHeight;
  const ratio = img.naturalWidth / img.naturalHeight;
  const h = Math.round(viewH * zoomLevel);
  const w = Math.round(h * ratio);
  img.style.width  = w + "px";
  img.style.height = h + "px";
  slide.style.width = w + "px";
}

function sizeAll() {
  Array.from(strip.children).forEach(slide => {
    const img = slide.querySelector("img");
    if (img && img.naturalWidth) sizeImg(slide, img);
  });
}

/* ────────────────────────────────────────────────────────────
   페이지 이동
   ──────────────────────────────────────────────────────────── */
function goTo(idx, behavior = "smooth") {
  idx = Math.max(0, Math.min(IMAGES.length - 1, idx));
  currentIdx = idx;
  strip.children[idx]?.scrollIntoView({ inline: "center", block: "nearest", behavior });
  updateUI();
}

/* ────────────────────────────────────────────────────────────
   스크롤 → 현재 페이지 추적
   ──────────────────────────────────────────────────────────── */
container.addEventListener("scroll", () => {
  const cx = container.scrollLeft + container.clientWidth / 2;
  let best = 0, bestD = Infinity;
  Array.from(strip.children).forEach((s, i) => {
    const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - cx);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best !== currentIdx) {
    currentIdx = best;
    curPageEl.textContent = currentIdx + 1;
    progressBar.style.width = pct() + "%";
  }
  clearTimeout(scrollEndTimer);
  scrollEndTimer = setTimeout(updateUI, 80);
}, { passive: true });

function pct() {
  return IMAGES.length <= 1 ? 100 : (currentIdx / (IMAGES.length - 1)) * 100;
}

/* ────────────────────────────────────────────────────────────
   줌
   ──────────────────────────────────────────────────────────── */
function applyZoom(z) {
  zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
  sizeAll();
  zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
  /* 줌 적용 후 현재 페이지 중앙 재정렬 */
  requestAnimationFrame(() => goTo(currentIdx, "instant"));
}

/* ────────────────────────────────────────────────────────────
   이벤트 바인딩
   ──────────────────────────────────────────────────────────── */
function bindEvents() {
  navLeft.addEventListener("click",  () => goTo(currentIdx - 1));
  navRight.addEventListener("click", () => goTo(currentIdx + 1));
  zoomInBtn.addEventListener("click",  () => applyZoom(zoomLevel + ZOOM_STEP));
  zoomOutBtn.addEventListener("click", () => applyZoom(zoomLevel - ZOOM_STEP));
  zoomReset.addEventListener("click",  () => applyZoom(1.0));

  document.addEventListener("keydown", e => {
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": goTo(currentIdx + 1); break;
      case "ArrowLeft":  case "ArrowUp":   goTo(currentIdx - 1); break;
      case "Home": goTo(0); break;
      case "End":  goTo(IMAGES.length - 1); break;
      case "+": case "=": applyZoom(zoomLevel + ZOOM_STEP); break;
      case "-": case "_": applyZoom(zoomLevel - ZOOM_STEP); break;
      case "0": applyZoom(1.0); break;
    }
  });

  /* Ctrl+휠 줌 */
  container.addEventListener("wheel", e => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      applyZoom(zoomLevel + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP));
    }
  }, { passive: false });

  /* 핀치 줌 */
  container.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      isPinching = true;
      pinchDist0 = getPinchDist(e);
      pinchZoom0 = zoomLevel;
      e.preventDefault();
    }
  }, { passive: false });

  container.addEventListener("touchmove", e => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      applyZoom(pinchZoom0 * (getPinchDist(e) / pinchDist0));
    }
  }, { passive: false });

  container.addEventListener("touchend", e => {
    if (e.touches.length < 2) isPinching = false;
  });

  /* 리사이즈 */
  let resT;
  window.addEventListener("resize", () => {
    clearTimeout(resT);
    resT = setTimeout(() => { sizeAll(); goTo(currentIdx, "instant"); }, 120);
  });
}

function getPinchDist(e) {
  return Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY
  );
}

/* ────────────────────────────────────────────────────────────
   UI 업데이트
   ──────────────────────────────────────────────────────────── */
function updateUI() {
  curPageEl.textContent = currentIdx + 1;
  navLeft.disabled  = currentIdx === 0;
  navRight.disabled = currentIdx === IMAGES.length - 1;
  Array.from(strip.children).forEach((s, i)    => s.classList.toggle("active", i === currentIdx));
  Array.from(thumbTrack.children).forEach((t, i) => t.classList.toggle("active", i === currentIdx));
  thumbTrack.children[currentIdx]?.scrollIntoView({ inline: "center", behavior: "smooth" });
  progressBar.style.width = pct() + "%";
}

init();
