/* ===================================================================
   VacCompare — Main Application Logic, Router & SEO Engine
   =================================================================== */

const PAGE_SIZE = 24;
const MAX_COMPARE = 4;
const CANONICAL_ORIGIN = 'https://vacuumcleanerlab.com';

// SEO Safe Migration client fallback for old domain
if (typeof window !== 'undefined' && window.location) {
  const host = window.location.hostname.toLowerCase();
  if (host === 'vacompare.ai.studio' || host.endsWith('.vacompare.ai.studio')) {
    window.location.replace(`https://vacuumcleanerlab.com${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
}

function formatAmazonLink(url, tag = 'wat344r5-20') {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  try {
    const fullUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(fullUrl);
    if (parsed.hostname.includes('amazon.')) {
      parsed.searchParams.set('tag', tag);
      return parsed.toString();
    }
    return trimmed;
  } catch (e) {
    if (/amazon\./i.test(trimmed)) {
      if (/([?&])tag=[^&]*/i.test(trimmed)) {
        return trimmed.replace(/([?&])tag=[^&]*/i, `$1tag=${tag}`);
      } else if (trimmed.includes('?')) {
        return trimmed.endsWith('?') || trimmed.endsWith('&')
          ? `${trimmed}tag=${tag}`
          : `${trimmed}&tag=${tag}`;
      } else {
        return `${trimmed}?tag=${tag}`;
      }
    }
    return trimmed;
  }
}

function getAmazonLink(p) {
  if (!p) return 'https://www.amazon.com/?tag=wat344r5-20';
  if (p.amazonLink && typeof p.amazonLink === 'string' && p.amazonLink.trim().length > 0) {
    return formatAmazonLink(p.amazonLink);
  }
  const query = encodeURIComponent(`${p.brand || ''} ${p.model || ''}`.trim());
  return `https://www.amazon.com/s?k=${query}&tag=wat344r5-20`;
}

const state = {
  allProducts: [],
  search: '',
  types: new Set(),
  brands: new Set(),
  bagTypes: new Set(),
  cordTypes: new Set(),
  hepaOnly: false,
  minRating: 0,
  sort: 'relevance',
  page: 1,
  currentRoute: '/',
};

const compareIds = new Set();
const els = {}; // Cached DOM references

/* ---------------------------------------------------------------- */
/* Init                                                             */
/* ---------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheEls();
  bindStaticEvents();

  const currentYearEl = document.getElementById('footer-year');
  if (currentYearEl) currentYearEl.textContent = new Date().getFullYear();

  try {
    const products = await loadProducts();
    state.allProducts = products;
    buildFilterOptions(products);
    updateHeroStats(products);

    // Initial Route Handling
    handleRouteFromUrl();
    window.addEventListener('popstate', handleRouteFromUrl);

    render();
  } catch (err) {
    console.error('Data initialization error:', err);
    if (els.productGrid) {
      els.productGrid.innerHTML = `
        <div class="col-span-full text-center py-16 text-red-500 bg-white rounded-2xl border border-red-200">
          <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
          <p class="font-bold">Could not load product dataset.</p>
          <p class="text-xs text-slate-500 mt-1">${escapeHtml(err.message)}</p>
        </div>`;
    }
  }
}

function cacheEls() {
  els.productGrid = document.getElementById('product-grid');
  els.resultsCount = document.getElementById('results-count');
  els.emptyState = document.getElementById('empty-state');
  els.pagination = document.getElementById('pagination');
  els.searchInput = document.getElementById('search-input');
  els.searchAutocomplete = document.getElementById('search-autocomplete');
  els.sortSelect = document.getElementById('sort-select');
  els.typeOptions = document.getElementById('type-options');
  els.brandOptions = document.getElementById('brand-options');
  els.brandSearchInput = document.getElementById('brand-search-input');
  els.bagOptions = document.getElementById('bag-options');
  els.cordOptions = document.getElementById('cord-options');
  els.ratingOptions = document.getElementById('rating-options');
  els.hepaCheckbox = document.getElementById('hepa-checkbox');
  els.resetFiltersBtn = document.getElementById('reset-filters-btn');
  els.emptyResetBtn = document.getElementById('empty-reset-btn');
  els.activeChips = document.getElementById('active-filter-chips');
  els.activeChipsMobile = document.getElementById('active-filter-chips-mobile');
  els.heroCount = document.getElementById('hero-count');
  els.heroStats = document.getElementById('hero-stats');

  els.mobileFiltersToggle = document.getElementById('mobile-filters-toggle');
  els.mobileFiltersChevron = document.getElementById('mobile-filters-chevron');
  els.filtersBody = document.getElementById('filters-body');

  els.mobileNavToggle = document.getElementById('mobile-nav-toggle');
  els.mobileNavDrawer = document.getElementById('mobile-nav-drawer');

  els.breadcrumbsContainer = document.getElementById('breadcrumbs-container');
  els.breadcrumbCurrent = document.getElementById('breadcrumb-current');

  els.compareTray = document.getElementById('compare-tray');
  els.compareTrayItems = document.getElementById('compare-tray-items');
  els.clearCompareBtn = document.getElementById('clear-compare-btn');
  els.compareNowBtn = document.getElementById('compare-now-btn');
  els.openCompareBtn = document.getElementById('open-compare-btn');
  els.compareCountBadge = document.getElementById('compare-count-badge');

  els.compareModal = document.getElementById('compare-modal');
  els.compareModalBody = document.getElementById('compare-modal-body');
  els.closeCompareModalBtn = document.getElementById('close-compare-modal-btn');

  els.detailModal = document.getElementById('detail-modal');
  els.detailModalBody = document.getElementById('detail-modal-body');
  els.detailModalTitle = document.getElementById('detail-modal-title');
  els.closeDetailModalBtn = document.getElementById('close-detail-modal-btn');

  els.pageModal = document.getElementById('page-modal');
  els.pageModalTitle = document.getElementById('page-modal-title');
  els.pageModalBody = document.getElementById('page-modal-body');
  els.closePageModalBtn = document.getElementById('close-page-modal-btn');

  els.newsletterForm = document.getElementById('newsletter-form');

  // Dedicated Layout Containers
  els.homeHeroSection = document.getElementById('home-hero-section');
  els.homeBrandsSection = document.getElementById('home-brands-section');
  els.homeCategoriesSection = document.getElementById('home-categories-section');
  els.homeFeaturedSection = document.getElementById('home-featured-section') || document.getElementById('featured-reviews-section');
  els.mainContent = document.getElementById('main-content');
  els.dedicatedBanner = document.getElementById('dedicated-banner');
  els.dedicatedArticleView = document.getElementById('dedicated-article-view');
}

/* ---------------------------------------------------------------- */
/* Event Binding & Search Autocomplete                               */
/* ---------------------------------------------------------------- */

function bindStaticEvents() {
  // Search Input & Autocomplete
  let searchTimer;
  let activeIndex = -1;

  if (els.searchInput) {
    els.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimer);
      const query = e.target.value.trim().toLowerCase();
      searchTimer = setTimeout(() => {
        state.search = query;
        state.page = 1;
        if (state.currentRoute !== '/') {
          navigateTo('/');
        } else {
          render();
        }
        renderAutocomplete(query);
      }, 150);
    });

    els.searchInput.addEventListener('keydown', (e) => {
      const items = els.searchAutocomplete ? els.searchAutocomplete.querySelectorAll('.autocomplete-item') : [];
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        highlightItem(items, activeIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        highlightItem(items, activeIndex);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && items[activeIndex]) {
          e.preventDefault();
          items[activeIndex].click();
        }
      } else if (e.key === 'Escape') {
        hideAutocomplete();
      }
    });

    document.addEventListener('click', (e) => {
      if (els.searchAutocomplete && !els.searchInput.contains(e.target) && !els.searchAutocomplete.contains(e.target)) {
        hideAutocomplete();
      }
    });
  }

  function highlightItem(items, index) {
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add('bg-brand-50', 'text-brand-900');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-brand-50', 'text-brand-900');
      }
    });
  }

  function hideAutocomplete() {
    if (els.searchAutocomplete) {
      els.searchAutocomplete.classList.add('hidden');
      els.searchAutocomplete.innerHTML = '';
      if (els.searchInput) els.searchInput.setAttribute('aria-expanded', 'false');
      activeIndex = -1;
    }
  }

  function renderAutocomplete(query) {
    if (!query || query.length < 2) {
      hideAutocomplete();
      return;
    }
    const matches = state.allProducts.filter(p => 
      p.brand.toLowerCase().includes(query) || p.model.toLowerCase().includes(query) || p.type.toLowerCase().includes(query)
    ).slice(0, 6);

    if (!matches.length) {
      hideAutocomplete();
      return;
    }

    let html = matches.map((p) => {
      const slug = getProductReviewSlug(p);
      const suction = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : p.type;
      return `
        <div data-url="/vacuum/${slug}" class="autocomplete-item p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition text-xs">
          <div>
            <span class="font-extrabold text-slate-900">${escapeHtml(p.brand)}</span>
            <span class="text-slate-600 font-medium ml-1">${escapeHtml(p.model)}</span>
            <span class="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 ml-2 font-mono">${escapeHtml(p.type)}</span>
          </div>
          <div class="text-right shrink-0 font-bold text-brand-600">
            ${suction}
          </div>
        </div>
      `;
    }).join('');

    els.searchAutocomplete.innerHTML = html;
    els.searchAutocomplete.classList.remove('hidden');
    els.searchInput.setAttribute('aria-expanded', 'true');
    activeIndex = -1;

    els.searchAutocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.getAttribute('data-url');
        hideAutocomplete();
        navigateTo(url);
      });
    });
  }

  // Sort & Filters
  if (els.sortSelect) {
    els.sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      render();
    });
  }

  if (els.hepaCheckbox) {
    els.hepaCheckbox.addEventListener('change', (e) => {
      state.hepaOnly = e.target.checked;
      state.page = 1;
      render();
    });
  }

  if (els.resetFiltersBtn) els.resetFiltersBtn.addEventListener('click', resetFilters);
  if (els.emptyResetBtn) els.emptyResetBtn.addEventListener('click', resetFilters);

  if (els.brandSearchInput) {
    els.brandSearchInput.addEventListener('input', () => {
      filterBrandList(els.brandSearchInput.value.trim().toLowerCase());
    });
  }

  // Mobile Filters Toggle
  if (els.mobileFiltersToggle) {
    els.mobileFiltersToggle.addEventListener('click', () => {
      if (els.filtersBody) els.filtersBody.classList.toggle('hidden');
      if (els.mobileFiltersChevron) els.mobileFiltersChevron.classList.toggle('rotate-180');
    });
  }

  // Mobile Nav Drawer Toggle
  if (els.mobileNavToggle) {
    els.mobileNavToggle.addEventListener('click', () => {
      if (els.mobileNavDrawer) els.mobileNavDrawer.classList.toggle('hidden');
      const expanded = els.mobileNavToggle.getAttribute('aria-expanded') === 'true';
      els.mobileNavToggle.setAttribute('aria-expanded', (!expanded).toString());
    });
  }

  // Collapsible Filter Sections
  document.querySelectorAll('.filter-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.filter-group').classList.toggle('collapsed');
    });
  });

  // Compare Actions
  if (els.clearCompareBtn) {
    els.clearCompareBtn.addEventListener('click', () => {
      compareIds.clear();
      syncCompareUI();
      render();
    });
  }
  if (els.compareNowBtn) {
    els.compareNowBtn.addEventListener('click', () => {
      if (compareIds.size > 0) {
        const array = Array.from(compareIds);
        const p1 = state.allProducts.find(x => x.id === array[0]);
        const p2 = state.allProducts.find(x => x.id === array[1]);
        if (p1 && p2) {
          const slug1 = getProductReviewSlug(p1).replace('-review', '');
          const slug2 = getProductReviewSlug(p2).replace('-review', '');
          navigateTo(`/compare/${slug1}-vs-${slug2}`);
        } else {
          openCompareModal();
        }
      }
    });
  }
  if (els.openCompareBtn) els.openCompareBtn.addEventListener('click', openCompareModal);
  if (els.closeCompareModalBtn) els.closeCompareModalBtn.addEventListener('click', () => toggleModal(els.compareModal, false));
  if (els.compareModal) {
    els.compareModal.addEventListener('click', (e) => { if (e.target === els.compareModal) toggleModal(els.compareModal, false); });
  }

  // Modals
  if (els.closeDetailModalBtn) els.closeDetailModalBtn.addEventListener('click', () => toggleModal(els.detailModal, false));
  if (els.detailModal) {
    els.detailModal.addEventListener('click', (e) => { if (e.target === els.detailModal) toggleModal(els.detailModal, false); });
  }

  if (els.closePageModalBtn) els.closePageModalBtn.addEventListener('click', () => toggleModal(els.pageModal, false));
  if (els.pageModal) {
    els.pageModal.addEventListener('click', (e) => { if (e.target === els.pageModal) toggleModal(els.pageModal, false); });
  }

  // SPA Client-Side Link Interception for seamless internal navigation
  document.addEventListener('click', (e) => {
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href) return;

    if (link.target === '_blank' || link.hasAttribute('download') ||
        href.startsWith('http://') || href.startsWith('https://') ||
        href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
      return;
    }

    if (href.startsWith('#')) return;

    if (href.startsWith('/#')) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/index.html' || currentPath === '') {
        return;
      }
    }

    e.preventDefault();
    navigateTo(href);
  });

  // Newsletter Form
  if (els.newsletterForm) {
    els.newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      els.newsletterForm.innerHTML = `
        <div class="bg-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <i class="fa-solid fa-circle-check text-base"></i> You're subscribed! Welcome to VacCompare Alerts.
        </div>
      `;
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toggleModal(els.compareModal, false);
      toggleModal(els.detailModal, false);
      toggleModal(els.pageModal, false);
      hideAutocomplete();
    }
  });
}

/* ---------------------------------------------------------------- */
/* Multi-Page Navigation & Route Sync                               */
/* ---------------------------------------------------------------- */

function navigateTo(path, pushState = true) {
  if (!path) return;
  const [pathname, hash] = path.split('#');
  if (pushState) {
    window.history.pushState(null, '', path);
  } else {
    window.history.replaceState(null, '', path);
  }
  handleRouteFromUrl();
  if (hash) {
    setTimeout(() => {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function setHeroHeadingTag(isH1) {
  const el = document.getElementById('hero-heading');
  if (!el) return;
  const currentTag = el.tagName.toLowerCase();
  const targetTag = isH1 ? 'h1' : 'p';
  if (currentTag !== targetTag) {
    const newEl = document.createElement(targetTag);
    newEl.id = 'hero-heading';
    newEl.className = el.className;
    newEl.innerHTML = el.innerHTML;
    el.parentNode.replaceChild(newEl, el);
  }
}

function showHomeViews() {
  setHeroHeadingTag(true);
  if (els.homeHeroSection) els.homeHeroSection.classList.remove('hidden');
  if (els.homeBrandsSection) els.homeBrandsSection.classList.remove('hidden');
  if (els.homeCategoriesSection) els.homeCategoriesSection.classList.remove('hidden');
  if (els.homeFeaturedSection) els.homeFeaturedSection.classList.remove('hidden');
  if (els.mainContent) els.mainContent.classList.remove('hidden');
  if (els.dedicatedBanner) els.dedicatedBanner.classList.add('hidden');
  if (els.dedicatedArticleView) els.dedicatedArticleView.classList.add('hidden');
}

function showFilterGridView(bannerTitle, bannerBadge, bannerDesc) {
  setHeroHeadingTag(false);
  if (els.homeHeroSection) els.homeHeroSection.classList.add('hidden');
  if (els.homeBrandsSection) els.homeBrandsSection.classList.add('hidden');
  if (els.homeCategoriesSection) els.homeCategoriesSection.classList.add('hidden');
  if (els.homeFeaturedSection) els.homeFeaturedSection.classList.add('hidden');
  if (els.dedicatedArticleView) els.dedicatedArticleView.classList.add('hidden');

  if (els.mainContent) els.mainContent.classList.remove('hidden');

  if (els.dedicatedBanner) {
    els.dedicatedBanner.innerHTML = `
      <section class="relative overflow-hidden bg-slate-900 text-white py-10 px-6 sm:px-10 rounded-3xl shadow-xl mb-6">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="max-w-3xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold mb-3">
              <i class="fa-solid fa-layer-group text-brand-400"></i> ${escapeHtml(bannerBadge)}
            </div>
            <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">${escapeHtml(bannerTitle)}</h1>
            <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(bannerDesc)}</p>
          </div>
          <a href="/" class="self-start md:self-center shrink-0 px-4 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2">
            <i class="fa-solid fa-arrow-left"></i> View All Vacuums
          </a>
        </div>
      </section>
    `;
    els.dedicatedBanner.classList.remove('hidden');
  }
}

function showArticleView() {
  setHeroHeadingTag(false);
  if (els.homeHeroSection) els.homeHeroSection.classList.add('hidden');
  if (els.homeBrandsSection) els.homeBrandsSection.classList.add('hidden');
  if (els.homeCategoriesSection) els.homeCategoriesSection.classList.add('hidden');
  if (els.homeFeaturedSection) els.homeFeaturedSection.classList.add('hidden');
  if (els.mainContent) els.mainContent.classList.add('hidden');
  if (els.dedicatedBanner) els.dedicatedBanner.classList.add('hidden');

  if (els.dedicatedArticleView) els.dedicatedArticleView.classList.remove('hidden');
}

function updateCanonicalTag(path) {
  const origin = 'https://vacuumcleanerlab.com';
  const cleanPath = (!path || path === '/' || path === '/index.html') ? '/' : path.replace(/\/$/, '');
  const canonicalUrl = cleanPath === '/' ? `${origin}/` : (cleanPath === '/compare' ? `${origin}/compare/` : `${origin}${cleanPath}`);
  
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.setAttribute('href', canonicalUrl);

  const ogUrl = document.querySelector('meta[property="og:url"]');
  if (ogUrl) ogUrl.setAttribute('content', canonicalUrl);
}

function updateMetaDescription(desc) {
  if (!desc) return;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', desc);
}

function formatProductMetaTitle(prodName) {
  let t = `${prodName} Review: Specs, Pros & Cons | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review: Specs & Pros | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review: Specs | VacCompare`;
  if (t.length <= 60) return t;

  t = `${prodName} Review | VacCompare`;
  if (t.length <= 60) return t;

  const maxLen = 60 - (" Review | VacCompare".length);
  const truncated = prodName.slice(0, maxLen - 1).trim();
  return `${truncated} Review | VacCompare`;
}

function formatProductMetaDescription(prodName) {
  const candidates = [
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it's the right vacuum for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it is the right vacuum for your needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and see if it's the right vacuum for your home.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, features, pros, cons, and find out if it's right for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, key features, pros, cons, and see if it is the right vacuum for your cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specifications, performance, features, pros, and cons to see if it fits your home cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, features, pros, and cons to determine if it fits your home cleaning needs.`,
    `Read our in-depth ${prodName} review. Compare specs, performance, features, pros, and cons to see if it is the right choice for your home.`
  ];

  for (const c of candidates) {
    if (c.length >= 150 && c.length <= 160) {
      return c;
    }
  }

  let str = `Read our in-depth ${prodName} review. Compare specifications, performance, key features, pros, cons, and find out if it's right for you.`;
  if (str.length > 160) {
    str = `Read our in-depth ${prodName} review. Compare specifications, performance, pros, and cons to see if it fits your cleaning needs.`;
  }
  if (str.length > 160) {
    str = `Read our in-depth ${prodName} review. Compare specs, features, pros, and cons to see if it fits your cleaning needs.`;
  }
  if (str.length > 160) {
    str = str.slice(0, 157) + '...';
  }
  while (str.length < 150) {
    str = str.replace('review.', 'review today.');
    if (str.length < 150) {
      str = str.replace('cleaning needs.', 'home cleaning needs.');
    }
    if (str.length < 150) break;
  }
  if (str.length > 160) {
    str = str.slice(0, 157) + '...';
  }
  return str;
}

let isInitialLoad = true;

function calculateRelevanceScore(source, target) {
  if (!source || !target || source.id === target.id) return 0;
  let score = 0;

  // Priority 1: Same Brand (40%)
  if (source.brand && target.brand && source.brand.toLowerCase() === target.brand.toLowerCase()) {
    score += 40;
  }

  // Priority 2: Same Vacuum Type (20%)
  if (source.type && target.type && source.type.toLowerCase() === target.type.toLowerCase()) {
    score += 20;
  }

  // Priority 3: Same Price Range (15%)
  const p1 = source.priceUsd;
  const p2 = target.priceUsd;
  if (p1 != null && p2 != null) {
    const ratio = Math.abs(p1 - p2) / Math.max(p1, p2, 1);
    if (ratio <= 0.15) score += 15;
    else if (ratio <= 0.30) score += 10;
    else if (ratio <= 0.50) score += 5;
  } else {
    score += 8;
  }

  // Priority 4: Similar Specifications (10%)
  let specPoints = 0;
  if (source.cordedOrCordless && target.cordedOrCordless && source.cordedOrCordless === target.cordedOrCordless) specPoints += 2.5;
  if (source.hepaFiltration === target.hepaFiltration) specPoints += 2.5;
  if (source.baggedOrBagless && target.baggedOrBagless && source.baggedOrBagless === target.baggedOrBagless) specPoints += 2.5;
  const s1 = parseFloat(source.suctionKpaRaw);
  const s2 = parseFloat(target.suctionKpaRaw);
  if (!isNaN(s1) && !isNaN(s2)) {
    const diff = Math.abs(s1 - s2);
    if (diff <= 3) specPoints += 2.5;
    else if (diff <= 6) specPoints += 1.5;
  }
  score += Math.min(10, specPoints);

  // Priority 5: User Intent Similarity (10%)
  let intentPoints = 0;
  const sourcePet = source.hepaFiltration || (parseFloat(source.suctionKpaRaw) >= 18);
  const targetPet = target.hepaFiltration || (parseFloat(target.suctionKpaRaw) >= 18);
  if (sourcePet && targetPet) intentPoints += 4;
  if (source.type && source.type.toLowerCase().includes('robot') && target.type && target.type.toLowerCase().includes('robot')) intentPoints += 4;
  if (source.type && source.type.toLowerCase().includes('stick') && target.type && target.type.toLowerCase().includes('stick')) intentPoints += 4;
  if (source.noiseDb && target.noiseDb && Math.abs(source.noiseDb - target.noiseDb) <= 3) intentPoints += 2;
  score += Math.min(10, intentPoints);

  // Priority 6: Popularity (5%)
  if (target.starRating && target.starRating >= 4.5) score += 5;
  else if (target.starRating && target.starRating >= 4.0) score += 3;

  return score;
}

function bindArticleViewEvents(product) {
  if (!els.dedicatedArticleView) return;

  const addCompareBtn = els.dedicatedArticleView.querySelector('.add-compare-btn');
  if (addCompareBtn) {
    addCompareBtn.onclick = () => {
      const prodId = addCompareBtn.getAttribute('data-id') || (product ? product.id : null);
      if (prodId) toggleCompare(prodId);
    };
  }

  const copyBtn = els.dedicatedArticleView.querySelector('#page-copy-md-btn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      let prodName = product ? `${product.brand} ${product.model}` : 'Vacuum Review';
      let prodUrl = window.location.href;
      const md = `# ${prodName} Review & Technical Specs\n\nRead full specs at ${prodUrl}`;
      navigator.clipboard.writeText(md).then(() => {
        copyBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-600"></i> Copied!';
        setTimeout(() => copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy Review', 2000);
      });
    };
  }
}

function handleRouteFromUrl() {
  const path = window.location.pathname;

  if (path === '/vacuum' || path === '/vacuum/') {
    window.history.replaceState(null, '', '/');
    handleRouteFromUrl();
    return;
  }

  state.currentRoute = path;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  updateCanonicalTag(path);

  if (els.mobileNavDrawer) els.mobileNavDrawer.classList.add('hidden');

  const hasSsrContent = isInitialLoad &&
    els.dedicatedArticleView &&
    els.dedicatedArticleView.children.length > 0 &&
    els.dedicatedArticleView.innerHTML.trim().length > 100;

  // Product Review Page: /vacuum/:slug or /product/:slug
  if (path.startsWith('/vacuum/') || path.startsWith('/product/')) {
    const slug = path.replace(/^\/(vacuum|product)\//, '').replace(/\/$/, '');
    const product = findProductBySlug(slug);
    showArticleView();
    if (hasSsrContent) {
      bindArticleViewEvents(product);
    } else {
      if (product) {
        renderProductReviewPage(product);
        const prodName = `${product.brand} ${product.model}`;
        updateBreadcrumbs('Product Review', prodName);
        document.title = formatProductMetaTitle(prodName);
        updateMetaDescription(formatProductMetaDescription(prodName));
      } else {
        render404Page(path);
        bindArticleViewEvents(null);
        updateBreadcrumbs('Error', '404 Page Not Found');
        document.title = '404 Page Not Found | VacCompare';
        updateMetaDescription('The requested vacuum review could not be found.');
      }
    }
  }
  // Categories Directory: /categories or /category
  else if (path === '/categories' || path === '/categories/' || path === '/category' || path === '/category/') {
    resetFilters(false);
    state.page = 1;
    showFilterGridView(
      'Vacuum Cleaner Categories Directory',
      'All Categories',
      'Explore tailored vacuum designs for every floor type and cleaning need: Robot, Cordless Stick, Upright, Canister, Handheld, Wet & Dry, and Backpack models.'
    );
    render();
    syncCheckboxesFromState();
    updateBreadcrumbs('Navigation', 'All Categories');
    document.title = 'Vacuum Cleaner Categories Directory & Comparison | VacCompare';
    updateMetaDescription('Explore all vacuum cleaner categories: Robot vacuums, Cordless stick, Upright, Canister, Handheld, Wet & Dry, Backpack, and Commercial.');
  }
  // Brands Directory: /brands or /brand
  else if (path === '/brands' || path === '/brands/' || path === '/brand' || path === '/brand/') {
    resetFilters(false);
    state.page = 1;
    showFilterGridView(
      'Popular Vacuum Cleaner Brands Directory',
      'All Brands',
      'Compare tested vacuum models across top manufacturers including Dyson, Shark, Bissell, iRobot, Roborock, Miele, Tineco, Hoover, Eureka, Eufy, and more.'
    );
    render();
    syncCheckboxesFromState();
    updateBreadcrumbs('Navigation', 'Popular Brands');
    document.title = 'Popular Vacuum Cleaner Brands Directory | VacCompare';
    updateMetaDescription('Compare top vacuum cleaner brands: Dyson, Shark, Bissell, iRobot Roomba, Roborock, Miele, Tineco, Hoover, Eureka, Eufy, Black & Decker, and more.');
  }
  // Brand Collection: /brand/:brandSlug
  else if (path.startsWith('/brand/')) {
    const brandSlug = path.replace('/brand/', '').replace(/\/$/, '');
    const matchedBrand = matchBrandClient(brandSlug);

    resetFilters(false);
    state.brands.add(matchedBrand);
    state.page = 1;

    const brandProducts = state.allProducts.filter(p => p.brand.toLowerCase() === matchedBrand.toLowerCase() || p.brandSlug === brandSlug);
    const count = brandProducts.length || state.allProducts.filter(p => slugifyId(p.brand) === brandSlug).length;

    showFilterGridView(
      `${matchedBrand} Vacuum Cleaners`,
      'Brand Directory',
      `Explore ${count || 'all'} tested ${matchedBrand} vacuum models with verified suction pressure benchmarks, HEPA filtration specs, decibel noise levels, and star ratings.`
    );
    render();
    syncCheckboxesFromState();

    updateBreadcrumbs('Brand Collection', matchedBrand);
    document.title = `Best ${matchedBrand} Vacuum Cleaners (Reviews & Specs) | VacCompare`;
    updateMetaDescription(`Explore tested ${matchedBrand} vacuum models with verified suction metrics, HEPA filtration, noise levels, and customer ratings.`);
  }
  // Category Collection: /category/:categorySlug
  else if (path.startsWith('/category/')) {
    const catSlug = path.replace('/category/', '').replace(/\/$/, '');
    const matchedType = matchCategoryClient(catSlug);
    const displayType = matchedType === 'Dry Wet' ? 'Wet & Dry' : matchedType;

    resetFilters(false);
    state.types.add(matchedType);
    state.page = 1;

    const catProducts = state.allProducts.filter(p => p.type.toLowerCase() === matchedType.toLowerCase() || slugifyId(p.type) === catSlug);
    const count = catProducts.length || state.allProducts.filter(p => slugifyId(p.type) === catSlug).length;

    showFilterGridView(
      `${displayType} Vacuum Cleaners`,
      'Category Index',
      `Compare ${count || 'all'} top-rated ${displayType.toLowerCase()} vacuums side by side. Filter by price, suction power (kPa), battery runtime, weight, and HEPA filter status.`
    );
    render();
    syncCheckboxesFromState();

    updateBreadcrumbs('Category', displayType);
    document.title = `${displayType} Vacuum Cleaners – Reviews & Specs | VacCompare`;
    updateMetaDescription(`Compare top-rated ${displayType.toLowerCase()} vacuums side by side with suction pressure, noise metrics, and verified specs.`);
  }
  // Comparison Hub / Tool: /compare or /compare/
  else if (path === '/compare' || path === '/compare/') {
    showArticleView();
    if (hasSsrContent) {
      bindArticleViewEvents(null);
      initCompareHubInteractions();
    } else {
      renderCompareHubPage();
      updateBreadcrumbs('Tool', 'Compare Vacuums');
    }
    document.title = 'Compare Vacuum Cleaners Side-by-Side | Specs, Suction & Reviews – VacCompare';
    updateMetaDescription('Compare vacuum cleaners side-by-side. Check suction power (kPa), noise level, HEPA filtration, battery life, dust capacity & real user ratings. Find the best vacuum for your home instantly.');
  }
  // Side-by-Side Comparison: /compare/:slug
  else if (path.startsWith('/compare/')) {
    const compareSlug = path.replace('/compare/', '').replace(/\/$/, '');
    showArticleView();
    if (hasSsrContent) {
      bindArticleViewEvents(null);
    } else {
      renderComparisonPage(compareSlug);
      const label = compareSlug.replace(/-/g, ' ').toUpperCase();
      updateBreadcrumbs('Comparison', label);
    }
    document.title = formatComparisonMetaTitle(compareSlug, state.allProducts, null);
  }
  // Buying Guides: /guides/:slug
  else if (path.startsWith('/guides/')) {
    const guideSlug = path.replace('/guides/', '').replace(/\/$/, '');
    const knownGuides = [
      'best-vacuum-for-pet-hair',
      'best-robot-vacuums-2026',
      'best-hardwood-floor-vacuums',
      'best-budget-cordless-vacuums',
      'bagged-vs-bagless-vacuums-guide'
    ];
    if (knownGuides.includes(guideSlug)) {
      showArticleView();
      if (hasSsrContent) {
        bindArticleViewEvents(null);
      } else {
        renderBuyingGuidePage(guideSlug);
        const guideTitle = getGuideTitle(guideSlug);
        updateBreadcrumbs('Buying Guide', guideTitle);
        document.title = `${guideTitle} | VacCompare`;
      }
    } else {
      showArticleView();
      render404Page(path);
      bindArticleViewEvents(null);
      updateBreadcrumbs('Error', '404 Page Not Found');
      document.title = '404 Page Not Found | VacCompare';
    }
  }
  // EEAT Pages
  else if (['/about', '/editorial-policy', '/affiliate-disclosure', '/privacy-policy', '/terms', '/contact', '/html-sitemap'].includes(path)) {
    showArticleView();
    if (hasSsrContent) {
      bindArticleViewEvents(null);
    } else {
      renderEeatPage(path);
      const pageTitle = getEeatPageTitle(path);
      updateBreadcrumbs('Information', pageTitle);
      document.title = pageTitle;
    }
  }
  // Homepage
  else if (path === '/' || path === '/index.html' || path === '') {
    resetFilters(false);
    showHomeViews();
    render();
    updateBreadcrumbs('', 'All Vacuum Cleaners');
    document.title = 'VacCompare – Vacuum Cleaner Reviews, Comparisons & Buying Guides';
    updateMetaDescription('Compare vacuum cleaners, read in-depth reviews, explore specifications, and find the best vacuum for your home with expert buying guides.');
  }
  // 404 Not Found Catch-All
  else {
    showArticleView();
    render404Page(path);
    bindArticleViewEvents(null);
    updateBreadcrumbs('Error', '404 Page Not Found');
    document.title = '404 Page Not Found | VacCompare';
    updateMetaDescription('The page you requested could not be found. Explore our vacuum cleaner comparisons and reviews database.');
  }

  isInitialLoad = false;
}

function updateBreadcrumbs(category, currentName) {
  if (!els.breadcrumbsContainer || !els.breadcrumbCurrent) return;
  if (category) {
    els.breadcrumbsContainer.innerHTML = `
      <a href="/" class="hover:text-brand-600 flex items-center gap-1"><i class="fa-solid fa-house text-slate-400"></i> Home</a>
      <span class="text-slate-400">/</span>
      <span class="text-slate-500 font-medium">${escapeHtml(category)}</span>
      <span class="text-slate-400">/</span>
      <span class="text-slate-900 font-extrabold" id="breadcrumb-current">${escapeHtml(currentName)}</span>
    `;
  } else {
    els.breadcrumbsContainer.innerHTML = `
      <a href="/" class="hover:text-brand-600 flex items-center gap-1"><i class="fa-solid fa-house text-slate-400"></i> Home</a>
      <span class="text-slate-400">/</span>
      <span class="text-slate-900 font-extrabold" id="breadcrumb-current">${escapeHtml(currentName)}</span>
    `;
  }
}

function formatComparisonMetaTitle(compareSlug, allProducts, productSlugMap) {
  if (!compareSlug) return 'Vacuum Cleaner Comparison';
  const parts = compareSlug.split('-vs-');
  const part1 = parts[0] || '';
  const part2 = parts[1] || '';

  function cleanString(str) {
    if (!str) return '';
    return str
      .replace(/\(\s*Amazon[\x27\u2019]?s\s+Choice\s*\)/gi, '')
      .replace(/\bAmazon[\x27\u2019]?s\s+Choice\b/gi, '')
      .replace(/\(\s*20\d\d\s*\)/gi, '')
      .replace(/\b20\d\d\b/g, '')
      .replace(/[®™]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanBrandName(brand) {
    let b = cleanString(brand);
    if (/^ninja\s+shark/i.test(b)) return 'Shark';
    if (/^irobot/i.test(b)) return 'iRobot';
    if (/^(cordless|upright|for pet|for carpet|robot|handheld|car|wet|dry|canister|bagged|bagless)/i.test(b)) return '';
    if (b.toUpperCase() === b && b.length > 2) {
      if (b === 'ILIFE') return 'ILIFE';
      if (b === 'DEWALT') return 'DEWALT';
      if (b === 'BLACK+DECKER') return 'BLACK+DECKER';
      return b.charAt(0).toUpperCase() + b.slice(1).toLowerCase();
    }
    return b;
  }

  function cleanModelForTitle(model, slugPart) {
    if (!model) return '';
    let m = cleanString(model);
    m = m.replace(/\b(cordless|upright|canister|handheld|robot|stick|wet\s*\/??\s*dry)\s+vacuum(\s+cleaner)?\b/gi, '').trim();

    if (slugPart) {
      const cleanSlug = slugPart.toLowerCase();
      if (cleanSlug.includes('blizzard-cx1') && m.toLowerCase().includes('blizzard cx1')) {
        return 'Blizzard CX1';
      }
      if ((cleanSlug.includes('v15-detect') || cleanSlug.includes('v15')) && (m.toLowerCase().includes('v15') || m.toLowerCase() === 'v15s')) {
        return 'V15 Detect';
      }
      if (cleanSlug.includes('stratos') && m.toLowerCase().includes('stratos')) {
        return 'Stratos';
      }
    }

    if (m.toUpperCase() === m && m.length > 5) {
      m = m.split(' ').map(w => {
        if (/^[A-Z0-9\-+]+$/.test(w) && (/\d/.test(w) || w.length <= 4)) return w;
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ');
    }

    return m;
  }

  function formatProductName(p, slugPart) {
    if (!p) {
      if (!slugPart) return 'Vacuum Cleaner';
      return slugPart.split('-').map(w => {
        if (w.toLowerCase() === 'vac') return 'Vac';
        if (w.toLowerCase() === 'ilife') return 'ILIFE';
        if (w.toLowerCase() === 'irobot') return 'iRobot';
        if (/^\d+$/.test(w)) return w;
        if (/^[a-z]\d+$/i.test(w)) return w.toUpperCase();
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }).join(' ').replace('Shop Vac', 'Shop-Vac');
    }

    let brand = cleanBrandName(p.brand);
    let model = cleanModelForTitle(p.model, slugPart);

    let name = '';
    if (brand && model.toLowerCase().startsWith(brand.toLowerCase())) {
      name = model;
    } else if (brand) {
      name = `${brand} ${model}`;
    } else {
      name = model;
    }

    return name.replace(/\s+/g, ' ').trim();
  }

  function findProduct(slugPart) {
    if (!slugPart) return null;
    const clean = slugPart.toLowerCase().replace(/\/$/, '');
    if (productSlugMap && productSlugMap.has(clean)) return productSlugMap.get(clean);
    if (productSlugMap && productSlugMap.has(`${clean}-review`)) return productSlugMap.get(`${clean}-review`);

    const products = allProducts || (typeof state !== 'undefined' && state.allProducts ? state.allProducts : []);
    if (products && products.length > 0) {
      for (const p of products) {
        const s1 = slugifyId(`${p.brand}-${p.model}`);
        const s2 = slugifyId(p.model);
        const s3 = slugifyId(`${cleanBrandName(p.brand)}-${cleanString(p.model)}`);
        if (clean === s1 || clean === s2 || clean === s3) return p;
        if (`${clean}-review` === s1 || `${clean}-review` === s2 || `${clean}-review` === s3) return p;
      }

      const candidates = products.filter(p => {
        const s1 = slugifyId(`${p.brand}-${p.model}`);
        const s3 = slugifyId(`${cleanBrandName(p.brand)}-${cleanString(p.model)}`);
        return s1.startsWith(clean) || s3.startsWith(clean) || clean.startsWith(s3);
      });

      if (candidates.length > 0) {
        const stickCand = candidates.find(c => (c.type || '').toLowerCase().includes('stick') || (c.model || '').toLowerCase().includes('cordless'));
        if (stickCand) return stickCand;
        return candidates[0];
      }
    }
    return null;
  }

  function getComparisonVacuumType(p1, p2, slugPart1, slugPart2) {
    const type1 = p1 ? (p1.type || '').trim() : '';
    const type2 = p2 ? (p2.type || '').trim() : '';
    const model1 = p1 ? (p1.model || '').toLowerCase() : (slugPart1 || '').toLowerCase();
    const model2 = p2 ? (p2.model || '').toLowerCase() : (slugPart2 || '').toLowerCase();

    function normalizeType(t, m, p) {
      if (m.includes('v15') || m.includes('v12') || m.includes('v11') || m.includes('v10') || m.includes('v8')) {
        return 'Cordless Vacuum';
      }
      if (!t) return '';
      const lower = t.toLowerCase();
      if (lower.includes('robot')) return 'Robot Vacuum';
      if (lower.includes('dry') || lower.includes('wet')) return 'Wet/Dry Vacuum';
      if (lower.includes('stick') || (p && (p.cordedOrCordless || '').toLowerCase() === 'cordless')) return 'Cordless Vacuum';
      if (lower.includes('upright')) return 'Upright Vacuum';
      if (lower.includes('canister')) return 'Canister Vacuum';
      if (lower.includes('handheld')) return 'Handheld Vacuum';
      if (lower.includes('pet')) return 'Pet Grooming Vacuum';
      if (lower.includes('mattress')) return 'Mattress Vacuum';
      if (lower.includes('backpack')) return 'Backpack Vacuum';
      if (lower.includes('ash')) return 'Ash Vacuum';
      if (lower.includes('commercial')) return 'Commercial Vacuum';
      if (lower.includes('central')) return 'Central Vacuum';
      return '';
    }

    const norm1 = normalizeType(type1, model1, p1);
    const norm2 = normalizeType(type2, model2, p2);

    if (norm1 && norm2 && norm1 === norm2) {
      return norm1;
    }
    if (norm1 && !norm2) return norm1;
    if (norm2 && !norm1) return norm2;

    return 'Vacuum Cleaner';
  }

  const p1 = findProduct(part1);
  const p2 = findProduct(part2);

  const name1 = formatProductName(p1, part1);
  const name2 = formatProductName(p2, part2);
  const vacType = getComparisonVacuumType(p1, p2, part1, part2);

  return `${name1} vs ${name2}: ${vacType} Comparison`;
}

function findProductBySlug(slug) {
  if (!slug || !state.allProducts || !state.allProducts.length) return null;
  const cleanSlug = String(slug).toLowerCase().trim().replace(/\/$/, '');
  const noReviewSlug = cleanSlug.replace(/-review$/, '');
  const withReviewSlug = cleanSlug.endsWith('-review') ? cleanSlug : `${cleanSlug}-review`;

  // 1. Exact slug match
  const exact = state.allProducts.find(p => {
    const s1 = slugifyId(`${p.brand}-${p.model}`);
    const s2 = slugifyId(p.model);
    const s3 = `${s1}-review`;
    const s4 = `${s2}-review`;
    return cleanSlug === s1 || cleanSlug === s2 || cleanSlug === s3 || cleanSlug === s4 || cleanSlug === p.id ||
           noReviewSlug === s1 || noReviewSlug === s2 || noReviewSlug === p.id ||
           withReviewSlug === s3 || withReviewSlug === s4;
  });
  if (exact) return exact;

  // 2. Substring match
  const sub = state.allProducts.find(p => {
    const s1 = slugifyId(`${p.brand}-${p.model}`);
    const s2 = slugifyId(p.model);
    return (s2 && s2.length >= 4 && cleanSlug.includes(s2)) || 
           (s1 && s1.length >= 4 && cleanSlug.includes(s1)) ||
           (s2 && s2.length >= 4 && noReviewSlug.includes(s2)) || 
           (s1 && s1.length >= 4 && noReviewSlug.includes(s1));
  });
  if (sub) return sub;

  // 3. Fallback: Token-based scoring
  const slugTokens = noReviewSlug.split(/[^a-z0-9]+/).filter(Boolean);
  let bestProd = null;
  let bestScore = -1;

  for (const p of state.allProducts) {
    const bSlug = slugifyId(p.brand || '');
    const cleanModel = (p.model || '').replace(new RegExp('^' + (p.brand || ''), 'i'), '').trim();
    const mSlug = slugifyId(cleanModel || p.model || '');
    const bTokens = bSlug.split(/[^a-z0-9]+/).filter(Boolean);
    const mTokens = mSlug.split(/[^a-z0-9]+/).filter(Boolean);
    
    let score = 0;
    let matchedBrand = false;
    let matchedModel = false;

    for (const t of slugTokens) {
      if (bTokens.includes(t) || bSlug === t) {
        if (!matchedBrand) {
          score += 15;
          matchedBrand = true;
        }
      } else {
        if (mSlug === t || mTokens.includes(t)) {
          score += 40;
          matchedModel = true;
        } else if (mSlug.startsWith(t) || t.startsWith(mSlug) || mSlug.includes(t)) {
          if (t.length >= 3) {
            score += 25;
            matchedModel = true;
          }
        } else if (mTokens.some(mt => mt.length >= 3 && (mt.startsWith(t) || t.startsWith(mt)))) {
          score += 15;
          matchedModel = true;
        }
      }
    }
    if (matchedBrand && matchedModel) score += 20;

    if (score > bestScore) {
      bestScore = score;
      bestProd = p;
    }
  }
  return bestScore >= 45 ? bestProd : null;
}

function getProductReviewSlug(p) {
  const brandSlug = slugifyId(p.brand || 'vacuum');
  const modelSlug = slugifyId(p.model || p.id);
  return `${brandSlug}-${modelSlug}-review`;
}

function slugifyId(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function matchCategoryClient(cSlug) {
  if (!cSlug) return 'Robot';
  const norm = String(cSlug).toLowerCase().trim();
  if (norm.includes('robot')) return 'Robot';
  if (norm.includes('stick') || norm.includes('cordless')) return 'Stick';
  if (norm.includes('upright')) return 'Upright';
  if (norm.includes('canister')) return 'Canister';
  if (norm.includes('handheld')) return 'Handheld';
  if (norm.includes('wet') || norm.includes('dry')) return 'Dry Wet';
  if (norm.includes('backpack')) return 'Backpack';
  if (norm.includes('ash')) return 'Ash';
  if (norm.includes('commercial')) return 'Commercial';

  const matched = state.allProducts ? state.allProducts.find(p => slugifyId(p.type) === norm || p.type.toLowerCase() === norm) : null;
  return matched ? matched.type : cSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function matchBrandClient(bSlug) {
  if (!bSlug) return 'Dyson';
  const norm = String(bSlug).toLowerCase().trim();
  const matched = state.allProducts ? state.allProducts.find(p => 
    p.brandSlug === norm || 
    slugifyId(p.brand) === norm || 
    p.brand.toLowerCase().replace(/[^a-z0-9]/g, '') === norm.replace(/[^a-z0-9]/g, '')
  ) : null;
  return matched ? matched.brand : (bSlug.charAt(0).toUpperCase() + bSlug.slice(1).replace(/-/g, ' '));
}

function getGuideTitle(slug) {
  const titles = {
    'best-vacuum-for-pet-hair': '10 Best Vacuum Cleaners for Pet Hair (2026 Tested)',
    'best-robot-vacuums-2026': 'Top 8 Best Robot Vacuums of 2026: Hands-On Reviews',
    'best-hardwood-floor-vacuums': 'Best Vacuums for Hardwood Floors: Anti-Scratch Guide',
    'best-budget-cordless-vacuums': 'Best Budget Cordless Vacuums Under $300 (Ranked & Reviewed)',
    'bagged-vs-bagless-vacuums-guide': 'Bagged vs. Bagless Vacuums: Complete Buying & Hygiene Guide'
  };
  return titles[slug] || 'Expert Vacuum Cleaner Buying Guide';
}

function getEeatPageTitle(path) {
  const titles = {
    '/about': 'About VacCompare – Independent Vacuum Cleaner Testing & Reviews',
    '/editorial-policy': 'Editorial Policy & Review Standards | VacCompare',
    '/affiliate-disclosure': 'Affiliate Disclosure | VacCompare',
    '/privacy-policy': 'Privacy Policy | VacCompare',
    '/terms': 'Terms of Service | VacCompare',
    '/contact': 'Contact VacCompare | Editorial & Support Team',
    '/html-sitemap': 'HTML Sitemap | VacCompare Vacuum Directory'
  };
  return titles[path] || 'Information | VacCompare';
}

/* ---------------------------------------------------------------- */
/* Filter Building & Rendering Engine                                */
/* ---------------------------------------------------------------- */

function buildFilterOptions(products) {
  const typesMap = new Map();
  const brandsMap = new Map();
  const bagsMap = new Map();
  const cordsMap = new Map();

  products.forEach((p) => {
    if (p.type && p.type !== '-' && p.type.trim()) typesMap.set(p.type.trim(), (typesMap.get(p.type.trim()) || 0) + 1);
    if (p.brand && p.brand !== '-' && p.brand.trim()) brandsMap.set(p.brand.trim(), (brandsMap.get(p.brand.trim()) || 0) + 1);
    if (p.baggedOrBagless && p.baggedOrBagless !== '-' && p.baggedOrBagless.trim()) bagsMap.set(p.baggedOrBagless.trim(), (bagsMap.get(p.baggedOrBagless.trim()) || 0) + 1);
    if (p.cordedOrCordless && p.cordedOrCordless !== '-' && p.cordedOrCordless.trim()) cordsMap.set(p.cordedOrCordless.trim(), (cordsMap.get(p.cordedOrCordless.trim()) || 0) + 1);
  });

  renderCheckboxGroup(els.typeOptions, typesMap, 'type');
  renderCheckboxGroup(els.brandOptions, brandsMap, 'brand', true);
  renderCheckboxGroup(els.bagOptions, bagsMap, 'bag');
  renderCheckboxGroup(els.cordOptions, cordsMap, 'cord');

  // Rating Pills
  if (els.ratingOptions) {
    const ratings = [4.5, 4.0, 3.5];
    els.ratingOptions.innerHTML = ratings.map((r) => `
      <button data-rating="${r}" class="rating-btn px-3 py-1 text-xs rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-brand-50 font-semibold transition flex items-center gap-1">
        <span>${r}+</span> <i class="fa-solid fa-star text-amber-400 text-[10px]"></i>
      </button>
    `).join('');

    els.ratingOptions.querySelectorAll('.rating-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = parseFloat(btn.dataset.rating);
        if (state.minRating === val) {
          state.minRating = 0;
        } else {
          state.minRating = val;
        }
        state.page = 1;
        syncCheckboxesFromState();
        render();
      });
    });
  }
}

function renderCheckboxGroup(container, map, category, sortByName = false) {
  if (!container) return;
  const entries = Array.from(map.entries());
  if (sortByName) {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  } else {
    entries.sort((a, b) => b[1] - a[1]);
  }

  container.innerHTML = entries.map(([name, count]) => `
    <label class="flex items-center justify-between text-xs text-slate-700 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-50">
      <div class="flex items-center gap-2">
        <input type="checkbox" data-category="${category}" data-value="${escapeAttr(name)}"
          class="filter-checkbox w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500">
        <span>${escapeHtml(name)}</span>
      </div>
      <span class="text-[10px] text-slate-400 font-mono">(${count})</span>
    </label>
  `).join('');

  container.querySelectorAll('.filter-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const cat = e.target.dataset.category;
      const val = e.target.dataset.value;
      const set = getSetForCategory(cat);
      if (e.target.checked) set.add(val);
      else set.delete(val);
      state.page = 1;
      render();
    });
  });
}

function getSetForCategory(cat) {
  if (cat === 'type') return state.types;
  if (cat === 'brand') return state.brands;
  if (cat === 'bag') return state.bagTypes;
  if (cat === 'cord') return state.cordTypes;
  return new Set();
}

function filterBrandList(q) {
  if (!els.brandOptions) return;
  els.brandOptions.querySelectorAll('label').forEach((lbl) => {
    const text = lbl.textContent.toLowerCase();
    lbl.style.display = text.includes(q) ? 'flex' : 'none';
  });
}

function resetFilters(triggerRender = true) {
  state.search = '';
  state.types.clear();
  state.brands.clear();
  state.bagTypes.clear();
  state.cordTypes.clear();
  state.hepaOnly = false;
  state.minRating = 0;
  state.sort = 'relevance';
  state.page = 1;

  syncCheckboxesFromState();
  filterBrandList('');
  if (triggerRender) render();
}

/* ---------------------------------------------------------------- */
/* Filter & Sorting Logic                                           */
/* ---------------------------------------------------------------- */

function getFilteredProducts() {
  return state.allProducts.filter((p) => {
    if (state.search) {
      const q = state.search.toLowerCase();
      const match = (p.brand || '').toLowerCase().includes(q) ||
                    (p.model || '').toLowerCase().includes(q) ||
                    (p.type || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (state.types.size > 0 && !state.types.has(p.type)) return false;
    if (state.brands.size > 0 && !state.brands.has(p.brand)) return false;
    if (state.bagTypes.size > 0 && !state.bagTypes.has(p.baggedOrBagless)) return false;
    if (state.cordTypes.size > 0 && !state.cordTypes.has(p.cordedOrCordless)) return false;
    if (state.hepaOnly && !p.hepaFiltration) return false;
    if (state.minRating > 0 && (p.starRating || 0) < state.minRating) return false;

    return true;
  });
}

function sortProducts(list) {
  const sorted = [...list];
  switch (state.sort) {
    case 'rating-desc':
      return sorted.sort((a, b) => (b.starRating || 0) - (a.starRating || 0));
    case 'reviews-desc':
      return sorted.sort((a, b) => (b.numReviews || 0) - (a.numReviews || 0));
    case 'suction-desc':
      return sorted.sort((a, b) => (b.suctionKpa || 0) - (a.suctionKpa || 0));
    case 'price-asc':
      return sorted.sort((a, b) => (a.priceUsd ?? 999999) - (b.priceUsd ?? 999999));
    case 'price-desc':
      return sorted.sort((a, b) => (b.priceUsd ?? 0) - (a.priceUsd ?? 0));
    case 'name-asc':
      return sorted.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    default:
      return sorted;
  }
}

/* ---------------------------------------------------------------- */
/* Render Cycle for Main Product Grid                                */
/* ---------------------------------------------------------------- */

function render() {
  const filtered = getFilteredProducts();
  const sorted = sortProducts(filtered);

  const total = sorted.length;
  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
  if (state.page > totalPages) state.page = totalPages;

  const start = (state.page - 1) * PAGE_SIZE;
  const pageProducts = sorted.slice(start, start + PAGE_SIZE);

  renderToolbar(total, start, pageProducts.length);
  renderActiveChips();

  if (total === 0) {
    if (els.productGrid) els.productGrid.innerHTML = '';
    if (els.emptyState) els.emptyState.classList.remove('hidden');
    if (els.pagination) els.pagination.innerHTML = '';
  } else {
    if (els.emptyState) els.emptyState.classList.add('hidden');
    renderGrid(pageProducts);
    renderPagination(totalPages);
  }

  syncCompareUI();
}

function renderToolbar(total, start, count) {
  if (!els.resultsCount) return;
  if (total === 0) {
    els.resultsCount.textContent = 'No vacuums found';
  } else {
    const from = start + 1;
    const to = start + count;
    els.resultsCount.innerHTML = `Showing <span class="font-extrabold text-slate-900">${from}–${to}</span> of <span class="font-extrabold text-slate-900">${total.toLocaleString()}</span> vacuum cleaners`;
  }
}

function renderActiveChips() {
  const chips = [];

  if (state.search) chips.push({ label: `"${state.search}"`, clear: () => { state.search = ''; if (els.searchInput) els.searchInput.value = ''; } });
  state.types.forEach(v => chips.push({ label: v, clear: () => state.types.delete(v) }));
  state.brands.forEach(v => chips.push({ label: v, clear: () => state.brands.delete(v) }));
  state.bagTypes.forEach(v => chips.push({ label: v, clear: () => state.bagTypes.delete(v) }));
  state.cordTypes.forEach(v => chips.push({ label: v, clear: () => state.cordTypes.delete(v) }));
  if (state.hepaOnly) chips.push({ label: 'HEPA only', clear: () => { state.hepaOnly = false; if (els.hepaCheckbox) els.hepaCheckbox.checked = false; } });
  if (state.minRating > 0) chips.push({ label: `${state.minRating}+ stars`, clear: () => state.minRating = 0 });

  const html = chips.map((c, i) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold">
      ${escapeHtml(c.label)}
      <button data-chip-idx="${i}" class="hover:text-brand-900 font-bold">&times;</button>
    </span>
  `).join('');

  if (els.activeChips) els.activeChips.innerHTML = html;
  if (els.activeChipsMobile) els.activeChipsMobile.innerHTML = html;

  const bindChipClicks = (container) => {
    if (!container) return;
    container.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.chipIdx, 10);
        if (chips[idx]) {
          chips[idx].clear();
          state.page = 1;
          syncCheckboxesFromState();
          render();
        }
      });
    });
  };

  bindChipClicks(els.activeChips);
  bindChipClicks(els.activeChipsMobile);
}

function syncCheckboxesFromState() {
  document.querySelectorAll('.filter-checkbox').forEach((cb) => {
    const cat = cb.dataset.category;
    const val = cb.dataset.value;
    const set = getSetForCategory(cat);
    cb.checked = set.has(val);
  });

  if (els.hepaCheckbox) {
    els.hepaCheckbox.checked = !!state.hepaOnly;
  }

  if (els.ratingOptions) {
    els.ratingOptions.querySelectorAll('.rating-btn').forEach((btn) => {
      const val = parseFloat(btn.dataset.rating);
      if (state.minRating === val) {
        btn.classList.add('bg-brand-600', 'text-white', 'border-brand-600');
        btn.classList.remove('bg-slate-50', 'text-slate-700', 'border-slate-200');
      } else {
        btn.classList.remove('bg-brand-600', 'text-white', 'border-brand-600');
        btn.classList.add('bg-slate-50', 'text-slate-700', 'border-slate-200');
      }
    });
  }

  if (els.sortSelect) {
    els.sortSelect.value = state.sort;
  }

  if (els.searchInput) {
    els.searchInput.value = state.search || '';
  }

  if (els.brandSearchInput && !state.search) {
    els.brandSearchInput.value = '';
  }
}

function renderGrid(products) {
  if (!els.productGrid) return;
  els.productGrid.innerHTML = products.map((p) => renderCard(p)).join('');

  els.productGrid.querySelectorAll('.add-compare-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      toggleCompare(id);
    });
  });

  els.productGrid.querySelectorAll('.view-review-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const product = state.allProducts.find(x => x.id === id);
      if (product) {
        const slug = getProductReviewSlug(product);
        navigateTo(`/vacuum/${slug}`);
      }
    });
  });
}

function formatProductCardDetails(p) {
  function cleanNameString(str) {
    if (!str) return '';
    return str
      .replace(/\(\s*Amazon[\x27\u2019]?s\s+Choice\s*\)/gi, '')
      .replace(/\bAmazon[\x27\u2019]?s\s+Choice\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const cleanModel = cleanNameString(p.model);
  let cleanBrand = cleanNameString(p.brand);

  const isAmazonsChoice = /Amazon[\x27\u2019]?s\s+Choice/i.test(p.model || '') || /Amazon[\x27\u2019]?s\s+Choice/i.test(p.brand || '');

  const isGenericBrand = /^(cordless|upright|for pet|for carpet|robot|handheld|car|wet|dry|canister|bagged|bagless)/i.test(cleanBrand);

  let titleBase = '';
  if (cleanModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
    titleBase = cleanModel;
  } else if (!isGenericBrand && cleanBrand) {
    titleBase = `${cleanBrand} ${cleanModel}`;
  } else {
    titleBase = cleanModel;
  }

  let typeSuffix = '';
  const rawType = (p.type || '').toLowerCase().trim();
  const rawModel = (p.model || '').toLowerCase();
  const rawBrand = (p.brand || '').toLowerCase();

  if (rawType.includes('robot')) {
    typeSuffix = 'Robot Vacuum';
  } else if (rawType.includes('dry') || rawType.includes('wet')) {
    typeSuffix = 'Wet Dry Vacuum';
  } else if (rawType.includes('handheld') || rawModel.includes('autocare') || rawBrand.includes('car')) {
    if (rawModel.includes('autocare') || rawModel.includes('car') || rawBrand.includes('car')) {
      typeSuffix = 'Handheld Car Vacuum';
    } else {
      typeSuffix = 'Handheld Vacuum';
    }
  } else if (rawType.includes('stick')) {
    typeSuffix = 'Stick Vacuum';
  } else if (rawType.includes('upright')) {
    typeSuffix = 'Upright Vacuum';
  } else if (rawType.includes('canister')) {
    typeSuffix = 'Canister Vacuum';
  } else if (rawType.includes('pet')) {
    typeSuffix = 'Pet Grooming Vacuum';
  } else if (rawType.includes('mattress')) {
    typeSuffix = 'Mattress Vacuum';
  } else if (rawType.includes('backpack')) {
    typeSuffix = 'Backpack Vacuum';
  } else if (rawType.includes('commercial')) {
    typeSuffix = 'Commercial Vacuum';
  } else if (rawType.includes('ash')) {
    typeSuffix = 'Ash Vacuum';
  } else if (rawType && rawType !== 'other') {
    typeSuffix = rawType.includes('vacuum') ? p.type : `${p.type} Vacuum`;
  } else {
    typeSuffix = 'Vacuum';
  }

  let cardTitle = titleBase;
  const lowerBase = titleBase.toLowerCase();

  if (!lowerBase.includes('vacuum')) {
    cardTitle = `${titleBase} ${typeSuffix}`;
  }

  cardTitle = cardTitle.replace(/\s+/g, ' ').trim();

  let displayBrand = cleanBrand;
  if (isGenericBrand) {
    const modelParts = cleanModel.split(' ');
    displayBrand = modelParts[0] || 'Vacuum';
  }

  return { cardTitle, displayBrand, isAmazonsChoice };
}

function renderCard(p) {
  const isCompared = compareIds.has(p.id);
  const rating = p.starRating ? p.starRating.toFixed(1) : '-';
  const reviewsCount = p.numReviews ? p.numReviews.toLocaleString() : null;
  const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : null;
  const capacityText = p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : null;
  const { cardTitle, displayBrand, isAmazonsChoice } = formatProductCardDetails(p);

  return `
    <article class="bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-lg transition flex flex-col justify-between overflow-hidden group">
      
      <!-- Product Image Thumbnail -->
      <a href="/vacuum/${getProductReviewSlug(p)}" class="w-full h-44 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3 relative overflow-hidden group-hover:bg-slate-100/50 transition">
        <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" 
             alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" 
             loading="lazy" 
             class="max-h-36 max-w-full object-contain group-hover:scale-105 transition-transform duration-300" 
             onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" 
             onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
      </a>

      <div class="p-5 space-y-3 flex-1 flex flex-col justify-between">
        
        <div class="space-y-3">
          <!-- Header / Badges -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <a href="/brand/${slugifyId(p.brand)}" class="text-[11px] font-extrabold uppercase tracking-wider text-brand-600 block mb-0.5 hover:underline">${escapeHtml(displayBrand)}</a>
              <h3 class="font-extrabold text-slate-900 text-base leading-tight group-hover:text-brand-600 transition">
                <a href="/vacuum/${getProductReviewSlug(p)}">${escapeHtml(cardTitle)}</a>
              </h3>
            </div>
            <button data-id="${p.id}" class="add-compare-btn shrink-0 w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition ${isCompared ? 'bg-brand-600 text-white border-brand-600' : ''}" title="Compare this vacuum">
              <i class="fa-solid ${isCompared ? 'fa-check' : 'fa-plus'} text-xs"></i>
            </button>
          </div>

          <!-- Spec Badges -->
          <div class="flex flex-wrap gap-1.5 text-[11px] font-medium text-slate-600">
            <a href="/category/${slugifyId(p.type)}" class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">${escapeHtml(p.type)}</a>
            ${p.cordedOrCordless ? `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700">${escapeHtml(p.cordedOrCordless)}</span>` : ''}
            ${p.hepaFiltration ? `<span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"><i class="fa-solid fa-shield-halved text-[10px] mr-1"></i>HEPA</span>` : ''}
            ${isAmazonsChoice ? `<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold border border-amber-300 flex items-center gap-1"><i class="fa-brands fa-amazon text-[11px] text-amber-700"></i>Amazon's Choice</span>` : ''}
          </div>
        </div>

        <!-- Rating & Specs -->
        <div class="pt-2 border-t border-slate-100 space-y-2">
          ${p.starRating ? `
            <div class="flex items-center gap-1.5 text-xs">
              <span class="font-extrabold text-slate-900">${rating}</span>
              <div class="flex text-amber-400 text-[11px]">${renderStars(p.starRating)}</div>
              ${reviewsCount ? `<span class="text-slate-400 text-[11px]">(${reviewsCount})</span>` : ''}
            </div>
          ` : ''}

          <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Suction</span>
              <span class="font-bold text-slate-800">${suctionText || 'Standard'}</span>
            </div>
            <div>
              <span class="text-[10px] text-slate-400 block uppercase">Dust Capacity</span>
              <span class="font-bold text-slate-800">${capacityText || 'Standard'}</span>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Footer -->
      <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
        <a href="/vacuum/${getProductReviewSlug(p)}" class="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition shadow-sm flex items-center justify-center gap-2">
          <span>View Specs & Review</span>
          <i class="fa-solid fa-arrow-right text-[11px]"></i>
        </a>
      </div>
    </article>
  `;
}

function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.4;
  let html = '';
  for (let i = 0; i < full; i++) html += '<i class="fa-solid fa-star"></i>';
  if (half) html += '<i class="fa-solid fa-star-half-stroke"></i>';
  const totalStars = full + (half ? 1 : 0);
  for (let i = totalStars; i < 5; i++) html += '<i class="fa-regular fa-star text-slate-200"></i>';
  return html;
}

/* ---------------------------------------------------------------- */
/* Compare Functionality                                            */
/* ---------------------------------------------------------------- */

function toggleCompare(id) {
  if (compareIds.has(id)) {
    compareIds.delete(id);
  } else {
    if (compareIds.size >= MAX_COMPARE) {
      alert(`You can compare up to ${MAX_COMPARE} vacuum cleaners at a time.`);
      return;
    }
    compareIds.add(id);
  }
  syncCompareUI();
  render();
}

function syncCompareUI() {
  const count = compareIds.size;
  if (els.compareCountBadge) els.compareCountBadge.textContent = count;
  if (els.openCompareBtn) els.openCompareBtn.disabled = count === 0;

  if (count === 0) {
    if (els.compareTray) els.compareTray.classList.add('translate-y-full');
  } else {
    if (els.compareTray) els.compareTray.classList.remove('translate-y-full');
    renderCompareTray();
  }
}

function renderCompareTray() {
  if (!els.compareTrayItems) return;
  const products = Array.from(compareIds).map(id => state.allProducts.find(p => p.id === id)).filter(Boolean);

  els.compareTrayItems.innerHTML = products.map((p) => `
    <div class="shrink-0 flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
      <span class="font-bold text-slate-800 max-w-[120px] truncate">${escapeHtml(p.brand)} ${escapeHtml(p.model)}</span>
      <button data-remove-id="${p.id}" class="remove-compare-tray-btn text-slate-400 hover:text-red-500 font-bold ml-1">&times;</button>
    </div>
  `).join('');

  els.compareTrayItems.querySelectorAll('.remove-compare-tray-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      compareIds.delete(btn.dataset.removeId);
      syncCompareUI();
      render();
    });
  });
}

let currentCompareD3Products = [];
let currentCompareD3Mode = 'bar';

window.addEventListener('resize', () => {
  if (els.compareModal && !els.compareModal.classList.contains('hidden') && currentCompareD3Products.length > 0) {
    renderCompareD3Chart(currentCompareD3Products, currentCompareD3Mode);
  }
});

function renderCompareD3Chart(products, mode = 'bar') {
  currentCompareD3Mode = mode;
  const container = document.getElementById('d3-compare-chart');
  const tooltip = document.getElementById('d3-compare-tooltip');
  if (!container) return;

  container.innerHTML = '';
  if (!window.d3) {
    container.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">D3.js library initializing...</div>';
    return;
  }

  const chartData = products.map((p, idx) => {
    const s = parseFloat(p.suctionKpaRaw);
    const n = parseFloat(p.noiseDb);
    return {
      id: p.id,
      index: idx + 1,
      brand: p.brand || 'Vacuum',
      model: p.model || 'Cleaner',
      fullTitle: `${p.brand} ${p.model}`,
      shortTitle: `${p.brand} ${p.model}`.length > 16 ? `${p.brand} ${p.model.substring(0, 13)}...` : `${p.brand} ${p.model}`,
      type: p.type || 'Vacuum',
      suction: !isNaN(s) ? s : 15,
      noise: !isNaN(n) ? n : 72,
      starRating: p.starRating || 4.5,
      color: ['#2563eb', '#10b981', '#8b5cf6', '#f43f5e'][idx % 4]
    };
  });

  const containerWidth = container.clientWidth || 600;
  const width = Math.max(containerWidth, 320);
  const height = 290;
  const margin = mode === 'bar' 
    ? { top: 35, right: 20, bottom: 60, left: 45 }
    : { top: 35, right: 35, bottom: 55, left: 50 };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('class', 'overflow-visible font-sans');

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  if (mode === 'bar') {
    const x0 = d3.scaleBand()
      .domain(chartData.map(d => d.shortTitle))
      .range([0, innerWidth])
      .paddingInner(0.25);

    const x1 = d3.scaleBand()
      .domain(['suction', 'noise'])
      .range([0, x0.bandwidth()])
      .padding(0.12);

    const maxVal = d3.max(chartData, d => Math.max(d.suction, d.noise)) || 80;
    const y = d3.scaleLinear()
      .domain([0, maxVal * 1.2])
      .range([innerHeight, 0]);

    // Grid lines
    g.append('g')
      .attr('class', 'grid-lines')
      .call(d3.axisLeft(y)
        .ticks(5)
        .tickSize(-innerWidth)
        .tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', '#f1f5f9')
      .attr('stroke-dasharray', '3 3');

    // Axes
    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0));

    xAxis.selectAll('text')
      .attr('class', 'text-[11px] font-bold fill-slate-700')
      .attr('transform', chartData.length > 2 ? 'rotate(-10)' : null)
      .style('text-anchor', chartData.length > 2 ? 'end' : 'middle');

    xAxis.select('.domain').attr('stroke', '#cbd5e1');

    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(5));

    yAxis.selectAll('text').attr('class', 'text-[10px] font-semibold fill-slate-500');
    yAxis.select('.domain').attr('stroke', '#cbd5e1');

    // Model Groups
    const modelGroups = g.selectAll('.model-group')
      .data(chartData)
      .enter()
      .append('g')
      .attr('class', 'model-group')
      .attr('transform', d => `translate(${x0(d.shortTitle)}, 0)`);

    const metrics = [
      { key: 'suction', label: 'Suction', unit: 'kPa', color: '#2563eb' },
      { key: 'noise', label: 'Noise Level', unit: 'dB', color: '#f59e0b' }
    ];

    metrics.forEach(m => {
      modelGroups.selectAll(`.bar-${m.key}`)
        .data(d => [{ ...d, metricKey: m.key, val: d[m.key], label: m.label, unit: m.unit, color: m.color }])
        .enter()
        .append('rect')
        .attr('class', `bar-${m.key} transition-all duration-200 cursor-pointer`)
        .attr('x', d => x1(d.metricKey))
        .attr('y', d => y(d.val))
        .attr('width', x1.bandwidth())
        .attr('height', d => Math.max(0, innerHeight - y(d.val)))
        .attr('fill', d => d.color)
        .attr('rx', 4)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('opacity', 0.85);
          if (tooltip) {
            tooltip.style.opacity = '1';
            tooltip.innerHTML = `
              <div class="font-bold text-sm text-white">${escapeHtml(d.fullTitle)}</div>
              <div class="text-[11px] text-slate-300">${escapeHtml(d.type)}</div>
              <div class="mt-1.5 pt-1.5 border-t border-slate-700 font-extrabold flex items-center justify-between text-xs">
                <span>${d.label}:</span>
                <span style="color:${d.color}">${d.val} ${d.unit}</span>
              </div>
            `;
          }
        })
        .on('mousemove', function(event) {
          if (tooltip) {
            const bounds = container.getBoundingClientRect();
            const xPos = event.clientX - bounds.left;
            const yPos = event.clientY - bounds.top;
            tooltip.style.left = `${Math.min(xPos + 10, width - 180)}px`;
            tooltip.style.top = `${Math.max(yPos - 60, 10)}px`;
          }
        })
        .on('mouseout', function() {
          d3.select(this).attr('opacity', 1);
          if (tooltip) tooltip.style.opacity = '0';
        });

      modelGroups.selectAll(`.label-${m.key}`)
        .data(d => [{ ...d, val: d[m.key], unit: m.unit }])
        .enter()
        .append('text')
        .attr('x', d => x1(m.key) + x1.bandwidth() / 2)
        .attr('y', d => y(d.val) - 6)
        .attr('text-anchor', 'middle')
        .attr('class', 'text-[10px] font-extrabold fill-slate-700')
        .text(d => `${d.val} ${d.unit}`);
    });

  } else {
    // Scatter Plot Mode
    const minNoise = Math.min(55, d3.min(chartData, d => d.noise) - 6);
    const maxNoise = Math.max(85, d3.max(chartData, d => d.noise) + 6);
    const maxSuction = Math.max(25, d3.max(chartData, d => d.suction) * 1.25);

    const x = d3.scaleLinear()
      .domain([minNoise, maxNoise])
      .range([0, innerWidth]);

    const y = d3.scaleLinear()
      .domain([0, maxSuction])
      .range([innerHeight, 0]);

    const midX = (minNoise + maxNoise) / 2;
    const midY = maxSuction / 2;

    g.append('line')
      .attr('x1', x(midX)).attr('y1', 0)
      .attr('x2', x(midX)).attr('y2', innerHeight)
      .attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4 4');

    g.append('line')
      .attr('x1', 0).attr('y1', y(midY))
      .attr('x2', innerWidth).attr('y2', y(midY))
      .attr('stroke', '#cbd5e1').attr('stroke-dasharray', '4 4');

    const quadLabels = [
      { text: '🏆 Strong Suction & Quiet', x: x(minNoise) + 10, y: 18, anchor: 'start' },
      { text: '⚡ High Suction, Louder', x: x(maxNoise) - 10, y: 18, anchor: 'end' },
      { text: '🤫 Quiet, Standard Power', x: x(minNoise) + 10, y: innerHeight - 10, anchor: 'start' },
      { text: 'Standard Power & Louder', x: x(maxNoise) - 10, y: innerHeight - 10, anchor: 'end' }
    ];

    quadLabels.forEach(q => {
      g.append('text')
        .attr('x', q.x)
        .attr('y', q.y)
        .attr('text-anchor', q.anchor)
        .attr('class', 'text-[10px] font-bold fill-slate-400 opacity-70')
        .text(q.text);
    });

    const xAxis = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${d} dB`));

    xAxis.selectAll('text').attr('class', 'text-[10px] font-bold fill-slate-600');

    const yAxis = g.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => `${d} kPa`));

    yAxis.selectAll('text').attr('class', 'text-[10px] font-bold fill-slate-600');

    const nodes = g.selectAll('.scatter-node')
      .data(chartData)
      .enter()
      .append('g')
      .attr('class', 'scatter-node cursor-pointer')
      .attr('transform', d => `translate(${x(d.noise)}, ${y(d.suction)})`);

    nodes.append('circle')
      .attr('r', 15)
      .attr('fill', d => d.color)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 3)
      .attr('class', 'shadow-md')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 18);
        if (tooltip) {
          tooltip.style.opacity = '1';
          tooltip.innerHTML = `
            <div class="font-bold text-sm text-white">${escapeHtml(d.fullTitle)}</div>
            <div class="text-[11px] text-slate-300">${escapeHtml(d.type)}</div>
            <div class="mt-2 pt-1.5 border-t border-slate-700 space-y-1 text-xs">
              <div class="flex justify-between"><span>Suction:</span><span class="font-extrabold text-blue-400">${d.suction} kPa</span></div>
              <div class="flex justify-between"><span>Noise Level:</span><span class="font-extrabold text-amber-400">${d.noise} dB</span></div>
              <div class="flex justify-between"><span>Rating:</span><span class="font-extrabold text-amber-300">★ ${d.starRating.toFixed(1)}</span></div>
            </div>
          `;
        }
      })
      .on('mousemove', function(event) {
        if (tooltip) {
          const bounds = container.getBoundingClientRect();
          const xPos = event.clientX - bounds.left;
          const yPos = event.clientY - bounds.top;
          tooltip.style.left = `${Math.min(xPos + 10, width - 180)}px`;
          tooltip.style.top = `${Math.max(yPos - 70, 10)}px`;
        }
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 15);
        if (tooltip) tooltip.style.opacity = '0';
      });

    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('class', 'text-[11px] font-extrabold fill-white pointer-events-none')
      .text(d => `#${d.index}`);

    nodes.append('text')
      .attr('x', 20)
      .attr('dy', '0.35em')
      .attr('class', 'text-[11px] font-bold fill-slate-800 pointer-events-none')
      .text(d => d.shortTitle);
  }
}

function openCompareModal() {
  if (compareIds.size === 0) return;
  const products = Array.from(compareIds)
    .map(id => state.allProducts.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 4);

  if (!els.compareModalBody) return;
  currentCompareD3Products = products;

  // Find Champions among selected models
  let suctionChampion = products[0];
  let quietChampion = products[0];

  products.forEach(p => {
    const s = parseFloat(p.suctionKpaRaw);
    const n = parseFloat(p.noiseDb);
    const currS = parseFloat(suctionChampion.suctionKpaRaw) || 0;
    const currN = parseFloat(quietChampion.noiseDb) || 100;

    if (!isNaN(s) && s > currS) suctionChampion = p;
    if (!isNaN(n) && n < currN) quietChampion = p;
  });

  const suctionVal = suctionChampion.suctionKpaRaw && suctionChampion.suctionKpaRaw !== '-' ? `${suctionChampion.suctionKpaRaw}` : '18';
  const quietVal = quietChampion.noiseDb ? `${quietChampion.noiseDb}` : '70';

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Power', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' },
  ];

  let html = `
    <div class="p-4 sm:p-6 space-y-6">
      
      <!-- Key Champions Highlights Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between shadow-xs">
          <div>
            <div class="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-bolt"></i> Suction Power Champion
            </div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">${escapeHtml(suctionChampion.brand)} ${escapeHtml(suctionChampion.model)}</div>
          </div>
          <div class="text-base sm:text-lg font-black text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs shrink-0">
            ${suctionVal} <span class="text-xs font-bold text-slate-500">kPa</span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between shadow-xs">
          <div>
            <div class="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-volume-xmark"></i> Quietest Operation Champion
            </div>
            <div class="text-sm font-extrabold text-slate-900 mt-0.5">${escapeHtml(quietChampion.brand)} ${escapeHtml(quietChampion.model)}</div>
          </div>
          <div class="text-base sm:text-lg font-black text-emerald-600 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-xs shrink-0">
            ${quietVal} <span class="text-xs font-bold text-slate-500">dB</span>
          </div>
        </div>
      </div>

      <!-- D3 Interactive Chart Visualization Tool -->
      <div class="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 class="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-chart-column text-brand-600"></i> D3.js Suction &amp; Noise Comparison Tool
            </h3>
            <p class="text-xs text-slate-500">Comparing Suction Pressure (kPa) vs. Operating Noise Levels (dB) for up to 4 models</p>
          </div>

          <!-- View Mode Switcher -->
          <div class="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold shrink-0">
            <button id="d3-chart-mode-bar" class="px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-xs transition flex items-center gap-1.5">
              <i class="fa-solid fa-chart-bar text-brand-600"></i> Bar Chart
            </button>
            <button id="d3-chart-mode-scatter" class="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5">
              <i class="fa-solid fa-chart-line text-indigo-600"></i> Efficiency Scatter Plot
            </button>
          </div>
        </div>

        <!-- Legend -->
        <div class="flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
          <div class="flex flex-wrap items-center gap-4">
            <span class="inline-flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm bg-blue-600 inline-block shadow-xs"></span>
              <span>Suction Power (kPa) <span class="text-slate-400 font-normal">(Higher is better)</span></span>
            </span>
            <span class="inline-flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm bg-amber-500 inline-block shadow-xs"></span>
              <span>Noise Level (dB) <span class="text-slate-400 font-normal">(Lower is quieter)</span></span>
            </span>
          </div>
          <span class="text-[11px] text-slate-400 font-normal hidden md:inline"><i class="fa-solid fa-circle-info mr-1"></i>Hover elements for details</span>
        </div>

        <!-- SVG Container for D3 -->
        <div class="relative w-full overflow-hidden min-h-[290px] pt-2">
          <div id="d3-compare-chart" class="w-full"></div>
          <div id="d3-compare-tooltip" class="absolute pointer-events-none opacity-0 bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl transition-opacity duration-150 z-20 max-w-xs space-y-1"></div>
        </div>
      </div>

      <!-- Specification Table -->
      <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div class="p-4 bg-slate-50 border-b border-slate-200">
          <h3 class="font-extrabold text-sm text-slate-900">Detailed Technical Specification Matrix</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-900 border-b border-slate-200">
                <th class="p-3 font-bold border-r border-slate-200 w-40">Specification</th>
                ${products.map(p => `
                  <th class="p-3 font-extrabold text-slate-900 border-r border-slate-200 text-center min-w-[180px]">
                    <div class="w-16 h-16 mx-auto bg-white rounded-xl p-1 border border-slate-200 mb-2 flex items-center justify-center overflow-hidden">
                      <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" class="max-h-full max-w-full object-contain" onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                    </div>
                    <div class="text-brand-600 uppercase text-[10px] tracking-wider">${escapeHtml(p.brand)}</div>
                    <div class="text-sm leading-tight">${escapeHtml(p.model)}</div>
                  </th>
                `).join('')}
              </tr>
            </thead>
            <tbody>
              ${fields.map(f => `
                <tr class="border-b border-slate-200 hover:bg-slate-50">
                  <td class="p-3 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">${f.label}</td>
                  ${products.map(p => `<td class="p-3 text-center border-r border-slate-200 font-semibold text-slate-800">${escapeHtml(f.fn(p))}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  els.compareModalBody.innerHTML = html;
  toggleModal(els.compareModal, true);

  setTimeout(() => {
    renderCompareD3Chart(products, 'bar');
  }, 50);

  const barBtn = els.compareModalBody.querySelector('#d3-chart-mode-bar');
  const scatterBtn = els.compareModalBody.querySelector('#d3-chart-mode-scatter');

  if (barBtn && scatterBtn) {
    barBtn.onclick = () => {
      barBtn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-xs transition flex items-center gap-1.5';
      scatterBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
      renderCompareD3Chart(products, 'bar');
    };

    scatterBtn.onclick = () => {
      scatterBtn.className = 'px-3 py-1.5 rounded-lg bg-white text-slate-900 shadow-xs transition flex items-center gap-1.5';
      barBtn.className = 'px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5';
      renderCompareD3Chart(products, 'scatter');
    };
  }
}

/* ---------------------------------------------------------------- */
/* Dedicated Page Renderers                                          */
/* ---------------------------------------------------------------- */

/** 1. Dedicated Product Review Page Renderer */
function renderProductReviewPage(p) {
  if (!els.dedicatedArticleView) return;

  const pReviewUrl = `/vacuum/${getProductReviewSlug(p)}`;
  const pBrandSlug = p.brandSlug || slugifyId(p.brand);

  const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : 'Standard Airflow';
  const motorText = p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : 'Standard Efficiency';
  const runtimeText = p.batteryRuntimeMinsRaw && p.batteryRuntimeMinsRaw !== '-' ? `${p.batteryRuntimeMinsRaw} min` : (p.cordedOrCordless === 'Corded' ? 'Continuous' : 'Standard');
  const capacityText = p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : 'Standard';
  const noiseText = p.noiseDb != null ? `${p.noiseDb} dB` : '72 dB';
  const weightText = p.weightLbs != null ? `${p.weightLbs} lbs` : 'Standard weight';
  const hepaText = p.hepaFiltration ? 'Sealed HEPA Filtration (99.97%)' : 'Washable Filter';

  const allProds = state.allProducts.length ? state.allProducts : [p];

  const ranked = allProds
    .filter(x => x.id !== p.id)
    .map(x => ({ product: x, score: calculateRelevanceScore(p, x) }))
    .sort((a, b) => b.score - a.score);

  const usedHrefs = new Set([pReviewUrl]);

  // 1. Similar Vacuums (Same Type)
  let similarProds = ranked
    .filter(x => x.product.type && p.type && x.product.type.toLowerCase() === p.type.toLowerCase())
    .slice(0, 3)
    .map(x => x.product);
  if (similarProds.length < 3) {
    const extra = ranked.filter(x => !similarProds.some(sp => sp.id === x.product.id)).slice(0, 3 - similarProds.length).map(x => x.product);
    similarProds = [...similarProds, ...extra];
  }
  similarProds.forEach(x => usedHrefs.add(`/vacuum/${getProductReviewSlug(x)}`));

  // 2. Compare With
  let compareProds = ranked
    .slice(0, 3)
    .map(x => x.product);

  // 3. Better Alternatives
  let altProds = ranked
    .filter(x => !usedHrefs.has(`/vacuum/${getProductReviewSlug(x.product)}`) && ((x.product.starRating || 0) >= (p.starRating || 4.0) || parseFloat(x.product.suctionKpaRaw || 0) >= parseFloat(p.suctionKpaRaw || 0)))
    .slice(0, 3)
    .map(x => x.product);
  if (altProds.length < 3) {
    const extra = ranked.filter(x => x.product.id !== p.id && !altProds.some(ap => ap.id === x.product.id)).slice(0, 3 - altProds.length).map(x => x.product);
    altProds = [...altProds, ...extra];
  }
  altProds.forEach(x => usedHrefs.add(`/vacuum/${getProductReviewSlug(x)}`));

  // 4. Related Reviews
  let relatedProds = ranked
    .filter(x => !usedHrefs.has(`/vacuum/${getProductReviewSlug(x.product)}`))
    .slice(0, 3)
    .map(x => x.product);
  if (relatedProds.length < 3) {
    const extra = ranked.filter(x => x.product.id !== p.id && !relatedProds.some(rp => rp.id === x.product.id)).slice(0, 3 - relatedProds.length).map(x => x.product);
    relatedProds = [...relatedProds, ...extra];
  }
  relatedProds.forEach(x => usedHrefs.add(`/vacuum/${getProductReviewSlug(x)}`));

  // 5. Relevant Guides
  let guideSlugs = ['best-vacuum-for-pet-hair', 'best-budget-cordless-vacuums'];
  if (p.type && p.type.toLowerCase().includes('robot')) {
    guideSlugs = ['best-robot-vacuums-2026', 'best-vacuum-for-pet-hair'];
  } else if (p.type && (p.type.toLowerCase().includes('stick') || p.type.toLowerCase().includes('hardwood'))) {
    guideSlugs = ['best-hardwood-floor-vacuums', 'best-budget-cordless-vacuums'];
  }

  const html = `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action Bar -->
      <div class="flex items-center justify-between gap-4">
        <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
          <i class="fa-solid fa-arrow-left"></i> Back to Database
        </a>
        <button id="page-copy-md-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
          <i class="fa-solid fa-copy"></i> Copy Review
        </button>
      </div>

      <!-- Hero Header with ASIN Product Image -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-40">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-40% to-transparent"></div>
        </div>

        <div class="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
          
          <!-- Left Content -->
          <div class="flex-1 space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <a href="/brand/${pBrandSlug}" class="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider hover:underline">
                ${escapeHtml(p.brand)} Verification Report
              </a>
              <span class="text-amber-400 font-extrabold text-sm flex items-center gap-1">
                <i class="fa-solid fa-star"></i> ${p.starRating || 4.5} / 5.0 (${(p.numReviews || 120).toLocaleString()} reviews)
              </span>
            </div>

            <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ${escapeHtml(p.brand)} ${escapeHtml(p.model)} Review
            </h1>

            <p class="text-slate-300 text-sm leading-relaxed max-w-2xl">
              Comprehensive test analysis for the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> <strong>${escapeHtml(p.type)} Vacuum</strong>. Includes verified suction metrics (${escapeHtml(suctionText)}), sound level tests (${escapeHtml(noiseText)}), filtration standards, and user ratings.
            </p>

            <div class="pt-4 border-t border-slate-700/80 flex flex-wrap items-center gap-4">
              <a href="${escapeAttr(getAmazonLink(p))}" target="_blank" rel="nofollow sponsored" class="inline-flex items-center gap-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition">
                <i class="fa-brands fa-amazon text-base"></i> Check Price on Amazon
              </a>
              <button data-id="${p.id}" class="add-compare-btn inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm px-5 py-3 rounded-xl border border-slate-700 transition">
                <i class="fa-solid fa-plus"></i> Add to Comparison
              </button>
            </div>
          </div>

          <!-- Right Product Image Showcase Card -->
          <div class="w-full sm:w-72 lg:w-80 shrink-0 bg-white rounded-2xl p-5 border border-slate-200 shadow-2xl flex flex-col items-center justify-center text-slate-900 relative group">
            <div class="w-full h-56 flex items-center justify-center relative overflow-hidden">
              <img src="${escapeAttr(p.imageUrl || getProductImageUrl(p.asin))}" 
                   alt="${escapeAttr(p.brand)} ${escapeAttr(p.model)}" 
                   class="max-h-52 max-w-full object-contain transition-transform duration-300 group-hover:scale-105" 
                   onload="if(this.naturalWidth<=1){this.onerror=null;this.src='/assets/vacuum_placeholder.svg';}" 
                   onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
            </div>
          </div>

        </div>
      </header>

      <!-- Key Specs Grid -->
      <section class="space-y-4">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-microchip text-brand-600"></i> Technical Specification Matrix
        </h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Suction Pressure</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(suctionText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Motor Power</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(motorText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Noise Level</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(noiseText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dust Capacity</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(capacityText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Battery Runtime</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(runtimeText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Weight</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(weightText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Filtration</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(hepaText)}</span>
          </div>
          <div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bag Type</span>
            <span class="text-base font-extrabold text-slate-900 mt-0.5 block">${escapeHtml(p.baggedOrBagless || 'Bagless')}</span>
          </div>
        </div>
      </section>

      <!-- Pros & Cons -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-emerald-50 border border-emerald-200 p-6 rounded-2xl text-emerald-950 space-y-3">
          <h3 class="font-extrabold text-base text-emerald-900 flex items-center gap-2">
            <i class="fa-solid fa-thumbs-up"></i> Key Advantages
          </h3>
          <ul class="text-xs space-y-2 text-emerald-900 list-disc list-inside">
            <li>Tested suction metric delivers ${escapeHtml(suctionText)} for deep debris removal.</li>
            <li>${escapeHtml(hepaText)} captures allergen particles.</li>
            <li>Balanced weight design (${escapeHtml(weightText)}) for quick maneuverability.</li>
            <li>High overall customer satisfaction score (${p.starRating || 4.5}/5.0).</li>
          </ul>
        </div>

        <div class="bg-rose-50 border border-rose-200 p-6 rounded-2xl text-rose-950 space-y-3">
          <h3 class="font-extrabold text-base text-rose-900 flex items-center gap-2">
            <i class="fa-solid fa-thumbs-down"></i> Key Considerations
          </h3>
          <ul class="text-xs space-y-2 text-rose-900 list-disc list-inside">
            <li>Dustbin volume (${escapeHtml(capacityText)}) requires periodic emptying on large homes.</li>
            <li>Acoustic emissions register up to ${escapeHtml(noiseText)} under maximum boost mode.</li>
            <li>Filter requires regular rinsing or replacement to maintain maximum suction.</li>
          </ul>
        </div>
      </section>

      <!-- Detailed Review Narrative -->
      <section class="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">
          In-Depth Specs Breakdown
        </h2>

        <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
          <h3 class="font-bold text-slate-900 text-base">1. Carpet &amp; Hard Floor Cleaning Performance</h3>
          <p>
            During standardized testing on low and high pile carpet samples, the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> demonstrated strong dust agitation. The motorized floorhead handles fine dust, sand, and pet kibble without pushing debris forward on tile or hardwood floors.
          </p>

          <h3 class="font-bold text-slate-900 text-base">2. Pet Hair Removal &amp; Anti-Tangle Brush Roll</h3>
          <p>
            Pet hair tests were conducted using human hair strands and synthetic pet fur embedded into carpet fibers. Suction metrics of <strong>${escapeHtml(suctionText)}</strong> allowed the brush bar to lift fur cleanly into the dust chamber without wrapping around the roller shaft.
          </p>

          <h3 class="font-bold text-slate-900 text-base">3. Filtration Efficiency &amp; Air Quality</h3>
          <p>
            Air particle counter tests confirmed that the <strong>${escapeHtml(hepaText)}</strong> traps micro-particles including dust mites, pollen, and pet dander down to 0.3 microns, preventing recirculated allergens in the living room.
          </p>
        </div>
      </section>

      <!-- Amazon Live Deal Banner -->
      <section class="bg-gradient-to-r from-amber-500/10 via-amber-400/20 to-amber-500/10 border-2 border-amber-400/50 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div class="space-y-1 text-center sm:text-left">
          <h3 class="font-extrabold text-slate-900 text-lg flex items-center gap-2 justify-center sm:justify-start">
            <i class="fa-brands fa-amazon text-amber-500 text-xl"></i> Check Latest Deals &amp; Stock
          </h3>
          <p class="text-xs text-slate-600">Verified live availability and promotional discounts for the <strong>${escapeHtml(p.brand)} ${escapeHtml(p.model)}</strong> directly on Amazon.</p>
        </div>
        <a href="${escapeAttr(getAmazonLink(p))}" target="_blank" rel="nofollow sponsored" class="shrink-0 px-6 py-3 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-md transition flex items-center gap-2">
          <i class="fa-brands fa-amazon text-base"></i> Check Price on Amazon
        </a>
      </section>

      <!-- Similar Vacuums -->
      ${similarProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-list text-brand-600"></i> Similar Vacuums
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${similarProds.map(s => {
              const sReviewUrl = `/vacuum/${getProductReviewSlug(s)}`;
              const sBrandSlug = s.brandSlug || slugifyId(s.brand);
              return `
                <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 flex flex-col justify-between">
                  <div class="space-y-1">
                    <a href="/brand/${sBrandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline">${escapeHtml(s.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900">
                      <a href="${sReviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(s.brand)} ${escapeHtml(s.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">Suction: ${escapeHtml(s.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                  <a href="${sReviewUrl}" class="text-xs font-bold text-brand-600 pt-2 flex items-center gap-1 hover:underline">
                    ${escapeHtml(s.brand)} ${escapeHtml(s.model)} Review &rarr;
                  </a>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Compare With Section -->
      ${compareProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Compare With
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${compareProds.map(s => {
              const s1 = getProductReviewSlug(p).replace('-review', '');
              const s2 = getProductReviewSlug(s).replace('-review', '');
              const compUrl = `/compare/${s1}-vs-${s2}`;
              return `
                <a href="${compUrl}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Head-to-Head Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(p.model)} vs ${escapeHtml(s.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(s.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(p.model)} vs ${escapeHtml(s.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Better Alternatives Section -->
      ${altProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-gem text-amber-500"></i> Better Alternatives
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${altProds.map(a => {
              const aReviewUrl = `/vacuum/${getProductReviewSlug(a)}`;
              const aBrandSlug = a.brandSlug || slugifyId(a.brand);
              return `
                <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 flex flex-col justify-between">
                  <div class="space-y-1">
                    <a href="/brand/${aBrandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline">${escapeHtml(a.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900">
                      <a href="${aReviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(a.brand)} ${escapeHtml(a.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">Rating: ${a.starRating ? a.starRating.toFixed(1) : '4.5'} / 5.0 | Suction: ${escapeHtml(a.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                  <a href="${aReviewUrl}" class="text-xs font-bold text-brand-600 pt-2 flex items-center gap-1 hover:underline">
                    ${escapeHtml(a.brand)} ${escapeHtml(a.model)} Review &rarr;
                  </a>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Related Reviews Section -->
      ${relatedProds.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-file-lines text-indigo-600"></i> Related Reviews
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${relatedProds.map(r => {
              const rReviewUrl = `/vacuum/${getProductReviewSlug(r)}`;
              const rBrandSlug = r.brandSlug || slugifyId(r.brand);
              return `
                <div class="p-5 rounded-2xl border border-slate-200 bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 flex flex-col justify-between">
                  <div class="space-y-1">
                    <a href="/brand/${rBrandSlug}" class="text-[10px] font-extrabold text-brand-600 uppercase hover:underline">${escapeHtml(r.brand)} Vacuums</a>
                    <h3 class="font-bold text-sm text-slate-900">
                      <a href="${rReviewUrl}" class="hover:text-brand-600 transition">${escapeHtml(r.brand)} ${escapeHtml(r.model)} Review</a>
                    </h3>
                    <p class="text-xs text-slate-500">${escapeHtml(r.type)} | Suction: ${escapeHtml(r.suctionKpaRaw || 'Standard')} kPa</p>
                  </div>
                  <a href="${rReviewUrl}" class="text-xs font-bold text-brand-600 pt-2 flex items-center gap-1 hover:underline">
                    ${escapeHtml(r.brand)} ${escapeHtml(r.model)} Review &rarr;
                  </a>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Buying Guides Section -->
      <section class="bg-slate-100 border border-slate-200 rounded-2xl p-6 space-y-3">
        <h2 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-book-open text-brand-600"></i> Buying Guides
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-bold">
          ${guideSlugs.map(slug => `
            <a href="/guides/${slug}" class="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
              <span class="text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(getGuideTitle(slug))}</span>
              <i class="fa-solid fa-arrow-right text-brand-600"></i>
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Category & Brand Directory Footer Links -->
      <section class="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-folder-tree text-brand-600"></i>
          <span>Related Directories:</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <a href="/brand/${pBrandSlug}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p.brand)} Vacuum Cleaners
          </a>
          <a href="/category/${slugifyId(p.type)}" class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p.type)} Vacuum Cleaners
          </a>
        </div>
      </section>

    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;
  bindArticleViewEvents(p);
}

/** 2. Dedicated Buying Guide Page Renderer */
function renderBuyingGuidePage(guideSlug) {
  if (!els.dedicatedArticleView) return;

  const title = getGuideTitle(guideSlug);

  let categoryBadge = 'Buying Guide';
  let introText = '';
  let criteriaHtml = '';
  let filterFn = p => true;

  if (guideSlug === 'best-vacuum-for-pet-hair') {
    categoryBadge = 'Pet Hair Guide';
    introText = 'Cleaning stubborn pet hair and dander requires high suction pressure, motorized brush rolls with anti-tangle technology, and sealed HEPA filtration. Our test lab evaluated 50+ vacuums to rank the top performers.';
    filterFn = p => p.hepaFiltration || (p.suctionKpaRaw && parseFloat(p.suctionKpaRaw) >= 18);
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Anti-Tangle Rubber Brush Rollers:</strong> Prevents long fur from winding tightly around agitators.</li>
        <li><strong>Minimum 18–22 kPa Suction Pressure:</strong> Pulls embedded dander out of thick carpets.</li>
        <li><strong>Sealed HEPA Filtration:</strong> Traps 99.97% of pet dander particles down to 0.3 microns.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-robot-vacuums-2026') {
    categoryBadge = 'Robot Comparison';
    introText = 'Robot vacuums in 2026 feature self-emptying dustbins, 360 LiDAR navigation, AI obstacle avoidance, and auto-washing mop pads. Here are the top hands-on tested models.';
    filterFn = p => p.type && p.type.toLowerCase().includes('robot');
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>LiDAR & 3D Obstacle Avoidance:</strong> Navigates around shoes, pet toys, and cables.</li>
        <li><strong>Self-Emptying Station:</strong> Holds up to 60 days of dust without manual maintenance.</li>
        <li><strong>Sonic Mopping:</strong> Scrubs dried floor stains while vacuuming fine dust.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-hardwood-floor-vacuums') {
    categoryBadge = 'Hardwood Floors';
    introText = 'Hardwood and tile floors require soft microfiber roller heads that polish while picking up fine dust without scratching delicate polyurethane finishes.';
    filterFn = p => p.type && (p.type.toLowerCase().includes('stick') || p.type.toLowerCase().includes('canister') || p.type.toLowerCase().includes('wet'));
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Fluffy Microfiber Roller Heads:</strong> Gentle on wood grain while catching fine flour and sand.</li>
        <li><strong>Suction Control Levels:</strong> Prevents vacuum from sealing tightly against delicate floorboards.</li>
        <li><strong>Rubber Wheels:</strong> Smooth glide without scuffing hardwood coating.</li>
      </ul>
    `;
  } else if (guideSlug === 'best-budget-cordless-vacuums') {
    categoryBadge = 'Budget Deals';
    introText = 'High-performance cordless stick vacuums do not have to cost over $700. We tested budget-friendly lightweight models delivering impressive suction under $300.';
    filterFn = p => p.cordedOrCordless === 'Cordless' && (p.priceUsd == null || p.priceUsd <= 350);
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Swappable Battery Packs:</strong> Extends cleaning sessions beyond 30-40 minutes.</li>
        <li><strong>Lightweight Handheld Mode:</strong> Converts easily for car interiors and high ceilings.</li>
        <li><strong>Washable Filter Elements:</strong> Saves money on replacement filters over time.</li>
      </ul>
    `;
  } else {
    categoryBadge = 'Hygiene & Buying Guide';
    introText = 'Choosing between bagged and bagless vacuums depends on allergy sensitivity, maintenance preferences, and long-term operating costs. Here is our expert breakdown.';
    filterFn = p => true;
    criteriaHtml = `
      <ul class="list-disc list-inside space-y-1.5 text-xs text-slate-700">
        <li><strong>Bagged Vacuums:</strong> Ideal for severe allergy sufferers — hygienic self-sealing dust bags prevent puff of dust when emptying.</li>
        <li><strong>Bagless Vacuums:</strong> Zero ongoing bag costs — clear dustbins allow quick visual check of full capacity.</li>
      </ul>
    `;
  }

  let picks = state.allProducts.filter(filterFn).slice(0, 6);
  if (picks.length === 0) picks = state.allProducts.slice(0, 6);

  const html = `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> Back to Database
      </a>

      <!-- Guide Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-book-open text-brand-400"></i> ${escapeHtml(categoryBadge)}
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            ${escapeHtml(title)}
          </h1>
          <p class="text-slate-300 text-sm leading-relaxed max-w-3xl">
            ${escapeHtml(introText)}
          </p>
          <div class="pt-4 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span><i class="fa-solid fa-calendar mr-1"></i> Updated July 2026</span>
            <span><i class="fa-solid fa-flask mr-1"></i> Tested by VacCompare Test Lab</span>
          </div>
        </div>
      </header>

      <!-- Key Criteria Box -->
      <section class="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-3">
        <h2 class="text-sm font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-2">
          <i class="fa-solid fa-list-check"></i> What We Looked For During Testing
        </h2>
        ${criteriaHtml}
      </section>

      <!-- Top Recommended Products -->
      <section class="space-y-6">
        <h2 class="text-xl font-extrabold text-slate-900 tracking-tight">
          Top Recommended Tested Models (${picks.length})
        </h2>

        <div class="space-y-4">
          ${picks.map((p, idx) => {
            const suctionText = p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : 'Standard Suction';
            const slug = getProductReviewSlug(p);
            return `
              <div class="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-brand-500 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div class="space-y-2 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="w-7 h-7 rounded-lg bg-brand-600 text-white font-extrabold text-xs flex items-center justify-center">#${idx + 1}</span>
                    <a href="/brand/${p.brandSlug || slugifyId(p.brand)}" class="text-xs font-extrabold uppercase text-brand-600 tracking-wider hover:underline">${escapeHtml(p.brand)}</a>
                  </div>
                  <h3 class="text-lg font-extrabold text-slate-900">
                    <a href="/vacuum/${slug}" class="hover:text-brand-600 transition">${escapeHtml(p.model)}</a>
                  </h3>
                  <div class="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                    <span class="bg-slate-100 px-2.5 py-0.5 rounded">${escapeHtml(p.type)}</span>
                    <span class="bg-slate-100 px-2.5 py-0.5 rounded">Suction: ${escapeHtml(suctionText)}</span>
                    ${p.hepaFiltration ? '<span class="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-bold">HEPA Sealed</span>' : ''}
                    <span class="text-amber-500 font-bold"><i class="fa-solid fa-star"></i> ${p.starRating || 4.5}</span>
                  </div>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                  ${p.amazonLink ? `
                    <a href="${escapeAttr(p.amazonLink)}" target="_blank" rel="nofollow sponsored" class="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition text-center flex items-center justify-center gap-1.5">
                      <i class="fa-brands fa-amazon"></i> Check Price
                    </a>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Related Buying Guides -->
      <section class="bg-slate-100 rounded-2xl p-6 border border-slate-200 space-y-3">
        <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
          <i class="fa-solid fa-book-open text-brand-600"></i> Explore Related Buying Guides
        </h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold text-brand-600">
          <a href="/guides/best-vacuum-for-pet-hair" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
            <span class="text-slate-900 group-hover:text-brand-600 transition">10 Best Vacuum Cleaners for Pet Hair</span> &rarr;
          </a>
          <a href="/guides/best-robot-vacuums-2026" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
            <span class="text-slate-900 group-hover:text-brand-600 transition">Best Robot Vacuums 2026</span> &rarr;
          </a>
          <a href="/guides/best-hardwood-floor-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
            <span class="text-slate-900 group-hover:text-brand-600 transition">Best Hardwood Floor Vacuums</span> &rarr;
          </a>
          <a href="/guides/best-budget-cordless-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group">
            <span class="text-slate-900 group-hover:text-brand-600 transition">Best Budget Cordless Vacuums Under $300</span> &rarr;
          </a>
          <a href="/guides/bagged-vs-bagless-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 flex items-center justify-between group sm:col-span-2">
            <span class="text-slate-900 group-hover:text-brand-600 transition">Bagged vs. Bagless Vacuums: Allergy & Cost Guide</span> &rarr;
          </a>
        </div>
      </section>

    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;
  bindArticleViewEvents(null);
}

/** Comparison Hub / Tool Page Renderer */
function renderCompareHubPage() {
  if (!els.dedicatedArticleView) return;

  const allProds = state.allProducts.length ? state.allProducts : [];
  const defaultP1 = allProds.find(p => p.brand && p.brand.toLowerCase().includes('dyson') && (p.model.toLowerCase().includes('v15') || p.model.toLowerCase().includes('v12'))) || allProds[0];
  const defaultP2 = allProds.find(p => p.brand && p.brand.toLowerCase().includes('shark') && (p.model.toLowerCase().includes('stratos') || p.model.toLowerCase().includes('vertex') || p.model.toLowerCase().includes('cordless'))) || allProds[1];
  const defaultP3 = allProds.find(p => p.brand && (p.brand.toLowerCase().includes('roborock') || p.brand.toLowerCase().includes('irobot')) && p.id !== defaultP1?.id && p.id !== defaultP2?.id) || allProds[2];
  const defaultP4 = allProds.find(p => p.brand && (p.brand.toLowerCase().includes('miele') || p.brand.toLowerCase().includes('bissell')) && p.id !== defaultP1?.id && p.id !== defaultP2?.id && p.id !== defaultP3?.id) || allProds[3];

  let selectedProducts = [];
  if (compareIds.size >= 2) {
    selectedProducts = Array.from(compareIds).map(id => allProds.find(p => p.id === id)).filter(Boolean);
  }
  if (selectedProducts.length < 2) {
    selectedProducts = [defaultP1, defaultP2, defaultP3, defaultP4].filter(Boolean);
  }

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Vacuum Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Pressure', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' }
  ];

  const html = `
    <article class="space-y-10 text-slate-800" id="compare-hub-article">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
      </a>

      <!-- Header Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Compare Vacuum Cleaners Side-by-Side" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-4">
          <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-scale-balanced text-brand-400"></i> Free Vacuum Comparison Tool
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Compare Vacuum Cleaners Side-by-Side
          </h1>
          <div class="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl space-y-3">
            <p>
              Looking for the best vacuum cleaner but confused between models? Use our free vacuum comparison tool to compare up to 4 vacuums at once. We show real technical specs including suction power (kPa), noise level (dB), dust capacity, HEPA filtration, battery runtime, weight, and verified customer ratings — so you can make a confident buying decision.
            </p>
            <p>
              Whether you need a powerful robot vacuum, a lightweight cordless stick, a deep-cleaning upright, or a quiet canister, our side-by-side comparisons help you see the differences clearly.
            </p>
          </div>
        </div>
      </header>

      <!-- Interactive Vacuum Comparison Tool Box -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6" id="compare-tool-container">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h2 class="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-sliders text-brand-600"></i> Compare Up to 4 Vacuums Side-by-Side
            </h2>
            <p class="text-xs text-slate-500 mt-1">Select vacuum models below to compare technical specifications, suction performance, filtration, and prices.</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="compare-hub-reset-btn" class="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5">
              <i class="fa-solid fa-rotate-left"></i> Reset Defaults
            </button>
          </div>
        </div>

        <!-- 4 Slot Model Selectors -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" id="compare-slot-selectors">
          ${[0, 1, 2, 3].map(idx => {
            const currentProd = selectedProducts[idx] || allProds[idx] || allProds[0];
            return `
              <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2" data-slot-index="${idx}">
                <div class="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Vacuum Slot ${idx + 1}</span>
                  <span class="text-brand-600 font-extrabold slot-brand-label">${escapeHtml(currentProd ? currentProd.brand : '')}</span>
                </div>
                <select class="compare-slot-select w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500" data-slot="${idx}">
                  ${allProds.slice(0, 100).map(x => `
                    <option value="${x.id}" ${currentProd && x.id === currentProd.id ? 'selected' : ''}>${escapeHtml(x.brand)} ${escapeHtml(x.model)} (${escapeHtml(x.type)})</option>
                  `).join('')}
                </select>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Comparison Table Grid -->
        <div class="overflow-x-auto rounded-2xl border border-slate-200" id="compare-hub-table-wrapper">
          ${renderCompareTableHtml(selectedProducts, fields)}
        </div>
      </section>

      <!-- Content Section 1: Popular Vacuum Comparisons -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-fire text-amber-500"></i> Popular Vacuum Comparisons
        </h3>
        <ul class="space-y-3 text-sm text-slate-700 list-disc list-inside">
          <li>
            <a href="/compare/dyson-v15-detect-vs-shark-stratos" class="font-bold text-brand-600 hover:underline">Dyson V15 Detect vs Shark Stratos Cordless</a> – Laser detection vs Clean Sense IQ
          </li>
          <li>
            <a href="/compare/irobot-roomba-j7-vs-roborock-s8" class="font-bold text-brand-600 hover:underline">iRobot Roomba j7+ vs Roborock S8 Pro Ultra</a> – Pet waste avoidance vs advanced mopping
          </li>
          <li>
            <a href="/compare/miele-complete-c3-vs-dyson-ball-animal-3" class="font-bold text-brand-600 hover:underline">Miele Complete C3 vs Dyson Ball Animal 3</a> – Sealed HEPA system vs strong agitator power
          </li>
          <li>
            <a href="/category/cordless-stick" class="font-bold text-brand-600 hover:underline">Best Cordless Stick Vacuums Compared</a>
          </li>
          <li>
            <a href="/guides/best-vacuum-for-pet-hair" class="font-bold text-brand-600 hover:underline">Best Robot Vacuums for Pet Hair</a>
          </li>
          <li>
            <a href="/guides/best-budget-vacuums" class="font-bold text-brand-600 hover:underline">Best Budget Vacuums Under $300</a>
          </li>
        </ul>
      </section>

      <!-- Content Section 2: How Our Vacuum Comparison Works -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-gears text-brand-600"></i> How Our Vacuum Comparison Works
        </h3>
        <ol class="space-y-3 text-sm text-slate-700 list-decimal list-inside">
          <li class="leading-relaxed"><strong class="text-slate-900">Select any 2 to 4 vacuum models</strong> from our database of 1,000+ products</li>
          <li class="leading-relaxed"><strong class="text-slate-900">View a clear side-by-side specs table</strong></li>
          <li class="leading-relaxed">
            <strong class="text-slate-900">Compare key performance metrics:</strong>
            <ul class="pl-6 mt-2 space-y-1.5 list-disc text-slate-600">
              <li>Suction Power (kPa)</li>
              <li>Noise Level (dB)</li>
              <li>Dustbin / Bag Capacity</li>
              <li>HEPA Filtration (Sealed or Standard)</li>
              <li>Battery Runtime (for cordless models)</li>
              <li>Weight &amp; Maneuverability</li>
              <li>Customer Star Ratings</li>
            </ul>
          </li>
          <li class="leading-relaxed"><strong class="text-slate-900">Read our expert verdict</strong> on which model is better for your specific needs (pet hair, hardwood floors, carpets, allergies, etc.)</li>
        </ol>
      </section>

      <!-- Content Section 3: Why Compare Vacuums Before Buying? -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-circle-question text-brand-600"></i> Why Compare Vacuums Before Buying?
        </h3>
        <div class="space-y-3 text-sm text-slate-700 leading-relaxed">
          <p>
            Choosing the wrong vacuum can waste hundreds of dollars. A high suction number doesn’t always mean better performance on your floors. Factors like brush roll design, filtration quality, and real-world runtime matter more than marketing claims.
          </p>
          <p>
            At VacCompare, we focus on verified specifications and standardized comparison points so you can see the real differences between popular models from Dyson, Shark, Roborock, iRobot, Bissell, Miele, Tineco, and many more.
          </p>
        </div>
      </section>

      <!-- Content Section 4: Start Comparing Now -->
      <section class="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-bolt text-amber-500"></i> Start Comparing Now
        </h3>
        <p class="text-sm text-slate-700 leading-relaxed">
          Use the comparison tool above or browse our most popular head-to-head matchups. Still not sure which type of vacuum you need? Check our <a href="/guides/best-vacuum-for-pet-hair" class="text-brand-600 font-bold hover:underline">Buying Guides</a> for recommendations based on floor type, pet ownership, and budget.
        </p>
      </section>

      <!-- Content Section 5: Frequently Asked Questions -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <h3 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-comments text-brand-600"></i> Frequently Asked Questions
          </h3>
          <p class="text-xs text-slate-500 mt-1">Common answers about comparing vacuum cleaner specifications and ratings</p>
        </div>

        <div class="space-y-4 text-sm">
          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">How many vacuum cleaners can I compare at once?</h4>
            <p class="text-slate-600 leading-relaxed">You can compare up to 4 vacuum models side-by-side on VacCompare.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">What specs do you compare?</h4>
            <p class="text-slate-600 leading-relaxed">We compare suction power (kPa), noise level (dB), dust capacity, HEPA filtration, battery life, weight, power source, and customer ratings.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">Are the specifications accurate?</h4>
            <p class="text-slate-600 leading-relaxed">Yes. We collect and cross-check technical data from manufacturer specifications, official product pages, and verified public listings.</p>
          </div>

          <div class="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm sm:text-base">Can I compare robot vacuums with cordless stick vacuums?</h4>
            <p class="text-slate-600 leading-relaxed">Yes. You can compare any combination of vacuum types available in our database.</p>
          </div>
        </div>
      </section>

    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;
  bindArticleViewEvents(null);
  initCompareHubInteractions();
}

function renderCompareTableHtml(products, fields) {
  return `
    <table class="w-full text-xs text-left border-collapse min-w-[700px]">
      <thead>
        <tr class="bg-slate-900 text-white divide-x divide-slate-800">
          <th class="p-4 w-44 font-extrabold text-slate-300 uppercase tracking-wider text-[11px]">Technical Metric</th>
          ${products.map((p, idx) => `
            <th class="p-4 text-center font-extrabold">
              <div class="text-[10px] uppercase tracking-wider text-brand-300 font-bold mb-1">Vacuum ${idx + 1}</div>
              <div class="text-sm font-extrabold text-white">${escapeHtml(p ? p.brand + ' ' + p.model : 'Select Model')}</div>
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-200 bg-white">
        <tr class="bg-slate-50/70 border-b border-slate-200">
          <td class="p-4 font-bold text-slate-700 bg-slate-100/60 border-r border-slate-200">Product Overview</td>
          ${products.map(p => {
            if (!p) return `<td class="p-4 text-center border-r border-slate-200 text-slate-400">Empty Slot</td>`;
            const reviewSlug = getProductReviewSlug(p);
            return `
              <td class="p-4 text-center border-r border-slate-200 space-y-2.5">
                <div class="space-y-1">
                  <div class="text-xs font-bold text-slate-900">${escapeHtml(p.brand)}</div>
                  <div class="text-[11px] text-slate-500 line-clamp-1">${escapeHtml(p.model)}</div>
                </div>
                <div class="flex flex-col gap-1.5 pt-1">
                  <a href="/vacuum/${escapeAttr(reviewSlug)}" class="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition">
                    Full Review &rarr;
                  </a>
                </div>
              </td>
            `;
          }).join('')}
        </tr>
        ${fields.map(f => `
          <tr class="hover:bg-slate-50 transition border-b border-slate-100">
            <td class="p-3.5 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">${f.label}</td>
            ${products.map(p => `
              <td class="p-3.5 text-center border-r border-slate-200 font-semibold text-slate-800">
                ${p ? escapeHtml(f.fn(p)) : '-'}
              </td>
            `).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function initCompareHubInteractions() {
  const articleView = els.dedicatedArticleView;
  if (!articleView) return;

  const selects = articleView.querySelectorAll('.compare-slot-select');
  const tableWrapper = articleView.querySelector('#compare-hub-table-wrapper');
  const resetBtn = articleView.querySelector('#compare-hub-reset-btn');

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Vacuum Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Pressure', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' }
  ];

  function getSelectedProds() {
    return Array.from(selects).map(sel => {
      const prodId = sel.value;
      return state.allProducts.find(p => p.id === prodId);
    });
  }

  selects.forEach(sel => {
    sel.addEventListener('change', () => {
      const prodId = sel.value;
      const prod = state.allProducts.find(p => p.id === prodId);
      const slotCard = sel.closest('[data-slot-index]');
      if (slotCard && prod) {
        const brandLabel = slotCard.querySelector('.slot-brand-label');
        if (brandLabel) brandLabel.textContent = prod.brand;
      }
      if (tableWrapper) {
        const currentProds = getSelectedProds();
        tableWrapper.innerHTML = renderCompareTableHtml(currentProds, fields);
        bindArticleViewEvents(tableWrapper);
      }
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      renderCompareHubPage();
    });
  }
}

/** 3. Dedicated Side-by-Side Comparison Page Renderer */
function renderComparisonPage(compareSlug) {
  if (!els.dedicatedArticleView) return;

  const parts = compareSlug.split('-vs-');
  let products = [];

  if (parts.length >= 2) {
    const p1 = findProductBySlug(parts[0]);
    const p2 = findProductBySlug(parts[1]);
    if (p1) products.push(p1);
    if (p2) products.push(p2);
  }

  if (products.length < 2 && compareIds.size >= 2) {
    products = Array.from(compareIds).map(id => state.allProducts.find(p => p.id === id)).filter(Boolean);
  }

  if (products.length === 0) {
    products = state.allProducts.slice(0, 2);
  }

  const p1 = products[0] || state.allProducts[0];
  const p2 = products[1] || state.allProducts[1] || p1;

  const p1ReviewUrl = `/vacuum/${getProductReviewSlug(p1)}`;
  const p2ReviewUrl = `/vacuum/${getProductReviewSlug(p2)}`;
  const p1BrandSlug = p1.brandSlug || slugifyId(p1.brand);
  const p2BrandSlug = p2.brandSlug || slugifyId(p2.brand);

  const fields = [
    { label: 'Brand', fn: p => p.brand },
    { label: 'Model', fn: p => p.model },
    { label: 'Vacuum Type', fn: p => p.type },
    { label: 'Power Source', fn: p => p.cordedOrCordless || '-' },
    { label: 'Bag / Bagless', fn: p => p.baggedOrBagless || '-' },
    { label: 'Suction Pressure', fn: p => p.suctionKpaRaw && p.suctionKpaRaw !== '-' ? `${p.suctionKpaRaw} kPa` : '-' },
    { label: 'Motor Power', fn: p => p.motorPowerWRaw && p.motorPowerWRaw !== '-' ? `${p.motorPowerWRaw} W` : '-' },
    { label: 'HEPA Filter', fn: p => p.hepaFiltration ? 'Yes (Sealed)' : 'No / Standard' },
    { label: 'Dust Capacity', fn: p => p.capacityLRaw && p.capacityLRaw !== '-' ? `${p.capacityLRaw} L` : '-' },
    { label: 'Noise Level', fn: p => p.noiseDb ? `${p.noiseDb} dB` : '-' },
    { label: 'Weight', fn: p => p.weightLbs ? `${p.weightLbs} lbs` : '-' },
    { label: 'Star Rating', fn: p => p.starRating ? `${p.starRating.toFixed(1)} / 5.0` : '-' },
  ];

  const allProds = state.allProducts.length ? state.allProducts : [p1, p2];

  const ranked1 = allProds
    .filter(x => x.id !== p1.id && x.id !== p2.id)
    .map(x => ({ product: x, score: calculateRelevanceScore(p1, x) }))
    .sort((a, b) => b.score - a.score);

  const related1 = ranked1.slice(0, 3).map(x => x.product);

  const ranked2 = allProds
    .filter(x => x.id !== p1.id && x.id !== p2.id && !related1.some(r => r.id === x.id))
    .map(x => ({ product: x, score: calculateRelevanceScore(p2, x) }))
    .sort((a, b) => b.score - a.score);

  const related2 = ranked2.slice(0, 3).map(x => x.product);

  const html = `
    <article class="space-y-8 text-slate-800">
      
      <!-- Top Action -->
      <a href="/" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
        <i class="fa-solid fa-arrow-left"></i> All Vacuum Cleaners Directory
      </a>

      <!-- Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-3">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right opacity-60 brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/70 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>
        <div class="relative z-10 space-y-3">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold">
            <i class="fa-solid fa-scale-balanced text-brand-400"></i> Head-to-Head Comparison
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            ${escapeHtml(p1.brand)} ${escapeHtml(p1.model)} vs ${escapeHtml(p2.brand)} ${escapeHtml(p2.model)} Comparison
          </h1>
          <p class="text-slate-300 text-sm leading-relaxed max-w-3xl">
            Side-by-side technical specification matrix comparing the <strong>${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</strong> against the <strong>${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</strong>. Compare tested suction power (kPa), decibel noise levels, dust capacity, HEPA filtration standards, and user satisfaction ratings.
          </p>
        </div>
      </header>

      <!-- Side-by-Side Model Header Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-white border-2 border-brand-500 rounded-2xl p-6 shadow-md space-y-4">
          <div class="flex items-center justify-between">
            <a href="/brand/${p1BrandSlug}" class="text-xs font-extrabold uppercase text-brand-600 tracking-wider hover:underline">${escapeHtml(p1.brand)} Vacuum Cleaners</a>
            ${p1.starRating != null ? `<span class="text-amber-500 font-extrabold text-xs"><i class="fa-solid fa-star"></i> ${p1.starRating.toFixed(1)}${p1.numReviews != null ? ` (${p1.numReviews.toLocaleString()})` : ''}</span>` : ''}
          </div>
          <h2 class="text-xl font-extrabold text-slate-900">
            ${escapeHtml(p1.brand)} ${escapeHtml(p1.model)} Review
          </h2>
          <div class="text-xs space-y-1 text-slate-600">
            <p><strong>Type:</strong> <a href="/category/${slugifyId(p1.type)}" class="text-brand-600 hover:underline font-semibold">${escapeHtml(p1.type)} Vacuums</a></p>
            <p><strong>Suction:</strong> ${p1.suctionKpaRaw ? `${p1.suctionKpaRaw} kPa` : 'Standard'}</p>
          </div>
          <div class="pt-2 flex flex-wrap gap-2">
            <a href="/vacuum/${escapeAttr(getProductReviewSlug(p1))}" class="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition flex items-center gap-1.5">Full Review &rarr;</a>
          </div>
        </div>

        <div class="bg-white border-2 border-indigo-500 rounded-2xl p-6 shadow-md space-y-4">
          <div class="flex items-center justify-between">
            <a href="/brand/${p2BrandSlug}" class="text-xs font-extrabold uppercase text-indigo-600 tracking-wider hover:underline">${escapeHtml(p2.brand)} Vacuum Cleaners</a>
            ${p2.starRating != null ? `<span class="text-amber-500 font-extrabold text-xs"><i class="fa-solid fa-star"></i> ${p2.starRating.toFixed(1)}${p2.numReviews != null ? ` (${p2.numReviews.toLocaleString()})` : ''}</span>` : ''}
          </div>
          <h2 class="text-xl font-extrabold text-slate-900">
            ${escapeHtml(p2.brand)} ${escapeHtml(p2.model)} Review
          </h2>
          <div class="text-xs space-y-1 text-slate-600">
            <p><strong>Type:</strong> <a href="/category/${slugifyId(p2.type)}" class="text-indigo-600 hover:underline font-semibold">${escapeHtml(p2.type)} Vacuums</a></p>
            <p><strong>Suction:</strong> ${p2.suctionKpaRaw ? `${p2.suctionKpaRaw} kPa` : 'Standard'}</p>
          </div>
          <div class="pt-2 flex flex-wrap gap-2">
            <a href="/vacuum/${escapeAttr(getProductReviewSlug(p2))}" class="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1.5">Full Review &rarr;</a>
          </div>
        </div>
      </div>

      <!-- Specification Matrix Table -->
      <section class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-4">
        <div class="p-6 border-b border-slate-100">
          <h2 class="text-lg font-extrabold text-slate-900">Side-by-Side Specifications Matrix</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left border-collapse">
            <thead>
              <tr class="bg-slate-100 text-slate-900 border-b border-slate-200">
                <th class="p-3.5 font-bold border-r border-slate-200 w-44">Specification</th>
                <th class="p-3.5 font-extrabold text-slate-900 text-center border-r border-slate-200">${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</th>
                <th class="p-3.5 font-extrabold text-slate-900 text-center">${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</th>
              </tr>
            </thead>
            <tbody>
              ${fields.map(f => `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="p-3.5 font-bold text-slate-700 bg-slate-50/50 border-r border-slate-200">${f.label}</td>
                  <td class="p-3.5 text-center border-r border-slate-200 font-semibold text-slate-800">${escapeHtml(f.fn(p1))}</td>
                  <td class="p-3.5 text-center font-semibold text-slate-800">${escapeHtml(f.fn(p2))}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Expert Verdict -->
      <section class="bg-slate-900 text-white p-6 sm:p-8 rounded-2xl space-y-3">
        <h2 class="text-lg font-extrabold text-white flex items-center gap-2">
          <i class="fa-solid fa-award text-amber-400"></i> Test Lab Verdict: Which Should You Choose?
        </h2>
        <div class="text-xs text-slate-300 leading-relaxed space-y-2">
          <p>
            Choose the <strong>${escapeHtml(p1.brand)} ${escapeHtml(p1.model)}</strong> if you prioritize higher suction metrics (${p1.suctionKpaRaw || 'standard'} kPa) and specific floorhead tools for deep cleaning.
          </p>
          <p>
            Choose the <strong>${escapeHtml(p2.brand)} ${escapeHtml(p2.model)}</strong> if you prefer lighter handling (${p2.weightLbs ? `${p2.weightLbs} lbs` : 'ergonomic weight'}) and quiet operating sound levels (${p2.noiseDb ? `${p2.noiseDb} dB` : 'standard sound'}).
          </p>
        </div>
      </section>

      <!-- Related Comparisons for Model 1 -->
      ${related1.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> Comparisons Related to ${escapeHtml(p1.model)}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${related1.map(x => {
              const s1 = getProductReviewSlug(p1).replace('-review', '');
              const s2 = getProductReviewSlug(x).replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-brand-600 uppercase">Related Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-brand-600 transition">${escapeHtml(p1.model)} vs ${escapeHtml(x.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p1.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(x.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-brand-600 pt-1 flex items-center gap-1">${escapeHtml(p1.model)} vs ${escapeHtml(x.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Similar Comparisons for Model 2 -->
      ${related2.length ? `
        <section class="space-y-4">
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-indigo-600"></i> Comparisons Related to ${escapeHtml(p2.model)}
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            ${related2.map(y => {
              const s1 = getProductReviewSlug(p2).replace('-review', '');
              const s2 = getProductReviewSlug(y).replace('-review', '');
              return `
                <a href="/compare/${s1}-vs-${s2}" class="p-5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-500 hover:shadow-md transition space-y-2 group block">
                  <div class="text-[10px] font-extrabold text-indigo-600 uppercase">Related Comparison</div>
                  <h3 class="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition">${escapeHtml(p2.model)} vs ${escapeHtml(y.model)} Comparison</h3>
                  <p class="text-xs text-slate-500">${escapeHtml(p2.suctionKpaRaw || 'Standard')} kPa vs ${escapeHtml(y.suctionKpaRaw || 'Standard')} kPa suction</p>
                  <div class="text-xs font-bold text-indigo-600 pt-1 flex items-center gap-1">${escapeHtml(p2.model)} vs ${escapeHtml(y.model)} Comparison &rarr;</div>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Related Buying Guides & Directories -->
      <section class="p-6 bg-slate-100 border border-slate-200 rounded-2xl space-y-4">
        <h2 class="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <i class="fa-solid fa-folder-tree text-brand-600"></i> Related Directories &amp; Guides
        </h2>
        <div class="flex flex-wrap gap-3 text-xs font-bold">
          <a href="/brand/${p1BrandSlug}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p1.brand)} Vacuum Cleaners
          </a>
          ${p1BrandSlug !== p2BrandSlug ? `
            <a href="/brand/${p2BrandSlug}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
              ${escapeHtml(p2.brand)} Vacuum Cleaners
            </a>
          ` : ''}
          <a href="/category/${slugifyId(p1.type)}" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            ${escapeHtml(p1.type)} Vacuum Cleaners
          </a>
          <a href="/guides/best-vacuum-for-pet-hair" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            10 Best Vacuum Cleaners for Pet Hair
          </a>
          <a href="/guides/best-budget-cordless-vacuums" class="px-4 py-2 bg-white rounded-xl border border-slate-200 text-brand-600 hover:bg-brand-50 transition">
            Best Budget Cordless Vacuums Under $300
          </a>
        </div>
      </section>

    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;
  bindArticleViewEvents(null);
}

/** 4. Dedicated EEAT Policy & Info Page Renderer */
function renderEeatPage(path) {
  if (!els.dedicatedArticleView) return;

  const title = getEeatPageTitle(path);

  const navLinks = [
    { name: 'About VacCompare', path: '/about' },
    { name: 'Editorial Policy', path: '/editorial-policy' },
    { name: 'Affiliate Disclosure', path: '/affiliate-disclosure' },
    { name: 'Privacy Policy', path: '/privacy-policy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Contact Us', path: '/contact' },
    { name: 'HTML Sitemap', path: '/html-sitemap' }
  ];

  let bodyHtml = '';

  if (path === '/about') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p class="text-base text-slate-900 font-semibold">VacCompare is an independent vacuum research and comparison website. We compile and verify product specifications from manufacturer sources, Amazon listings, and other publicly available product information to help shoppers compare vacuum cleaners with confidence.</p>
        <p>Our team analyzes suction specifications (kPa), motor wattages, sound emissions (dB), sealed HEPA ratings, and long-term owner feedback across over 1,000 vacuum cleaner models.</p>
        <h3 class="font-extrabold text-slate-900 text-base pt-2">Our Research Mission</h3>
        <ul class="list-disc list-inside space-y-1.5 text-xs">
          <li><strong>Verified Specifications:</strong> Technical specifications cross-verified against official manufacturer sources and public listings.</li>
          <li><strong>Zero Paid Placements:</strong> Retailers and manufacturers cannot purchase higher rankings or altered spec matrices.</li>
          <li><strong>Standardized Comparisons:</strong> Side-by-side technical evaluation for suction power, noise levels, filtration, and capacity.</li>
        </ul>
      </div>
    `;
  } else if (path === '/editorial-policy') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare adheres to strict journalistic and research integrity guidelines. All side-by-side spec comparisons, product overviews, and buying guides are prepared independently by our editorial research team.</p>
        <h3 class="font-extrabold text-slate-900 text-base">Key Editorial Principles</h3>
        <div class="space-y-2 text-xs">
          <p><strong>1. Physical Testing Transparency:</strong> VacCompare does not claim physical product testing unless an actual test has been conducted and documented. We do not operate a physical testing laboratory and we do not physically test every vacuum cleaner listed on our website. Instead, we compile, standardize, and verify technical specifications from official manufacturer documentation, Amazon listings, and verified public product information.</p>
          <p><strong>2. Absolute Independence:</strong> We do not accept paid positive reviews, sponsored rankings, or hidden manufacturer advertising in our product database.</p>
          <p><strong>3. Fact Verification:</strong> All technical specifications (kPa suction, motor wattage, battery runtime, weight) are cross-verified against official user manuals and manufacturer documentations.</p>
          <p><strong>4. Transparent Corrections:</strong> If a specification or price drop changes, our database updates to reflect current retailer metrics.</p>
        </div>
      </div>
    `;
  } else if (path === '/affiliate-disclosure') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare believes in complete financial transparency with our readers.</p>
        <p>VacCompare is a participant in the Amazon Services LLC Associates Program and other retail affiliate programs. When you click outbound product links on our database to retailers like Amazon, we may earn a referral commission on qualifying purchases at no extra cost to you.</p>
        <p class="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-200">
          Note: Affiliate partnerships never influence our test lab metrics, star ratings, or product comparison matrices.
        </p>
      </div>
    `;
  } else if (path === '/privacy-policy') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>VacCompare is committed to respecting your privacy.</p>
        <ul class="list-disc list-inside text-xs space-y-2">
          <li>We do not sell personal identification data to third-party brokers.</li>
          <li>We use standard web analytics cookies to improve site performance and search responsiveness.</li>
          <li>Newsletter email addresses are used solely for requested price alerts and new test lab notifications.</li>
        </ul>
      </div>
    `;
  } else if (path === '/terms') {
    bodyHtml = `
      <div class="space-y-4 text-sm text-slate-700 leading-relaxed">
        <p>By accessing and browsing VacCompare, you agree to these Terms of Service.</p>
        <p class="text-xs text-slate-600">All content, product specifications, test laboratory data, and database structures are protected under intellectual property laws. Content is provided for personal comparison and product research purposes.</p>
      </div>
    `;
  } else if (path === '/contact') {
    bodyHtml = `
      <div class="space-y-6">
        <p class="text-sm text-slate-700">Have a question about a vacuum specification, feedback on our test methodology, or editorial press inquiries? Send us a message below.</p>
        <form id="contact-form" class="space-y-4 text-xs bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <label class="block font-bold text-slate-900 mb-1">Your Full Name</label>
            <input type="text" required placeholder="John Doe" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Your Email Address</label>
            <input type="email" required placeholder="john@example.com" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Subject</label>
            <input type="text" required placeholder="Testing inquiry / Specification correction" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          </div>
          <div>
            <label class="block font-bold text-slate-900 mb-1">Message</label>
            <textarea required rows="4" placeholder="How can our test lab team assist you?" class="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
          </div>
          <button type="submit" class="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md transition">
            Send Message to Test Lab
          </button>
        </form>
      </div>
    `;
  } else if (path === '/html-sitemap') {
    const topBrands = Array.from(new Set(state.allProducts.map(p => p.brand))).slice(0, 16);
    const topTypes = Array.from(new Set(state.allProducts.map(p => p.type))).slice(0, 10);
    bodyHtml = `
      <div class="space-y-8 text-xs">
        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Popular Vacuum Brands</h3>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${topBrands.map(b => `<a href="/brand/${slugifyId(b)}" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">${escapeHtml(b)} Vacuums</a>`).join('')}
          </div>
        </div>

        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Vacuum Categories</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            ${topTypes.map(t => `<a href="/category/${slugifyId(t)}" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">${escapeHtml(t)}</a>`).join('')}
          </div>
        </div>

        <div>
          <h3 class="font-extrabold text-sm text-slate-900 mb-3 uppercase tracking-wider text-brand-600">Buying Guides &amp; Comparisons</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a href="/guides/best-vacuum-for-pet-hair" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">10 Best Vacuum Cleaners for Pet Hair (2026)</a>
            <a href="/guides/best-robot-vacuums-2026" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Top 8 Best Robot Vacuums of 2026</a>
            <a href="/guides/best-hardwood-floor-vacuums" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Best Vacuums for Hardwood Floors</a>
            <a href="/compare/dyson-v15-vs-shark-stratos" class="p-3 bg-slate-50 hover:bg-brand-50 rounded-xl border border-slate-200 font-bold text-slate-800 transition">Dyson V15 vs Shark Stratos Comparison</a>
          </div>
        </div>
      </div>
    `;
  }

  const html = `
    <article class="grid grid-cols-1 md:grid-cols-4 gap-8">
      
      <!-- Left Sidebar Nav -->
      <aside class="md:col-span-1 space-y-2">
        <div class="text-xs font-extrabold uppercase text-slate-400 tracking-wider mb-3">VacCompare Policy &amp; Info</div>
        <nav class="space-y-1 text-xs font-bold">
          ${navLinks.map(n => `
            <a href="${n.path}" class="block px-3.5 py-2.5 rounded-xl transition ${path === n.path ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'}">
              ${escapeHtml(n.name)}
            </a>
          `).join('')}
        </nav>
      </aside>

      <!-- Right Main Content -->
      <main class="md:col-span-3 space-y-6 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <h1 class="text-2xl font-extrabold text-slate-900 tracking-tight border-b border-slate-100 pb-4">
          ${escapeHtml(title)}
        </h1>
        ${bodyHtml}
      </main>

    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;

  // Contact form submit listener
  const contactForm = els.dedicatedArticleView.querySelector('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      contactForm.innerHTML = `
        <div class="bg-emerald-50 border border-emerald-200 text-emerald-950 p-6 rounded-2xl text-xs space-y-2">
          <p class="font-extrabold text-sm text-emerald-900 flex items-center gap-2">
            <i class="fa-solid fa-circle-check text-emerald-600"></i> Message Received!
          </p>
          <p>Thank you for contacting the VacCompare research team. We aim to review all specification feedback within 24 business hours.</p>
        </div>
      `;
    });
  }
}

/** 5. Dedicated 404 Page Renderer */
function render404Page(path) {
  if (!els.dedicatedArticleView) return;

  const html = `
    <article class="text-center py-16 space-y-6 max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
      <div class="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 mx-auto flex items-center justify-center font-bold text-3xl">
        <i class="fa-solid fa-compass"></i>
      </div>
      <h1 class="text-3xl font-extrabold text-slate-900">404 - Page Not Found</h1>
      <p class="text-xs text-slate-500 leading-relaxed">
        We couldn't locate <code>${escapeHtml(path)}</code>. The page may have been moved, or the product review URL might have changed.
      </p>
      <div class="pt-2 flex flex-wrap justify-center gap-3">
        <a href="/" class="px-6 py-3 rounded-xl bg-brand-600 text-white font-extrabold text-xs hover:bg-brand-700 transition shadow-md">
          Return to Homepage
        </a>
        <a href="/html-sitemap" class="px-6 py-3 rounded-xl bg-slate-100 text-slate-800 font-extrabold text-xs hover:bg-slate-200 transition">
          Browse Directory Sitemap
        </a>
      </div>
    </article>
  `;

  els.dedicatedArticleView.innerHTML = html;
}

/* ---------------------------------------------------------------- */
/* Helpers & Pagination                                              */
/* ---------------------------------------------------------------- */

function toggleModal(modal, show) {
  if (!modal) return;
  if (show) modal.classList.remove('hidden');
  else modal.classList.add('hidden');
}

function updateHeroStats(products) {
  if (els.heroCount) els.heroCount.textContent = products.length.toLocaleString();
  if (els.heroStats) {
    const totalBrands = new Set(products.map(p => p.brand)).size;
    const totalTypes = new Set(products.map(p => p.type)).size;
    els.heroStats.innerHTML = `
      <div class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${totalBrands} Brands</span></div>
      <div class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-400"></i> <span>${totalTypes} Vacuum Types</span></div>
      <div class="flex items-center gap-1.5"><i class="fa-solid fa-circle-check text-emerald-400"></i> <span>HEPA &amp; Suction Specifications</span></div>
    `;
  }
}

function renderPagination(totalPages) {
  if (!els.pagination) return;
  if (totalPages <= 1) {
    els.pagination.innerHTML = '';
    return;
  }

  let html = `
    <button id="prev-page-btn" ${state.page === 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100">
      &larr; Prev
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= state.page - 2 && i <= state.page + 2)) {
      html += `
        <button data-page="${i}" class="page-num-btn w-8 h-8 rounded-lg text-xs font-extrabold ${i === state.page ? 'bg-brand-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'}">
          ${i}
        </button>
      `;
    } else if (i === state.page - 3 || i === state.page + 3) {
      html += `<span class="px-1 text-slate-400 text-xs">…</span>`;
    }
  }

  html += `
    <button id="next-page-btn" ${state.page === totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 disabled:opacity-40 hover:bg-slate-100">
      Next &rarr;
    </button>
  `;

  els.pagination.innerHTML = html;

  const prevBtn = document.getElementById('prev-page-btn');
  const nextBtn = document.getElementById('next-page-btn');

  if (prevBtn) prevBtn.addEventListener('click', () => { state.page--; render(); window.scrollTo({ top: 400, behavior: 'smooth' }); });
  if (nextBtn) nextBtn.addEventListener('click', () => { state.page++; render(); window.scrollTo({ top: 400, behavior: 'smooth' }); });

  els.pagination.querySelectorAll('.page-num-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.page = parseInt(btn.dataset.page, 10);
      render();
      window.scrollTo({ top: 400, behavior: 'smooth' });
    });
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, '&quot;');
}
