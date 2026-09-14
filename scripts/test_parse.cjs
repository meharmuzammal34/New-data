const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const filePath = path.join(__dirname, '../data/archive_raw/hoover-linx-cordless-stick-vacuum-cleaner-review.html');
const html = fs.readFileSync(filePath, 'utf8');
const dom = new JSDOM(html);
const doc = dom.window.document;

console.log("Title:", doc.querySelector('h1')?.textContent.trim());

// Review wrapper
const reviewWrapper = doc.querySelector('#bd-review-wrapper');
if (reviewWrapper) {
  const criteria = Array.from(reviewWrapper.querySelectorAll('.bd-review-criteria')).map(el => {
    const desc = el.querySelector('.bd-criteria-description')?.textContent.trim();
    const scoreWidth = el.querySelector('.bd-criteria-star-top')?.getAttribute('style');
    return { desc, scoreWidth };
  });
  const overall = reviewWrapper.querySelector('#bd-criteria-final-score h3')?.textContent.trim();
  const amazonBtn = reviewWrapper.querySelector('a.review-amazon-button')?.getAttribute('href');
  console.log("Rating:", { overall, criteria, amazonBtn });
}

// Entry content
const entry = doc.querySelector('.entry-content, .the-content-class, article');
console.log("Entry found:", !!entry);

// Let's see children of entry
if (entry) {
  const headings = Array.from(entry.querySelectorAll('h2, h3, h4')).map(h => h.textContent.trim());
  console.log("Headings in article:", headings);
}
