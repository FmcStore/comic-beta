/* script.js - Lite Version (No Blocking Loading) */

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
    contentArea.innerHTML = `<div class="text-center py-40 text-red-500 font-bold">Gagal memuat konten. Coba refresh.</div>`;
}

async function fetchAPI(url) {
    // Progress bar visual saja, tidak blocking
    if(progressBar) progressBar.style.width = "70%"; 
    try {
        const response = await fetch(API_PROXY + encodeURIComponent(url));
        const data = await response.json();
        if(progressBar) {
            progressBar.style.width = "100%";
            setTimeout(() => progressBar.style.width = "0%", 200);
        }
        if (data.success) return data.result?.content || data.result || data;
        return null;
    } catch (e) { 
        if(progressBar) progressBar.style.width = "0%";
        return null; 
    }
}

function toggleFilter() {
    filterPanel.classList.toggle('hidden');
    const genreSelect = document.getElementById('filter-genre');
    if (genreSelect && genreSelect.options.length <= 1) loadGenres();
}

function resetNavs() {
    mainNav.classList.remove('-translate-y-full');
    mobileNav.classList.remove('translate-y-full');
    filterPanel.classList.add('hidden');
    clearInterval(heroInterval);
    document.body.style.overflow = "auto"; // Pastikan bisa scroll lagi
}

function setLoading() {
    // Loading indicator sederhana (teks saja, bukan skeleton berat)
    contentArea.innerHTML = `<div class="flex justify-center py-40"><div class="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-500"></div></div>`;
}

// --- HOME & LIST ---

async function showHome(push = true) {
    if (push) updateURL('/'); 
    resetNavs();
    setLoading();
    
    const data = await fetchAPI(`${API_BASE}/home`);
    if(!data || !data.data) { redirectTo404(); return; }

    const hot = data.data.hotUpdates || [];
    const latest = data.data.latestReleases || [];

    // Hero Slider
    const heroes = hot.slice(0, 5); 
    const heroHTML = `
        <div class="hero-wrapper mb-8">
            ${heroes.map((item, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}" id="slide-${index}">
                    <div class="absolute inset-0 bg-cover bg-center blur-xl opacity-40" style="background-image: url('${item.image}');"></div>
                    <div class="absolute inset-0 bg-black/50"></div>
                    <div class="absolute inset-0 flex items-center justify-center md:justify-end md:pr-20">
                         <img src="${item.image}" class="h-full object-contain opacity-80 md:opacity-100">
                    </div>
                    <div class="hero-content container mx-auto px-4 pb-12">
                        <span class="text-amber-500 font-bold text-xs uppercase tracking-wider mb-2 block">Featured #${index+1}</span>
                        <h1 class="text-2xl md:text-5xl font-extrabold mb-4 leading-tight line-clamp-2 text-white shadow-black drop-shadow-md">${item.title}</h1>
                        <button onclick="showDetail('${item.slug}')" class="amber-gradient text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition">Baca Sekarang</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Latest Grid
    const latestHTML = `
        <section class="container mx-auto px-4 pb-10">
            <h2 class="text-xl font-bold mb-6 border-l-4 border-amber-500 pl-4">Rilis Terbaru</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                ${latest.map(item => `
                    <div class="cursor-pointer group" onclick="showDetail('${item.slug}')">
                        <div class="relative rounded-xl overflow-hidden aspect-[3/4] mb-3 border border-white/5 card-hover">
                            <span class="type-badge ${getTypeClass(item.type)}">${item.type || 'UP'}</span>
                            <img src="${item.image}" loading="lazy" class="w-full h-full object-cover">
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

// Logic Slider Sederhana
let slideIndex = 0;
function initSlider(total) {
    if (total <= 1) return;
    clearInterval(heroInterval);
    const showSlide = (n) => {
        const slides = document.querySelectorAll('.hero-slide');
        slideIndex = (n + total) % total;
        slides.forEach(s => s.classList.remove('active'));
        if(slides[slideIndex]) slides[slideIndex].classList.add('active');
    };
    heroInterval = setInterval(() => { showSlide(slideIndex + 1); }, 4000);
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

// --- DETAIL PAGE ---

async function showDetail(idOrSlug, push = true) {
    let slug = idOrSlug;
    setLoading(); // Loading simple

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
            <img src="${res.image}" class="w-full h-full object-cover blur-2xl opacity-20">
            <div class="absolute inset-0 bg-gradient-to-b from-[#0b0b0f]/60 via-[#0b0b0f]/90 to-[#0b0b0f]"></div>
        </div>
    `;

    // Info Grid Simple
    const infoGrid = `
        <div class="grid grid-cols-3 gap-2 mb-6 w-full text-center">
             <div class="bg-white/5 p-2 rounded-lg border border-white/5">
                <div class="text-[10px] text-gray-400 uppercase">Rating</div>
                <div class="text-sm font-bold text-amber-500">⭐ ${res.rating}</div>
            </div>
            <div class="bg-white/5 p-2 rounded-lg border border-white/5">
                <div class="text-[10px] text-gray-400 uppercase">Status</div>
                <div class="text-sm font-bold text-green-400">${res.status}</div>
            </div>
            <div class="bg-white/5 p-2 rounded-lg border border-white/5">
                <div class="text-[10px] text-gray-400 uppercase">Type</div>
                <div class="text-sm font-bold text-white">${res.type}</div>
            </div>
        </div>
    `;

    contentArea.innerHTML = `
        ${backdropHTML}
        <div class="container mx-auto px-4 pt-10 pb-20">
            <div class="flex flex-col md:flex-row gap-8 lg:gap-12 animate-fade-in">
                <!-- Cover -->
                <div class="md:w-[260px] flex-shrink-0 mx-auto w-full max-w-[260px]">
                    <img src="${res.image}" class="w-full rounded-xl shadow-2xl border border-white/10">
                    <div class="flex flex-col gap-3 mt-6">
                        <button onclick="${startBtnAction}" class="amber-gradient w-full py-3.5 rounded-xl font-bold text-black flex items-center justify-center gap-2 hover:scale-[1.02] transition shadow-lg">
                            <i class="fa fa-book-open"></i> ${startBtnText}
                        </button>
                        <button onclick="toggleBookmark('${slug}', '${res.title.replace(/'/g, "")}', '${res.image}')" id="btn-bookmark" class="w-full py-3.5 rounded-xl glass font-semibold hover:bg-white/10 transition flex items-center justify-center gap-2">
                            <i class="fa fa-bookmark"></i> Simpan
                        </button>
                    </div>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <h1 class="text-3xl font-extrabold mb-4 leading-tight">${res.title}</h1>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${res.genres ? res.genres.map(g => `<span onclick="showGenre('${g.slug}')" class="cursor-pointer hover:text-amber-500 transition text-gray-400 text-xs px-3 py-1 rounded-full border border-white/10 bg-white/5">${g.title}</span>`).join('') : ''}
                    </div>
                    ${infoGrid}
                    <div class="bg-white/5 rounded-xl p-4 mb-8 border border-white/5">
                        <h3 class="font-bold text-sm mb-2 text-amber-500 uppercase">Sinopsis</h3>
                        <p class="text-gray-300 text-sm leading-relaxed text-justify max-h-40 overflow-y-auto pr-2 custom-scroll">${res.synopsis || "Sinopsis tidak tersedia."}</p>
                    </div>
                    
                    <!-- Chapter List -->
                    <div class="glass rounded-xl border border-white/10 overflow-hidden">
                        <div class="p-3 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <h3 class="font-bold text-sm flex items-center gap-2">Chapter List <span class="bg-amber-500 text-black text-[10px] px-2 rounded-full">${res.chapters.length}</span></h3>
                            <input type="text" id="chapter-search" onkeyup="filterChapters()" placeholder="Cari..." class="bg-black/40 border border-white/10 rounded px-3 py-1 text-xs w-32 focus:border-amber-500 outline-none text-white">
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
            <div onclick="readChapter('${ch.slug}', '${comicSlug}')" class="chapter-item flex justify-between items-center p-3 mb-1 rounded-lg cursor-pointer ${isLastRead ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'bg-transparent'} hover:bg-white/5">
                <span class="text-sm font-medium truncate ${isLastRead ? 'text-amber-500' : 'text-gray-300'}">${ch.title}</span>
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

// --- READER (FIX: LANGSUNG GAMBAR TANPA SKELETON) ---

async function readChapter(chIdOrSlug, comicSlug = null, push = true) {
    let chSlug = chIdOrSlug;
    
    // 1. UI Langsung Render (Optimistic)
    const backAction = comicSlug ? `showDetail('${comicSlug}')` : `showHome()`;
    
    // Layout Reader
    contentArea.innerHTML = `
        <div class="relative min-h-screen bg-[#111] -mx-4 -mt-24">
             <!-- Progress Bar -->
            <div class="read-progress-container"><div class="read-progress-bar" id="read-progress"></div></div>

            <!-- Top Nav -->
            <div id="reader-top" class="fixed top-0 w-full bg-[#0b0b0f]/95 border-b border-white/5 z-[60] p-3 flex justify-between items-center transition-transform duration-300 backdrop-blur-md">
                <div class="flex items-center gap-3">
                    <button onclick="${backAction}" class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-amber-500 hover:text-black transition"><i class="fa fa-arrow-left"></i></button>
                    <h2 class="text-xs font-bold text-white max-w-[200px] truncate" id="reader-title">${chSlug}</h2>
                </div>
                <button onclick="toggleReaderSettings()" class="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"><i class="fa fa-cog"></i></button>
                 <!-- Settings -->
                <div id="reader-settings-menu" class="reader-settings">
                    <button onclick="setReaderMode('fit')" class="text-xs text-left p-2 rounded hover:bg-white/10"><i class="fa fa-arrows-left-right-to-line"></i> Fit Width</button>
                    <button onclick="setReaderMode('full')" class="text-xs text-left p-2 rounded hover:bg-white/10"><i class="fa fa-expand"></i> Full Width</button>
                </div>
            </div>

            <!-- Container Gambar (Start Kosong) -->
            <div id="reader-images" class="flex flex-col items-center pt-16 pb-24 min-h-screen w-full max-w-3xl mx-auto bg-[#111]" onclick="toggleReaderUI()">
                <div class="py-40 text-center text-gray-500 animate-pulse text-xs">Memuat data chapter...</div>
            </div>

            <!-- Bottom Nav -->
            <div id="reader-bottom" class="fixed bottom-0 left-0 w-full z-[60] p-4 flex justify-center pointer-events-none transition-transform duration-300 bg-gradient-to-t from-black/90 to-transparent">
                <div class="glass px-4 py-2 rounded-full flex gap-4 items-center shadow-2xl pointer-events-auto bg-[#111]/90 backdrop-blur-xl border border-white/10" id="nav-container">
                    <span class="text-xs text-gray-500">Loading...</span>
                </div>
            </div>
            
            <button onclick="window.scrollTo(0,0)" id="scrollTopBtn" class="scroll-to-top"><i class="fa fa-arrow-up"></i></button>
        </div>
    `;

    mainNav.classList.add('-translate-y-full');
    mobileNav.classList.add('translate-y-full');
    
    // Scroll Listener
    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        document.getElementById("read-progress").style.width = (winScroll / height) * 100 + "%";
        const btn = document.getElementById("scrollTopBtn");
        if (winScroll > 300) btn.classList.add("show"); else btn.classList.remove("show");
    };

    // 2. Fetch Data Background
    if (idOrSlug.length === 36) {
        const mapping = await getSlugFromUuid(idOrSlug);
        if (mapping) chSlug = mapping.slug;
    }

    if (push) {
        const uuid = await getUuidFromSlug(chSlug, 'chapter');
        updateURL(`/chapter/${uuid}`);
    }

    const data = await fetchAPI(`${API_BASE}/chapter/${chSlug}`);
    
    if(!data || !data.data) { 
        document.getElementById('reader-images').innerHTML = `<div class="py-40 text-center text-red-500">Gagal memuat. <button onclick="readChapter('${chSlug}', '${comicSlug}')" class="underline">Reload</button></div>`;
        return; 
    }

    const res = data.data;

    // 3. Update UI
    document.getElementById('reader-title').innerText = res.title || chSlug;

    // Navigasi Bawah
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

    // 4. RENDER GAMBAR (METODE "RAW" - TANPA SKELETON BLOCKING)
    const imgContainer = document.getElementById('reader-images');
    imgContainer.innerHTML = ''; // Clear loading text
    
    res.images.forEach((url) => {
        // Langsung buat IMG tag
        // min-h-[400px] bg-zinc-900: Placeholder warna gelap minimalis biar mata gak sakit
        const img = document.createElement('img');
        img.src = url;
        img.className = "w-full h-auto mb-1 min-h-[300px] bg-[#1a1a1a]"; 
        img.loading = "lazy"; // Biarkan browser yang atur lazy loading
        
        // Error handler simple: Ganti src jadi error placeholder atau coba reload
        img.onerror = function() {
            this.style.minHeight = "100px";
            this.style.border = "1px solid red";
            this.alt = "Gagal memuat gambar (Tap to reload)";
            this.onclick = function() { this.src = url; } // Klik gambar rusak buat reload
        };
        
        // Load handler: Hilangkan min-height biar fit content
        img.onload = function() {
            this.style.minHeight = "auto";
            this.style.backgroundColor = "transparent";
        };

        imgContainer.appendChild(img);
    });

    if(comicSlug) saveHistory(comicSlug, null, null, chSlug, res.title);
}

function toggleReaderUI() {
    document.getElementById('reader-top')?.classList.toggle('ui-hidden-top');
    document.getElementById('reader-bottom')?.classList.toggle('ui-hidden-bottom');
    document.getElementById('reader-settings-menu')?.classList.remove('active');
}

function toggleReaderSettings() {
    document.getElementById('reader-settings-menu')?.classList.toggle('active');
}

function setReaderMode(mode) {
    const container = document.getElementById('reader-images');
    container.style.maxWidth = mode === 'fit' ? '768px' : '100%';
    toggleReaderSettings();
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
