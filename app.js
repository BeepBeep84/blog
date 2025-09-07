const POSTS_URL = 'posts.json';
const PAGE_SIZE = 10;

const state = { allPosts: [], filtered: [], page: 1, topic: 'all', sort: 'new', topics: [] };

document.getElementById('year').textContent = new Date().getFullYear();
setupReaderToggle();
init();

async function init() {
  try {
    const res = await fetch(POSTS_URL, { cache: 'no-store' });
    const json = await res.json();
    state.allPosts = json.posts.map(p => ({
      ...p,
      slug: slugify(`${p.title}-${p.date}`),
      topicSlug: slugify(p.topic),
      dateObj: new Date(p.date)
    }));

    const names = Array.from(new Set(state.allPosts.map(p => p.topic))).sort((a,b)=>a.localeCompare(b));
    state.topics = names.map(name => ({ name, slug: slugify(name) }));

    const url = new URL(location.href);
    const topicParam = (url.searchParams.get('topic') || 'all').toLowerCase();
    const sortParam = (url.searchParams.get('sort') || 'new').toLowerCase();
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    if (topicParam) state.topic = topicParam;
    if (['new','old','az','za'].includes(sortParam)) state.sort = sortParam;
    if (pageParam > 0) state.page = pageParam;

    buildFilters();
    wireUI();
    applyFilterAndSort();
  } catch (e) {
    document.getElementById('posts').innerHTML = `<p>Failed to load posts.json</p>`;
    console.error(e);
  }
}

function buildFilters(){
  const el = document.getElementById('topicFilters');
  const mkChip = (label, slug) => {
    const a = document.createElement('a');
    a.href = withParams({ topic: slug, sort: state.sort, page: 1 });
    a.className = 'chip' + (state.topic===slug ? ' active' : '');
    a.textContent = label;
    a.dataset.topic = slug;
    return a;
  };
  el.innerHTML = '';
  el.appendChild(mkChip('All','all'));
  state.topics.forEach(t => el.appendChild(mkChip(t.name, t.slug)));
}

function wireUI(){
  document.getElementById('topicFilters').addEventListener('click', (e)=>{
    const a = e.target.closest('a.chip'); if(!a) return;
    e.preventDefault();
    state.topic = a.dataset.topic;
    state.page = 1;
    updateURL();
    buildFilters();
    applyFilterAndSort();
  });

  const sortSel = document.getElementById('sortOrder');
  sortSel.value = state.sort;
  sortSel.addEventListener('change', ()=>{
    state.sort = sortSel.value;
    state.page = 1;
    updateURL();
    applyFilterAndSort();
  });

  document.getElementById('prevBtn').addEventListener('click', ()=>{
    if (state.page > 1){ state.page--; updateURL(); render(); }
  });
  document.getElementById('nextBtn').addEventListener('click', ()=>{
    const max = Math.ceil(state.filtered.length / PAGE_SIZE) || 1;
    if (state.page < max){ state.page++; updateURL(); render(); }
  });
}

function applyFilterAndSort(){
  let list = (state.topic==='all') ? state.allPosts.slice() : state.allPosts.filter(p => p.topicSlug === state.topic);
  list.sort((a,b)=>{
    switch(state.sort){
      case 'old': return a.dateObj - b.dateObj;
      case 'az':  return a.title.localeCompare(b.title);
      case 'za':  return b.title.localeCompare(a.title);
      case 'new':
      default:    return b.dateObj - a.dateObj;
    }
  });
  state.filtered = list;
  render();
}

function render(){
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);
  document.getElementById('posts').innerHTML = pageItems.map(p => cardHTML(p)).join('');

  const max = Math.ceil(state.filtered.length / PAGE_SIZE) || 1;
  document.getElementById('pageInfo').textContent = `Page ${state.page} of ${max}`;
  document.getElementById('prevBtn').disabled = state.page <= 1;
  document.getElementById('nextBtn').disabled = state.page >= max;
}

function cardHTML(p){
  const preview = (p.description && p.description.trim())
    ? p.description.trim()
    : (p.seo_description && p.seo_description.trim())
      ? p.seo_description.trim()
      : makeExcerpt(p.content, 180);

  const dateStr = new Date(p.date).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'2-digit' });
  const img = p.image ? `<img src="${escapeHtml(p.image)}" alt="">` : '';
  const topicLink = `index.html?topic=${encodeURIComponent(p.topicSlug)}&sort=${encodeURIComponent(state.sort)}`;
  return `
    <article class="card">
      ${img}
      <div class="body">
        <div class="meta">${dateStr} • <a href="${topicLink}" class="topic-link">${escapeHtml(p.topic)}</a></div>
        <h2><a href="post.html?slug=${encodeURIComponent(p.slug)}">${escapeHtml(p.title)}</a></h2>
        <p>${escapeHtml(preview)}</p>
      </div>
    </article>
  `;
}

function updateURL(){
  const url = withParams({ topic: state.topic, sort: state.sort, page: state.page });
  history.replaceState(null, '', url);
}

function withParams({topic, sort, page}){
  const u = new URL(location.href);
  u.searchParams.set('topic', topic);
  u.searchParams.set('sort', sort);
  u.searchParams.set('page', page);
  return u.pathname + '?' + u.searchParams.toString();
}

function slugify(s){
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-');
}
function makeExcerpt(md, maxLen){
  const text = md.replace(/`{3}[\s\S]*?`{3}/g,' ')
                 .replace(/`[^`]*`/g,' ')
                 .replace(/!\[.*?\]\(.*?\)/g,' ')
                 .replace(/\[(.*?)\]\((.*?)\)/g,'$1')
                 .replace(/[#>*_~\-]+/g,' ')
                 .replace(/\s+/g,' ')
                 .trim();
  return text.length > maxLen ? text.slice(0, maxLen-1) + '…' : text;
}
function escapeHtml(s){
  return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function setupReaderToggle(){
  const btn = document.getElementById('readerToggle');
  const on = localStorage.getItem('readerMode') === 'on';
  setReader(on);
  btn?.addEventListener('click', ()=> setReader(!document.documentElement.classList.contains('reader-on')));
}
function setReader(on){
  document.documentElement.classList.toggle('reader-on', on);
  const btn = document.getElementById('readerToggle');
  if (btn){
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = `Easy Reader: ${on ? 'On' : 'Off'}`;
  }
  localStorage.setItem('readerMode', on ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent('reader-mode', { detail: { on } }));
}
