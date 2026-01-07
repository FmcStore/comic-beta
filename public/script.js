/* script.js - FULL VERSION WITH CLOUD SYNC & UUID */

const API_PROXY = "https://api.nekolabs.web.id/px?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikcast";
const BACKEND_URL = window.location.origin;

// --- CONFIG SUPABASE (ISI DENGAN DATA KAMU) ---
const SUPABASE_URL = "https://rkxtqfzoqftdykarsutb.supabase.co";
const SUPABASE_KEY = "sb_publishable_ey4p-Xu2nivEnsw_J54MtQ_jdnIePFx";
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
        desc.innerHTML = `<i class="fa fa-circle text-green-500 mr-1"></i> Cloud Sync Aktif. Riwayat tersimpan di akun Google.`;
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

async function logout() { await supabase.auth.signOut(); window.location.reload(); }

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
    console.log("Local History synced to Cloud.");
}

// --- UUID HELPERS ---

async function getUuidFromSlug(slug, type) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/get-id`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
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
        const response = await fetch(API_PROXY + encodeURIComponent(url));
        const data = await response.json();
        return data.success ? (data.result?.content || data.result) : null;
    } catch (e) { return null; }
}

async function loadGenres() {
    const data = await fetchAPI(`${API_BASE}/genres`);
    if(data && data.data) {
        const select = document.getElementById('filter-genre');
        select.innerHTML = '<option value="">Pilih Genre</option>';
        data.data.sort((a, b) => a.title.localeCompare(b.title)).forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.slug; opt.text = g.title; select.appendChild(opt);
        });
    }
}

// --- PAGES ---

async function showHome(push = true) {
    if (push) updateURL('/'); resetNavs(); setLoading();
    const data = await fetchAPI(`${API_BASE}/home`);
    if(!data) return;

    contentArea.innerHTML = `
        <section class="mb-12">
            <h2 class="text-xl font-bold mb-6 flex items-center gap-2"><i class="fa fa-fire text-amber-500"></i> Populer Hari Ini</h2>
            <div class="flex overflow-x-auto gap-4 hide-scroll pb-4 -mx-4 px-4 md:mx-0 md:px-0">
                ${data.data.hotUpdates.map(item => `
                    <div class="min-w-[150px] md:min-w-[200px] cursor-pointer card-hover relative rounded-2xl overflow-hidden group" onclick="showDetail('${item.slug}')">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/90 z-10"></div>
                        <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Hot'}</span>
                        <img src="${item.image}" class="h-64 md:h-80 w-full object-cover transform group-hover:scale-110 transition duration-500">
                        <div class="absolute bottom-0 left-0 p-3 z-20 w-full">
                            <h3 class="text-sm font-bold truncate text-white">${item.title}</h3>
                            <p class="text-amber-400 text-xs font-semibold mt-1">${item.chapter || item.latestChapter}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div class="lg:col-span-2">
                <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                    ${data.data.latestReleases.slice(0, 12).map(item => `
                        <div class="bg-zinc-900/40 border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-amber-500/50 transition" onclick="showDetail('${item.slug}')">
                            <img src="${item.image}" class="h-48 w-full object-cover">
                            <div class="p-3"><h3 class="text-xs font-bold truncate">${item.title}</h3></div>
                        </div>
                    `).join('')}
                </div>
            </div>
            <div>
                <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Proyek Kami</h2>
                <div class="space-y-4">
                    ${data.data.projectUpdates.map(item => `
                        <div class="flex gap-4 bg-zinc-900/30 p-2 rounded-xl cursor-pointer hover:bg-white/5 transition border border-transparent hover:border-white/10" onclick="showDetail('${item.slug}')">
                            <img src="${item.image}" class="w-16 h-20 rounded-lg object-cover">
                            <div class="flex-1 flex flex-col justify-center overflow-hidden">
                                <h3 class="font-bold text-xs truncate">${item.title}</h3>
                                <p class="text-amber-500 text-[10px]">${item.chapters[0]?.title}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
    window.scrollTo(0,0);
}

// --- Detail Page Logic (REMASTERED) ---

async function showDetail(idOrSlug, push = true) {
    let slug = idOrSlug; setLoading();
    if (idOrSlug.length === 36) {
        const m = await getSlugFromUuid(idOrSlug); if (m) slug = m.slug;
    }
    if (push) {
        const uuid = await getUuidFromSlug(slug, 'series'); updateURL(`/series/${uuid}`);
    }
    resetNavs(); 
    const data = await fetchAPI(`${API_BASE}/detail/${slug}`);
    if(!data) return;
    const res = data.data; currentChapterList = res.chapters;

    const hist = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const saved = hist.find(h => h.slug === slug);
    const startAct = saved ? `readChapter('${saved.lastChapterSlug}', '${slug}')` : `readChapter('${res.chapters[res.chapters.length - 1].slug}', '${slug}')`;

    contentArea.innerHTML = `
        <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 overflow-hidden">
            <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 backdrop-banner animate-pulse">
            <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/40 to-[#0b0b0f]"></div>
        </div>
        
        <div class="relative z-10 flex flex-col md:flex-row gap-8 lg:gap-12 mt-4 animate-fade-in">
            <div class="md:w-[280px] shrink-0 mx-auto md:mx-0">
                <img src="${res.image}" class="w-full rounded-2xl shadow-2xl border border-white/10">
                <div class="flex flex-col gap-3 mt-6">
                    <button onclick="${startAct}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black shadow-lg shadow-amber-500/20">Baca Sekarang</button>
                    <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark" class="glass w-full py-3.5 rounded-xl font-semibold">Simpan</button>
                </div>
            </div>

            <div class="flex-1">
                <h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">${res.title}</h1>
                <div class="flex flex-wrap gap-3 mb-6">
                    <span class="glass px-4 py-1.5 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/20">⭐ ${res.rating}</span>
                    <span class="glass px-4 py-1.5 rounded-lg text-xs font-bold text-green-400 border border-green-500/20">${res.status}</span>
                </div>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${res.genres ? res.genres.map(g => `<span class="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs">${g.title}</span>`).join('') : ''}
                </div>

                <div class="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                    <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase tracking-wide">Sinopsis</h3>
                    <p id="synopsis-text" class="text-gray-300 text-sm leading-relaxed line-clamp-4 transition-all duration-300">${res.synopsis || "N/A"}</p>
                    <button onclick="toggleSynopsis()" id="synopsis-btn" class="text-amber-500 text-xs font-bold mt-2">Baca Selengkapnya</button>
                </div>

                <div class="glass rounded-2xl border border-white/10 overflow-hidden">
                    <div class="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                        <h3 class="font-bold">Daftar Chapter</h3>
                        <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari..." class="bg-black/30 border border-white/10 rounded-lg px-3 py-1 text-xs">
                    </div>
                    <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto p-2">
                        ${res.chapters.map(ch => `
                            <div onclick="readChapter('${ch.slug}', '${slug}')" class="chapter-item group flex justify-between items-center p-3 mb-1 rounded-xl bg-white/5 hover:bg-white/10 transition cursor-pointer">
                                <span class="text-sm font-medium group-hover:text-amber-500 transition">${ch.title}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    checkBookmarkStatus(slug);
    saveHistory(slug, res.title, res.image);
    window.scrollTo(0,0);
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

// --- Reader Logic (SKELETON & DROPDOWN) ---

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
    let chSlug = chIdOrSlug;
    if (chIdOrSlug.length === 36) {
        const m = await getSlugFromUuid(chIdOrSlug); if (m) chSlug = m.slug;
    }
    if (push) {
        const uuid = await getUuidFromSlug(chSlug, 'chapter'); updateURL(`/chapter/${uuid}`);
    }

    mainNav.classList.add('-translate-y-full'); mobileNav.classList.add('translate-y-full');
    const data = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    if(!data) return;
    const res = data.data; const finalComicSlug = comicSlug || res.parent_slug || res.comic_slug;

    // Dropdown Navigation
    let dropdownHTML = '';
    if (currentChapterList && currentChapterList.length > 0) {
        dropdownHTML = `
            <select onchange="readChapter(this.value, '${finalComicSlug}')" class="bg-black/50 border border-white/10 rounded-lg text-xs p-2 text-white max-w-[120px]">
                ${currentChapterList.map(ch => `<option value="${ch.slug}" ${ch.slug === chSlug ? 'selected' : ''}>${ch.title}</option>`).join('')}
            </select>
        `;
    }

    contentArea.innerHTML = `
        <div class="relative bg-black -mx-4 -mt-24 min-h-screen">
            <div id="reader-top" class="reader-ui fixed top-0 w-full glass z-[60] p-4 flex justify-between items-center transition-all duration-300">
                <button onclick="showDetail('${finalComicSlug || ''}')" class="p-2"><i class="fa fa-arrow-left"></i></button>
                <h2 class="text-xs font-bold text-amber-500 truncate max-w-[150px]">${chSlug}</h2>
                <button onclick="toggleFullScreen()"><i class="fa fa-expand"></i></button>
            </div>

            <div id="reader-images" class="flex flex-col items-center pt-20 pb-40" onclick="toggleReaderUI()">
                ${res.images.map(img => `
                    <div class="w-full max-w-3xl relative min-h-[400px] bg-zinc-900/50">
                        <img src="${img}" class="w-full opacity-0 transition-opacity duration-500" onload="this.classList.remove('opacity-0'); this.parentElement.style.minHeight='auto'">
                    </div>
                `).join('')}
            </div>

            <div id="reader-bottom" class="reader-ui fixed bottom-6 left-0 w-full z-[60] flex justify-center px-4 pointer-events-none transition-all duration-300">
                <div class="glass p-2 rounded-2xl flex gap-2 items-center pointer-events-auto">
                    <button onclick="${res.navigation.prev ? `readChapter('${res.navigation.prev}', '${finalComicSlug}')` : ''}" class="p-3 bg-white/5 rounded-xl"><i class="fa fa-chevron-left"></i></button>
                    ${dropdownHTML}
                    <button onclick="${res.navigation.next ? `readChapter('${res.navigation.next}', '${finalComicSlug}')` : ''}" class="p-3 amber-gradient rounded-xl"><i class="fa fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `;
    if(finalComicSlug) saveHistory(finalComicSlug, null, null, chSlug, chSlug.replace(/-/g, ' '));
    window.scrollTo(0,0);
}

function toggleReaderUI() {
    document.getElementById('reader-top').classList.toggle('ui-hidden-top');
    document.getElementById('reader-bottom').classList.toggle('ui-hidden-bottom');
}

// --- BOOKMARKS & HISTORY LOGIC ---

async function saveHistory(slug, title, image, chSlug, chTitle) {
    const ts = new Date().getTime();
    const historyData = {
        slug, title: title || 'N/A', image: image || 'assets/icon.png',
        lastChapterSlug: chSlug, lastChapterTitle: chTitle || 'Chapter ?',
        timestamp: ts
    };

    // Lokal backup
    let hist = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    hist = hist.filter(h => h.slug !== slug); hist.unshift(historyData);
    if (hist.length > 50) hist.pop();
    localStorage.setItem('fmc_history', JSON.stringify(hist));

    // Cloud save if login
    if(currentUser && supabase) {
        await supabase.from('history').upsert({
            user_id: currentUser.id, slug: slug,
            title: historyData.title, image: historyData.image,
            last_chapter_slug: chSlug, last_chapter_title: chTitle,
            updated_at: new Date()
        }, { onConflict: 'user_id, slug' });
    }
}

async function showHistory() {
    updateURL('/history'); resetNavs(); setLoading();
    let displayData = [];
    if(currentUser && supabase) {
        const { data } = await supabase.from('history').select('*').order('updated_at', { ascending: false });
        if(data) displayData = data.map(d => ({ slug: d.slug, title: d.title, image: d.image, lastChapterTitle: d.last_chapter_title }));
    } else {
        displayData = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    }
    renderGrid({ data: displayData }, currentUser ? "Riwayat Cloud" : "Riwayat Lokal");
}

function toggleBookmark(slug, title, image) {
    let b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const idx = b.findIndex(x => x.slug === slug);
    if (idx > -1) b.splice(idx, 1); else b.push({ slug, title, image });
    localStorage.setItem('fmc_bookmarks', JSON.stringify(b));
    checkBookmarkStatus(slug);
}
function checkBookmarkStatus(slug) {
    let b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const btn = document.getElementById('btn-bookmark');
    if (btn) btn.innerHTML = b.some(x => x.slug === slug) ? "Tersimpan" : "Simpan";
}
function showBookmarks() { 
    updateURL('/bookmarks'); resetNavs(); 
    renderGrid({ data: JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]') }, "Koleksi"); 
}

// --- INIT & NAVIGATION ---

async function handleInitialLoad() {
    const path = window.location.pathname; resetNavs(); 
    if (path.startsWith('/series/')) showDetail(path.split('/')[2], false);
    else if (path.startsWith('/chapter/')) readChapter(path.split('/')[2], null, false);
    else if (path === '/ongoing') showOngoing(1);
    else if (path === '/completed') showCompleted(1);
    else if (path === '/history') showHistory();
    else if (path === '/bookmarks') showBookmarks();
    else showHome(false);
}

function renderGrid(data, title, funcName, extraArg = null) {
    const list = data?.data || [];
    contentArea.innerHTML = `<h2 class="text-2xl font-bold mb-8 border-l-4 border-amber-500 pl-4">${title}</h2>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-6">${list.map(item => `
            <div class="bg-zinc-900/40 rounded-xl overflow-hidden card-hover cursor-pointer" onclick="showDetail('${item.slug}')">
                <img src="${item.image}" class="h-64 w-full object-cover">
                <div class="p-3 text-center text-xs font-bold truncate">${item.title}</div>
            </div>`).join('')}</div>`;
}

window.addEventListener('popstate', handleInitialLoad);
document.addEventListener('DOMContentLoaded', () => {
    loadGenres(); checkAuthStatus(); handleInitialLoad();
});

function handleSearch(e) { if(e.key === 'Enter') applyAdvancedFilter(); }
async function applyAdvancedFilter() {
    const q = document.getElementById('search-input').value; filterPanel.classList.add('hidden'); setLoading();
    if(q) { const d = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(q)}/1`); renderGrid(d, `Hasil: ${q}`); }
    }
