/* script.js - Full Features with Google Login & Auto Sync */

const API_PROXY = "https://api.nekolabs.web.id/px?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikcast";
const BACKEND_URL = window.location.origin;

// --- KONFIGURASI SUPABASE (WAJIB ISI) ---
const SUPABASE_URL = "URL_SUPABASE_KAMU";
const SUPABASE_KEY = "ANON_KEY_SUPABASE_KAMU";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');

let currentUser = null;
let currentChapterList = [];

// --- SISTEM AUTH & AUTO SYNC ---

async function checkAuthStatus() {
    if(!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    updateAuthUI();
    if(user) syncLocalToCloud(); 
}

function updateAuthUI() {
    const avatar = document.getElementById('user-avatar');
    const userName = document.getElementById('auth-user-name');
    const desc = document.getElementById('auth-desc');
    const btnLogin = document.getElementById('btn-login-google');
    const btnLogout = document.getElementById('btn-logout');

    if(currentUser) {
        const p = currentUser.user_metadata;
        userName.innerText = p.full_name || "Pembaca";
        desc.innerHTML = `<i class="fa fa-circle text-green-500 mr-1"></i> Cloud Sync Aktif. Riwayat aman & sinkron.`;
        if(p.avatar_url) avatar.innerHTML = `<img src="${p.avatar_url}" class="w-full h-full object-cover">`;
        btnLogin.classList.add('hidden');
        btnLogout.classList.remove('hidden');
    } else {
        userName.innerText = "Mode: Local Storage";
        desc.innerHTML = `<i class="fa fa-circle text-orange-500 mr-1 animate-pulse"></i> Offline. Riwayat bisa hilang jika pindah browser.`;
        avatar.innerHTML = `<i class="fa fa-user text-xl text-gray-600"></i>`;
        btnLogin.classList.remove('hidden');
        btnLogout.classList.add('hidden');
    }
}

async function loginGoogle() {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
}

async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
}

async function syncLocalToCloud() {
    if(!currentUser) return;
    let local = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    if(local.length === 0) return;

    const toSync = local.map(item => ({
        user_id: currentUser.id,
        slug: item.slug,
        title: item.title,
        image: item.image,
        last_chapter_slug: item.lastChapterSlug,
        last_chapter_title: item.lastChapterTitle,
        updated_at: new Date(item.timestamp || Date.now())
    }));

    await supabase.from('history').upsert(toSync, { onConflict: 'user_id, slug' });
    console.log("History Local synced to Cloud!");
}

// --- UUID HELPERS ---

async function getUuidFromSlug(slug, type) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/get-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, type })
        });
        const data = await res.json();
        return data.uuid;
    } catch (e) { return slug; }
}

async function getSlugFromUuid(uuid) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/get-slug/${uuid}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) { return null; }
}

// --- CORE UTILS ---

function updateURL(path) { if (window.location.pathname !== path) history.pushState(null, null, path); }
function getTypeClass(type) {
    const t = type?.toLowerCase() || '';
    if (t.includes('manga')) return 'type-manga';
    if (t.includes('manhwa')) return 'type-manhwa';
    if (t.includes('manhua')) return 'type-manhua';
    return 'type-default';
}
function setLoading() { contentArea.innerHTML = `<div class="flex justify-center py-40"><div class="animate-spin rounded-full h-12 w-12 border-t-2 border-amber-500"></div></div>`; }
function resetNavs() { mainNav.classList.remove('-translate-y-full'); mobileNav.classList.remove('translate-y-full'); filterPanel.classList.add('hidden'); }

async function fetchAPI(url) {
    try {
        const res = await fetch(API_PROXY + encodeURIComponent(url));
        const d = await res.json();
        return d.success ? (d.result?.content || d.result) : null;
    } catch (e) { return null; }
}

// --- FITUR FILTER & MENU ---

async function loadGenres() {
    const data = await fetchAPI(`${API_BASE}/genres`);
    if(data && data.data) {
        const select = document.getElementById('filter-genre');
        select.innerHTML = '<option value="">Pilih Genre</option>';
        data.data.sort((a,b) => a.title.localeCompare(b.title)).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.slug; opt.text = g.title; select.appendChild(opt);
        });
    }
}

async function showHome(push = true) {
    if (push) updateURL('/'); resetNavs(); setLoading();
    const data = await fetchAPI(`${API_BASE}/home`);
    if(!data) return;
    contentArea.innerHTML = `
        <section class="mb-12">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa fa-fire text-amber-500"></i> Populer</h2>
            <div class="flex overflow-x-auto gap-4 hide-scroll pb-4">
                ${data.data.hotUpdates.map(item => `
                    <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group" onclick="showDetail('${item.slug}')">
                        <img src="${item.image}" class="h-64 md:h-80 w-full object-cover group-hover:scale-110 transition duration-500">
                        <div class="absolute bottom-0 p-3 bg-gradient-to-t from-black w-full"><h3 class="text-xs font-bold truncate">${item.title}</h3></div>
                    </div>
                `).join('')}
            </div>
        </section>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div class="lg:col-span-2">
                <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${data.data.latestReleases.slice(0, 12).map(item => `
                        <div class="bg-zinc-900/40 p-2 rounded-xl cursor-pointer border border-white/5 hover:border-amber-500/50 transition" onclick="showDetail('${item.slug}')">
                            <img src="${item.image}" class="h-48 w-full object-cover rounded-lg">
                            <h3 class="text-xs font-bold mt-2 truncate">${item.title}</h3>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

async function showOngoing(page = 1) {
    updateURL('/ongoing'); resetNavs(); setLoading();
    const data = await fetchAPI(`${API_BASE}/list?status=Ongoing&orderby=popular&page=${page}`);
    renderGrid(data, "Komik Ongoing", "showOngoing");
}

async function showCompleted(page = 1) {
    updateURL('/completed'); resetNavs(); setLoading();
    const data = await fetchAPI(`${API_BASE}/list?status=Completed&orderby=popular&page=${page}`);
    renderGrid(data, "Komik Tamat", "showCompleted");
}

async function applyAdvancedFilter() {
    const q = document.getElementById('search-input').value;
    const g = document.getElementById('filter-genre').value;
    filterPanel.classList.add('hidden'); setLoading();
    if (q) { const d = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(q)}/1`); renderGrid(d, `Hasil: ${q}`); return; }
    if (g) { showGenre(g, 1); return; }
}

function renderGrid(data, title, funcName, extraArg = null) {
    const list = data?.data || [];
    let pagin = '';
    if (data.pagination && funcName) {
        const cur = data.pagination.currentPage;
        const arg = extraArg ? `'${extraArg}', ` : '';
        pagin = `<div class="mt-10 flex justify-center gap-4">
            ${cur > 1 ? `<button onclick="${funcName}(${arg}${cur - 1})" class="glass px-4 py-2 rounded-lg text-xs">Prev</button>` : ''}
            <span class="bg-amber-500 text-black px-4 py-2 rounded-lg text-xs font-bold">${cur}</span>
            ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${arg}${cur + 1})" class="glass px-4 py-2 rounded-lg text-xs">Next</button>` : ''}
        </div>`;
    }
    contentArea.innerHTML = `<h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">${list.map(item => `
            <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer relative" onclick="showDetail('${item.slug}')">
                <img src="${item.image}" class="h-64 w-full object-cover">
                <div class="p-3 text-center text-xs font-bold truncate">${item.title}</div>
            </div>`).join('')}</div>${pagin}`;
    window.scrollTo(0,0);
}

// --- DETAIL PAGE & SYNOPSIS TOGGLE ---

async function showDetail(idOrSlug, push = true) {
    let slug = idOrSlug; setLoading();
    if (idOrSlug.length === 36) { const m = await getSlugFromUuid(idOrSlug); if (m) slug = m.slug; }
    if (push) { const uuid = await getUuidFromSlug(slug, 'series'); updateURL(`/series/${uuid}`); }
    resetNavs(); 
    const data = await fetchAPI(`${API_BASE}/detail/${slug}`);
    if(!data) return;
    const res = data.data; currentChapterList = res.chapters;

    const hist = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const saved = hist.find(h => h.slug === slug);
    const startAct = saved ? `readChapter('${saved.lastChapterSlug}', '${slug}')` : `readChapter('${res.chapters[res.chapters.length - 1].slug}', '${slug}')`;

    contentArea.innerHTML = `
        <div class="flex flex-col md:flex-row gap-8 mt-4 animate-fade-in">
            <div class="md:w-[280px] shrink-0">
                <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10">
                <div class="flex flex-col gap-3 mt-6">
                    <button onclick="${startAct}" class="amber-gradient py-3 rounded-xl font-bold text-black shadow-lg shadow-amber-500/20">Baca Sekarang</button>
                    <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark" class="glass py-3 rounded-xl font-semibold">Simpan</button>
                </div>
            </div>
            <div class="flex-1">
                <h1 class="text-3xl font-extrabold mb-4">${res.title}</h1>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${res.genres ? res.genres.map(g => `<span class="bg-white/5 px-3 py-1 rounded-full text-xs border border-white/10">${g.title}</span>`).join('') : ''}
                </div>
                <div class="bg-white/5 p-6 rounded-2xl mb-8 border border-white/5">
                    <h3 class="font-bold text-amber-500 text-sm uppercase mb-2">Sinopsis</h3>
                    <p id="synopsis-text" class="text-gray-300 text-sm leading-relaxed line-clamp-4">${res.synopsis || 'N/A'}</p>
                    <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 text-xs font-bold mt-2">Baca Selengkapnya</button>
                </div>
                <div class="glass rounded-2xl overflow-hidden border border-white/10">
                    <div class="p-4 bg-white/5 flex justify-between items-center">
                        <h3 class="font-bold">Daftar Chapter</h3>
                        <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari..." class="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-xs">
                    </div>
                    <div id="chapter-list-container" class="max-h-96 overflow-y-auto p-2">
                        ${res.chapters.map(ch => `<div onclick="readChapter('${ch.slug}', '${slug}')" class="chapter-item p-3 mb-1 bg-white/5 rounded-lg cursor-pointer hover:bg-amber-500 hover:text-black transition text-sm"><span>${ch.title}</span></div>`).join('')}
                    </div>
                </div>
            </div>
        </div>`;
    checkBookmarkStatus(slug);
    saveHistory(slug, res.title, res.image);
}

function toggleSynopsis() {
    const t = document.getElementById('synopsis-text');
    const b = document.getElementById('synopsis-btn');
    if (t.classList.contains('line-clamp-4')) { t.classList.remove('line-clamp-4'); b.innerText = "Tutup"; }
    else { t.classList.add('line-clamp-4'); b.innerText = "Baca Selengkapnya"; }
}

function filterChapters() {
    const f = document.getElementById('chapter-search').value.toLowerCase();
    const items = document.getElementsByClassName('chapter-item');
    for (let i of items) { i.style.display = i.innerText.toLowerCase().includes(f) ? "" : "none"; }
}

// --- READER LOGIC (SKELETON & UI) ---

async function readChapter(idOrSlug, comicSlug = null, push = true) {
    let slug = idOrSlug;
    if (idOrSlug.length === 36) { const m = await getSlugFromUuid(idOrSlug); if (m) slug = m.slug; }
    if (push) { const uuid = await getUuidFromSlug(slug, 'chapter'); updateURL(`/chapter/${uuid}`); }
    
    mainNav.classList.add('-translate-y-full'); mobileNav.classList.add('translate-y-full');
    const data = await fetchAPI(`${API_BASE}/chapter/${slug}`);
    if(!data) return;

    contentArea.innerHTML = `
        <div class="relative bg-black -mx-4 -mt-24">
            <div id="reader-top" class="reader-ui fixed top-0 w-full glass z-[60] p-4 flex justify-between">
                <button onclick="showHome()"><i class="fa fa-arrow-left"></i></button>
                <h2 class="text-xs font-bold text-amber-500 truncate max-w-[150px]">${slug}</h2>
                <button onclick="toggleFullScreen()"><i class="fa fa-expand"></i></button>
            </div>
            <div id="reader-images" class="flex flex-col items-center pt-20 pb-40" onclick="toggleReaderUI()">
                ${data.data.images.map(img => `
                    <div class="w-full max-w-3xl relative min-h-[300px] bg-zinc-900/50">
                        <img src="${img}" class="w-full opacity-0 transition-opacity duration-500" onload="this.classList.remove('opacity-0'); this.parentElement.style.minHeight='auto'">
                    </div>
                `).join('')}
            </div>
            <div id="reader-bottom" class="reader-ui fixed bottom-6 left-0 w-full z-[60] flex justify-center">
                <div class="glass p-2 rounded-2xl flex gap-4">
                    <button onclick="${data.data.navigation.prev ? `readChapter('${data.data.navigation.prev}', '${comicSlug}')` : ''}" class="p-3 bg-white/10 rounded-xl"><i class="fa fa-chevron-left"></i></button>
                    <button onclick="${data.data.navigation.next ? `readChapter('${data.data.navigation.next}', '${comicSlug}')` : ''}" class="p-3 amber-gradient rounded-xl"><i class="fa fa-chevron-right"></i></button>
                </div>
            </div>
        </div>`;
    if(comicSlug) saveHistory(comicSlug, null, null, slug, slug.replace(/-/g, ' '));
    window.scrollTo(0,0);
}

function toggleReaderUI() {
    document.getElementById('reader-top').classList.toggle('ui-hidden-top');
    document.getElementById('reader-bottom').classList.toggle('ui-hidden-bottom');
}

// --- BOOKMARKS & HISTORY LOGIC ---

function toggleBookmark(s, t, i) {
    let b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const idx = b.findIndex(x => x.slug === s);
    if (idx > -1) b.splice(idx, 1); else b.push({ slug: s, title: t, image: i });
    localStorage.setItem('fmc_bookmarks', JSON.stringify(b));
    checkBookmarkStatus(s);
}
function checkBookmarkStatus(s) {
    const b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const btn = document.getElementById('btn-bookmark');
    if(btn) btn.innerHTML = b.some(x => x.slug === s) ? "Tersimpan" : "Simpan";
}
function showBookmarks() { updateURL('/bookmarks'); resetNavs(); renderGrid({ data: JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]') }, "Koleksi"); }

async function saveHistory(slug, title, image, chSlug, chTitle) {
    const ts = new Date().getTime();
    const data = { slug, title, image, lastChapterSlug: chSlug, lastChapterTitle: chTitle, timestamp: ts };

    // Lokal Save
    let h = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    h = h.filter(x => x.slug !== slug); h.unshift(data);
    if (h.length > 50) h.pop();
    localStorage.setItem('fmc_history', JSON.stringify(h));

    // Cloud Save if Login
    if(currentUser && supabase) {
        await supabase.from('history').upsert({
            user_id: currentUser.id, slug, title, image,
            last_chapter_slug: chSlug, last_chapter_title: chTitle, updated_at: new Date()
        }, { onConflict: 'user_id, slug' });
    }
}

async function showHistory() {
    updateURL('/history'); resetNavs(); setLoading();
    let d = [];
    if(currentUser && supabase) {
        const { data } = await supabase.from('history').select('*').order('updated_at', { ascending: false });
        if(data) d = data.map(x => ({ slug: x.slug, title: x.title, image: x.image, lastChapterTitle: x.last_chapter_title }));
    } else {
        d = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    }
    renderGrid({ data: d }, currentUser ? "Riwayat Cloud" : "Riwayat Lokal");
}

// --- INITIAL LOAD ---

async function handleInitialLoad() {
    const p = window.location.pathname; resetNavs(); 
    if (p.startsWith('/series/')) showDetail(p.split('/')[2], false);
    else if (p.startsWith('/chapter/')) readChapter(p.split('/')[2], null, false);
    else if (p === '/ongoing') showOngoing(1);
    else if (p === '/completed') showCompleted(1);
    else if (p === '/history') showHistory();
    else showHome(false);
}

window.addEventListener('popstate', handleInitialLoad);
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadGenres();
    handleInitialLoad();
});
