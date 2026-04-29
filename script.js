/* ============================================================
   만화 뷰어 — script.js
   ============================================================ */

/* ──────────────────────────────────────────────────────────
   ★ 이미지 목록 설정 (여기만 수정하세요)
   경로는 index.html 기준 상대경로 또는 절대 URL.
   title 은 선택사항.
   ────────────────────────────────────────────────────────── */
const IMAGES = [
  { src: "images/page01.jpg", title: "1화 — 시작" },
  { src: "images/page02.jpg", title: "1화 — 2페이지" },
  { src: "images/page03.jpg", title: "1화 — 3페이지" },
  { src: "images/page04.jpg", title: "1화 — 4페이지" },
  { src: "images/page05.jpg", title: "1화 — 5페이지" },
  // 필요한 만큼 추가
];

/* ──────────────────────────────────────────────────────────
   상수 / 상태
   ────────────────────────────────────────────────────────── */
const MIN_ZOOM   = 0.4;
const MAX_ZOOM   = 3.0;
const ZOOM_STEP  = 0.15;
const SNAP_EASE  = 350;      // 페이지 스냅 애니메이션 ms

let currentIdx  = 0;
let zoomLevel   = 1.0;
let isSnapping  = false;

/* ──────────────────────────────────────────────────────────
   DOM 참조
   ────────────────────────────────────────────────────────── */
const strip      = document.getElementById("imageStrip");
const container  = document.getElementById("scrollContainer");
const leftBar    = document.getElementById("leftBar");
const rightBar   = document.getElementById("rightBar");
const navLeft    = document.getElementById("navLeft");
const navRight   = document.getElementById("navRight");
const curPageEl  = document.getElementById("currentPage");
const totPageEl  = document.getElementById("totalPages");
const zoomLabel  = document.getElementById("zoomLabel");
const zoomInBtn  = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomReset  = document.getElementById("zoomReset");
const thumbTrack = document.getElementById("thumbTrack");
const progressBar= document.getElementById("progressBar");

/* ──────────────────────────────────────────────────────────
   초기화 — 이미지 슬라이드 & 썸네일 생성
   ────────────────────────────────────────────────────────── */
function init() {
  totPageEl.textContent = IMAGES.length;

  IMAGES.forEach((item, i) => {
    /* 슬라이드 */
    const slide = document.createElement("div");
    slide.className = "page-slide";
    slide.dataset.index = i;

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || `page ${i + 1}`;
    img.draggable = false;
    /* 이미지 로드 후 슬라이드 너비 확정 */
    img.onload = () => onImageLoad(slide, img);
    img.onerror = () => onImageError(slide, img, i);

    slide.appendChild(img);
    strip.appendChild(slide);

    /* 썸네일 */
    const thumb = document.createElement("div");
    thumb.className = "thumb-item";
    thumb.dataset.index = i;
    thumb.setAttribute("data-index", i + 1);
    thumb.title = item.title || `${i + 1}페이지`;

    const tImg = document.createElement("img");
    tImg.src = item.src;
    tImg.alt = "";
    tImg.draggable = false;

    thumb.appendChild(tImg);
    thumb.addEventListener("click", () => goTo(i, true));
    thumbTrack.appendChild(thumb);
  });

  updateUI();
}

function onImageLoad(slide, img) {
  /* 슬라이드 너비 = 이미지 자연 비율 × 뷰어 높이 */
  const viewH = container.clientHeight;
  const nat   = img.naturalWidth / img.naturalHeight;
  slide.style.width = (viewH * nat * zoomLevel) + "px";
}

function onImageError(slide, img, i) {
  /* 이미지 없을 때 placeholder */
  img.style.display = "none";
  const ph = document.createElement("div");
  ph.style.cssText = `
    width:200px; height:280px; background:#1e1e1e;
    border:1px dashed #444; border-radius:4px;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    color:#555; font-size:13px; gap:8px;
  `;
  ph.innerHTML = `<span style="font-size:32px">🖼️</span><span>이미지 ${i+1}</span>`;
  slide.style.width = "200px";
  slide.appendChild(ph);
}

/* ──────────────────────────────────────────────────────────
   페이지 이동
   ────────────────────────────────────────────────────────── */
function goTo(idx, smooth = true) {
  if (idx < 0 || idx >= IMAGES.length) return;
  currentIdx = idx;
  snapToPage(smooth);
  updateUI();
}

function snapToPage(smooth = true) {
  const slide = strip.children[currentIdx];
  if (!slide) return;

  /* 슬라이드 중심을 뷰어 중심에 맞추는 scrollLeft 계산 */
  const slideLeft   = slide.offsetLeft;
  const slideWidth  = slide.offsetWidth;
  const viewW       = container.clientWidth;
  const target      = slideLeft + slideWidth / 2 - viewW / 2;

  isSnapping = true;
  if (smooth) {
    smoothScrollTo(container, target, SNAP_EASE, () => { isSnapping = false; });
  } else {
    container.scrollLeft = target;
    isSnapping = false;
  }
}

/* requestAnimationFrame 기반 부드러운 스크롤 */
function smoothScrollTo(el, target, duration, cb) {
  const start    = el.scrollLeft;
  const distance = target - start;
  let   startTime = null;

  function step(ts) {
    if (!startTime) startTime = ts;
    const elapsed  = ts - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease     = easeOutCubic(progress);
    el.scrollLeft  = start + distance * ease;
    if (progress < 1) requestAnimationFrame(step);
    else { el.scrollLeft = target; cb && cb(); }
  }
  requestAnimationFrame(step);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* ──────────────────────────────────────────────────────────
   드래그 스크롤
   ────────────────────────────────────────────────────────── */
let isDragging   = false;
let dragStartX   = 0;
let scrollStartX = 0;
let velX         = 0;
let lastX        = 0;
let lastT        = 0;

container.addEventListener("mousedown", dragStart);
container.addEventListener("touchstart", dragStart, { passive: true });
document.addEventListener("mousemove",  dragMove);
document.addEventListener("touchmove",  dragMove, { passive: false });
document.addEventListener("mouseup",    dragEnd);
document.addEventListener("touchend",   dragEnd);

function dragStart(e) {
  isDragging   = true;
  isSnapping   = false;
  const pt     = e.touches ? e.touches[0] : e;
  dragStartX   = pt.clientX;
  scrollStartX = container.scrollLeft;
  velX         = 0;
  lastX        = pt.clientX;
  lastT        = performance.now();
  container.classList.add("grabbing");
}

function dragMove(e) {
  if (!isDragging) return;
  if (e.touches) e.preventDefault();
  const pt    = e.touches ? e.touches[0] : e;
  const now   = performance.now();
  const dt    = now - lastT || 1;
  velX        = (pt.clientX - lastX) / dt;   // px/ms
  lastX       = pt.clientX;
  lastT       = now;
  container.scrollLeft = scrollStartX - (pt.clientX - dragStartX);
}

function dragEnd() {
  if (!isDragging) return;
  isDragging = false;
  container.classList.remove("grabbing");

  /* 플릭 속도로 페이지 전환 여부 결정 */
  const FLICK_THRESHOLD = 0.35;  /* px/ms */
  const DRAG_THRESHOLD  = 80;    /* px */
  const dragDelta = scrollStartX - container.scrollLeft; /* + = 오른→왼 (다음) */

  if (velX < -FLICK_THRESHOLD || dragDelta > DRAG_THRESHOLD) {
    goTo(currentIdx + 1);          /* 다음 */
  } else if (velX > FLICK_THRESHOLD || dragDelta < -DRAG_THRESHOLD) {
    goTo(currentIdx - 1);          /* 이전 */
  } else {
    goTo(currentIdx);              /* 제자리 스냅 */
  }
}

/* ──────────────────────────────────────────────────────────
   화살표 네비게이션
   ────────────────────────────────────────────────────────── */
navLeft.addEventListener("click",  () => goTo(currentIdx - 1));
navRight.addEventListener("click", () => goTo(currentIdx + 1));

/* ──────────────────────────────────────────────────────────
   키보드 단축키
   ────────────────────────────────────────────────────────── */
document.addEventListener("keydown", e => {
  switch(e.key) {
    case "ArrowRight": case "ArrowDown":  goTo(currentIdx + 1); break;
    case "ArrowLeft":  case "ArrowUp":    goTo(currentIdx - 1); break;
    case "Home": goTo(0); break;
    case "End":  goTo(IMAGES.length - 1); break;
    case "+": case "=": applyZoom(zoomLevel + ZOOM_STEP); break;
    case "-": case "_": applyZoom(zoomLevel - ZOOM_STEP); break;
    case "0": applyZoom(1.0); break;
  }
});

/* ──────────────────────────────────────────────────────────
   줌
   ────────────────────────────────────────────────────────── */
zoomInBtn.addEventListener("click",  () => applyZoom(zoomLevel + ZOOM_STEP));
zoomOutBtn.addEventListener("click", () => applyZoom(zoomLevel - ZOOM_STEP));
zoomReset.addEventListener("click",  () => applyZoom(1.0));

/* 핀치-투-줌 (모바일) */
let pinchDist0 = null;
container.addEventListener("touchstart", e => {
  if (e.touches.length === 2) {
    pinchDist0 = getPinchDist(e);
  }
}, { passive: true });

container.addEventListener("touchmove", e => {
  if (e.touches.length === 2 && pinchDist0 != null) {
    const dist = getPinchDist(e);
    const scale = dist / pinchDist0;
    applyZoom(zoomLevel * scale, false);
    pinchDist0 = dist;
    e.preventDefault();
  }
}, { passive: false });

container.addEventListener("touchend", () => { pinchDist0 = null; });

function getPinchDist(e) {
  const dx = e.touches[0].clientX - e.touches[1].clientX;
  const dy = e.touches[0].clientY - e.touches[1].clientY;
  return Math.hypot(dx, dy);
}

/* 마우스 휠 줌 */
container.addEventListener("wheel", e => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    applyZoom(zoomLevel + delta);
  }
}, { passive: false });

function applyZoom(newZoom, snap = true) {
  zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  document.documentElement.style.setProperty("--zoom", zoomLevel);

  /* 슬라이드 너비 재계산 */
  const viewH = container.clientHeight;
  Array.from(strip.children).forEach((slide, i) => {
    const img = slide.querySelector("img");
    if (img && img.naturalWidth) {
      const nat = img.naturalWidth / img.naturalHeight;
      slide.style.width = (viewH * nat * zoomLevel) + "px";
    }
  });

  zoomLabel.textContent = Math.round(zoomLevel * 100) + "%";
  if (snap) snapToPage(false);
}

/* ──────────────────────────────────────────────────────────
   UI 업데이트
   ────────────────────────────────────────────────────────── */
function updateUI() {
  curPageEl.textContent = currentIdx + 1;

  navLeft.disabled  = currentIdx === 0;
  navRight.disabled = currentIdx === IMAGES.length - 1;

  /* 슬라이드 active 클래스 */
  Array.from(strip.children).forEach((s, i) => {
    s.classList.toggle("active", i === currentIdx);
  });

  /* 썸네일 active */
  Array.from(thumbTrack.children).forEach((t, i) => {
    t.classList.toggle("active", i === currentIdx);
  });

  /* 썸네일 뷰포트로 스크롤 */
  const activThumb = thumbTrack.children[currentIdx];
  if (activThumb) activThumb.scrollIntoView({ inline: "center", behavior: "smooth" });

  /* 프로그레스 바 */
  const pct = IMAGES.length <= 1 ? 100 : (currentIdx / (IMAGES.length - 1)) * 100;
  progressBar.style.width = pct + "%";
}

/* ──────────────────────────────────────────────────────────
   창 크기 변경 대응
   ────────────────────────────────────────────────────────── */
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    applyZoom(zoomLevel, false);
    snapToPage(false);
  }, 120);
});

/* ──────────────────────────────────────────────────────────
   실행
   ────────────────────────────────────────────────────────── */
init();
