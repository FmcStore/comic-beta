/* script.js - Ultimate Performance & UI Upgrade */

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

// --- Helpers ---
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

function redirectTo404() {
    contentArea.innerHTML = `<div class="text-center py-40 text-red-500 font-bold">Error 404: Halaman tidak ditemukan/Server Error.</div>`;
}

async function fetchAPI(url) {
    progressBar.style.width = "70%"; // Fake progress start
    try {
        const response = await fetch(API_PROXY + encodeURIComponent(url));
        const data = await response.json();
        progressBar.style.width = "100%";
        setTimeout(() => progressBar.style.width = "0%", 300);
        if (data.success) return data.result?.content || data.result || data;
        return null;
    } catch (e) { 
        progressBar.style.width = "0%";
        return null; 
    }
}

function toggleFilter() {
    filterPanel.classList.toggle('hidden');
    if (document.getElementById('filter-genre').options.length <= 1) loadGenres();
}

function resetNavs() {
    mainNav.classList.remove('-translate-y-full');
    mobileNav.classList.remove('translate-y-full');
    mainNav.classList.remove('opacity-0');
    filterPanel.classList.add('hidden');
    clearInterval(heroInterval);
    // Kembalikan scroll ke normal jika keluar dari reader
    document.body.style.overflow = "auto";
}

function setLoading() {
    // Loading skeleton minimalis
    contentArea.innerHTML = `
    <div class="container mx-auto px-4 pt-10 animate-pulse">
        <div class="h-64 bg-zinc-800 rounded-xl mb-6 w-full md:w-1/3 mx-auto"></div>
        <div class="h-8 bg-zinc-800 rounded mb-4 w-3/4 mx-auto"></div>
        <div class="h-4 bg-zinc-800 rounded mb-2 w-full mx-auto"></div>
        <div class="h-4 bg-zinc-800 rounded mb-2 w-5/6 mx-auto"></div>
    </div>`;
}

// --- HOME & LIST (Sama seperti sebelumnya, Optimized) ---

async function showHome(push = true) {
    if (push) updateURL('/'); 
    resetNavs();
    setLoading();
    
    const data = await fetchAPI(`${API_BASE}/home`);
    if(!data || !data.data) { redirectTo404(); return; }

    const hot = data.data.hotUpdates || [];
    const latest = data.data.latestReleases || [];
    const projects = data.data.projectUpdates || [];

    // Hero Slider
    const heroes = hot.slice(0, 5); 
    const heroHTML = `
        <div class="hero-wrapper mb-8">
            ${heroes.map((item, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                    <div class="absolute inset-0 bg-cover bg-center blur-2xl opacity-50 scale-110" style="background-image: url('${item.image}');"></div>
                    <div class="absolute inset-0 bg-black/40"></div>
                    <div class="absolute inset-0 flex items-center justify-center md:justify-end md:pr-20 pointer-events-none">
                         <img src="${item.image}" class="h-full w-full object-cover md:object-contain md:w-auto opacity-60 md:opacity-100 mask-image-b md:mask-none">
                    </div>
                    <div class="hero-content container mx-auto px-4 pb-12 md:pb-20">
                        <span class="inline-block px-3 py-1 mb-3 text-[10px] font-bold tracking-wider text-black bg-amber-500 rounded-full w-fit uppercase shadow-lg shadow-amber-500/50">Featured #${index + 1}</span>
                        <h1 class="text-3xl md:text-5xl font-extrabold mb-2 leading-tight drop-shadow-lg max-w-2xl line-clamp-2">${item.title}</h1>
                        <button onclick="showDetail('${item.slug}')" class="amber-gradient text-black px-8 py-3 rounded-xl font-bold hover:scale-105 transition shadow-lg shadow-amber-500/20 pointer-events-auto mt-4">Baca Sekarang</button>
                    </div>
                </div>
            `).join('')}
            <div class="absolute bottom-6 right-6 md:right-20 flex gap-2 z-20">
                ${heroes.map((_, i) => `<div class="w-2 h-2 rounded-full bg-white/30 cursor-pointer slider-dot ${i===0?'bg-amber-500 w-6':''}" onclick="changeSlide(${i})"></div>`).join('')}
            </div>
        </div>
    `;

    // Latest Update Grid
    const latestHTML = `
        <section class="container mx-auto px-4 pb-10">
            <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${latest.map(item => `
                    <div class="cursor-pointer group" onclick="showDetail('${item.slug}')">
                        <div class="relative rounded-xl overflow-hidden aspect-[3/4] mb-3 border border-white/5 card-hover">
                            <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'UP'}</span>
                            <img src="${item.image}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                            <div class="absolute bottom-0 w-full p-2 bg-gradient-to-t from-black/90 to-transparent text-right">
                                <span class="text-[10px] text-gray-300">${item.chapters[0]?.time || 'New'}</span>
                            </div>
                        </div>
                        <h3 class="text-xs font-bold line-clamp-2 h-8 group-hover:text-amber-500 transition">${item.title}</h3>
                        <span class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded mt-1 inline-block">${item.chapters[0]?.title || 'Ch.?'}</span>
                    </div>
                `).join('')}
            </div>
            <div class="mt-8 flex justify-center"><button onclick="showOngoing()" class="glass px-6 py-2 rounded-full text-sm hover:bg-white/10">Lihat Semua</button></div>
        </section>
    `;

    contentArea.innerHTML = `<div class="-mt-24 md:-mt-24">${heroHTML}${latestHTML}</div>`;
    initSlider(heroes.length);
    window.scrollTo(0,0);
}

// Logic Slider
let slideIndex = 0;
function initSlider(total) {
    if (total <= 1) return;
    clearInterval(heroInterval);
    
    const showSlide = (n) => {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.slider-dot');
        slideIndex = (n + total) % total;
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => { d.classList.remove('bg-amber-500', 'w-6'); d.classList.add('bg-white/30'); });
        if(slides[slideIndex]) slides[slideIndex].classList.add('active');
        if(dots[slideIndex]) { dots[slideIndex].classList.remove('bg-white/30'); dots[slideIndex].classList.add('bg-amber-500', 'w-6'); }
    };
    window.changeSlide = (n) => { clearInterval(heroInterval); showSlide(n); startTimer(); };
    const startTimer = () => { heroInterval = setInterval(() => { showSlide(slideIndex + 1); }, 5000); };
    startTimer();
}

async function loadGenres() {
    const data = await fetchAPI(`${API_BASE}/genres`);
    if(data && data.data) {
        const select = document.getElementById('filter-genre');
        const sorted = data.data.sort((a, b) => a.title.localeCompare(b.title));
        select.innerHTML = '<option value="">Pilih Genre</option>';
        sorted.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.slug; opt.text = g.title; select.appendChild(opt);
        });
    }
}

async function applyAdvancedFilter() {
    const query = document.getElementById('search-input').value;
    const genre = document.getElementById('filter-genre').value;
    filterPanel.classList.add('hidden');
    setLoading();
    if (query) {
        const data = await fetchAPI(`${API_BASE}/search/${encodeURIComponent(query)}/1`);
        renderGrid(data, `Search: "${query}"`, null); return;
    }
    if (genre) { showGenre(genre, 1); return; }
    showOngoing();
}

function renderGrid(data, title, funcName, extraArg = null) {
    const list = data?.data || [];
    if(list.length === 0) { contentArea.innerHTML = `<div class="text-center py-40 text-gray-500">Kosong.</div>`; return; }
    
    let paginationHTML = '';
    if (data.pagination && funcName) {
        const current = data.pagination.currentPage;
        const argStr = extraArg ? `'${extraArg}', ` : '';
        paginationHTML = `
            <div class="mt-10 flex justify-center gap-4">
                ${current > 1 ? `<button onclick="${funcName}(${argStr}${current - 1})" class="glass px-4 py-2 rounded">Prev</button>` : ''}
                <span class="bg-amber-500 text-black px-4 py-2 rounded font-bold">${current}</span>
                ${data.pagination.hasNextPage ? `<button onclick="${funcName}(${argStr}${current + 1})" class="glass px-4 py-2 rounded">Next</button>` : ''}
            </div>`;
    }

    contentArea.innerHTML = `
        <div class="container mx-auto px-4 pt-4">
            <h2 class="text-2xl font-bold mb-6 border-l-4 border-amber-500 pl-4">${title}</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${list.map(item => `
                    <div class="bg-zinc-900/40 rounded-xl overflow-hidden border border-white/5 card-hover cursor-pointer group" onclick="showDetail('${item.slug}')">
                        <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'Comic'}</span>
                        <div class="relative aspect-[3/4]">
                            <img src="${item.image}" class="w-full h-full object-cover group-hover:scale-110 transition duration-500">
                        </div>
                        <div class="p-3 text-center">
                            <h3 class="text-xs font-bold truncate group-hover:text-amber-500 transition">${item.title}</h3>
                            <p class="text-[10px] text-amber-500 mt-1">${item.latestChapter || 'Baca'}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            ${paginationHTML}
        </div>`;
    window.scrollTo(0,0);
}

async function showOngoing(page=1) { updateURL('/ongoing'); resetNavs(); setLoading(); const d = await fetchAPI(`${API_BASE}/list?status=Ongoing&orderby=popular&page=${page}`); renderGrid(d,"Ongoing", "showOngoing"); }
async function showCompleted(page=1) { updateURL('/completed'); resetNavs(); setLoading(); const d = await fetchAPI(`${API_BASE}/list?status=Completed&orderby=popular&page=${page}`); renderGrid(d,"Completed", "showCompleted"); }
async function showGenre(slug, page=1) { resetNavs(); setLoading(); const d = await fetchAPI(`${API_BASE}/genre/${slug}/${page}`); renderGrid(d, `Genre: ${slug}`, "showGenre", slug); }

// --- DETAIL PAGE (UPGRADED) ---

async function showDetail(idOrSlug, push = true) {
    let slug = idOrSlug;
    setLoading();

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
    if(!data || !data.data) { redirectTo404(); return; }

    const res = data.data;
    currentChapterList = res.chapters;

    const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const savedItem = history.find(h => h.slug === slug);
    const lastCh = savedItem ? savedItem.lastChapterSlug : null;
    const startBtnText = lastCh ? `Lanjut: ${savedItem.lastChapterTitle.replace(res.title, '').trim()}` : "Mulai Baca Chapter 1";
    const startBtnAction = lastCh ? `readChapter('${lastCh}', '${slug}')` : (res.chapters.length > 0 ? `readChapter('${res.chapters[res.chapters.length-1].slug}', '${slug}')` : "");

    // Backdrop Image
    const backdropHTML = `
        <div class="fixed top-0 left-0 w-full h-[60vh] -z-10 pointer-events-none overflow-hidden">
            <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20 mask-image-b">
            <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/60 via-[#0b0b0f]/90 to-[#0b0b0f]"></div>
        </div>
    `;

    // Metadata Grid (UPGRADE)
    const infoGrid = `
        <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6 w-full">
             <div class="info-grid-item">
                <span class="info-label">Rating</span>
                <span class="info-value text-amber-500">⭐ ${res.rating}</span>
            </div>
            <div class="info-grid-item">
                <span class="info-label">Status</span>
                <span class="info-value text-green-400">${res.status}</span>
            </div>
            <div class="info-grid-item">
                <span class="info-label">Type</span>
                <span class="info-value">${res.type}</span>
            </div>
             <div class="info-grid-item hidden sm:flex">
                <span class="info-label">Author</span>
                <span class="info-value truncate max-w-[80px]">${res.author || '-'}</span>
            </div>
        </div>
    `;

    contentArea.innerHTML = `
        ${backdropHTML}
        <div class="container mx-auto px-4 pt-10 pb-20">
            <div class="flex flex-col md:flex-row gap-8 lg:gap-12 animate-fade-in">
                
                <!-- Left Column -->
                <div class="md:w-[280px] flex-shrink-0 mx-auto w-full max-w-[280px]">
                    <div class="relative group">
                        <span class="type-badge ${getTypeClass(res.type)} scale-110 top-4 left-4 shadow-lg">${res.type || 'Comic'}</span>
                        <img src="${res.image}" class="w-full rounded-xl shadow-2xl border border-white/10 group-hover:border-amber-500/50 transition duration-300">
                    </div>
                    
                    <div class="flex flex-col gap-3 mt-6">
                        <button onclick="${startBtnAction}" class="amber-gradient w-full py-4 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition shadow-lg shadow-amber-500/20">
                            <i class="fa fa-book-open"></i> ${startBtnText}
                        </button>
                        <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark" class="w-full py-4 rounded-xl glass font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2">
                            <i class="fa fa-bookmark"></i> Simpan
                        </button>
                    </div>
                </div>

                <!-- Right Column -->
                <div class="flex-1 min-w-0">
                    <h1 class="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">${res.title}</h1>
                    
                    <!-- Genre Tags -->
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${res.genres ? res.genres.map(g => `<span onclick="showGenre('${g.slug}')" class="cursor-pointer hover:text-amber-500 transition text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">${g.title}</span>`).join('') : ''}
                    </div>

                    ${infoGrid}

                    <div class="bg-white/5 rounded-xl p-5 mb-8 border border-white/5">
                        <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase">Sinopsis</h3>
                        <p class="text-gray-300 text-sm leading-relaxed text-justify max-h-40 overflow-y-auto pr-2 custom-scroll">${res.synopsis || "Sinopsis tidak tersedia."}</p>
                    </div>
                    
                    <!-- Chapter List Upgrade -->
                    <div class="glass rounded-xl border border-white/10 overflow-hidden">
                        <div class="p-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-3 bg-white/5">
                            <h3 class="font-bold flex items-center gap-2"><i class="fa fa-list-ul text-amber-500"></i> Chapter List <span class="bg-amber-500 text-black text-[10px] font-bold px-2 rounded-full">${res.chapters.length}</span></h3>
                            <div class="relative w-full sm:w-auto">
                                <i class="fa fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs"></i>
                                <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari Chapter..." class="bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs w-full sm:w-64 focus:border-amber-500 outline-none text-white">
                            </div>
                        </div>
                        <div id="chapter-list-container" class="max-h-[500px] overflow-y-auto p-2 bg-black/20 custom-scroll"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    renderChapterList(res.chapters, slug);
    checkBookmarkStatus(slug);
    saveHistory(slug, res.title, res.image);
    window.scrollTo(0,0);
}

function renderChapterList(chapters, comicSlug) {
    const container = document.getElementById('chapter-list-container');
    const history = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    const comicHistory = history.find(h => h.slug === comicSlug);
    const lastReadSlug = comicHistory ? comicHistory.lastChapterSlug : '';

    container.innerHTML = chapters.map(ch => {
        const isLastRead = ch.slug === lastReadSlug;
        return `
            <div onclick="readChapter('${ch.slug}', '${comicSlug}')" class="chapter-item flex justify-between items-center p-3 mb-1 rounded-lg cursor-pointer ${isLastRead ? 'bg-amber-500/10 border-l-amber-500' : 'bg-transparent border-l-transparent'}">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-gray-400 shrink-0">
                        <i class="fa ${isLastRead ? 'fa-book-open text-amber-500' : 'fa-hashtag'} text-xs"></i>
                    </div>
                    <span class="text-sm font-medium truncate ${isLastRead ? 'text-amber-500' : 'text-gray-300'}">${ch.title}</span>
                </div>
                <span class="text-[10px] text-gray-500 whitespace-nowrap">${ch.time || ''}</span>
            </div>
        `;
    }).join('');
}

function filterChapters() {
    const input = document.getElementById('chapter-search').value.toLowerCase();
    const items = document.getElementsByClassName('chapter-item');
    for (let item of items) {
        item.style.display = item.innerText.toLowerCase().includes(input) ? "flex" : "none";
    }
}


// --- READER (SPEED OPTIMIZED & FEATURE RICH) ---

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
    let chSlug = chIdOrSlug;
    
    // 1. LANGSUNG TAMPILKAN UI (Optimistic UI) - Jangan tunggu fetch!
    // Ini yang bikin rasanya "cepat"
    const backAction = comicSlug ? `showDetail('${comicSlug}')` : `showHome()`;
    
    // Setup Struktur Reader Kosong
    const readerShell = `
        <div class="relative min-h-screen bg-[#111] -mx-4 -mt-24">
             <!-- Progress Bar -->
            <div class="read-progress-container"><div class="read-progress-bar" id="read-progress"></div></div>

            <!-- Header Fixed -->
            <div id="reader-top" class="fixed top-0 w-full bg-[#0b0b0f]/95 border-b border-white/5 z-[60] p-3 flex justify-between items-center transition-transform duration-300 backdrop-blur-md">
                <div class="flex items-center gap-3">
                    <button onclick="${backAction}" class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-amber-500 hover:text-black transition"><i class="fa fa-arrow-left"></i></button>
                    <div class="flex flex-col">
                        <span class="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Loading...</span>
                        <h2 class="text-xs font-bold text-white max-w-[150px] truncate" id="reader-title">${chSlug}</h2>
                    </div>
                </div>
                <div class="flex gap-2 relative">
                    <button onclick="toggleReaderSettings()" class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"><i class="fa fa-cog"></i></button>
                    <!-- Settings Menu -->
                    <div id="reader-settings-menu" class="reader-settings">
                        <span class="text-[10px] text-gray-500 uppercase font-bold px-1">Tampilan</span>
                        <button onclick="setReaderMode('fit')" class="text-xs text-left p-2 rounded hover:bg-white/10 flex gap-2 items-center"><i class="fa fa-arrows-left-right-to-line"></i> Fit Width</button>
                        <button onclick="setReaderMode('full')" class="text-xs text-left p-2 rounded hover:bg-white/10 flex gap-2 items-center"><i class="fa fa-expand"></i> Full Width</button>
                    </div>
                </div>
            </div>

            <!-- Image Container (Skeleton Mode Awal) -->
            <div id="reader-images" class="flex flex-col items-center pt-16 pb-24 min-h-screen w-full max-w-3xl mx-auto bg-[#111] cursor-pointer" onclick="toggleReaderUI()">
                <div class="flex flex-col items-center justify-center py-40 gap-4 w-full">
                    <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-500"></div>
                    <p class="text-xs text-gray-500 animate-pulse">Memuat Gambar...</p>
                </div>
            </div>

            <!-- Footer Fixed -->
            <div id="reader-bottom" class="fixed bottom-0 left-0 w-full z-[60] p-4 flex justify-center pointer-events-none transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                <div class="glass px-4 py-2 rounded-full flex gap-4 items-center shadow-2xl pointer-events-auto bg-[#111]/90 backdrop-blur-xl border border-white/10" id="nav-container">
                    <span class="text-xs text-gray-500">Loading Nav...</span>
                </div>
            </div>

            <!-- Scroll To Top -->
            <button onclick="window.scrollTo(0,0)" id="scrollTopBtn" class="scroll-to-top"><i class="fa fa-arrow-up"></i></button>
        </div>
    `;

    // Render Shell
    contentArea.innerHTML = readerShell;
    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');
    
    // Scroll Listener for Progress & Top Button
    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        document.getElementById("read-progress").style.width = scrolled + "%";
        
        const btn = document.getElementById("scrollTopBtn");
        if (winScroll > 300) btn.classList.add("show"); else btn.classList.remove("show");
    };

    // 2. FETCH DATA (Background Process)
    if (idOrSlug.length === 36) {
        const mapping = await getSlugFromUuid(idOrSlug);
        if (mapping) chSlug = mapping.slug;
    }

    if (push) {
        const uuid = await getUuidFromSlug(chSlug, 'chapter');
        updateURL(`/chapter/${uuid}`);
    }

    const data = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    
    // Handle Error Fetch
    if(!data || !data.data) { 
        document.getElementById('reader-images').innerHTML = `<div class="py-40 text-center text-red-500 flex flex-col items-center gap-3"><i class="fa fa-triangle-exclamation text-3xl"></i><p>Gagal memuat chapter.</p><button onclick="readChapter('${chSlug}', '${comicSlug}')" class="bg-white/10 px-4 py-2 rounded mt-2">Coba Lagi</button></div>`;
        return; 
    }

    const res = data.data;

    // 3. UPDATE UI DENGAN DATA ASLI
    document.getElementById('reader-title').innerText = res.title || chSlug;
    document.querySelector('#reader-top span').innerText = "Sedang Membaca"; // Hapus loading text

    // Render Navigasi Bawah
    let dropdownHTML = '';
    if (currentChapterList && currentChapterList.length > 0) {
        dropdownHTML = `
            <select onchange="readChapter(this.value, '${comicSlug}')" class="bg-transparent text-white text-xs py-2 outline-none w-24 truncate font-bold text-center appearance-none">
                ${currentChapterList.map(ch => `<option value="${ch.slug}" ${ch.slug === chSlug ? 'selected' : ''} class="bg-black text-gray-300">${ch.title}</option>`).join('')}
            </select>
        `;
    }

    document.getElementById('nav-container').innerHTML = `
        <button onclick="${res.navigation.prev ? `readChapter('${res.navigation.prev}', '${comicSlug}')` : ''}" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 ${!res.navigation.prev ? 'opacity-30' : ''}"><i class="fa fa-chevron-left"></i></button>
        ${dropdownHTML || '<span class="text-xs font-bold text-white">Chapter</span>'}
        <button onclick="${res.navigation.next ? `readChapter('${res.navigation.next}', '${comicSlug}')` : ''}" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 ${!res.navigation.next ? 'opacity-30' : ''}"><i class="fa fa-chevron-right"></i></button>
    `;

    // Render Gambar (Progressive)
    const imgContainer = document.getElementById('reader-images');
    imgContainer.innerHTML = ''; // Hapus spinner loading
    
    res.images.forEach((url, idx) => {
        const wrap = document.createElement('div');
        wrap.className = "w-full relative min-h-[400px] bg-[#0f0f0f] mb-1"; // Min-height penting agar scrollbar muncul dulu
        
        // Skeleton Text
        wrap.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-gray-700 text-xs z-0 skeleton">Page ${idx+1}</div>`;

        const img = new Image();
        img.src = url;
        img.className = "relative z-10 w-full h-auto opacity-0 transition-opacity duration-300";
        img.loading = "lazy";
        
        img.onload = () => {
            img.classList.remove('opacity-0');
            wrap.style.minHeight = 'auto'; // Reset min-height setelah load
            wrap.style.background = 'transparent';
        };
        
        img.onerror = () => {
            wrap.innerHTML = `<div class="py-20 text-center flex flex-col items-center gap-2"><i class="fa fa-image text-gray-600 text-2xl"></i><span class="text-[10px] text-gray-500">Error loading img</span><button onclick="this.parentElement.parentElement.querySelector('img').src='${url}'" class="text-[10px] bg-white/10 px-3 py-1 rounded">Reload</button></div>`;
            wrap.appendChild(img);
        };

        wrap.appendChild(img);
        imgContainer.appendChild(wrap);
    });

    if(comicSlug) saveHistory(comicSlug, null, null, chSlug, res.title);
}

// Reader Settings Functions
function toggleReaderUI() {
    const top = document.getElementById('reader-top');
    const bottom = document.getElementById('reader-bottom');
    if(top) top.classList.toggle('ui-hidden-top');
    if(bottom) bottom.classList.toggle('ui-hidden-bottom');
    // Hide settings if open
    document.getElementById('reader-settings-menu')?.classList.remove('active');
}

function toggleReaderSettings() {
    const menu = document.getElementById('reader-settings-menu');
    if(menu) menu.classList.toggle('active');
}

function setReaderMode(mode) {
    const container = document.getElementById('reader-images');
    if(mode === 'fit') {
        container.style.maxWidth = '768px';
    } else {
        container.style.maxWidth = '100%';
    }
    toggleReaderSettings(); // close menu
}

// --- History & Bookmarks ---
function handleSearch(e) { if(e.key === 'Enter') applyAdvancedFilter(); }
function saveHistory(slug, title, image, chSlug, chTitle) {
    let h = JSON.parse(localStorage.getItem('fmc_history') || '[]');
    h = h.filter(x => x.slug !== slug);
    h.unshift({ slug, title, image, lastChapterSlug: chSlug, lastChapterTitle: chTitle });
    if(h.length > 50) h.pop();
    localStorage.setItem('fmc_history', JSON.stringify(h));
}
function showHistory() {
    updateURL('/history'); resetNavs();
    renderGrid({ data: JSON.parse(localStorage.getItem('fmc_history')||'[]') }, "Riwayat Baca", null);
}
function toggleBookmark(slug, title, image) {
    let b = JSON.parse(localStorage.getItem('fmc_bookmarks') || '[]');
    const i = b.findIndex(x => x.slug === slug);
    if(i > -1) b.splice(i, 1); else b.push({ slug, title, image });
    localStorage.setItem('fmc_bookmarks', JSON.stringify(b));
    checkBookmarkStatus(slug);
}
function checkBookmarkStatus(slug) {
    const btn = document.getElementById('btn-bookmark');
    if(!btn) return;
    const exists = JSON.parse(localStorage.getItem('fmc_bookmarks')||'[]').some(x => x.slug === slug);
    btn.innerHTML = exists ? `<i class="fa fa-check text-amber-500"></i> Tersimpan` : `<i class="fa fa-bookmark"></i> Simpan`;
    if(exists) { btn.classList.add('border-amber-500/50', 'bg-amber-500/10'); btn.classList.remove('glass'); }
    else { btn.classList.remove('border-amber-500/50', 'bg-amber-500/10'); btn.classList.add('glass'); }
}
function showBookmarks() {
    updateURL('/bookmarks'); resetNavs();
    renderGrid({ data: JSON.parse(localStorage.getItem('fmc_bookmarks')||'[]') }, "Koleksi Favorit", null);
}

// --- Init ---
async function handleInitialLoad() {
    const p = window.location.pathname;
    resetNavs();
    if(p === '/404.html') return;
    if(p.startsWith('/series/')) showDetail(p.split('/')[2], false);
    else if(p.startsWith('/chapter/')) readChapter(p.split('/')[2], null, false);
    else if(p === '/ongoing') showOngoing(1);
    else if(p === '/completed') showCompleted(1);
    else if(p === '/history') showHistory();
    else if(p === '/bookmarks') showBookmarks();
    else showHome(false);
}

window.addEventListener('popstate', handleInitialLoad);
document.addEventListener('DOMContentLoaded', () => { loadGenres(); handleInitialLoad(); });
