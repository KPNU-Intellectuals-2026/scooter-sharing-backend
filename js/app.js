import { NEWS } from './news-data.js';
import { renderNews, setNewsFilter, setNewsQuery } from './news/render.js';
import { initNav } from './ui/nav.js';
import { initBackToTop } from './ui/back-to-top.js';
import { initA11yPanel } from './a11y/panel.js';
import { initTTS } from './a11y/tts.js';
import { initAIAdapt } from './ai/adapt.js';
import { initAIExtras } from './ai_extras.js';

function ready(fn){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once:true });
  else fn();
}

ready(() => {
  const tts = initTTS();
  const a11y = initA11yPanel({ tts });

  const ai = initAIAdapt({ a11y });
  initAIExtras({ notify: ai?.notify });
  const tickerTrack = document.getElementById('ticker-track');
  const search = document.getElementById('news-search');

  function setScenarioActive(activeFocus = ''){
    document.querySelectorAll('[data-focus]').forEach((el) => {
      const isActive = el.getAttribute('data-focus') === activeFocus;
      el.setAttribute('aria-pressed', String(isActive));
      el.classList.toggle('active', isActive);
    });
  }

  function applyFilterUI(filter){
    document.querySelectorAll('[data-filter]').forEach((el) => {
      const active = el.getAttribute('data-filter') === filter;
      el.classList.toggle('active', active);
      el.setAttribute('aria-pressed', String(active));
      el.removeAttribute('aria-current');
    });
  }

  function resetExperienceState(){
    if (search) search.value = '';
    setScenarioActive('');
    applyFilterUI('all');
    setNewsFilter('all');
    setNewsQuery('');
  }

  // Save/restore filter state
  function saveFilterState(filter, query) {
    try {
      localStorage.setItem('news-filter', filter);
      localStorage.setItem('news-query', query);
    } catch {}
  }

  function loadFilterState() {
    try {
      const filter = localStorage.getItem('news-filter') || 'all';
      const query = localStorage.getItem('news-query') || '';
      return { filter, query };
    } catch {
      return { filter: 'all', query: '' };
    }
  }

  // --- Ticker render (headlines) ---
  function renderTicker(items){
    const track = tickerTrack;
    if (!track) return;

    const headlines = (Array.isArray(items) ? items : [])
      .slice(0, 10)          // 10 найсвіжіших (бо на початку)
      .map(n => n?.title)
      .filter(Boolean);

    if (!headlines.length){
      track.innerHTML = '';
      return;
    }

    const htmlOnce = headlines.map(t => `
      <div class="ticker-item" role="listitem">
        <span class="ticker-dot" aria-hidden="true">•</span>
        <span>${t}</span>
      </div>
    `).join('');

    // Дублюємо для безшовного “бігу”
    track.innerHTML = htmlOnce + htmlOnce;
    track.dataset.userPaused = 'false';
  }

  // Render cards into #cards
  const mount = document.getElementById('cards');
  if (mount) renderNews(mount, NEWS);

  // Render ticker right after initial render
  renderTicker(NEWS);

  // Load saved filter state on page load
  const savedState = loadFilterState();
  if (search) search.value = savedState.query;
  applyFilterUI(savedState.filter);
  setNewsFilter(savedState.filter);
  setNewsQuery(savedState.query);

  // Filters + burger menu
  initNav({
    onFilter: (filter) => setNewsFilter(filter)
  });

  initBackToTop();

  // Hero TTS
  const heroBtn = document.getElementById('hero-tts');
  const heroArticle = document.getElementById('hero-article');
  if (heroBtn && heroArticle){
    heroBtn.addEventListener('click', () => {
      const h1 = heroArticle.querySelector('h1');
      const meta = heroArticle.querySelector('.meta');
      const text = [
        (h1?.innerText || '').trim(),
        (meta?.innerText || '').trim()
      ].filter(Boolean).join('. ');
      if (text) tts.speak(text);
    });
  }

  // Search + trending
  if (search){
    search.addEventListener('input', () => {
      setScenarioActive('');
      setNewsQuery(search.value);
    });
  }

  // Trending tags handling
  let currentTrend = null;
  const clearFiltersBtn = document.getElementById('clear-filters');
  
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-trend]');
    if (!b) return;
    const q = b.getAttribute('data-trend') || '';
    
    // If clicking the same trend again, reset filters
    if (currentTrend === q) {
      currentTrend = null;
      if (search) search.value = '';
      setNewsQuery('');
      setScenarioActive('');
      updateClearFiltersVisibility();
      return;
    }
    
    currentTrend = q;
    setScenarioActive('');
    if (search) search.value = q;
    setNewsQuery(q);
    updateClearFiltersVisibility();
  });
  
  // Also reset trend when using other filters
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    currentTrend = null;
    updateClearFiltersVisibility();
  });
  
  // Clear filters button
  function updateClearFiltersVisibility() {
    if (!clearFiltersBtn) return;
    const hasActiveFilter = currentTrend !== null || (search && search.value.trim() !== '');
    clearFiltersBtn.hidden = !hasActiveFilter;
  }
  
  clearFiltersBtn?.addEventListener('click', () => {
    currentTrend = null;
    if (search) search.value = '';
    setNewsQuery('');
    setScenarioActive('');
    updateClearFiltersVisibility();
  });
  
  // Update clear button visibility when search changes
  if (search) {
    const originalInputHandler = search.oninput;
    search.addEventListener('input', () => {
      updateClearFiltersVisibility();
    });
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]');
    if (!b) return;
    setScenarioActive('');
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-focus]');
    if (!b) return;

    const focus = b.getAttribute('data-focus');
    if (!focus) return;

    const focusMap = {
      security: { filter: 'tech', query: 'фішинг' },
      work: { filter: 'all', query: 'економіка' },
      explain: { filter: 'world', query: 'пояснення' }
    };

    const target = focusMap[focus];
    if (!target) return;

    setScenarioActive(focus);
    applyFilterUI(target.filter);
    if (search) search.value = target.query;
    setNewsFilter(target.filter);
    setNewsQuery(target.query);

    document.getElementById('cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ai?.notify?.('AI: підібрав матеріали за вибраним сценарієм.', 4200);
  });

  document.addEventListener('a11y:reset-all', () => {
    resetExperienceState();
  });

  // Quick actions
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qa]');
    if (!b) return;

    const qa = b.getAttribute('data-qa');

  if (qa === 'readable'){
    const st = a11y.getState();
    a11y.setState({ userLevel: Math.max(st.userLevel ?? 0, 2), measureGlobal: true });

  }else if (qa === 'contrast'){
    a11y.setState({ theme: 'high-contrast' });

  }else if (qa === 'tts'){
      const firstCard = document.querySelector('#cards [data-news-item]');
      if (!firstCard) return;

    const title =
      firstCard.querySelector('h3 a, h3')?.innerText?.trim() || '';
    const excerpt =
      firstCard.querySelector('.card-body p.measure, .card-body p')?.innerText?.trim() || '';
    const date =
      firstCard.querySelector('time')?.innerText?.trim()
    || firstCard.querySelector('time')?.getAttribute('datetime')?.trim()
    || '';

    const text = [title, excerpt, date].filter(Boolean).join('. ');
      if (text) tts.toggle(text);
    }
  });

  // Form handling
  const form = document.getElementById('subscribe-form');
  const formMessage = document.getElementById('form-message');

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email');
      const password = document.getElementById('password');
      
      // Clear previous messages
      formMessage.textContent = '';
      formMessage.style.color = '';
      
      // Validate email
      if (!email.value || !email.checkValidity()) {
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        formMessage.textContent = 'Будь ласка, введіть коректну електронну пошту.';
        formMessage.style.color = '#b00020';
        return;
      }
      
      // Validate password
      if (!password.value || !password.checkValidity()) {
        password.setAttribute('aria-invalid', 'true');
        password.focus();
        formMessage.textContent = 'Пароль має містити мінімум 6 символів.';
        formMessage.style.color = '#b00020';
        return;
      }
      
      // Success
      formMessage.textContent = 'Дякуємо за підписку!';
      formMessage.style.color = '#4caf50';
      
      // Reset form
      form.reset();
      
      // Optional: Add a subtle animation to the message
      formMessage.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        formMessage.style.opacity = '0.7';
      }, 100);
    });
    
    // Clear error state on input
    [document.getElementById('email'), document.getElementById('password')].forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          input.removeAttribute('aria-invalid');
          if (formMessage) {
            formMessage.textContent = '';
            formMessage.style.color = '';
          }
        });
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      search?.focus();
    }
    
    // Ctrl/Cmd + F: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      search?.focus();
    }
    
    // Escape: Close accessibility panel
    if (e.key === 'Escape') {
      const panel = document.getElementById('a11y-panel');
      const backdrop = document.getElementById('backdrop');
      const fab = document.getElementById('a11y-toggle');
      
      if (panel && !panel.hidden) {
        panel.hidden = true;
        backdrop.hidden = true;
        document.body.classList.remove('dialog-open');
        fab?.setAttribute('aria-expanded', 'false');
        fab?.focus();
      }
    }
    
    // Ctrl/Cmd + /: Open accessibility panel
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const panel = document.getElementById('a11y-panel');
      const backdrop = document.getElementById('backdrop');
      const fab = document.getElementById('a11y-toggle');
      
      if (panel && panel.hidden) {
        panel.hidden = false;
        backdrop.hidden = false;
        document.body.classList.add('dialog-open');
        fab?.setAttribute('aria-expanded', 'true');
        
        // Focus the panel title
        const title = document.getElementById('a11y-title');
        if (title) {
          title.focus();
        }
      }
    }
    
    // Ctrl/Cmd + 1-5: Switch filters
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '5') {
      e.preventDefault();
      const filters = ['all', 'politics', 'tech', 'sport', 'world'];
      const filterIndex = parseInt(e.key) - 1;
      if (filters[filterIndex]) {
        setNewsFilter(filters[filterIndex]);
        applyFilterUI(filters[filterIndex]);
      }
    }
    
    // Ctrl/Cmd + R: Reset all filters
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      resetExperienceState();
    }
  });
});
