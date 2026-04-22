// js/news/render.js
let _all = [];
let _mount = null;
let _filter = 'all';
let _query = '';

function escapeHTML(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#039;");
}

function formatDate(iso){
  try{
    return new Intl.DateTimeFormat('uk-UA', { year:'numeric', month:'short', day:'2-digit' })
      .format(new Date(iso));
  }catch{ return iso; }
}

function matches(item){
  if (_filter !== 'all' && item.category !== _filter) return false;
  if (!_query) return true;

  const q = _query.toLowerCase();
  const blob = `${item.title} ${item.excerpt} ${(item.tags||[]).join(' ')} ${item.categoryLabel}`.toLowerCase();
  return blob.includes(q);
}

function render(){
  if (!_mount) return;

  const items = _all.filter(matches);

    const live = document.getElementById('a11y-live');
  if (live){
    const msg = _query
      ? `Знайдено ${items.length} новин за запитом “${_query}”.`
      : `Показано ${items.length} новин.`;

    live.textContent = '';
    setTimeout(() => { live.textContent = msg; }, 10);
  }

  // Show loading indicator for large datasets or slow filters
  const showLoading = items.length === 0 && (_all.length > 0);
  if (showLoading) {
    _mount.innerHTML = `
      <div class="loading-indicator" role="status" aria-live="polite">
        <div class="loading-spinner" aria-hidden="true"></div>
        <span>Завантаження новин...</span>
      </div>
    `;
    return;
  }

  const html = items.map(item => {
    const id = escapeHTML(item.id);
    const title = escapeHTML(item.title);
    const excerpt = escapeHTML(item.excerpt);
    const cat = escapeHTML(item.categoryLabel || item.category);
    const dateText = escapeHTML(formatDate(item.dateISO));
    const dateISO = escapeHTML(item.dateISO || '');
    const minutes = Number(item.minutes);
    const minutesText = Number.isFinite(minutes) && minutes > 0 ? `${minutes} хв` : '';
    const img = escapeHTML(item.image || '');
    const imgAlt = escapeHTML(item.imageAlt || item.title || '');
    const href = escapeHTML(item.url || `#${item.id}`);

    return `
      <article class="card glass" role="listitem" id="${id}" data-news-item data-category="${escapeHTML(item.category)}">
        <div class="card-media">
          ${img ? `<img src="${img}" alt="${imgAlt}" loading="lazy" decoding="async">` : ''}
          <button class="card-tts-btn ui-control"
                  type="button"
                  aria-label="Озвучити новину: ${title}"
                  title="Прослухати новину"
                  data-tts-read
                  data-tts-source="#${id}">🔊</button>
        </div>

        <div class="card-body">
          <div class="meta">
            <span class="nav-pill ui-control" style="pointer-events:none; opacity:.9;">${cat}</span>
            <span aria-hidden="true">•</span>
            <time datetime="${dateISO}">${dateText}</time>
            ${minutesText ? `<span aria-hidden="true">•</span><span>${escapeHTML(minutesText)}</span>` : ''}
          </div>

          <h3 class="measure">
            <a class="news-link" href="${href}" aria-label="Відкрити новину: ${title}">${title}</a>
          </h3>

          <p class="measure">${excerpt}</p>
        </div>
      </article>
    `;
  }).join('');

  _mount.innerHTML = html || `<p class="meta" role="status">Немає новин для цього фільтра/пошуку.</p>`;

  // Animate cards entrance
  requestAnimationFrame(() => {
    const cards = _mount.querySelectorAll('.card');
    cards.forEach((card, index) => {
      card.classList.add('hidden');
      setTimeout(() => {
        card.classList.remove('hidden');
        card.classList.add('visible');
      }, index * 50); // Staggered animation
    });
  });
}

export function renderNews(mountEl, items){
  _mount = mountEl;
  _all = Array.isArray(items) ? items : [];
  render();
}

export function setNewsFilter(filter){
  _filter = filter || 'all';
  render();
  saveFilterState(_filter, _query);
}

export function setNewsQuery(q){
  _query = String(q || '').trim();
  render();
  saveFilterState(_filter, _query);
}

export function getFilterState(){
  return { filter: _filter, query: _query };
}

function saveFilterState(filter, query) {
  try {
    localStorage.setItem('news-filter', filter);
    localStorage.setItem('news-query', query);
  } catch {}
}

export function loadSavedFilterState(){
  try {
    const filter = localStorage.getItem('news-filter') || 'all';
    const query = localStorage.getItem('news-query') || '';
    return { filter, query };
  } catch {
    return { filter: 'all', query: '' };
  }
}
