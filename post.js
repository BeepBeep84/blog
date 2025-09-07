const POSTS_URL = 'posts.json';
document.getElementById('year').textContent = new Date().getFullYear();
setupReaderToggle();

(async function(){
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  if(!slug){ renderError('No post specified.'); return; }
  try{
    const res = await fetch(POSTS_URL, { cache: 'no-store' });
    const json = await res.json();
    const posts = json.posts.map(p => ({ ...p, slug: slugify(`${p.title}-${p.date}`) }));
    const post = posts.find(p => p.slug === slug);
    if(!post){ renderError('Post not found.'); return; }
    renderPost(post);
    injectSEO(post);
  }catch(e){
    renderError('Failed to load post.'); console.error(e);
  }
})();

function renderError(msg){ document.getElementById('postTitle').textContent = msg; document.getElementById('postMeta').textContent = ''; }
function renderPost(p){
  document.title = `${p.title} • My Blog`;
  document.getElementById('postTitle').textContent = p.title;
  const dateStr = new Date(p.date).toLocaleDateString(undefined, { year:'numeric', month:'long', day:'2-digit' });
  const topicSlug = slugify(p.topic);
  document.getElementById('postMeta').innerHTML = `${dateStr} • <a href="index.html?topic=${encodeURIComponent(topicSlug)}&sort=new">${escapeHtml(p.topic)}</a>`;
  const hero = document.getElementById('postImage');
  if (p.image){ hero.src = p.image; hero.alt = p.title; hero.style.display = 'block'; }
  document.getElementById('postContent').innerHTML = markdownToHtml(p.content);
}
function injectSEO(p){
  const url = `${location.origin}${location.pathname}?slug=${encodeURIComponent(slugify(`${p.title}-${p.date}`))}`;
  setMeta('name','description', p.seo_description || '');
  setMeta('name','keywords', (p.seo_keywords || []).join(', '));
  setMeta('property','og:title', p.title);
  setMeta('property','og:description', p.seo_description || '');
  setMeta('property','og:image', p.image || '');
  setMeta('property','og:url', url);
  setMeta('name','twitter:title', p.title);
  setMeta('name','twitter:description', p.seo_description || '');
  setMeta('name','twitter:image', p.image || '');
  const ld = { '@context':'https://schema.org','@type':'BlogPosting', headline:p.title, datePublished:p.date, image:p.image||undefined, articleSection:p.topic, description:p.seo_description||'', keywords:(p.seo_keywords||[]).join(', '), mainEntityOfPage:url };
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
}
function setMeta(kind, name, value){ let el = document.head.querySelector(`meta[${kind}="${name}"]`); if(!el){ el=document.createElement('meta'); el.setAttribute(kind,name); document.head.appendChild(el);} el.setAttribute('content', value); }
function slugify(s){ return s.toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-'); }
function markdownToHtml(md){
  let html = md;
  html = html.replace(/```([\s\S]*?)```/g, (_,c)=>`<pre><code>${escapeHtml(c.trim())}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, (_,c)=>`<code>${escapeHtml(c)}</code>`);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_,alt,src)=>`<img class="inline-img" alt="${escapeAttr(alt)}" src="${escapeAttr(src)}">`);
  html = html.replace(/^###### (.*)$/gm,'<h6>$1</h6>').replace(/^##### (.*)$/gm,'<h5>$1</h5>').replace(/^#### (.*)$/gm,'<h4>$1</h4>').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/__([^_]+)__/g,'<strong>$1</strong>').replace(/_([^_]+)_/g,'<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/(^|\n)[*-] (.*)(?=\n|$)/g,(_,p1,item)=>`${p1}<li>${item}</li>`).replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
  html = html.split(/\n{2,}/).map(b=>{ const t=b.trim(); if(!t) return ''; if (/^\s*<(h\d|ul|pre|blockquote|img)/.test(t)) return t; if (/^\s*<li>/.test(t)) return t; return `<p>${t.replace(/\n/g,'<br>')}</p>`; }).join('\n');
  return html;
}
function escapeHtml(s){ return s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function escapeAttr(s){ return escapeHtml(String(s)).replace(/"/g,'&quot;'); }

function setupReaderToggle(){
  const btn = document.getElementById('readerToggle');
  const on = localStorage.getItem('readerMode') === 'on';
  setReader(on);
  btn?.addEventListener('click', ()=> setReader(!document.documentElement.classList.contains('reader-on')));
}
function setReader(on){
  document.documentElement.classList.toggle('reader-on', on);
  const btn = document.getElementById('readerToggle');
  if (btn){ btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = `Easy Reader: ${on ? 'On' : 'Off'}`; }
  localStorage.setItem('readerMode', on ? 'on' : 'off');
  window.dispatchEvent(new CustomEvent('reader-mode', { detail: { on } }));
  if (!on) {
    document.querySelectorAll('#starfield, #bouncingLogo, #stars, #boo, canvas')
      .forEach(el => el.style.removeProperty('display'));
  }
}
