/* script.js - VERSI SANGAT RINGAN & CEPAT (LOGIKA LAMA + TAMPILAN BARU) */

const API_PROXY = "https://api.nekolabs.web.id/px?url=";
const API_BASE = "https://www.sankavollerei.com/comic/komikcast";
const BACKEND_URL = window.location.origin;

const contentArea = document.getElementById('content-area');
const filterPanel = document.getElementById('filter-panel');
const mainNav = document.getElementById('main-nav');
const mobileNav = document.getElementById('mobile-nav');
const progressBar = document.getElementById('progress-bar');

let currentChapterList = [];
let heroInterval = null;

// --- Helper Functions Standar ---

async function getUuidFromSlug(slug, type) {
    try {
        const res = await fetch(`${BACKEND_URL}/api/get-id`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, type }) });
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

function updateURL(path) {
    if (window.location.pathname !== path) history.pushState(null, null, path);
}

function getTypeClass(type) {
    if (!type) return 'type-default';
    const t = type.toLowerCase();
    if (t.includes('manga')) return 'type-manga';
    if (t.includes('manhwa')) return 'type-manhwa';
    if (t.includes('manhua')) return 'type-manhua';
    return 'type-default';
}

// Fungsi Fetch Sederhana (Tanpa Error handling ribet)
async function fetchAPI(url) {
    if(progressBar) progressBar.style.width = "60%";
    try {
        const response = await fetch(API_PROXY + encodeURIComponent(url));
        const data = await response.json();
        if(progressBar) { progressBar.style.width = "100%"; setTimeout(() => progressBar.style.width = "0%", 200); }
        if (data.success) return data.result?.content || data.result || data;
        return null;
    } catch (e) { 
        if(progressBar) progressBar.style.width = "0%";
        return null; 
    }
}

function resetNavs() {
    mainNav.classList.remove('-translate-y-full');
    mobileNav.classList.remove('translate-y-full');
    filterPanel.classList.add('hidden');
    clearInterval(heroInterval);
}

function setLoading() {
    // Loading Spinner Simpel
    contentArea.innerHTML = `<div class="flex flex-col h-screen items-center justify-center gap-3"><div class="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div><p class="text-xs text-gray-500 animate-pulse">Memuat...</p></div>`;
}

// --- BAGIAN UTAMA (HOME) ---

async function showHome(push = true) {
    if (push) updateURL('/'); 
    resetNavs();
    setLoading();
    
    const data = await fetchAPI(`${API_BASE}/home`);
    if(!data || !data.data) { contentArea.innerHTML = "<div class='text-center py-20'>Gagal memuat home.</div>"; return; }

    const hot = data.data.hotUpdates || [];
    const latest = data.data.latestReleases || [];

    // Slider Simple
    const heroes = hot.slice(0, 5); 
    const heroHTML = `
        <div class="hero-wrapper mb-8">
            ${heroes.map((item, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                    <img src="${item.image}" class="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm">
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0b0b0f] to-transparent"></div>
                    <div class="hero-content container mx-auto px-4 pb-12">
                         <span class="text-amber-500 font-bold text-xs uppercase mb-2 block">Hot Update #${index+1}</span>
                        <h1 class="text-3xl md:text-5xl font-extrabold mb-4 line-clamp-2 text-white drop-shadow-md">${item.title}</h1>
                        <button onclick="showDetail('${item.slug}')" class="amber-gradient text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition">Baca Komik</button>
                    </div>
                </div>
            `).join('')}
        </div>`;

    // List Terbaru
    const latestHTML = `
        <section class="container mx-auto px-4 pb-10">
            <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${latest.map(item => `
                    <div class="cursor-pointer group relative" onclick="showDetail('${item.slug}')">
                        <div class="relative rounded-xl overflow-hidden aspect-[3/4] mb-2 border border-white/5 card-hover">
                            <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'UP'}</span>
                            <img src="${item.image}" class="w-full h-full object-cover">
                            <div class="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black to-transparent">
                                <p class="text-[10px] text-gray-300 text-right">${item.chapters[0]?.time || ''}</p>
                            </div>
                        </div>
                        <h3 class="text-xs font-bold line-clamp-2 h-8 text-gray-200 group-hover:text-amber-500">${item.title}</h3>
                        <span class="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 rounded">${item.chapters[0]?.title || 'Ch.?'}</span>
                    </div>
                `).join('')}
            </div>
             <div class="mt-8 flex justify-center"><button onclick="showOngoing()" class="glass px-6 py-2 rounded-full text-sm hover:bg-white/10">Lihat Semua</button></div>
        </section>`;

    contentArea.innerHTML = `<div class="-mt-24 md:-mt-24">${heroHTML}${latestHTML}</div>`;
    
    // Slider Logic Paling Sederhana
    let idx = 0;
    if(heroInterval) clearInterval(heroInterval);
    heroInterval = setInterval(() => {
        const slides = document.querySelectorAll('.hero-slide');
        slides.forEach(s => s.classList.remove('active'));
        idx = (idx + 1) % slides.length;
        if(slides[idx]) slides[idx].classList.add('active');
    }, 4000);
    
    window.scrollTo(0,0);
}

// --- BAGIAN DETAIL ---

async function showDetail(idOrSlug, push = true) {
    let slug = idOrSlug;
    setLoading(); // Tampilkan loading spinner biasa

    if (idOrSlug.length === 36) {
        const mapping = await getSlugFromUuid(idOrSlug);
        if (mapping) slug = mapping.slug;
    }
    if (push) {
        const uuid = await getUuidFromSlug(slug, 'series');
        updateURL(`/series/${uuid}`);
    }

    resetNavs(); 
    const data = await fetchAPI(`${API_BASE}/detail/${slug}`);
    if(!data || !data.data) { contentArea.innerHTML = "<div class='text-center py-20'>Gagal memuat detail.</div>"; return; }

    const res = data.data;
    currentChapterList = res.chapters;

    // Logic Tombol Baca
    const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const saved = history.find(h => h.slug === slug);
    const lastCh = saved ? saved.lastChapterSlug : null;
    const btnText = lastCh ? "Lanjut Baca" : "Mulai Baca";
    const btnAction = lastCh ? `readChapter('${lastCh}', '${slug}')` : (res.chapters.length > 0 ? `readChapter('${res.chapters[res.chapters.length-1].slug}', '${slug}')` : "");

    // Render HTML Langsung (Tanpa Skeleton aneh-aneh)
    contentArea.innerHTML = `
        <div class="fixed top-0 left-0 w-full h-[50vh] -z-10 pointer-events-none">
            <img src="${res.image}" class="w-full h-full object-cover blur-xl opacity-30">
            <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/50 to-[#0b0b0f]"></div>
        </div>

        <div class="container mx-auto px-4 pt-10 pb-20">
            <div class="flex flex-col md:flex-row gap-8">
                <div class="md:w-[240px] flex-shrink-0 mx-auto w-full max-w-[240px]">
                    <img src="${res.image}" class="w-full rounded-xl shadow-2xl border border-white/10">
                    <div class="flex flex-col gap-3 mt-5">
                        <button onclick="${btnAction}" class="amber-gradient w-full py-3 rounded-xl font-bold text-black shadow-lg">
                           ${btnText}
                        </button>
                        <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark" class="glass w-full py-3 rounded-xl font-bold">Simpan</button>
                    </div>
                </div>

                <div class="flex-1">
                    <h1 class="text-2xl md:text-4xl font-extrabold mb-3">${res.title}</h1>
                    <div class="flex flex-wrap gap-2 mb-4 text-xs">
                         <span class="bg-amber-500 text-black px-2 py-1 rounded font-bold">⭐ ${res.rating}</span>
                         <span class="bg-green-600 text-white px-2 py-1 rounded font-bold">${res.status}</span>
                         <span class="bg-gray-700 text-white px-2 py-1 rounded font-bold">${res.type}</span>
                    </div>
                    <p class="text-gray-300 text-sm mb-6 line-clamp-4 hover:line-clamp-none cursor-pointer text-justify">${res.synopsis}</p>
                    
                    <div class="glass rounded-xl border border-white/10 p-4">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="font-bold text-lg">Chapter List (${res.chapters.length})</h3>
                            <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari..." class="bg-black/50 border border-white/10 rounded px-3 py-1 text-xs w-32 text-white">
                        </div>
                        <div class="max-h-[500px] overflow-y-auto custom-scroll pr-2" id="chapter-list">
                            ${res.chapters.map(ch => `
                                <div onclick="readChapter('${ch.slug}', '${slug}')" class="chapter-item flex justify-between p-3 mb-1 rounded hover:bg-white/10 cursor-pointer border-b border-white/5">
                                    <span class="text-sm font-medium text-gray-300 hover:text-amber-500 transition">${ch.title}</span>
                                    <span class="text-[10px] text-gray-500">${ch.time}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    checkBookmarkStatus(slug);
    saveHistory(slug, res.title, res.image);
    window.scrollTo(0,0);
}

function filterChapters() {
    const input = document.getElementById('chapter-search').value.toLowerCase();
    const items = document.querySelectorAll('.chapter-item');
    items.forEach(item => {
        item.style.display = item.innerText.toLowerCase().includes(input) ? "flex" : "none";
    });
}

// --- BAGIAN READER (FIXED: LANGSUNG GAMBAR, NO LOADING SHELL) ---

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
    let chSlug = chIdOrSlug;
    
    // 1. Tampilkan Loading Fullscreen Dulu (Agar user tahu sedang proses)
    contentArea.innerHTML = `
        <div class="flex flex-col h-screen items-center justify-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
            <p class="text-sm font-bold text-amber-500">Membuka Chapter...</p>
        </div>
    `;

    // 2. Fetch Data di Latar Belakang
    if (idOrSlug.length === 36) {
        const mapping = await getSlugFromUuid(idOrSlug);
        if (mapping) chSlug = mapping.slug;
    }
    if (push) {
        const uuid = await getUuidFromSlug(chSlug, 'chapter');
        updateURL(`/chapter/${uuid}`);
    }

    const data = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    
    // Jika gagal, beritahu user
    if(!data || !data.data) { 
        contentArea.innerHTML = `<div class="flex flex-col h-screen items-center justify-center gap-4 text-red-500">
            <i class="fa fa-triangle-exclamation text-4xl"></i>
            <p>Gagal memuat chapter.</p>
            <button onclick="readChapter('${chSlug}', '${comicSlug}')" class="bg-white/10 px-6 py-2 rounded-full text-white">Coba Lagi</button>
        </div>`;
        return; 
    }

    const res = data.data;
    const backAction = comicSlug ? `showDetail('${comicSlug}')` : `showHome()`;

    // 3. Render HTML String Langsung (Cara Tercepat & Paling Stabil)
    // Kita gunakan string template literal untuk menyusun HTML gambar sekaligus.
    // Tidak ada "createElement" satu-satu yang bikin lambat.
    
    const imagesHTML = res.images.map(url => 
        `<img src="${url}" class="w-full h-auto mb-0 bg-[#111]" loading="lazy" onerror="this.src='https://via.placeholder.com/500x800?text=Error+Image'">`
    ).join('');

    // Navigasi Dropdown
    const dropdownHTML = currentChapterList.length > 0 ? `
        <select onchange="readChapter(this.value, '${comicSlug}')" class="bg-black/50 text-white text-xs py-2 px-2 rounded border border-white/20 outline-none">
            ${currentChapterList.map(ch => `<option value="${ch.slug}" ${ch.slug === chSlug ? 'selected' : ''}>${ch.title}</option>`).join('')}
        </select>` : '';

    // Render Full Page
    contentArea.innerHTML = `
        <div class="bg-[#111] min-h-screen -mt-24 -mx-4">
            <!-- Header Mengambang -->
            <div id="reader-top" class="fixed top-0 w-full bg-[#0b0b0f]/90 backdrop-blur z-[60] p-3 flex justify-between items-center border-b border-white/5 transition-transform duration-300">
                <button onclick="${backAction}" class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-amber-500 hover:text-black"><i class="fa fa-arrow-left"></i></button>
                <h2 class="text-xs font-bold text-white truncate max-w-[200px]">${res.title || chSlug}</h2>
                <div class="w-8"></div> <!-- Spacer -->
            </div>

            <!-- KONTAINER GAMBAR (Langsung isi) -->
            <div id="reader-images" class="w-full max-w-3xl mx-auto pt-14 pb-20 bg-[#111] min-h-screen" onclick="toggleReaderUI()">
                ${imagesHTML}
            </div>

            <!-- Navigasi Bawah -->
            <div id="reader-bottom" class="fixed bottom-0 w-full z-[60] p-4 flex justify-center pointer-events-none transition-transform duration-300 bg-gradient-to-t from-black to-transparent">
                <div class="glass px-4 py-2 rounded-full flex gap-3 items-center shadow-lg pointer-events-auto bg-[#111]/90">
                    <button onclick="${res.navigation.prev ? `readChapter('${res.navigation.prev}', '${comicSlug}')` : ''}" class="text-white hover:text-amber-500 ${!res.navigation.prev ? 'opacity-30' : ''}"><i class="fa fa-chevron-left text-lg"></i></button>
                    ${dropdownHTML}
                    <button onclick="${res.navigation.next ? `readChapter('${res.navigation.next}', '${comicSlug}')` : ''}" class="text-white hover:text-amber-500 ${!res.navigation.next ? 'opacity-30' : ''}"><i class="fa fa-chevron-right text-lg"></i></button>
                </div>
            </div>
            
             <button onclick="window.scrollTo(0,0)" class="fixed bottom-24 right-5 bg-amber-500 w-10 h-10 rounded-full flex items-center justify-center text-black shadow-lg z-50 opacity-80 hover:opacity-100"><i class="fa fa-arrow-up"></i></button>
        </div>
    `;

    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');
    window.scrollTo(0,0);
}

function toggleReaderUI() {
    document.getElementById('reader-top').classList.toggle('-translate-y-full');
    document.getElementById('reader-bottom').classList.toggle('translate-y-full');
}

// --- FUNGSI PENDUKUNG LAIN (SEARCH, HISTORY, DLL) ---

function handleSearch(e) { if(e.key === 'Enter') applyAdvancedFilter(); }
function toggleFilter() { filterPanel.classList.toggle('hidden'); if(document.getElementById('filter-genre').options.length <= 1) loadGenres(); }
async function applyAdvancedFilter() {
    const query = document.getElementById('search-input').value;
    const genre = document.getElementById('filter-genre').value;
    filterPanel.classList.add('hidden'); setLoading();
    if (query) { const d = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`); renderGrid(d, `Search: ${query}`); return; }
    if (genre) { showGenre(genre); return; }
    showOngoing();
}
async function loadGenres() {
    const data = await fetchAPI(`${API_BASE}/genres`);
    if(data && data.data) {
        const sel = document.getElementById('filter-genre');
        sel.innerHTML = '<option value="">Pilih Genre</option>';
        data.data.sort((a,b)=>a.title.localeCompare(b.title)).forEach(g => {
            const opt = document.createElement('option'); opt.value = g.slug; opt.text = g.title; sel.appendChild(opt);
        });
    }
}
function renderGrid(data, title) {
    if(!data || !data.data || data.data.length===0) { contentArea.innerHTML="<div class='py-20 text-center'>Kosong.</div>"; return; }
    contentArea.innerHTML = `
    <div class="container mx-auto px-4 pt-6">
        <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">${title}</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            ${data.data.map(i => `
                <div class="group cursor-pointer relative" onclick="showDetail('${i.slug}')">
                    <div class="aspect-[3/4] rounded-xl overflow-hidden mb-2 card-hover border border-white/5">
                        <img src="${i.image}" class="w-full h-full object-cover">
                        <span class="type-badge ${getTypeClass(i.type)}">${i.type||'UP'}</span>
                    </div>
                    <h3 class="text-xs font-bold line-clamp-2 text-gray-200 group-hover:text-amber-500">${i.title}</h3>
                </div>
            `).join('')}
        </div>
         <div class="mt-8 flex justify-center gap-4">
            ${data.pagination?.currentPage > 1 ? `<button onclick="alert('Fitur prev page simpel')" class="glass px-4 py-2 rounded">Prev</button>` : ''}
            ${data.pagination?.hasNextPage ? `<button onclick="alert('Fitur next page simpel')" class="glass px-4 py-2 rounded">Next</button>` : ''}
        </div>
    </div>`;
    window.scrollTo(0,0);
}

// Shortcut Navigasi
async function showOngoing() { setLoading(); const d = await fetchAPI(`${API_BASE}/list?status=Ongoing&orderby=popular&page=1`); renderGrid(d, "Ongoing Popular"); }
async function showCompleted() { setLoading(); const d = await fetchAPI(`${API_BASE}/list?status=Completed&orderby=popular&page=1`); renderGrid(d, "Completed Popular"); }
async function showGenre(g) { setLoading(); const d = await fetchAPI(`${API_BASE}/genre/${g}/1`); renderGrid(d, `Genre: ${g}`); }

// Storage
function saveHistory(slug, title, image, chSlug, chTitle) {
    let h = JSON.parse(localStorage.getItem('fmc_history')||'[]');
    h = h.filter(x=>x.slug!==slug);
    h.unshift({slug, title, image, lastChapterSlug:chSlug});
    if(h.length>50) h.pop();
    localStorage.setItem('fmc_history', JSON.stringify(h));
}
function showHistory() {
    updateURL('/history'); resetNavs();
    renderGrid({data:JSON.parse(localStorage.getItem('fmc_history')||'[]')}, "Riwayat Baca");
}
function toggleBookmark(slug, title, image) {
    let b = JSON.parse(localStorage.getItem('fmc_bookmarks')||'[]');
    const i = b.findIndex(x=>x.slug===slug);
    if(i>-1) b.splice(i,1); else b.push({slug, title, image});
    localStorage.setItem('fmc_bookmarks', JSON.stringify(b));
    checkBookmarkStatus(slug);
}
function checkBookmarkStatus(slug) {
    const btn = document.getElementById('btn-bookmark');
    if(btn) {
        const exists = JSON.parse(localStorage.getItem('fmc_bookmarks')||'[]').some(x=>x.slug===slug);
        btn.innerHTML = exists ? "Tersimpan" : "Simpan";
        if(exists) btn.classList.add('text-amber-500'); else btn.classList.remove('text-amber-500');
    }
}
function showBookmarks() {
    updateURL('/bookmarks'); resetNavs();
    renderGrid({data:JSON.parse(localStorage.getItem('fmc_bookmarks')||'[]')}, "Koleksi");
}

// Init
async function init() {
    const p = window.location.pathname;
    if(p.startsWith('/series/')) showDetail(p.split('/')[2], false);
    else if(p.startsWith('/chapter/')) readChapter(p.split('/')[2], null, false);
    else if(p === '/ongoing') showOngoing();
    else if(p === '/history') showHistory();
    else showHome(false);
    loadGenres();
}
window.addEventListener('popstate', init);
document.addEventListener('DOMContentLoaded', init);
