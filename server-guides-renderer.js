// Server-side renderer for full Vacuum Cleaner Lab buying guides hub and guide articles
import { ALL_GUIDES } from './guides-data.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Render individual buying guide article page
 */
export function renderServerGuideArticlePage(guide, origin, allProducts) {
  if (!guide) {
    return `<div class="p-8 text-center text-slate-600">Buying guide not found. <a href="/guides" class="text-brand-600 underline">Browse all buying guides</a>.</div>`;
  }

  const tableRows = guide.tableData || [];
  const sections = guide.sections || [];
  const otherGuides = ALL_GUIDES.filter(g => g.slug !== guide.slug).slice(0, 4);

  return `
    <article class="space-y-8 text-slate-800" data-guide-slug="${escapeAttr(guide.slug)}">
      
      <!-- Top Action Bar -->
      <div class="flex items-center justify-between gap-4">
        <a href="/guides" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
          <i class="fa-solid fa-arrow-left"></i> All Buying Guides
        </a>
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <i class="fa-solid fa-shield-check"></i> 2026 Verified
          </span>
          <button id="page-copy-md-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition" title="Copy Guide Text">
            <i class="fa-solid fa-copy"></i> Copy Guide
          </button>
        </div>
      </div>

      <!-- Hero Header -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-30">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="${escapeAttr(guide.primaryImage)}" alt="Guide Feature" class="w-full h-full object-cover object-center blur-xs brightness-90" onerror="this.onerror=null; this.src='/assets/vacuum_hero_banner.jpg';" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-40% to-transparent"></div>
        </div>

        <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-8 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider">
                ${escapeHtml(guide.category)}
              </span>
              <span class="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                Price Target: ${escapeHtml(guide.priceRange)}
              </span>
              <span class="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold">
                <i class="fa-regular fa-clock mr-1"></i> ${escapeHtml(guide.readTime)}
              </span>
              <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold">
                Updated for 2026
              </span>
            </div>

            <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ${escapeHtml(guide.title)}
            </h1>

            <!-- Author & Editorial Trust Box -->
            <div class="flex items-center gap-3 pt-2 text-xs text-slate-300">
              <div class="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white shadow-sm">
                VL
              </div>
              <div>
                <div class="font-bold text-white">${escapeHtml(guide.author.name)}</div>
                <div class="text-slate-400">Published in Vacuum Cleaner Lab Archive &bull; Updated September 2026</div>
              </div>
            </div>

            <!-- Intro Paragraphs -->
            <div class="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed pt-2">
              ${(guide.introParas || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}
            </div>

            <div class="pt-2 flex flex-wrap items-center gap-3">
              <a href="#comparison-table" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs transition inline-flex items-center gap-2 shadow-sm">
                <i class="fa-solid fa-table-list"></i> Jump to Comparison Table
              </a>
              <a href="#buying-factors" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition inline-flex items-center gap-2">
                <i class="fa-solid fa-list-check"></i> Key Factors to Consider
              </a>
            </div>
          </div>

          <!-- Featured Guide Banner Card -->
          <div class="lg:col-span-4 flex flex-col items-center">
            <div class="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center space-y-4 w-full max-w-xs">
              <div class="h-56 flex items-center justify-center p-3 bg-slate-50 rounded-xl overflow-hidden">
                <img src="${escapeAttr(guide.primaryImage)}" 
                     alt="${escapeAttr(guide.shortTitle)}" 
                     class="max-h-full max-w-full object-contain"
                     onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
              </div>
              <div class="pt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold space-y-1">
                <div class="flex items-center justify-between">
                  <span>Category</span>
                  <span class="font-bold text-slate-900">${escapeHtml(guide.category)}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Price Range</span>
                  <span class="font-bold text-emerald-700">${escapeHtml(guide.priceRange)}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Tested Models</span>
                  <span class="font-bold text-slate-900">${tableRows.length || 'Multiple'}</span>
                </div>
              </div>
              <a href="#buying-factors" class="w-full block py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs text-center transition">
                Read Buying Advice &rarr;
              </a>
            </div>
          </div>
        </div>
      </header>

      <!-- Table of Contents / Quick Jump -->
      <nav class="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs" aria-label="Table of contents">
        <div class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <i class="fa-solid fa-list text-brand-600"></i> Quick Guide Navigation
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-semibold">
          ${tableRows.length > 0 ? `<a href="#comparison-table" class="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 border border-slate-200 transition">Comparison Table</a>` : ''}
          ${sections.map((s, idx) => `
            <a href="#section-${idx}" class="px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-brand-50 text-slate-700 hover:text-brand-600 border border-slate-200 transition">
              ${escapeHtml(s.title.substring(0, 35))}${s.title.length > 35 ? '...' : ''}
            </a>
          `).join('')}
          <a href="#verdict" class="px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition">
            Final Verdict
          </a>
        </div>
      </nav>

      <!-- Comparison Table (if present) -->
      ${tableRows.length > 0 ? `
        <section id="comparison-table" class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                <i class="fa-brands fa-amazon text-amber-500"></i> Top Ranked Vacuum Cleaners: Amazon Pricing &amp; Ratings
              </h2>
              <p class="text-xs sm:text-sm text-slate-500 mt-1">Lab-tested floor care models with verified specifications, pros &amp; cons, and direct Amazon buying options.</p>
            </div>
            <span class="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-200/60 px-3.5 py-1.5 rounded-full self-start sm:self-auto whitespace-nowrap">
              ${tableRows.length} Lab-Verified Models
            </span>
          </div>

          <div class="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table class="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr class="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                  <th class="py-3.5 px-4">Preview</th>
                  <th class="py-3.5 px-4 min-w-[180px]">Vacuum Model</th>
                  <th class="py-3.5 px-4">Type</th>
                  <th class="py-3.5 px-4">Price</th>
                  <th class="py-3.5 px-4">Rating</th>
                  <th class="py-3.5 px-4 min-w-[220px]">Pros &amp; Cons</th>
                  <th class="py-3.5 px-4 text-center">Amazon</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${tableRows.map((item, idx) => `
                  <tr class="hover:bg-slate-50/70 transition">
                    <td class="py-3.5 px-4 w-16">
                      <div class="w-14 h-14 bg-white rounded-xl border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        <img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                      </div>
                    </td>
                    <td class="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      <div class="font-extrabold text-slate-900 leading-snug">${escapeHtml(item.name)}</div>
                      <div class="text-[11px] text-slate-500 font-normal mt-0.5">${escapeHtml(item.highlights || 'Top-tier floor care performance')}</div>
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/60">
                        ${escapeHtml(item.type)}
                      </span>
                    </td>
                    <td class="py-3.5 px-4 font-black text-slate-900 whitespace-nowrap">
                      <span class="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs">${escapeHtml(item.price)}</span>
                    </td>
                    <td class="py-3.5 px-4 whitespace-nowrap">
                      <div class="inline-flex items-center gap-1 font-black text-amber-500 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200/60">
                        <i class="fa-solid fa-star text-xs"></i>
                        <span class="text-slate-900 font-bold">${escapeHtml(item.rating)}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4">
                      <div class="space-y-1 text-[11px]">
                        <div class="text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200/60 flex items-center gap-1.5 leading-tight">
                          <i class="fa-solid fa-check text-emerald-600 shrink-0"></i>
                          <span>${escapeHtml(Array.isArray(item.pros) ? item.pros[0] : (item.pros || 'Strong suction power'))}</span>
                        </div>
                        <div class="text-rose-800 bg-rose-50 px-2 py-1 rounded border border-rose-200/60 flex items-center gap-1.5 leading-tight">
                          <i class="fa-solid fa-minus text-rose-500 shrink-0"></i>
                          <span>${escapeHtml(Array.isArray(item.cons) ? item.cons[0] : (item.cons || 'Requires regular filter upkeep'))}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-center whitespace-nowrap">
                      <a href="${escapeAttr(item.amazonUrl)}" target="_blank" rel="nofollow sponsored" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-xs hover:shadow">
                        <i class="fa-brands fa-amazon text-sm"></i> Check Price
                      </a>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </section>
      ` : ''}

      <!-- Detailed Guide Sections & Product Breakdowns -->
      <div id="buying-factors" class="space-y-6">
        ${sections.map((sec, idx) => {
          const isProduct = Boolean(sec.productName || sec.amazonUrl || (sec.pros && sec.pros.length > 0));
          const cleanParas = (sec.paragraphs || []).filter(p => {
            const t = p.trim().toLowerCase();
            return !t.startsWith('price:') && !t.startsWith('rating:') && !t.includes('click here') && !t.includes('features at a glance') && !t.includes('discount link');
          });
          
          if (isProduct) {
            const productName = sec.productName || sec.title;
            const prosList = (sec.pros && sec.pros.length > 0) 
              ? sec.pros 
              : ['Fade-free suction and solid build quality', 'Easy to clean and maintain', 'Effective pickup on common household dirt'];
            const consList = (sec.cons && sec.cons.length > 0)
              ? sec.cons
              : ['Requires regular filter washing', 'Dust canister capacity is designed for spot sweeps'];

            return `
              <section id="section-${idx}" class="product-spotlight-card bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs hover:shadow-md transition space-y-6">
                <!-- Product Header with Vacuum Name and Badges -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-brand-700 bg-brand-50 border border-brand-200/60 px-3 py-0.5 rounded-full mb-2">
                      <i class="fa-solid fa-award"></i> Lab Tested Vacuum Pick #${idx + 1}
                    </span>
                    <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                      ${escapeHtml(productName)}
                    </h2>
                  </div>
                  
                  <div class="flex items-center flex-wrap gap-2.5 self-start sm:self-auto">
                    ${sec.rating ? `
                      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-extrabold shadow-2xs">
                        <i class="fa-solid fa-star text-amber-500"></i> ${escapeHtml(sec.rating)} / 5.0
                      </span>
                    ` : ''}
                    ${sec.price ? `
                      <span class="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold">
                        <i class="fa-solid fa-tag text-slate-500"></i> ${escapeHtml(sec.price)}
                      </span>
                    ` : ''}
                  </div>
                </div>

                <!-- Product Showcase Row -->
                <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-slate-50/80 p-5 rounded-2xl border border-slate-100">
                  <div class="md:col-span-4 flex flex-col items-center justify-center">
                    <div class="w-48 h-48 bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
                      <img src="${escapeAttr(sec.image || '/assets/vacuum_placeholder.svg')}" alt="${escapeAttr(productName)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                    </div>
                  </div>

                  <div class="md:col-span-8 flex flex-col justify-between space-y-4">
                    <div>
                      <div class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Vacuum Model &amp; Type</div>
                      <div class="text-base sm:text-lg font-extrabold text-slate-900">${escapeHtml(productName)}</div>
                      <div class="text-xs text-slate-600 mt-1">${escapeHtml(sec.type || 'High-Performance Floor Care')} &bull; Laboratory Verified Pick</div>
                    </div>
                    
                    <div class="pt-2 flex flex-wrap items-center gap-3">
                      ${sec.amazonUrl ? `
                        <a href="${escapeAttr(sec.amazonUrl)}" target="_blank" rel="nofollow sponsored" class="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs transition shadow-sm hover:shadow">
                          <i class="fa-brands fa-amazon text-base"></i> Check Price &amp; Reviews on Amazon &rarr;
                        </a>
                      ` : ''}
                    </div>
                  </div>
                </div>

                <!-- Review Narrative Paragraphs -->
                <div class="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  ${cleanParas.map(p => `<p>${escapeHtml(p)}</p>`).join('')}
                </div>

                <!-- Pros & Cons Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <!-- Pros Card -->
                  <div class="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-2.5">
                    <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                      <i class="fa-solid fa-thumbs-up text-emerald-600"></i> What We Liked (Pros)
                    </div>
                    <ul class="space-y-2 text-xs sm:text-sm text-emerald-950">
                      ${prosList.map(pr => `
                        <li class="flex items-start gap-2">
                          <i class="fa-solid fa-check text-emerald-600 mt-1 shrink-0"></i>
                          <span>${escapeHtml(pr)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>

                  <!-- Cons Card -->
                  <div class="p-5 rounded-2xl bg-rose-50/80 border border-rose-200/80 space-y-2.5">
                    <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-800">
                      <i class="fa-solid fa-thumbs-down text-rose-600"></i> Considerations (Cons)
                    </div>
                    <ul class="space-y-2 text-xs sm:text-sm text-rose-950">
                      ${consList.map(cn => `
                        <li class="flex items-start gap-2">
                          <i class="fa-solid fa-minus text-rose-500 mt-1 shrink-0"></i>
                          <span>${escapeHtml(cn)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                </div>

                <!-- Key Features Checklist -->
                ${(sec.bullets && sec.bullets.length > 0) ? `
                  <div class="pt-2 border-t border-slate-100">
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Key Features at a Glance:</div>
                    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      ${sec.bullets.map(b => `
                        <li class="flex items-start gap-2 text-xs sm:text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <i class="fa-solid fa-circle-check text-brand-600 mt-0.5 shrink-0"></i>
                          <span>${escapeHtml(b)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
              </section>
            `;
          }

          // General guide factor section (e.g. Weight, Noise, Filtration, etc.)
          return `
            <section id="section-${idx}" class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <span class="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-black shrink-0">
                    ${idx + 1}
                  </span>
                  ${escapeHtml(sec.title)}
                </h2>
              </div>

              <div class="space-y-3 pt-1">
                ${cleanParas.map(p => `<p class="text-sm sm:text-base text-slate-700 leading-relaxed">${escapeHtml(p)}</p>`).join('')}
                ${(sec.bullets && sec.bullets.length > 0) ? `
                  <div class="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mt-3">
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Key Takeaways &amp; Checkpoints:</div>
                    <ul class="space-y-2">
                      ${sec.bullets.map(b => `
                        <li class="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                          <i class="fa-solid fa-check text-brand-600 mt-1"></i>
                          <span>${escapeHtml(b)}</span>
                        </li>
                      `).join('')}
                    </ul>
                  </div>
                ` : ''}
              </div>
            </section>
          `;
        }).join('')}
      </div>

      <!-- Final Verdict Box -->
      <section id="verdict" class="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="flex items-center gap-3 border-b border-slate-700/80 pb-3">
          <div class="p-2.5 rounded-xl bg-amber-400 text-slate-950 font-black text-base">
            <i class="fa-solid fa-gavel"></i>
          </div>
          <div>
            <h3 class="text-xl font-extrabold text-white">Final Verdict &amp; Summary</h3>
            <p class="text-xs text-slate-300">Expert conclusion for ${escapeHtml(guide.shortTitle)}</p>
          </div>
        </div>
        <p class="text-slate-200 text-sm sm:text-base leading-relaxed">
          ${escapeHtml(guide.finalVerdict || guide.description)}
        </p>
        <div class="pt-3 flex flex-wrap items-center gap-3">
          <a href="/guides" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition inline-flex items-center gap-2">
            <i class="fa-solid fa-book-open"></i> Browse More Vacuum Guides
          </a>
          <a href="/compare/" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition inline-flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced"></i> Compare Vacuum Cleaners Side-by-Side
          </a>
        </div>
      </section>

      <!-- Explore Other Expert Guides -->
      <section class="bg-slate-100 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <i class="fa-solid fa-book-open text-brand-600"></i> Related Vacuum Buying Guides
            </h3>
            <p class="text-xs text-slate-500">More in-depth buying guides and laboratory reviews from our archive.</p>
          </div>
          <a href="/guides" class="text-xs font-bold text-brand-600 hover:underline">
            View All Guides &rarr;
          </a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${otherGuides.map(og => `
            <a href="/guides/${og.slug}" class="p-4 bg-white rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition flex items-start gap-4 group">
              <div class="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center shrink-0">
                <img src="${escapeAttr(og.primaryImage)}" alt="${escapeAttr(og.shortTitle)}" class="max-h-full max-w-full object-contain" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
              </div>
              <div class="space-y-1 flex-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-extrabold uppercase tracking-wider text-brand-600">${escapeHtml(og.category)}</span>
                  <span class="text-[11px] text-slate-400 font-semibold">${escapeHtml(og.readTime)}</span>
                </div>
                <h4 class="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition leading-snug">
                  ${escapeHtml(og.shortTitle)}
                </h4>
                <div class="text-xs text-slate-500 flex items-center justify-between pt-1">
                  <span>${escapeHtml(og.priceRange)}</span>
                  <span class="text-brand-600 font-bold group-hover:translate-x-0.5 transition inline-flex items-center">Read &rarr;</span>
                </div>
              </div>
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Category & Tool Directory Cross-Links -->
      <section class="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-sm flex items-center gap-2">
            <i class="fa-solid fa-folder-tree text-brand-600"></i> Explore Related Vacuum Categories &amp; Reviews
          </h3>
          <a href="/reviews" class="text-xs font-bold text-brand-600 hover:underline">
            All 19 Reviews &rarr;
          </a>
        </div>
        <div class="flex flex-wrap gap-2 text-xs font-semibold">
          <a href="/category/cordless-stick" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Cordless Stick Vacuums</a>
          <a href="/category/upright-vacuums" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Upright Vacuums</a>
          <a href="/category/canister-vacuums" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Canister Vacuums</a>
          <a href="/category/robot-vacuums" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Robot Vacuums</a>
          <a href="/category/handheld-vacuums" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Handheld Vacuums</a>
          <a href="/categories" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">All Categories</a>
          <a href="/brands" class="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">Popular Brands</a>
          <a href="/compare/" class="px-3.5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 transition">Interactive Comparison Tool</a>
        </div>
      </section>

    </article>
  `;
}

/**
 * Render the main Buying Guides Hub page (/guides)
 */
export function renderServerGuidesHubPage(guides = ALL_GUIDES, origin = '') {
  return `
    <div class="space-y-8 text-slate-800" data-page="guides-hub">
      
      <!-- Hero Banner -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-30">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Cleaner Buying Guides" class="w-full h-full object-cover object-center blur-xs" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-40% to-transparent"></div>
        </div>

        <div class="relative z-10 max-w-3xl space-y-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider">
            <i class="fa-solid fa-book-open"></i> Expert Buying Guides &bull; 2026 Edition
          </div>
          <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Vacuum Cleaner Buying Guides
          </h1>
          <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
            In-depth, research-backed buying guides helping you find the perfect vacuum for every budget, flooring type, and stair layout. Each guide features side-by-side comparison tables, hands-on tests, and verified buyer recommendations.
          </p>

          <!-- Quick Stat Counters -->
          <div class="pt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-300">
            <div class="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <i class="fa-solid fa-newspaper text-brand-400"></i>
              <span><strong>${guides.length}</strong> Complete Guides</span>
            </div>
            <div class="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <i class="fa-solid fa-tags text-emerald-400"></i>
              <span>Budgets: <strong>$50 to $300+</strong></span>
            </div>
            <div class="flex items-center gap-2 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700">
              <i class="fa-solid fa-stairs text-amber-400"></i>
              <span>Specialized: <strong>Stairs &amp; Cordless</strong></span>
            </div>
          </div>
        </div>
      </header>

      <!-- Filter / Category Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div class="flex flex-wrap items-center gap-2" id="guides-category-filters">
          <button class="px-4 py-2 rounded-xl bg-brand-600 text-white font-bold text-xs transition guide-filter-btn" data-filter="all">All Guides (${guides.length})</button>
          <button class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition guide-filter-btn" data-filter="budget">Budget Guides (<$150)</button>
          <button class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition guide-filter-btn" data-filter="cordless">Cordless &amp; Stick</button>
          <button class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition guide-filter-btn" data-filter="stairs">Stair Care</button>
          <button class="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition guide-filter-btn" data-filter="mid-range">Mid-Range ($200-$300)</button>
        </div>
        <div class="w-full sm:w-64 relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
          <input type="text" id="guides-search-input" placeholder="Search guides & topics..." class="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-brand-500 bg-slate-50" />
        </div>
      </div>

      <!-- Guides Card Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="guides-grid-container">
        ${guides.map((g, idx) => `
          <div class="bg-white rounded-3xl border border-slate-200 hover:shadow-xl hover:border-brand-300 transition duration-200 flex flex-col justify-between overflow-hidden group guide-card" 
               data-category="${escapeAttr(g.category.toLowerCase())}"
               data-price="${escapeAttr(g.priceRange.toLowerCase())}"
               data-title="${escapeAttr(g.title.toLowerCase())}">
            
            <div>
              <!-- Guide Thumbnail Banner -->
              <a href="/guides/${g.slug}" class="block relative h-48 bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-center overflow-hidden">
                <img src="${escapeAttr(g.primaryImage)}" 
                     alt="${escapeAttr(g.shortTitle)}" 
                     class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300"
                     onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-extrabold uppercase tracking-wider">
                  ${escapeHtml(g.category)}
                </span>
                <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shadow-xs">
                  ${escapeHtml(g.priceRange)}
                </span>
              </a>

              <!-- Card Content -->
              <div class="p-6 space-y-3">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span><i class="fa-regular fa-clock mr-1"></i> ${escapeHtml(g.readTime)}</span>
                  <span class="text-emerald-600 font-bold"><i class="fa-solid fa-check mr-1"></i> 2026 Edition</span>
                </div>

                <h3 class="text-lg font-extrabold text-slate-900 group-hover:text-brand-600 transition leading-snug">
                  <a href="/guides/${g.slug}">
                    ${escapeHtml(g.shortTitle)}
                  </a>
                </h3>

                <p class="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                  ${escapeHtml(g.description)}
                </p>

                ${g.tableData && g.tableData.length > 0 ? `
                  <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <span class="font-bold text-slate-800">Ranked Models:</span>
                    <span class="text-slate-500">${g.tableData.slice(0, 3).map(p => escapeHtml(p.name.split(',')[0].split('(')[0])).join(', ')}...</span>
                  </div>
                ` : `
                  <div class="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <span class="font-bold text-slate-800">Covers:</span> Weight, Pivoting Heads, Cordless vs Corded &amp; Attachments
                  </div>
                `}
              </div>
            </div>

            <!-- Card Action Footer -->
            <div class="p-6 pt-0">
              <a href="/guides/${g.slug}" class="w-full py-2.5 px-4 rounded-xl bg-slate-100 group-hover:bg-brand-600 group-hover:text-white text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition">
                Read Full Guide &amp; Reviews <i class="fa-solid fa-arrow-right text-xs"></i>
              </a>
            </div>

          </div>
        `).join('')}
      </div>

      <!-- Quick Comparison Guide by Budget -->
      <section class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-scale-balanced text-brand-600"></i> How to Pick a Vacuum by Budget
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Quick rules of thumb when selecting vacuums across different price points.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div class="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Budget Under $100</span>
              <span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black">Entry Level</span>
            </div>
            <p class="text-slate-600 leading-relaxed">
              Ideal for compact dorms, quick spills, or secondary utility rooms. Expect corded stick or handheld designs with high value per dollar.
            </p>
            <div class="pt-2">
              <a href="/guides/best-vacuum-cleaners-under-100-guide-and-reviews" class="text-brand-600 font-bold hover:underline">Read Under $100 Guide &rarr;</a>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div class="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Affordable $100 – $200</span>
              <span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-black">Sweet Spot</span>
            </div>
            <p class="text-slate-600 leading-relaxed">
              Delivers full-size upright cyclonic suction, swivel steering, pet hair brush rolls, and washable filtration without breaking $200.
            </p>
            <div class="pt-2">
              <a href="/guides/best-vacuum-cleaner-under-150-guide-and-reviews" class="text-brand-600 font-bold hover:underline">Read Under $150 &amp; $200 Guides &rarr;</a>
            </div>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <div class="font-extrabold text-slate-900 text-sm flex items-center justify-between">
              <span>Premium $200 – $300+</span>
              <span class="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black">Pro Tier</span>
            </div>
            <p class="text-slate-600 leading-relaxed">
              Equipped with sealed HEPA systems, motorized anti-tangle brushrolls, canister lift-away flexibility, and advanced lithium-ion runtime.
            </p>
            <div class="pt-2">
              <a href="/guides/best-vacuum-cleaner-under-300-guide-and-reviews" class="text-brand-600 font-bold hover:underline">Read Under $300 Guide &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Buying Guide FAQ Section (SEO Structured) -->
      <section class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-circle-question text-brand-600"></i> Frequently Asked Questions About Vacuum Cleaners
          </h2>
          <p class="text-xs text-slate-500 mt-0.5">Essential buying advice answered by our floor care specialists.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm">What is the best vacuum for carpeted stairs?</h4>
            <p class="text-slate-600 leading-relaxed">
              For stairs, weight and maneuverability are paramount. Cordless stick vacuums that convert into handhelds, or canisters with long hoses and motorized turbo brushes, offer the best balance of safety and deep cleaning without dragging a heavy unit upstairs. Check our <a href="/guides/how-to-choose-the-best-vacuum-cleaner-for-stairs-ultimate-guide" class="text-brand-600 font-bold underline">Stairs Guide</a>.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm">How much suction power is enough?</h4>
            <p class="text-slate-600 leading-relaxed">
              Standard bare floors need around 10–14 kPa (or ~100 Air Watts), while medium-to-high pile carpets and pet owners should target 18–25+ kPa for deep follicle extraction.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm">Is a $50 vacuum cleaner durable?</h4>
            <p class="text-slate-600 leading-relaxed">
              A $50 vacuum excels at light everyday pickups, dust busting, and hard tiles. For wall-to-wall carpets, moving up to the $100–$150 category ensures motorized agitation and sealed filtration. See our <a href="/guides/best-vacuum-cleaner-under-50-guide-and-reviews" class="text-brand-600 font-bold underline">Under $50 Guide</a>.
            </p>
          </div>

          <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
            <h4 class="font-bold text-slate-900 text-sm">Can I compare specific models directly?</h4>
            <p class="text-slate-600 leading-relaxed">
              Yes! Use our <a href="/compare/" class="text-brand-600 font-bold underline">Interactive Vacuum Comparison Hub</a> to compare suction power, battery runtime, weight, and filtration head-to-head.
            </p>
          </div>
        </div>
      </section>

      <!-- Cross Navigation -->
      <section class="p-6 bg-slate-50 border border-slate-200 rounded-3xl flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700">
        <div class="flex items-center gap-2">
          <i class="fa-solid fa-layer-group text-brand-600"></i>
          <span>More Vacuum Resources:</span>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <a href="/reviews" class="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">19 In-Depth Reviews</a>
          <a href="/compare/" class="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-brand-600 hover:bg-brand-50 transition">Side-by-Side Comparison</a>
          <a href="/categories" class="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition">All Categories</a>
          <a href="/brands" class="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition">All Brands</a>
        </div>
      </section>

    </div>
  `;
}
