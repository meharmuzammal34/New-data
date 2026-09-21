const fs = require('fs');
const path = require('path');

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/parsed_reviews.json'), 'utf8'));

// Include the 19th review: Shark Professional Navigator Upright Vacuum Cleaner Review
const sharkProNavigator = {
  slug: 'shark-professional-navigator-upright-vacuum-cleaner-review',
  title: 'Shark Professional Navigator Upright Vacuum Cleaner Review',
  brand: 'Shark',
  model: 'Professional Navigator Upright NV356E',
  category: 'Upright Vacuums',
  categoryUrl: '/category/upright-vacuums',
  overallScore: '4.5',
  criteria: [
    { name: 'Design', score: '90%' },
    { name: 'Features', score: '90%' },
    { name: 'Health', score: '95%' },
    { name: 'Price', score: '90%' }
  ],
  amazonUrl: 'https://www.amazon.com/dp/B005KMDV9A?tag=vacuumcleanerlab-20',
  imagePath: '/assets/vendorimagesNV356E_Image1._CB304632530_.jpg',
  summaryText: 'After some careful research I have come upon the Shark Professional Navigator Upright, which stands out as one of the best vacuum cleaner options on the market. This Lift-Away vacuum cleaner prides itself on it’s never lose suction ability, and its anti-allergen complete seal system. The powerful, portable, lightweight and large capacity vacuum cleaner therefore allows you to execute deep carpet cleaning and bare floor cleaning like never before.',
  introParas: [
    'While the process of buying a vacuum cleaner might seem simple, it is actually complicated by the sheer number of styles, brands, and models on offer. Trying to determine which vacuum cleaner is the most powerful, technologically advanced, and budget friendly, is therefore a monumental task. So what do you do in this situation? Simple; you can ask me!',
    'After some careful research I have come upon the Shark Professional Navigator Upright, which stands out as one of the best vacuum cleaner options on the market. This Lift-Away vacuum cleaner prides itself on it’s never lose suction ability, and its anti-allergen complete seal system.',
    'The powerful, portable, lightweight and large capacity vacuum cleaner therefore allows you to execute deep carpet cleaning and bare floor cleaning like never before. So if you are looking for a quick and easy way to clean your house, read the Shark Pro Navigator review below.'
  ],
  features: [
    {
      title: 'Never Lose Suction and Sealed Vacuum Technology',
      paragraphs: [
        'The Shark Pro Navigator is equipped with advanced cyclonic technology, which works to efficiently separate fine dirt from your air. In this way dirt is prevented from clogging up your filters, in turn ensuring that your vacuum cleaner does not lose suction with time.',
        'Additionally, this upright vacuum is composed of Shark’s popular anti-allergen Complete Seal Technology, and top notch HEPA filtration system. These two features work seamlessly to capture and remove 99.9% of dust and allergens, so that you can breathe fresh air.'
      ]
    },
    {
      title: 'Lift Away Canister and Premium Attachments',
      paragraphs: [
        'Another great feature of the Shark Navigator is its lightweight, portable, and large capacity dust cup, which allows you to conveniently move around your house and car without feeling bogged down. This easy to empty dust cup works closely with a dust-away hard floor attachment and a powerful pet attachment.',
        'The patented dust-away attachment allows for efficient and powerful floor cleaning, while the pet attachment makes it easy to lift pet hair from the floor, carpets, and upholstery. Lastly, the Navigator has a microfiber pad that will wipe away tiny dirt particles that are invisible to the eye.'
      ]
    },
    {
      title: 'Swivel Steering',
      paragraphs: [
        'The Navigator is also popular for its swivel steering, which allows you to maneuver around furniture and obstacles without losing control of the vacuum. The swivel steering combined with the lightweight design of the vacuum make is simple and fun to execute your cleaning.'
      ]
    },
    {
      title: 'Amazing Deep Carpet Cleaning',
      paragraphs: [
        'The upright vacuum cleaner also consists of powerful suction abilities, which allow you to pick up all visible and invisible dirt embedded into you carpet. This upright therefore has the ability to clean thick carpets as easily as it can clean bare floors and rugs.',
        'The efficient vacuum cleaner is therefore perfect for cleaning up all the dirt, dust, and pet hair found deep down in your carpets.'
      ]
    },
    {
      title: 'Brushroll',
      paragraphs: [
        'The Navigator Upright can also perform multi-surface cleaning, thanks to its motorized rotating brush. This brushroll has an on/off switch, which you can use depending on whether you are cleaning bare floors or thick carpets. When the brushroll is on it will loosen up dirt embedded in your carpet fibers, and when it is off it can clean bare floors without causing any scratches.'
      ]
    }
  ],
  pros: [
    'Foam and HEPA filters work efficiently',
    'Cord is long',
    'Can clean a wide array of surfaces',
    'Easy to maneuver',
    'Has anti-allergen technology',
    'Excellent suction',
    'Price is great',
    'Dust cup cleans easily',
    'Easy to assemble',
    'Lightweight and sturdy construction',
    'Quiet performance',
    'Can switch between an upright and canister vacuum'
  ],
  cons: [
    'Hose is short',
    'Poor edge cleaning',
    'No on-board storage'
  ],
  faqs: [
    {
      q: 'Q. What accessories do you get with the Professional Navigator Upright vacuum cleaner?',
      a: 'A. The Upright comes with a dusting brush, 8 inch crevice tool, pet hair power brush, microfiber pad, and a dust away hard floor attachment.'
    },
    {
      q: 'Q. What is the difference between the standard brush roll and gentle brush roll?',
      a: 'A. The standard brush is designed for the carpet, while the gentle brush is designed for hardwood floors.'
    },
    {
      q: 'Q. Are the filters of the Shark Professional Navigator washable?',
      a: 'A. Yes, the foam and HEPA filters are easy to wash.'
    }
  ],
  finalVerdict: 'The Shark Professional Navigator is an excellent vacuum cleaner that boasts of sturdy construction and a user friendly design. There is no doubt that this vacuum cleaner is the best in its class and price range. You won’t find better!'
};

const allReviews = [sharkProNavigator, ...parsed];

const fileContent = `// Autogenerated comprehensive vacuum reviews database (19 articles)
export const ALL_REVIEWS = ${JSON.stringify(allReviews, null, 2)};

export const REVIEWS_BY_SLUG = new Map();
ALL_REVIEWS.forEach(r => {
  REVIEWS_BY_SLUG.set(r.slug, r);
  REVIEWS_BY_SLUG.set('/reviews/' + r.slug, r);
  REVIEWS_BY_SLUG.set('/' + r.slug, r);
  REVIEWS_BY_SLUG.set(r.slug.replace(/-review$/, ''), r);
  REVIEWS_BY_SLUG.set(r.slug + '/', r);
});

export function getReviewBySlug(slug) {
  if (!slug) return null;
  const clean = slug.replace(/^\\/?(reviews|vacuum|product)\\//, '').replace(/^\\//, '').replace(/\\/$/, '');
  return REVIEWS_BY_SLUG.get(clean) || 
         REVIEWS_BY_SLUG.get(slug) || 
         ALL_REVIEWS.find(r => r.slug === clean || r.slug.includes(clean) || clean.includes(r.slug));
}
`;

fs.writeFileSync(path.join(__dirname, '../reviews-data.js'), fileContent, 'utf8');

const clientFileContent = `// Autogenerated comprehensive vacuum reviews database (19 articles)
window.VAC_REVIEWS = ${JSON.stringify(allReviews, null, 2)};
window.getArchiveReviewBySlug = function(slug) {
  if (!slug || !window.VAC_REVIEWS) return null;
  const clean = slug.replace(/^\\/?(reviews|vacuum|product)\\//, '').replace(/^\\//, '').replace(/\\/$/, '');
  return window.VAC_REVIEWS.find(r => r.slug === clean || r.slug === slug || r.slug === '/' + clean || clean.includes(r.slug) || r.slug.includes(clean));
};
`;
fs.writeFileSync(path.join(__dirname, '../js/reviews-data.js'), clientFileContent, 'utf8');

console.log(`Successfully generated reviews-data.js and js/reviews-data.js with ${allReviews.length} full reviews!`);
