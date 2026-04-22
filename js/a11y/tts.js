function getTextFromSelector(selector){
  const el = document.querySelector(selector);
  if (!el) return '';
  return (el.innerText || el.textContent || '').trim();
}

function extractReadableTextFromCard(cardEl){
  if (!cardEl) return '';

  // Title: prefer link text inside h3
  const title =
    cardEl.querySelector('h3 a, h3, h2, .card-title, .news-title, [data-title]')?.innerText?.trim() || '';

  // Excerpt: беримо саме абзац новини, а не "meta"
  // У тебе в картці excerpt це <p class="measure">...</p>
  const excerpt =
    cardEl.querySelector('.card-body p.measure, p, .excerpt, .card-excerpt, [data-excerpt]')?.innerText?.trim() || '';

  // Date: беремо тільки <time>, щоб не читало "Політика • 2 хв"
  const timeEl = cardEl.querySelector('time');
  const date =
    (timeEl?.innerText || timeEl?.getAttribute('datetime') || '').trim();

  return [title, excerpt, date].filter(Boolean).join('. ');
}

function pickVoice(voices, preferredName){
  if (!voices.length) return null;
  if (preferredName){
    const exact = voices.find(v => v.name === preferredName);
    if (exact) return exact;
  }
  // Prefer uk/ua-ish, else first
  return voices.find(v => (v.lang || '').toLowerCase().startsWith('uk'))
      || voices.find(v => (v.lang || '').toLowerCase().includes('ua'))
      || voices[0];
}

export function initTTS(){
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  const voiceSelect = document.getElementById('tts-voice');
  const rateRange = document.getElementById('tts-rate');
  const sampleBtn = document.getElementById('tts-sample');

   const SETTINGS_KEY = 'a11y.settings.v2';

  function readSavedRate(){
    try{
      const raw = localStorage.getItem(SETTINGS_KEY);
      const s = raw ? JSON.parse(raw) : null;
      const n = Number(s?.ttsRate);
      return Number.isFinite(n) ? n : 1;
    }catch{
      return 1;
    }
  }

  let voices = [];
  let currentText = '';
  const isSpeakingNow = () =>
    supported && (window.speechSynthesis.speaking || window.speechSynthesis.pending);

    if (rateRange) rateRange.value = String(readSavedRate());

  function loadVoices(){
    if (!supported) return;
    voices = window.speechSynthesis.getVoices() || [];
    if (!voiceSelect) return;

    const prev = voiceSelect.value || '';

    voiceSelect.textContent = '';
    for (const v of voices){
      const opt = document.createElement('option');
      opt.value = v.name || '';
      opt.textContent = `${v.name || 'Voice'} (${v.lang || 'und'})`;
      voiceSelect.appendChild(opt);
    }

    // Keep previous if exists else pick preferred
    const preferred = prev || pickVoice(voices)?.name || '';
    if (preferred) voiceSelect.value = preferred;
  }

  function stop(){
    if (!supported) return;
    window.speechSynthesis.cancel();
  }

  function speak(text){
    if (!supported) return;
    if (!text) return;

    stop();
    currentText = text;

    const u = new SpeechSynthesisUtterance(text);

    const rate = rateRange ? Number(rateRange.value) : 1;
    u.rate = Number.isFinite(rate) ? rate : 1;

    const selected = voiceSelect ? voiceSelect.value : '';
    const v = pickVoice(voices, selected);
    if (v) u.voice = v;
    if (v?.lang) u.lang = v.lang;

    // Auto-pause on scroll
    let scrollTimeout;
    const scrollHandler = () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 1500);
      }
    };

    // Add scroll listener only when speaking
    window.addEventListener('scroll', scrollHandler, { passive: true });

    u.onend = () => {
      window.removeEventListener('scroll', scrollHandler);
    };
    u.onerror = () => {
      window.removeEventListener('scroll', scrollHandler);
    };

    window.speechSynthesis.speak(u);
  }

  function toggle(text){
    if (!supported) return;
    if (isSpeakingNow() && text === currentText) stop();
    else speak(text);
  }

// Buttons in cards (delegated)
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tts-read]');
  if (!btn) return;

  const src = btn.getAttribute('data-tts-source');

  // src can point to card root OR to specific text element; support both
  const srcEl = src ? document.querySelector(src) : null;
  const card = srcEl?.closest?.('[data-news-item], .card') || btn.closest('[data-news-item], .card');

  const text = card
    ? extractReadableTextFromCard(card)
    : (srcEl ? (srcEl.innerText || srcEl.textContent || '').trim() : '');

    if (!text) return;
    toggle(text);
});

  // Sample button
  sampleBtn?.addEventListener('click', () => {
    speak('Привіт! Це приклад озвучення. Швидкість і голос можна змінити в налаштуваннях.');
  });

  if (supported){
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }else{
    if (voiceSelect) voiceSelect.innerHTML = '<option>Недоступно у цьому браузері</option>';
    if (sampleBtn) sampleBtn.disabled = true;
  }

  return { supported, speak, stop, toggle, isSpeaking: isSpeakingNow };
}
