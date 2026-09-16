// Server-side renderer for full Vacuum Cleaner Lab review articles and reviews hub
import { ALL_REVIEWS } from './reviews-data.js';
import { getRelatedGuidesForReview, getCompetingReviews } from './internal-linking-data.js';

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

export function renderServerReviewArticlePage(review, origin, allProducts) {
  if (!review) {
    return `<div class="p-8 text-center text-slate-600">Review not found. <a href="/reviews" class="text-brand-600 underline">Browse all reviews</a>.</div>`;
  }

  const amazonUrl = review.amazonUrl || 'https://www.amazon.com/s?k=' + encodeURIComponent(review.title) + '&tag=wat344r5-20';
  const categoryUrl = review.categoryUrl || `/category/${slugify(review.category)}`;
  const brandSlug = slugify(review.brand);
  const criteria = review.criteria || [
    { name: 'Design', score: '90%' },
    { name: 'Features', score: '90%' },
    { name: 'Health', score: '95%' },
    { name: 'Price', score: '90%' }
  ];

  return `
    <article class="space-y-8 text-slate-800" data-review-slug="${escapeAttr(review.slug)}">
      
      <!-- Top Action Bar -->
      <div class="flex items-center justify-between gap-4">
        <a href="/reviews" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition">
          <i class="fa-solid fa-arrow-left"></i> All Vacuum Reviews
        </a>
        <button id="page-copy-md-btn" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
          <i class="fa-solid fa-copy"></i> Copy Review
        </button>
      </div>

      <!-- Hero Header with Product Image -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-40">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-40% to-transparent"></div>
        </div>

        <div class="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-8 space-y-4">
            <div class="flex flex-wrap items-center gap-2">
              <a href="/brand/${brandSlug}" class="px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider hover:bg-brand-500/30 transition">
                ${escapeHtml(review.brand)}
              </a>
              <a href="${escapeAttr(categoryUrl)}" class="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold hover:bg-slate-700 transition">
                ${escapeHtml(review.category)}
              </a>
              <div class="flex items-center gap-1 text-amber-400 font-extrabold text-sm ml-auto sm:ml-0">
                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                <span class="text-white ml-1.5">${review.overallScore} / 5.0 (Editor Rating)</span>
              </div>
            </div>

            <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              ${escapeHtml(review.title)}
            </h1>

            <div class="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed">
              ${(review.introParas || []).map(p => `<p>${escapeHtml(p)}</p>`).join('')}
            </div>

            <div class="pt-2 flex flex-wrap items-center gap-3">
              <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs transition inline-flex items-center gap-2 shadow-sm">
                <i class="fa-brands fa-amazon"></i> See Customer Rating
              </a>
              <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition inline-flex items-center gap-2">
                Check Price on Amazon &rarr;
              </a>
              <a href="${escapeAttr(categoryUrl)}" class="px-4 py-2.5 rounded-xl bg-brand-600/80 hover:bg-brand-600 text-white font-bold text-xs transition inline-flex items-center gap-1.5">
                ${escapeHtml(review.category)}
              </a>
            </div>

            ${(() => {
              const rGuides = getRelatedGuidesForReview(review.slug);
              if (!rGuides || rGuides.length === 0) return '';
              return `
                <div class="pt-2 flex items-center gap-2 flex-wrap text-xs text-slate-300">
                  <span class="font-bold text-amber-400 flex items-center gap-1">
                    <i class="fa-solid fa-trophy text-amber-400"></i> Featured In Guides:
                  </span>
                  ${rGuides.map(g => `
                    <a href="/guides/${escapeAttr(g.slug)}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-300 hover:text-white border border-slate-700 font-bold text-[11px] transition">
                      <i class="fa-solid fa-bookmark text-[9px] text-amber-400"></i> ${escapeHtml(g.shortTitle || g.title)} &rarr;
                    </a>
                  `).join('')}
                </div>
              `;
            })()}
          </div>

          <!-- Product Image Card -->
          <div class="lg:col-span-4 flex flex-col items-center">
            <div class="bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 text-center space-y-4 w-full max-w-xs">
              <div class="h-64 flex items-center justify-center p-2 bg-slate-50 rounded-xl overflow-hidden">
                <img src="${escapeAttr(review.imagePath)}" 
                     alt="${escapeAttr(review.title)}" 
                     class="max-h-full max-w-full object-contain"
                     onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
              </div>
              <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span class="font-extrabold text-slate-900">Editor Score</span>
                <span class="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">${review.overallScore} / 5.0</span>
              </div>
              <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="w-full block py-2 px-3 rounded-lg bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs text-center transition">
                <i class="fa-brands fa-amazon mr-1"></i> See Customer Rating
              </a>
            </div>
          </div>
        </div>
      </header>

      <!-- Editor Rating Section -->
      <section class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-award text-amber-500"></i> Editor Rating
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">Comprehensive benchmark assessment based on laboratory evaluations.</p>
          </div>
          <div class="flex items-center gap-3">
            <div class="text-right">
              <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Score</div>
              <div class="text-2xl font-black text-slate-900 leading-none">${review.overallScore} <span class="text-sm font-normal text-slate-400">/ 5.0</span></div>
            </div>
            <div class="p-3 bg-amber-50 text-amber-500 rounded-2xl flex items-center text-lg">
              <i class="fa-solid fa-star"></i>
            </div>
          </div>
        </div>

        <!-- Rating Categories Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          ${criteria.map(c => {
            const pct = parseInt(c.score, 10) || 90;
            return `
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div class="flex items-center justify-between text-xs font-extrabold text-slate-700">
                  <span>${escapeHtml(c.name)}</span>
                  <span class="text-brand-600">${escapeHtml(c.score)}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="bg-brand-600 h-2 rounded-full" style="width: ${pct}%;"></div>
                </div>
                <div class="text-[11px] text-slate-400 font-medium flex items-center gap-1 pt-1">
                  <i class="fa-solid fa-circle-check text-emerald-500 text-[10px]"></i> Evaluated
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Summary Box -->
        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Summary</h3>
            <span class="text-xs font-black text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              Score: ${review.overallScore}
            </span>
          </div>
          <p class="text-sm text-slate-600 leading-relaxed">
            ${escapeHtml(review.summaryText || '')}
          </p>
          <div class="pt-1">
            <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="inline-flex items-center gap-2 text-xs font-extrabold text-amber-600 hover:text-amber-700 hover:underline">
              <i class="fa-brands fa-amazon"></i> See Customer Rating on Amazon &rarr;
            </a>
          </div>
        </div>
      </section>

      <!-- Pros & Cons Grid -->
      <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Pros -->
        <div class="bg-white rounded-3xl border border-emerald-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3 border-b border-emerald-100 pb-3">
            <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-thumbs-up"></i>
            </div>
            <h2 class="text-lg font-extrabold text-slate-900">Pros</h2>
          </div>
          <ul class="space-y-2.5 text-sm text-slate-700">
            ${(review.pros || []).map(pro => `
              <li class="flex items-start gap-2.5">
                <i class="fa-solid fa-circle-check text-emerald-500 mt-1 shrink-0"></i>
                <span>${escapeHtml(pro)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- Cons -->
        <div class="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div class="flex items-center gap-3 border-b border-rose-100 pb-3">
            <div class="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              <i class="fa-solid fa-thumbs-down"></i>
            </div>
            <h2 class="text-lg font-extrabold text-slate-900">Cons</h2>
          </div>
          <ul class="space-y-2.5 text-sm text-slate-700">
            ${(review.cons || []).map(con => `
              <li class="flex items-start gap-2.5">
                <i class="fa-solid fa-circle-xmark text-rose-500 mt-1 shrink-0"></i>
                <span>${escapeHtml(con)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </section>

      <!-- Detailed Review & Features Breakdown -->
      <section class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-8">
        <div class="border-b border-slate-100 pb-4">
          <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight">Detailed Review &amp; Features Breakdown</h2>
          <p class="text-sm text-slate-500 mt-1">Comprehensive examination of the ${escapeHtml(review.model)} features, performance, and ergonomics.</p>
        </div>

        <div class="space-y-8">
          ${(review.features || []).map(f => `
            <div class="space-y-3">
              <h3 class="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-brand-500"></span>
                ${escapeHtml(f.title)}
              </h3>
              ${(f.paragraphs || []).map(p => `
                <p class="text-slate-600 text-sm sm:text-base leading-relaxed">
                  ${escapeHtml(p)}
                </p>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Frequently Asked Questions (FAQ) -->
      ${(review.faqs && review.faqs.length > 0) ? `
        <section class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs space-y-6">
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-circle-question text-brand-600"></i> Frequently Asked Questions (FAQ)
            </h2>
            <p class="text-sm text-slate-500 mt-1">Common questions answered about the ${escapeHtml(review.title)}.</p>
          </div>

          <div class="space-y-4">
            ${review.faqs.map(faq => `
              <div class="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div class="font-extrabold text-slate-900 text-sm sm:text-base flex items-start gap-2">
                  <span class="text-brand-600 font-black">Q:</span>
                  <span>${escapeHtml(faq.q.replace(/^[Qq]\.?\s*/, ''))}</span>
                </div>
                <div class="text-slate-600 text-sm leading-relaxed pl-5">
                  ${escapeHtml(faq.a.replace(/^[Aa]\.?\s*/, ''))}
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Final Verdict -->
      <section class="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-300 font-bold">
            <i class="fa-solid fa-certificate"></i>
          </div>
          <div>
            <h2 class="text-xl font-extrabold tracking-tight">Final Verdict</h2>
            <p class="text-xs text-slate-400">Our summary recommendation</p>
          </div>
        </div>

        <p class="text-slate-200 text-sm sm:text-base leading-relaxed">
          ${escapeHtml(review.finalVerdict || '')}
        </p>

        <div class="pt-4 border-t border-slate-700/60 flex flex-wrap items-center gap-3">
          <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold text-xs transition inline-flex items-center gap-2">
            <i class="fa-brands fa-amazon"></i> See Customer Rating
          </a>
          <a href="${escapeAttr(amazonUrl)}" target="_blank" rel="nofollow sponsored" class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-600 transition inline-flex items-center gap-2">
            Check Amazon Price &rarr;
          </a>
          <a href="${escapeAttr(categoryUrl)}" class="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition">
            Compare with Other ${escapeHtml(review.category)}
          </a>
          <a href="/brand/${brandSlug}" class="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition">
            View All ${escapeHtml(review.brand)} Models
          </a>
        </div>
      </section>

      <!-- Featured In Buying Guides Section -->
      ${(() => {
        const relatedGuides = getRelatedGuidesForReview(review.slug);
        if (!relatedGuides || relatedGuides.length === 0) return '';
        return `
          <section id="review-featured-guides" class="bg-gradient-to-br from-amber-50/70 via-white to-brand-50/40 rounded-3xl border border-amber-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-4">
              <div>
                <span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-3 py-1 rounded-full mb-1">
                  <i class="fa-solid fa-bookmark text-amber-700"></i> Editorial Buying Guides
                </span>
                <h3 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Featured In Vacuum Cleaner Lab Buyer's Guides
                </h3>
                <p class="text-xs sm:text-sm text-slate-600 mt-1">
                  See how the ${escapeHtml(review.model)} scored against competing vacuum cleaners in our comprehensive category comparisons and laboratory testing guides.
                </p>
              </div>
              <a href="/guides" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:border-brand-500 text-slate-800 hover:text-brand-600 text-xs font-bold shadow-2xs self-start sm:self-auto whitespace-nowrap transition">
                All Buying Guides &rarr;
              </a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${relatedGuides.map(g => `
                <div class="p-5 bg-white rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-md transition flex flex-col justify-between space-y-3 group">
                  <div class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded border border-brand-100">${escapeHtml(g.category)}</span>
                      <span class="text-[11px] text-slate-400 font-semibold">${escapeHtml(g.readTime)}</span>
                    </div>
                    <h4 class="text-base font-extrabold text-slate-900 group-hover:text-brand-600 transition leading-snug">
                      <a href="/guides/${escapeAttr(g.slug)}">${escapeHtml(g.title)}</a>
                    </h4>
                    <p class="text-xs text-amber-950/90 font-medium leading-relaxed bg-amber-50/70 p-3 rounded-xl border border-amber-100">
                      <i class="fa-solid fa-award text-amber-600 mr-1.5"></i> ${escapeHtml(g.contextNote)}
                    </p>
                  </div>
                  <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-600">${escapeHtml(g.priceRange)}</span>
                    <a href="/guides/${escapeAttr(g.slug)}" class="inline-flex items-center gap-1 font-extrabold text-brand-600 hover:text-brand-800">
                      Read Buying Guide &rarr;
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
      })()}

      <!-- Direct Competitors & Bench-Tested Alternatives -->
      ${(() => {
        const competitors = getCompetingReviews(review.slug);
        if (!competitors || competitors.length === 0) return '';
        return `
          <section id="review-competing-models" class="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span class="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-full mb-1">
                  <i class="fa-solid fa-scale-balanced text-brand-600"></i> Side-by-Side Contenders
                </span>
                <h3 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Direct Competitors Tested in This Class
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                  Compare laboratory test results, suction benchmarks, and user satisfaction with competing models in the same category.
                </p>
              </div>
              <a href="/reviews" class="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline self-start sm:self-auto">
                Explore All 19 Reviews &rarr;
              </a>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${competitors.map(comp => `
                <div class="p-5 bg-slate-50/60 rounded-2xl border border-slate-200/80 hover:border-brand-300 hover:bg-white hover:shadow-md transition flex flex-col justify-between space-y-4 group">
                  <div class="space-y-3">
                    <div class="h-36 bg-white rounded-xl border border-slate-100 p-2 flex items-center justify-center overflow-hidden">
                      <img src="${escapeAttr(comp.imagePath)}" alt="${escapeAttr(comp.title)}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                    </div>
                    <div>
                      <div class="flex items-center justify-between text-[11px] mb-1">
                        <span class="font-bold text-brand-600 uppercase tracking-wider">${escapeHtml(comp.brand)}</span>
                        <span class="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60"><i class="fa-solid fa-star text-[9px] text-amber-500"></i> ${comp.overallScore}</span>
                      </div>
                      <h4 class="text-sm font-extrabold text-slate-900 group-hover:text-brand-600 transition leading-snug">
                        <a href="/reviews/${escapeAttr(comp.slug)}">${escapeHtml(comp.title)}</a>
                      </h4>
                    </div>
                    <p class="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      ${escapeHtml(comp.summaryVerdict)}
                    </p>
                  </div>
                  <div class="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span class="font-bold text-slate-700">${escapeHtml(comp.price)}</span>
                    <a href="/reviews/${escapeAttr(comp.slug)}" class="font-extrabold text-brand-600 hover:underline inline-flex items-center gap-1">
                      Full Review &rarr;
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </section>
        `;
      })()}

      <!-- Related Category & Buying Guides Directory -->
      <section class="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Explore Related Guides &amp; Categories</h3>
          <a href="/guides" class="text-xs font-bold text-brand-600 hover:underline">All Buying Guides &rarr;</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="${escapeAttr(categoryUrl)}" class="p-4 bg-white hover:bg-brand-50 rounded-2xl border border-slate-200 hover:border-brand-500 transition group">
            <div class="font-extrabold text-slate-900 text-sm group-hover:text-brand-600 transition">${escapeHtml(review.category)} Directory</div>
            <div class="text-xs text-slate-500 mt-1">Browse all verified ${escapeHtml(review.category).toLowerCase()} models.</div>
          </a>
          <a href="/guides/best-vacuum-cleaners-under-200" class="p-4 bg-white hover:bg-brand-50 rounded-2xl border border-slate-200 hover:border-brand-500 transition group">
            <div class="font-extrabold text-slate-900 text-sm group-hover:text-brand-600 transition">Best Vacuums Under $200</div>
            <div class="text-xs text-slate-500 mt-1">Top budget performance tested by our lab technicians.</div>
          </a>
          <a href="/guides/best-vacuum-for-pet-hair" class="p-4 bg-white hover:bg-brand-50 rounded-2xl border border-slate-200 hover:border-brand-500 transition group">
            <div class="font-extrabold text-slate-900 text-sm group-hover:text-brand-600 transition">Best Vacuums for Pet Hair</div>
            <div class="text-xs text-slate-500 mt-1">Tested against stubborn pet fur, dander, and deep carpet fibers.</div>
          </a>
        </div>
      </section>

    </article>
  `;
}

export function renderServerReviewsHubPage(origin, allProducts, allReviews = ALL_REVIEWS) {
  const reviews = allReviews || ALL_REVIEWS;
  const featured = reviews.find(r => r.slug.includes('shark-professional-navigator')) || reviews[0];

  // Group counts
  const brandCounts = {};
  const categoryCounts = {};
  reviews.forEach(r => {
    brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });

  return `
    <article class="space-y-8 text-slate-800" id="reviews-hub-container">
      
      <!-- Reviews Hub Header -->
      <header class="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl space-y-4">
        <div class="absolute inset-0 z-0 flex justify-end pointer-events-none opacity-40">
          <div class="relative w-full md:w-3/4 lg:w-2/3 h-full">
            <img src="/assets/vacuum_hero_banner.jpg" alt="Vacuum Banner Background" class="w-full h-full object-cover object-right brightness-110" />
            <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 via-35% to-transparent"></div>
        </div>

        <div class="relative z-10 space-y-3 max-w-3xl">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-extrabold uppercase tracking-wider">
            <i class="fa-solid fa-star-half-stroke text-brand-400"></i> Comprehensive Reviews &amp; Lab Ratings
          </div>
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Vacuum Cleaner Reviews (${reviews.length} Articles)
          </h1>
          <p class="text-slate-300 text-sm sm:text-base leading-relaxed">
            Read complete, unfiltered vacuum cleaner evaluations covering suction pressure tests, motor endurance, HEPA allergen sealing, pet hair pickup, weight ergonomics, and long-term durability.
          </p>
          <div class="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-400 font-medium">
            <span><i class="fa-solid fa-circle-check text-emerald-400 mr-1"></i> ${reviews.length} Full Review Articles Published</span>
            <span><i class="fa-solid fa-shield-check text-emerald-400 mr-1"></i> Unbiased &amp; Spec-Backed</span>
            <span><i class="fa-solid fa-scale-balanced text-amber-400 mr-1"></i> Tested Against Lab Benchmarks</span>
          </div>
        </div>
      </header>

      <!-- PUBLISHED REVIEWS SHOWCASE SECTION (All Reviews in Featured Format) -->
      <section class="space-y-6" id="reviews-showcase-section">
        <div class="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 class="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <i class="fa-solid fa-layer-group text-brand-600"></i> In-Depth Vacuum Review Articles (${reviews.length})
            </h2>
            <p class="text-xs sm:text-sm text-slate-500 mt-1">Complete evaluations, laboratory benchmarks, pros &amp; cons, and direct purchase options.</p>
          </div>
          <div class="flex flex-wrap items-center gap-2 text-xs font-bold" id="reviews-brand-filter-bar">
            <a href="/reviews" class="px-3 py-1.5 rounded-xl bg-brand-600 text-white shadow-xs">All (${reviews.length})</a>
            ${Object.entries(brandCounts).map(([brand, count]) => `
              <a href="/brand/${slugify(brand)}" class="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                ${escapeHtml(brand)} (${count})
              </a>
            `).join('')}
          </div>
        </div>

        <!-- All Review Article Cards in Full Featured Format -->
        <div class="space-y-6" id="all-reviews-articles-container">
          ${reviews.map((r, idx) => {
            const bSlug = slugify(r.brand);
            const cUrl = r.categoryUrl || `/category/${slugify(r.category)}`;
            const aUrl = r.amazonUrl || 'https://www.amazon.com/s?k=' + encodeURIComponent(r.title) + '&tag=wat344r5-20';
            const shortSummary = r.summaryText 
              ? (r.summaryText.length > 250 ? r.summaryText.substring(0, 247) + '...' : r.summaryText)
              : (r.introParas && r.introParas[0] ? r.introParas[0] : '');
            const isFeatured = idx === 0;

            return `
              <div class="review-article-card bg-white rounded-3xl border-2 ${isFeatured ? 'border-brand-500/40 ring-2 ring-brand-500/10' : 'border-slate-200 hover:border-brand-500/40'} p-6 sm:p-8 shadow-md hover:shadow-xl transition flex flex-col lg:flex-row items-center gap-8" data-brand="${escapeAttr(bSlug)}">
                <!-- Image -->
                <a href="/reviews/${r.slug}" class="w-full sm:w-72 lg:w-80 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-center group overflow-hidden">
                  <img src="${escapeAttr(r.imagePath)}" 
                       alt="${escapeAttr(r.title)}" 
                       class="max-h-56 max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                       onerror="this.onerror=null; this.src='/assets/vacuum_placeholder.svg';" />
                </a>

                <!-- Details & Excerpt -->
                <div class="flex-1 space-y-4 w-full">
                  <div class="flex flex-wrap items-center gap-2">
                    <a href="/brand/${bSlug}" class="px-2.5 py-0.5 rounded-md bg-brand-100 hover:bg-brand-200 text-brand-800 text-xs font-bold transition">
                      ${escapeHtml(r.brand)}
                    </a>
                    <a href="${escapeAttr(cUrl)}" class="px-2.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
                      ${escapeHtml(r.category)}
                    </a>
                    ${isFeatured ? `
                      <span class="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase tracking-wide">
                        Editor's Choice
                      </span>
                    ` : ''}
                    <div class="flex items-center gap-1 text-amber-500 font-extrabold text-xs ml-auto">
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star"></i>
                      <i class="fa-solid fa-star-half-stroke"></i>
                      <span class="text-slate-900 ml-1 text-sm font-black">${r.overallScore || '4.5'} / 5.0</span>
                    </div>
                  </div>

                  <h3 class="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
                    <a href="/reviews/${r.slug}" class="hover:text-brand-600 transition">
                      ${escapeHtml(r.title)}
                    </a>
                  </h3>

                  <p class="text-sm text-slate-600 leading-relaxed">
                    ${escapeHtml(shortSummary)}
                  </p>

                  <div class="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span class="bg-emerald-50 text-emerald-800 border border-emerald-200/50 px-2.5 py-1 rounded-md font-medium"><strong>${(r.pros || []).length}</strong> Pros Evaluated</span>
                    <span class="bg-rose-50 text-rose-800 border border-rose-200/50 px-2.5 py-1 rounded-md font-medium"><strong>${(r.cons || []).length}</strong> Cons Noted</span>
                    <span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium"><strong>${(r.features || []).length}</strong> Feature Breakdowns</span>
                    <span class="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-medium"><strong>${(r.faqs || []).length}</strong> FAQs Answered</span>
                  </div>

                  <div class="pt-2 flex flex-wrap items-center gap-3">
                    <a href="/reviews/${r.slug}" class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs transition inline-flex items-center gap-2 shadow-xs">
                      Read Full Review <i class="fa-solid fa-arrow-right"></i>
                    </a>
                    <a href="${escapeAttr(aUrl)}" target="_blank" rel="nofollow sponsored" class="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs transition inline-flex items-center gap-1.5 shadow-xs">
                      <i class="fa-brands fa-amazon"></i> See Customer Rating
                    </a>
                    <a href="${escapeAttr(aUrl)}" target="_blank" rel="nofollow sponsored" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition inline-flex items-center gap-1.5">
                      Check Amazon Price &rarr;
                    </a>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>

      <!-- Category Quick Links -->
      <section class="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
        <h3 class="font-extrabold text-sm text-slate-900 uppercase tracking-wider text-brand-600">Browse Vacuum Cleaners By Category</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-bold text-center">
          <a href="/category/upright-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Upright
          </a>
          <a href="/category/cordless-stick" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Cordless Stick
          </a>
          <a href="/category/robot-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Robot
          </a>
          <a href="/category/canister-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Canister
          </a>
          <a href="/category/handheld-vacuums" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Handheld
          </a>
          <a href="/category/dry-wet" class="p-3 bg-white rounded-xl border border-slate-200 hover:border-brand-500 transition text-slate-800 hover:text-brand-600">
            Wet &amp; Dry
          </a>
        </div>
      </section>

    </article>
  `;
}
