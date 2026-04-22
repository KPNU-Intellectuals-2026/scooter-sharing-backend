function mode(){
  return (document.body?.dataset?.aiMode || 'auto').toLowerCase(); // auto | gentle | off
}

function showAIToast(text, timeoutMs = 4500){
  const el = document.getElementById('ai-indicator');
  if (!el) return;

  const textEl = el.querySelector('.ai-text');
  if (textEl) textEl.textContent = text;

  el.hidden = false;
  el.classList.add('show');

  window.clearTimeout(showAIToast._t);
  showAIToast._t = window.setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.hidden = true; }, 250);
  }, timeoutMs);
}

function levelFromMisses(m){
  if (m >= 8) return 4;
  if (m >= 5) return 3;
  if (m >= 2) return 2;
  return 0;
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

function nowHour(){
  try { return new Date().getHours(); } catch { return 12; }
}

export function initAIAdapt({ a11y } = {}){
  if (mode() === 'off') return { notify: showAIToast };

  // Anti-double-click guard (helps tremor / accidental repeated presses)
  let lastClickAt = 0;
  document.addEventListener('click', (e) => {
    if (mode() === 'off') return;

  const btn = e.target.closest('button, [role="button"], .ui-control');
    if (!btn) return;

    const t = performance.now();
    if (t - lastClickAt < 280){
      e.preventDefault();
      return;
    }
    lastClickAt = t;
  }, true);

  function applySystemPrefs(){
    const st = a11y?.getState?.() || {};

    // 1) Reduced motion
    try{
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce && !st.userSetMotion){
        a11y?.setAIState?.({ reduceMotion: true });
        showAIToast('AI: врахував системне “зменшити рух”.', 4500);
      }
    }catch{}

    // 2) High contrast / forced colors
    try{
      const more = window.matchMedia?.('(prefers-contrast: more)').matches;
      const forced = window.matchMedia?.('(forced-colors: active)').matches;

      if ((more || forced) && !st.userSetTheme){
      a11y?.setAIState?.({ theme: 'high-contrast' });
        if (!st.userSetLinks)
          a11y?.setAIState?.({ underlineLinks: true });
        showAIToast('AI: увімкнув високий контраст (системні налаштування).', 5200);
      }
    }catch{}

    // 3) Dark scheme preference (auto only)
    try{
      const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
      if (dark && mode() === 'auto' && !st.userSetTheme){
        a11y?.setAIState?.({ theme: 'dark' });
      }
    }catch{}
  }

  function enableReadingMode(){
    document.body.classList.add('a11y-reading-ruler','a11y-declutter');
  }

  function disableReadingMode(){
    document.body.classList.remove('a11y-reading-ruler','a11y-declutter');
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#a11y-reset');
    if (!btn) return;
    disableReadingMode();
  }, true);

  // --- Forms "no pain" (HTML5 validity) ---
  function ensureInlineError(el, msg){
  if (!el || !msg) return;

  const id = el.id || (el.id = `fld_${Math.random().toString(36).slice(2, 9)}`);
  const errId = `${id}__err`;

  let err = document.getElementById(errId);
  if (!err){
    err = document.createElement('div');
    err.id = errId;
    err.className = 'a11y-field-error';
    err.setAttribute('role', 'status');
    err.setAttribute('aria-live', 'polite');

    const wrap = el.closest?.('.field, .form-row, .input-row, label') || el.parentElement;

    if (wrap?.tagName === 'LABEL' && wrap.parentElement){
      wrap.insertAdjacentElement('afterend', err);
    } else {
      const host = wrap || el.parentElement || el;
      if (host instanceof HTMLInputElement || host instanceof HTMLTextAreaElement || host instanceof HTMLSelectElement){
        (host.parentElement || el.form || document.body).appendChild(err);
      } else {
        host.appendChild(err);
      }
    }
  }

  err.textContent = msg;

  const desc = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (!desc.includes(errId)){
    desc.push(errId);
    el.setAttribute('aria-describedby', desc.join(' '));
  }

  el.setAttribute('aria-invalid', 'true');
}

function messageFromValidity(el){
  const v = el?.validity;
  if (!v) return 'Перевір це поле.';

  if (v.valueMissing) return 'Це поле обов’язкове.';
  if (v.typeMismatch){
    if (el.type === 'email') return 'Введи коректну електронну пошту.';
    if (el.type === 'url') return 'Введи коректне посилання.';
    return 'Неправильний формат.';
  }
  if (v.tooShort) return `Занадто коротко (мінімум ${el.minLength}).`;
  if (v.tooLong) return `Занадто довго (максимум ${el.maxLength}).`;
  if (v.patternMismatch) return 'Формат не відповідає вимогам.';
  if (v.rangeUnderflow) return `Значення має бути не менше ${el.min}.`;
  if (v.rangeOverflow) return `Значення має бути не більше ${el.max}.`;
  if (v.badInput) return 'Неправильне значення.';
  return el.validationMessage || 'Перевір це поле.';
}

function focusFirstInvalid(form){
  const first = form.querySelector(':invalid');
  if (!first) return false;

  try { first.focus({ preventScroll: true }); } catch { try { first.focus(); } catch {} }
  try { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch {}

  const msg = messageFromValidity(first);
  ensureInlineError(first, msg);

  // Легка допомога (без зміни userSet*)
  document.body.classList.add('focus-thick');
  showAIToast(`AI: помилка у формі — ${msg}`, 5200);
  return true;
}

// Блокуємо сабміт і підказуємо людині
document.addEventListener('submit', (e) => {
  if (mode() !== 'auto') return;

  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;

  if (!form.checkValidity()){
    e.preventDefault();
    focusFirstInvalid(form);
  }
}, true);

// Пояснення на конкретних полях (працює і без submit)
document.addEventListener('invalid', (e) => {
  if (mode() !== 'auto') return;

   e.preventDefault(); // ✅ глушимо нативний tooltip браузера

  const el = e.target;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;

  ensureInlineError(el, messageFromValidity(el));
}, true);

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;

    if (el.checkValidity()){
      el.removeAttribute('aria-invalid');

      const errId = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/).find(x => x.endsWith('__err'));

      if (errId){
        const errEl = document.getElementById(errId);
        if (errEl) errEl.remove();

        const desc = (el.getAttribute('aria-describedby') || '')
          .split(/\s+/).filter(Boolean)
          .filter(x => x !== errId);

        if (desc.length) el.setAttribute('aria-describedby', desc.join(' '));
        else el.removeAttribute('aria-describedby');
      }
    }
  }, true);

  function srgbToLin(c){
    c /= 255;
    return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  function relLuminance(rgb){
    const [r,g,b] = rgb.map(srgbToLin);
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }
  function parseRgb(str){
    const m = str.match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const parts = m[1].split(',').map(x => parseFloat(x.trim()));
    return parts.length >= 3 ? parts.slice(0,3) : null;
  }
  function contrastRatio(fgRgb, bgRgb){
    const L1 = relLuminance(fgRgb);
    const L2 = relLuminance(bgRgb);
    const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
    return (hi + 0.05) / (lo + 0.05);
  }

  let lastContrastToastAt = 0;

  function checkContrastAndAdapt(){
    if (mode() !== 'auto') return;

    const st = a11y?.getState?.() || {};
    if (st.userSetTheme) return;

    const nodes = Array.from(document.querySelectorAll(
      '.site-header a, .site-header button, #main a, #main button, .nav-pill, .btn-outline, .btn-primary'
    ))
      .filter(el => el.getClientRects().length)
      .slice(0, 50);

    let worst = Infinity;

    for (const el of nodes){
      const cs = getComputedStyle(el);
      const fg = parseRgb(cs.color);
      if (!fg) continue;

      let bgStr = cs.backgroundColor;
      if (!bgStr || bgStr === 'transparent' || bgStr === 'rgba(0, 0, 0, 0)'){
        bgStr = getComputedStyle(document.body).backgroundColor;
      }
      const bg = parseRgb(bgStr);
      if (!bg) continue;

      worst = Math.min(worst, contrastRatio(fg, bg));
    }

    if (worst < 4.5){
      // Мінімально інвазивно: посилання + (якщо є) high-contrast тема
      if (!st.userSetLinks)
        a11y?.setAIState?.({ underlineLinks: true });
      a11y?.setAIState?.({ theme: 'high-contrast' });

      const t = performance.now();
      if (t - lastContrastToastAt > 60000){
        lastContrastToastAt = t;
        showAIToast('AI: підсилив контраст і видимість посилань (виявлено низький контраст).', 6000);
      }
    }
  }

  setTimeout(checkContrastAndAdapt, 350);
  window.addEventListener('resize', () => { try{ checkContrastAndAdapt(); }catch{} }, { passive:true });

  // --- Zoom -> aiLevel (stable) ---
  const baseDPR = window.devicePixelRatio || 1;
  const baseVV  = window.visualViewport?.scale || 1;

  function getZoomFactor(){
    const dpr = window.devicePixelRatio || 1;
    const vv  = window.visualViewport?.scale || 1;
    return Math.max(dpr / baseDPR, vv / baseVV);
  }

  function levelFromZoomFactor(z){
    if (z >= 1.6) return 4;
    if (z >= 1.35) return 3;
    if (z >= 1.15) return 2;
    if (z >= 1.05) return 1;
    return 0;
  }

  let lastZoomLevel = 0;

  function handleZoomChange(){
    if (mode() !== 'auto') return;

    const z = getZoomFactor();
    const lvl = levelFromZoomFactor(z);

    if (lvl !== lastZoomLevel){
      const prev = lastZoomLevel;
      lastZoomLevel = lvl;

      a11y?.setAILevels?.({ aiLevelZoom: lvl });

      if (lvl > prev){
        showAIToast(`AI: zoom x${z.toFixed(2)} — рівень ${lvl}.`, 5200);
      }
    }
  }

  window.addEventListener('resize', handleZoomChange, { passive:true });
  window.visualViewport?.addEventListener('resize', handleZoomChange);
  window.visualViewport?.addEventListener('scroll', handleZoomChange);
  setInterval(handleZoomChange, 800);
  handleZoomChange();

  // Apply OS prefs early
  applySystemPrefs();

  // 1) Keyboard usage -> thick focus
  let sawTab = false;
  window.addEventListener('keydown', (e) => {
    if (mode() === 'off') return;
    if (e.key === 'Tab' && !sawTab){
      sawTab = true;
      document.body.classList.add('focus-thick');
      showAIToast('AI: підсилив фокус для керування клавіатурою.');
    }
  }, { passive:true });

  let tabCount = 0;
  let lastActivate = performance.now();

  document.addEventListener('keydown', (e) => {
    if (mode() === 'off') return;

    if (e.key === 'Enter' || e.key === ' '){
      lastActivate = performance.now();
    }
    if (e.key === 'Tab'){
      tabCount++;
      if (mode() === 'auto' && tabCount >= 8 && (performance.now() - lastActivate) > 6000){
        document.body.classList.add('a11y-hover-glow','a11y-emphasize-click','focus-thick');
        showAIToast('AI: підсилив навігацію для клавіатури.', 5000);
        tabCount = 0;
      }
    }
  }, { passive:true });

  // 2) Hover glow baseline
  if (mode() === 'auto'){
    document.body.classList.add('a11y-hover-glow');
  }

  // Pointer coarse (touch) => bigger hit targets (auto)
  try{
    if (mode() === 'auto' && window.matchMedia?.('(pointer: coarse)').matches){
      const st = a11y?.getState?.() || {};
      const next = Math.max(Number(st.aiLevelMiss ?? 0), 1);
      a11y?.setAILevels?.({ aiLevelMiss: next });
    }
  }catch{}

  // 4) Misclick / tremor heuristic (near-miss aware)
  let missTimes = []; // timestamps (ms)

  function pushMiss(){
    const t = performance.now();
    missTimes.push(t);
    // чистимо старі
    missTimes = missTimes.filter(x => (t - x) <= 30000);
    return missTimes.length;
  }

  const INTERACTIVE_SEL =
    'button, a, input, select, textarea, [role="button"], .nav-pill, .ui-control';

  function nearestInteractiveWithin(x, y, root, maxDist = 28){
    const candidates = Array.from(root.querySelectorAll(INTERACTIVE_SEL))
      .filter(el => !el.hasAttribute('disabled') && el.getClientRects().length);

    let best = null;
    let bestD = Infinity;

    for (const el of candidates){
      const r = el.getBoundingClientRect();
      const dx = x < r.left ? r.left - x : (x > r.right ? x - r.right : 0);
      const dy = y < r.top ? r.top - y : (y > r.bottom ? y - r.bottom : 0);
      const d = Math.hypot(dx, dy);

      if (d < bestD){
        bestD = d;
        best = el;
      }
    }

    return bestD <= maxDist ? { el: best, dist: bestD } : null;
  }

  document.addEventListener('click', (e) => {
    if (mode() === 'off') return;

    const x = e.clientX;
    const y = e.clientY;

    const directInteractive = e.target.closest(INTERACTIVE_SEL);
    if (directInteractive) return;

    const header = e.target.closest('.site-header');
    if (header){
      const near = nearestInteractiveWithin(x, y, header, 30);
      if (near){
        const missCount = pushMiss();                 // ✅ кількість промахів за останні 30с
        const targetLevel = levelFromMisses(missCount);

        if (mode() === 'gentle'){
          document.body.classList.add('a11y-hover-glow');
          if (missCount === 2) showAIToast('AI: підсвітив елементи — схоже на промахи.', 5000);
          return;
        }

        if (mode() === 'auto'){
          a11y?.setAILevels?.({ aiLevelMiss: targetLevel });

          document.body.classList.toggle('a11y-emphasize-click', targetLevel >= 2);
          document.body.classList.toggle('underline-links', targetLevel >= 2);
          document.body.classList.toggle('focus-thick', missCount >= 4);
          document.body.classList.toggle('reduce-motion', missCount >= 4);

          if (targetLevel >= 2){
            document.body.classList.add('a11y-hover-glow');
            showAIToast(`AI: промахи (${missCount}/30с) — рівень ${targetLevel}.`, 5200);
          }
        }
      }
    }
  }, { passive:true });

  // 5) Long read: enable readable after time
  let startedAt = Date.now();
  let longReadFired = false;

  window.addEventListener('scroll', () => {
    if (mode() === 'off') return;

    const y = window.scrollY || document.documentElement.scrollTop;
    if (y < 200){
      startedAt = Date.now();
      longReadFired = false;
      return;
    }
    if (longReadFired) return;

    const elapsed = Date.now() - startedAt;
    if (elapsed > 45000){
      longReadFired = true;

      if (mode() === 'auto'){
      enableReadingMode();
      const st = a11y?.getState?.() || {};
      const next = Math.max(Number(st.aiLevelRead ?? 0), 2);
      a11y?.setAILevels?.({ aiLevelRead: next });
      showAIToast('AI: увімкнув режим читабельності для довгого читання.', 6000);
      }else{
        showAIToast('Порада: спробуй пресет “Легке читання”.', 6000);
      }
    }
  }, { passive:true });

  // Reading intent: selection -> readability
document.addEventListener('selectionchange', () => {
  if (mode() !== 'auto') return;

  const sel = document.getSelection?.();
  const txt = (sel && sel.toString()) ? sel.toString().trim() : '';

  if (txt.length >= 12){
    enableReadingMode();

    const st = a11y?.getState?.() || {};
    const next = Math.max(Number(st.aiLevelRead ?? 0), 2);
    a11y?.setAILevels?.({ aiLevelRead: next });

    const t = performance.now();
    if (t - lastSelToastAt > 15000){
      lastSelToastAt = t;
      showAIToast('AI: увімкнув читабельність (виявлено роботу з текстом).', 5500);
    }
  }
});

// 6) Rapid scroll => reduce motion (less trigger-happy)
let lastY = window.scrollY || 0;
let lastT = performance.now();

let motionReduced = false;
let fastScrollHits = 0;
let lastFastAt = 0;
let lastMotionToastAt = 0;

window.addEventListener('scroll', () => {
  if (mode() === 'off') return;

  const y = window.scrollY || 0;
  const t = performance.now();
  const dy = Math.abs(y - lastY);
  const dt = Math.max(16, t - lastT);
  const speed = dy / dt; // px per ms

  const st = a11y?.getState?.() || {};
  if (st.userSetMotion) {
    lastY = y; lastT = t;
    return; // якщо людина сама вирішила — AI не втручається
  }

  // Вважаємо “швидким” тільки реально різкий скрол
  const isFast = speed > 3.2 && dy > 220;

  if (isFast){
    // збираємо “хіти” тільки якщо вони близько один до одного
    if (t - lastFastAt < 900) fastScrollHits++;
    else fastScrollHits = 1;

    lastFastAt = t;
  }

  // Спрацьовуємо після 3 швидких скролів підряд + cooldown
  if (!motionReduced && mode() === 'auto' && fastScrollHits >= 3){
    const cooldownOk = (t - lastMotionToastAt) > 30000; // 30с
    motionReduced = true;

    if (a11y?.setAIState) a11y.setAIState({ reduceMotion: true });
    else document.body.classList.add('reduce-motion');

    if (cooldownOk){
      lastMotionToastAt = t;
      showAIToast('AI: зменшив анімації (виявлено різкий скрол).', 4500);
    }
  }

  lastY = y; lastT = t;
}, { passive:true });

  // 7) Ticker pause — можна лишити, але якщо ticker немає, це "мертвий код"
  const ticker = document.getElementById('ticker-track');
  const isTickerPausedByUser = () => ticker?.dataset?.userPaused === 'true';
  const pauseTicker = () => {
    if (ticker) ticker.style.animationPlayState = 'paused';
  };
  const playTicker = () => {
    if (!ticker || isTickerPausedByUser()) return;
    ticker.style.animationPlayState = 'running';
  };

  document.addEventListener('focusin', (e) => {
    if (!ticker) return;
    if (e.target.closest('.site-header, #a11y-panel')) pauseTicker();
  });
  document.addEventListener('focusout', () => {
    if (!ticker) return;
    playTicker();
  });

  const tickerWrap = document.querySelector('.ticker');
  if (ticker && tickerWrap){
    tickerWrap.addEventListener('mouseenter', () => ticker.style.animationPlayState = 'paused');
    tickerWrap.addEventListener('mouseleave', () => ticker.style.animationPlayState = 'running');
  }

  return { notify: showAIToast };
}
