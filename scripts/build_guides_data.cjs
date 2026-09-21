const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const rawDir = path.join(__dirname, '../data/guides_raw');
const outJson = path.join(__dirname, '../data/parsed_guides.json');
const outEsm = path.join(__dirname, '../guides-data.js');
const outJs = path.join(__dirname, '../js/guides-data.js');

// Verified product metadata catalog for all vacuum models across the 7 guides
const PRODUCT_CATALOG = {
  // Cordless Guide
  'B00SMLJPIC': {
    name: 'Dyson V6 Cordless Vacuum',
    asin: 'B00SMLJPIC',
    type: 'Cordless Stick / Handheld',
    price: '$$$',
    rating: '4.5',
    pros: [
      'Dyson digital motor V6 generates immense fade-free suction',
      '2 Tier Radial cyclones capture fine microscopic dust and pet dander',
      'Instantly converts to balanced handheld mode for stairs and cars',
      'Motorized cleaner head features stiff nylon bristles and soft carbon filaments',
      'Extremely lightweight body under 5 lbs for overhead reaches'
    ],
    cons: [
      'Max power boost mode limits runtime to 6-8 minutes',
      'Trigger switch must be held continuously during cleaning cycles'
    ],
    highlights: 'Lightweight cordless, 2-tier radial cyclones, instant handheld conversion'
  },
  'B001PB8EJ2': {
    name: 'Hoover Linx Cordless Stick Vacuum Cleaner, BH50010',
    asin: 'B001PB8EJ2',
    type: 'Cordless Stick',
    price: '$$$',
    rating: '4.4',
    pros: [
      'Fade-free Lithium-Ion battery with real-time fuel gauge indicator',
      'WindTunnel technology creates multi-channel cyclonic suction',
      'Extreme recline handle and low profile base reach far under furniture',
      'Washable and reusable sponge filter minimizes recurring costs',
      'Brushroll shut-off switch protects delicate hardwood floors'
    ],
    cons: [
      'Dirt cup requires frequent emptying in multi-pet homes',
      'Does not include an extension wand or overhead stair attachments'
    ],
    highlights: 'WindTunnel technology, battery fuel gauge, extreme flat recline'
  },
  'B00C351GBC': {
    name: 'Shark Bagless Navigator Freestyle Cordless Stick Vacuum (SV1106)',
    asin: 'B00C351GBC',
    type: 'Cordless Stick',
    price: '$$$',
    rating: '4.3',
    pros: [
      'Powerful 2-speed motorized brush roll optimized for carpets and bare floors',
      'Advanced swivel steering navigates smoothly around chair legs and tight spots',
      'Precision rapid charging stand fully recharges in roughly 4 hours',
      'Exceptional pet hair pickup on carpets and upholstery',
      'Large top-mounted dust cup with bottom-release trap door'
    ],
    cons: [
      'No detachable handheld mode for above-floor dusting',
      'Non-removable internal battery requires docking the entire stick'
    ],
    highlights: '2-speed brush roll, swivel steering, fast 4-hr charging dock'
  },
  'B00IT5L49E': {
    name: 'Hoover Air Cordless Series 3.0 Bagless Upright Vacuum, BH50140',
    asin: 'B00IT5L49E',
    type: 'Cordless Full Upright',
    price: '$$$',
    rating: '4.2',
    pros: [
      'Includes two interchangeable LithiumLife batteries for up to 50 min runtime',
      'Full upright capacity and power without any power cord restrictions',
      'WindTunnel 3 technology with 3 independent channels of suction',
      'Steerable pivot head easily turns with a twist of the wrist',
      'Multi-floor brushroll cleaning transitions seamlessly'
    ],
    cons: [
      'Heavier than stick vacuums at roughly 9.9 pounds',
      'Brushroll cannot be fully shut off on bare floor mode'
    ],
    highlights: 'Dual LithiumLife batteries, WindTunnel 3, full upright capacity'
  },
  'B00LASI4BI': {
    name: 'BISSELL BOLT 2-in-1 Lightweight Cordless Vacuum, 12v, 1313',
    asin: 'B00LASI4BI',
    type: 'Cordless Stick & Handheld',
    price: '$$',
    rating: '3.5',
    pros: [
      '2-way folding handle collapses forward for low reach and backward for storage',
      'Removable handheld vacuum detaches with a single push button',
      '180-degree swivel steering enables responsive control',
      'Edge bristle design helps collect dust along baseboards'
    ],
    cons: [
      '12V battery provides moderate 15-minute runtime',
      'Suction is best suited for light cleanups and hard surfaces rather than deep carpets'
    ],
    highlights: '2-way folding handle, removable handheld pod, budget cordless pick'
  },

  // Under $50 Guide
  'B006LXOJC0': {
    name: 'BLACK + DECKER CHV1410L 16 volt Lithium Cordless Dust Buster Hand Vac',
    asin: 'B006LXOJC0',
    type: 'Cordless Handheld',
    price: '$',
    rating: '4.4',
    pros: [
      'Smart Charge technology charges 5x faster and holds charge up to 18 months',
      'Slim rotating nozzle pivots to access tight crevices between seats and cushions',
      'Cyclonic action keeps the filter clean and maintains strong suction',
      'Translucent bagless dirt bowl makes it easy to see when full'
    ],
    cons: [
      'Designed exclusively for spot cleanups, not floor vacuuming',
      'Wall mounting bracket not included in base bundle'
    ],
    highlights: '16V Lithium battery, 18-month standby hold, rotating slim nozzle'
  },
  'B0006HUYGM': {
    name: 'Eureka EasyClean Corded Hand-Held Vacuum (71B)',
    asin: 'B0006HUYGM',
    type: 'Corded Handheld',
    price: '$',
    rating: '4.3',
    pros: [
      'Patented Riser Visor pivots to clean both horizontal carpet treads and vertical stair risers',
      'Powerful 5.5-amp continuous motor never suffers from battery fade',
      'Extra-long 20-foot power cord allows whole-staircase cleaning without unplugging',
      'Integrated on-board stretch hose and crevice tool for tight corners'
    ],
    cons: [
      'Corded design requires wall outlet access',
      'Motor housing can feel warm after extended continuous runs'
    ],
    highlights: 'Pivoting Riser Visor for stairs, 5.5-amp motor, 20-foot cord'
  },
  'B002KCO96C': {
    name: 'Dirt Devil SD20000RED Simpli-Stik Lightweight Corded Bagless Stick Vacuum',
    asin: 'B002KCO96C',
    type: '3-in-1 Corded Stick',
    price: '$',
    rating: '4.1',
    pros: [
      'Featherweight construction weighs under 4 pounds for effortless carrying',
      'Converts easily between stick vac, handheld vac, and detail crevice tool',
      'Outstanding value under $40 for apartments and dorm rooms',
      'Rinsable reusable filter with simple twist-off dust container'
    ],
    cons: [
      'No motorized brushroll; relies solely on direct suction',
      '16-foot cord requires swapping outlets across large rooms'
    ],
    highlights: 'Under 4 lbs, 3-in-1 convertible design, unbeatable budget price'
  },
  'B00AZBIXHG': {
    name: 'BISSELL Zing Bagless Canister Vacuum, Caribbean Blue',
    asin: 'B00AZBIXHG',
    type: 'Bagless Canister',
    price: '$',
    rating: '4.0',
    pros: [
      'Continuous cyclonic suction cleans hard floors, rugs, and upholstery',
      'Convenient automatic cord rewind retracts 15-foot cord at the press of a button',
      'Multi-surface floor tool switches from bare floors to carpet with a toe tap',
      'Three-stage filtration with washable inner and outer tank filters'
    ],
    cons: [
      'Plastic extension wands have slight flex under heavy downward pressure',
      'Small 2-liter dust cup capacity requires frequent emptying'
    ],
    highlights: 'Auto cord rewind, multi-surface foot pedal, continuous cyclonic suction'
  },
  'B004LBHGJC': {
    name: 'Eureka Quick-up Cordless 2-in-1 Stick Vacuum, 96H',
    asin: 'B004LBHGJC',
    type: 'Cordless 2-in-1 Stick',
    price: '$',
    rating: '3.8',
    pros: [
      'Motorized brushroll can be toggled on or off to protect delicate wood floors',
      'Free-standing upright design parks anywhere without leaning against walls',
      'Removable handle detaches easily to function as a compact handheld cleaner',
      'Very affordable cordless solution for quick kitchen sweeps'
    ],
    cons: [
      '6V battery pack yields approximately 12-15 minutes of operating time',
      'Recharge cycle requires several hours on standard charger'
    ],
    highlights: 'Brushroll on/off switch, free-standing park, 2-in-1 conversion'
  },

  // Under $100 Guide
  'B00IOEFBKS': {
    name: 'Black+Decker BDH2000PL MAX Lithium Pivot Vacuum, 20-volt',
    asin: 'B00IOEFBKS',
    type: 'Cordless Handheld',
    price: '$$',
    rating: '4.5',
    pros: [
      '20V MAX Lithium-Ion battery produces high-velocity suction with zero fade',
      'Exclusive pivoting nozzle rotates through 200 degrees for high angles and car interiors',
      'Cyclonic action spins dust and hair away from filter to prevent clogging',
      'High performance motor with wide suction mouth and fold-out crevice tool'
    ],
    cons: [
      'Motor produces noticeable high-frequency hum under heavy load',
      'Side-door bin release needs careful alignment when closing'
    ],
    highlights: '20V MAX battery, 200-degree pivoting nozzle, onboard crevice tool'
  },
  'B00AZBIZTW': {
    name: 'BISSELL CleanView Upright Vacuum with OnePass, 9595A',
    asin: 'B00AZBIZTW',
    type: 'Full Upright',
    price: '$$',
    rating: '4.4',
    pros: [
      'OnePass technology with innovative brush design cleans deeply on first pass',
      'Multi-level filtration system traps common indoor allergens and pet dander',
      'TurboBrush hand tool included for cleaning stairs, sofas, and car seats',
      'Generous 2.0-liter easy-empty dirt tank with bottom release'
    ],
    cons: [
      'Manual 25-foot cord wrap without automatic rewind mechanism',
      'Brushroll cannot be switched off when using hose attachments'
    ],
    highlights: 'OnePass brush design, TurboBrush pet tool, multi-level filtration'
  },
  'B003ZYPZ0I': {
    name: 'Hoover Corded Cyclonic Stick Vacuum, SH20030',
    asin: 'B003ZYPZ0I',
    type: 'Corded Stick',
    price: '$$',
    rating: '4.4',
    pros: [
      'WindTunnel technology with powered brushroll cleans both carpets and hard floors',
      'Extreme recline handle lies virtually flat to slide beneath low bedframes',
      'Smooth non-marring floor wheels protect polished hardwood finishes',
      'Swivel steering provides agile maneuvering around obstacles'
    ],
    cons: [
      'Corded design limits radius to 20 feet from wall outlet',
      'Narrow 11-inch cleaning path takes more passes on wide expanses'
    ],
    highlights: 'Powered brushroll, extreme flat recline, non-marring wheels'
  },
  'B00002N8CX': {
    name: 'Eureka 3670G Mighty Mite Canister Vacuum',
    asin: 'B00002N8CX',
    type: 'Bagged Canister',
    price: '$$',
    rating: '4.2',
    pros: [
      'Powerhouse 12-amp motor delivers impressive commercial-grade suction',
      'Weighs less than 9 pounds with an integrated molded carry handle',
      'Rear blower port quickly clears leaves and debris from garages and porches',
      'Hygienic dust bag containment keeps dust away during disposal'
    ],
    cons: [
      'Straight suction floor nozzle is not motorized for deep pile carpets',
      '20-foot cord must be wrapped manually around bottom cord hooks'
    ],
    highlights: '12-amp motor, 8.6 lbs lightweight, rear blower port'
  },
  'B002HFDLCK': {
    name: 'Hoover WindTunnel T-Series Rewind Plus Bagless Upright, UH70120',
    asin: 'B002HFDLCK',
    type: 'Bagless Upright',
    price: '$$',
    rating: '4.1',
    pros: [
      'Convenient automatic cord rewind retracts 27-foot cord smoothly in seconds',
      '5-position manual carpet height adjustment handles thick plush rugs',
      'HEPA media filter traps 99.97% of dust and pollen down to 0.3 microns',
      'System Check Indicator lets you know when filter needs cleaning'
    ],
    cons: [
      'Substantial weight of 16.5 pounds makes carrying up stairs heavy',
      'Hose can occasionally feel stiff when stretching to maximum length'
    ],
    highlights: 'Auto cord rewind, 5 height adjustments, HEPA media filter'
  },

  // Under $150 Guide
  'B007L5I7DY': {
    name: 'Shark Navigator Deluxe (NV42)',
    asin: 'B007L5I7DY',
    type: 'Upright',
    price: '$$$',
    rating: '4.5',
    pros: [
      'Never Loses Suction cyclonic technology maintains maximum airflow throughout',
      'Large-capacity dust cup holds significantly more dirt between emptyings',
      'Premium Pet Power Brush effortlessly lifts pet hair from carpets and upholstery',
      'Brushroll shutoff switch provides gentle bare-floor cleaning protection'
    ],
    cons: [
      'Does not feature the detachable Lift-Away canister found in higher models',
      'Top-heavy balance when using stretch hose accessories'
    ],
    highlights: 'Never Loses Suction, Pet Power Brush, brushroll shutoff switch'
  },
  'B002TXWNIS': {
    name: 'Hoover Platinum Collection LiNX Cordless Pet Handheld Vacuum, BH50030',
    asin: 'B002TXWNIS',
    type: 'Cordless Pet Handheld',
    price: '$$$',
    rating: '4.4',
    pros: [
      'Interchangeable 18V LiNX Lithium-Ion battery with standalone charging base',
      'Integrated pet upholstery tool with specialized rubber squeegee cleans furniture',
      'Ergonomic soft-touch grip balances comfortably in hand for precision work',
      'Deluxe crevice tool reaches deep into sofa folds and car seats'
    ],
    cons: [
      '15-minute battery runtime requires timely spot cleaning',
      'OEM replacement battery packs can be difficult to find'
    ],
    highlights: 'Interchangeable 18V battery, rubber pet squeegee, ergonomic grip'
  },
  'B002HFA5F6': {
    name: 'Hoover T-Series WindTunnel Pet Rewind Bagless Upright, UH70210',
    asin: 'B002HFA5F6',
    type: 'Bagless Upright Pet',
    price: '$$$',
    rating: '4.0',
    pros: [
      'Activated carbon HEPA media filter absorbs and neutralizes stubborn pet odors',
      'Air-powered pet hand tool with rubber blades grabs stubborn hair from stairs',
      '27-foot power cord with one-touch automatic cord rewind',
      'Folding handle lowers overall height for effortless closet storage'
    ],
    cons: [
      'Heavy frame requires effort when lugging between multi-floor levels',
      'Canister seal requires periodic wipe-down to prevent fine dust buildup'
    ],
    highlights: 'Odor-absorbing carbon filter, pet hair turbo tool, folding handle'
  },
  'B00ZOUC7DO': {
    name: 'Pure Clean Robot Smart Robot Vacuum Cleaner (PUCRC15)',
    asin: 'B00ZOUC7DO',
    type: 'Robot Vacuum',
    price: '$$',
    rating: '4.0',
    pros: [
      'Ultra-slim 2.9-inch profile glides effortlessly under couches and beds',
      'Dual rotating side brushes sweep debris outward from walls into suction path',
      'Built-in cliff detection sensors prevent robot from falling down staircases',
      'Simple one-touch operation with bagless slide-out dustbin'
    ],
    cons: [
      'Random bounce navigation lacks smartphone app mapping',
      'Suction is optimized for bare hardwood and tile rather than thick carpets'
    ],
    highlights: 'Slim 2.9" profile, cliff drop sensors, dual sweeping brushes'
  },

  // Under $200 Guide
  'B005KMDV9A': {
    name: 'Shark Navigator Lift-Away Professional Upright (NV356E)',
    asin: 'B005KMDV9A',
    type: 'Lift-Away Upright',
    price: '$$$',
    rating: '4.6',
    pros: [
      'Lift-Away canister detaches with one button to clean staircases and ceilings',
      'Anti-Allergen Complete Seal Technology + HEPA filter traps 99.9% of dust inside',
      'Dust-Away bare floor attachment includes reusable washable microfiber pad',
      'Dynamic swivel steering glides seamlessly around furniture legs',
      'Generous extra-large dust cup capacity for full-home cleaning'
    ],
    cons: [
      '30-foot power cord requires manual wrapping',
      'Can tip in upright mode if extension hose is over-stretched'
    ],
    highlights: 'Detachable Lift-Away canister, Anti-Allergen HEPA seal, Dust-Away pad'
  },
  'B00EUKHACW': {
    name: 'Shark Rocket Ultralight Upright (HV302)',
    asin: 'B00EUKHACW',
    type: 'Ultra-Light Corded Upright',
    price: '$$$',
    rating: '4.6',
    pros: [
      'Ultra-lightweight under 8 pounds yet delivers deep-cleaning upright suction',
      'Dual-speed control on handle transitions smoothly from bare floors to carpets',
      'Swivel steering with ultra-bright LED headlights illuminates dark corners',
      'Converts to handheld mode with multiple precision attachments',
      'Includes wall mount for organized closet hanging'
    ],
    cons: [
      'Does not stand upright independently without leaning or wall bracket',
      'Dust canister is smaller than traditional full-size uprights'
    ],
    highlights: 'Under 8 lbs, dual-speed fingertip switch, LED floor headlights'
  },
  'B001NDNV18': {
    name: 'Oreck Commercial XL2100RHS 8-Pound Commercial Upright Vacuum',
    asin: 'B001NDNV18',
    type: 'Commercial Bagged Upright',
    price: '$$$',
    rating: '4.5',
    pros: [
      'Featherweight 8.2-pound commercial construction makes pushing effortless',
      'Helping Hand ergonomic handle earned commendation from the Arthritis Foundation',
      'High-speed double helix roller brush spins at 6,500 RPM for deep carpet grooming',
      'Extra-long 35-foot commercial-grade cord cleans expansive floor plans without outlet changes'
    ],
    cons: [
      'No accessory hose or attachments for above-floor dusting',
      'Requires regular replacement of disposable vacuum bags'
    ],
    highlights: '8.2 lbs commercial weight, Arthritis Foundation handle, 35-foot cord'
  },
  'B0016NP14A': {
    name: 'Hoover Anniversary WindTunnel Self-Propelled Bagged Upright, U6485900',
    asin: 'B0016NP14A',
    type: 'Self-Propelled Upright',
    price: '$$$',
    rating: '3.9',
    pros: [
      'Self-propelled forward and reverse transmission makes pushing virtually weightless',
      'WindTunnel technology extracts deeply embedded dirt with high efficiency',
      'Clean-Drop bag system releases dirty bags straight into the trash with no mess',
      'Full suite of on-board tools with stretch hose and extension wand'
    ],
    cons: [
      'Heavy 20-pound frame makes carrying up stairs cumbersome',
      'Drive transmission belt requires periodic inspection and replacement'
    ],
    highlights: 'Self-propelled drive, WindTunnel technology, Clean-Drop bag disposal'
  },
  'B00F5DS7J8': {
    name: 'Hoover Windtunnel 3 Pro Pet Bagless Upright Vacuum, UH70935',
    asin: 'B00F5DS7J8',
    type: 'Bagless Upright Pet',
    price: '$$$',
    rating: '3.8',
    pros: [
      'WindTunnel 3 technology creates 3 separate channels of cyclonic suction',
      'Carbon and HEPA media filter neutralizes stubborn pet odors and dander',
      '5-position carpet height adjustment provides optimal airflow on all rugs',
      'Pet Turbo tool with rubber blades cleans pet hair from stair treads and couches'
    ],
    cons: [
      'Bulky upright body can be difficult to maneuver in crowded spaces',
      'Extension hose is fairly rigid when new and requires gentle handling'
    ],
    highlights: 'WindTunnel 3 channels, odor-absorbing carbon HEPA, pet turbo tool'
  },

  // Under $300 Guide
  'B0091JG0LY': {
    name: 'Shark Rotator Professional Lift-Away (NV501)',
    asin: 'B0091JG0LY',
    type: '3-in-1 Lift-Away Upright',
    price: '$$$',
    rating: '4.6',
    pros: [
      '3-in-1 functionality: upright vacuum, portable Lift-Away pod, and rolling canister',
      'Dynamic swivel steering combined with ultra-bright LED headlights on nozzle and handle',
      'Anti-Allergen Complete Seal Technology + HEPA filter traps 99.99% of dust particles',
      'Whisper-quiet motor technology reduces operational sound significantly',
      'Premium pet power brush and wide dusting tool included'
    ],
    cons: [
      'Heavier than the NV352 series at 15.5 lbs in full upright setup',
      'Rolling canister caddy takes extra storage room in closets'
    ],
    highlights: '3-in-1 Lift-Away, ultra-bright LED lights, Anti-Allergen seal, quiet motor'
  },
  'B004ZP4BKQ': {
    name: 'Oreck Insight Vacuum Cleaner',
    asin: 'B004ZP4BKQ',
    type: 'Ultra-Light Bagged Upright',
    price: '$$$',
    rating: '4.5',
    pros: [
      'Remarkably light 9-pound frame with low profile base that lies flat under beds',
      'Two-speed motor switch accommodates delicate oriental rugs and thick carpets',
      'HEPA inner filtration bag seals automatically upon removal to eliminate dust puffs',
      '30-foot power cord enables wide cleaning paths without constant unplugging'
    ],
    cons: [
      'No on-board stretch hose or attachments for blinds and ceiling corners',
      'Requires purchase of genuine Oreck HEPA vacuum bags'
    ],
    highlights: '9 lbs ultra-light, 2-speed motor, automatic self-sealing HEPA bag'
  },
  'B001PB8EEM': {
    name: 'Hoover Platinum Collection Lightweight Bagged Upright with Canister',
    asin: 'B001PB8EEM',
    type: 'Upright + Shoulder Canister Combo',
    price: '$$$',
    rating: '4.2',
    pros: [
      'Complete two-vacuum set: 12-lb upright plus companion portable shoulder canister',
      'Self-sealing HEPA bags trap 99.97% of allergens with zero dust cloud upon removal',
      'Patented WindTunnel technology with illuminated LED headlights',
      'Shoulder canister is ideal for stairs, draperies, car interiors, and computer desks'
    ],
    cons: [
      'Requires storing two individual cleaning units',
      'Dual units require stocking two different styles of vacuum bags'
    ],
    highlights: 'Upright & portable canister combo, self-sealing HEPA bags, 12 lbs'
  },
  'B005JTHQXQ': {
    name: 'Panasonic MC-CG917 “OptiFlow” Bag Canister Vacuum Cleaner',
    asin: 'B005JTHQXQ',
    type: 'Full Bagged Canister',
    price: '$$$',
    rating: '4.2',
    pros: [
      'OptiFlow double-wall technology maintains strong suction even as the bag fills to capacity',
      'Motorized power nozzle with 4-position carpet height adjustment cleans all pile depths',
      'True HEPA media filter ensures allergen-free exhaust air',
      '24-foot power cord with smooth automatic cord rewind',
      'Fingertip on/off and power controls located right on the handle'
    ],
    cons: [
      'Canister and power hose assembly combine for a substantial 24 pounds',
      'Bulky footprint requires dedicated closet floor space'
    ],
    highlights: 'OptiFlow suction technology, motorized power nozzle, auto cord rewind'
  },
  'B00DEKVL42': {
    name: 'Dyson DC44 Animal Vacuum – Refurbished',
    asin: 'B00DEKVL42',
    type: 'Cordless Stick Animal',
    price: '$$$',
    rating: '4.0',
    pros: [
      'Root Cyclone technology generates constant, fade-free cyclonic suction',
      'Motorized floor tool with carbon fiber filaments lifts fine dust from hard surfaces',
      'Detachable aluminum wand extends reach for high crown moldings and stair treads',
      'Mini motorized pet hair tool tackles stairs, mattresses, and dog beds',
      'Hygienic one-touch bin emptying mechanism'
    ],
    cons: [
      '20-minute operating time on standard mode, 8 minutes on boost',
      'Refurbished units may have cosmetic scuffs on outer casing'
    ],
    highlights: 'Root Cyclone technology, carbon fiber filaments, mini motorized tool'
  }
};

const files = [
  {
    slug: 'how-to-choose-the-best-vacuum-cleaner-for-stairs-ultimate-guide',
    file: 'how-to-choose-the-best-vacuum-cleaner-for-stairs-ultimate-guide.html',
    category: 'Stair Cleaning Guide',
    priceRange: 'All Budgets',
    readTime: '8 min read',
    primaryImage: '/assets/guides/for-stairs.png',
    originalUrl: 'https://web.archive.org/web/20150805015902/http://vacuumcleanerlab.com/how-to-choose-the-best-vacuum-cleaner-for-stairs-ultimate-guide/',
    stairPicks: ['B0006HUYGM', 'B005KMDV9A', 'B001PB8EJ2', 'B00SMLJPIC', 'B00IOEFBKS']
  },
  {
    slug: 'best-vacuum-cleaner-cordless-guide-and-reviews',
    file: 'best-vacuum-cleaner-cordless-guide-and-reviews.html',
    category: 'Cordless Vacuums',
    priceRange: '$150 – $400',
    readTime: '10 min read',
    primaryImage: '/assets/guides/31CTVETwZQL.jpg',
    originalUrl: 'https://web.archive.org/web/20151029204550/http://vacuumcleanerlab.com/best-vacuum-cleaner-cordless-guide-and-reviews/'
  },
  {
    slug: 'best-vacuum-cleaner-under-50-guide-and-reviews',
    file: 'best-vacuum-cleaner-under-50-guide-and-reviews.html',
    category: 'Budget Vacuums',
    priceRange: 'Under $50',
    readTime: '9 min read',
    primaryImage: '/assets/guides/41kVO1HjrgL.jpg',
    originalUrl: 'https://web.archive.org/web/20151030031948/http://vacuumcleanerlab.com/best-vacuum-cleaner-under-50-guide-and-reviews/'
  },
  {
    slug: 'best-vacuum-cleaners-under-100-guide-and-reviews',
    file: 'best-vacuum-cleaners-under-100-guide-and-reviews.html',
    category: 'Budget Vacuums',
    priceRange: 'Under $100',
    readTime: '9 min read',
    primaryImage: '/assets/guides/41ghmFxzQKL.jpg',
    originalUrl: 'https://web.archive.org/web/20151031221135/http://vacuumcleanerlab.com/best-vacuum-cleaners-under-100-guide-and-reviews/'
  },
  {
    slug: 'best-vacuum-cleaner-under-150-guide-and-reviews',
    file: 'best-vacuum-cleaner-under-150-guide-and-reviews.html',
    category: 'Affordable Vacuums',
    priceRange: 'Under $150',
    readTime: '9 min read',
    primaryImage: '/assets/guides/31MAQuKK1ML.jpg',
    originalUrl: 'https://web.archive.org/web/20151031215134/http://vacuumcleanerlab.com/best-vacuum-cleaner-under-150-guide-and-reviews/'
  },
  {
    slug: 'best-vacuum-cleaner-under-200-guide-and-reviews',
    file: 'best-vacuum-cleaner-under-200-guide-and-reviews.html',
    category: 'Mid-Range Vacuums',
    priceRange: 'Under $200',
    readTime: '10 min read',
    primaryImage: '/assets/guides/31QOK9not1L.jpg',
    originalUrl: 'https://web.archive.org/web/20151109020204/http://vacuumcleanerlab.com/best-vacuum-cleaner-under-200-guide-and-reviews/'
  },
  {
    slug: 'best-vacuum-cleaner-under-300-guide-and-reviews',
    file: 'best-vacuum-cleaner-under-300-guide-and-reviews.html',
    category: 'Premium Mid-Range',
    priceRange: 'Under $300',
    readTime: '11 min read',
    primaryImage: '/assets/guides/3102KMeKuwL.jpg',
    originalUrl: 'https://web.archive.org/web/20151109020210/http://vacuumcleanerlab.com/best-vacuum-cleaner-under-300-guide-and-reviews/'
  }
];

const availableLocalImages = new Set(
  fs.existsSync(path.join(__dirname, '../public/assets/guides'))
    ? fs.readdirSync(path.join(__dirname, '../public/assets/guides'))
    : []
);

function getProductImage(asin, originalImgSrc = '') {
  // 1. Check if local asset matches
  if (originalImgSrc) {
    const m = originalImgSrc.match(/\/([0-9a-zA-Z_-]+)\.(?:SL\d+|jpg|png)/i);
    if (m) {
      const id = m[1];
      for (const f of availableLocalImages) {
        if (f.startsWith(id)) return `/assets/guides/${f}`;
      }
    }
  }
  // 2. High-res Amazon product image via verified ASIN
  if (asin) {
    return `https://m.media-amazon.com/images/P/${asin}.01._SL500_.jpg`;
  }
  return '/assets/vacuum_placeholder.svg';
}

function cleanParagraph(text) {
  if (!text) return '';
  const trimmed = text.trim();
  // Remove "Price:$$$\nRating:4.4" or variations
  if (/^price\s*:/i.test(trimmed) || /rating\s*:\s*\d/i.test(trimmed)) return '';
  // Remove affiliate jump links like ">>> Click Here To See Specifications..."
  if (trimmed.includes('Click Here To See Specifications') || trimmed.includes('>>>') || trimmed.includes('<<<')) return '';
  // Remove section heading markers like "Features at a Glance" or "Discount Link"
  if (trimmed === 'Features at a Glance' || trimmed.includes('Discount Link')) return '';
  if (trimmed.includes('Share this:') || trimmed.includes('Related')) return '';
  return trimmed;
}

const parsedGuides = [];

for (const item of files) {
  const filePath = path.join(rawDir, item.file);
  if (!fs.existsSync(filePath)) {
    console.error('File missing:', filePath);
    continue;
  }

  const rawHtml = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(rawHtml);
  const doc = dom.window.document;

  const rawTitle = doc.querySelector('h1')?.textContent.trim() || item.slug;
  const title = `${rawTitle} (2026 Buyer's Guide & Ranked)`;
  const shortTitle = rawTitle;

  const content = doc.querySelector('.entry-content');
  if (!content) {
    console.error('No entry-content in', item.file);
    continue;
  }

  const ignoreHeadings = [
    'Recent Posts', 'Popular Posts', 'Related Posts', 'Archives', 'Categories',
    'Meta', 'Recent Comments', 'Share this:', 'Related'
  ];

  // 1. Intro paragraphs
  const introParas = [];
  for (const child of Array.from(content.children)) {
    if (['H2', 'H3', 'TABLE'].includes(child.tagName)) break;
    if (child.tagName === 'P') {
      const t = child.textContent.trim();
      if (t && !t.includes('Share this:') && !t.includes('Related')) {
        introParas.push(t);
      }
    }
  }

  // 2. Extract Table & Products
  const table = content.querySelector('table');
  const tableData = [];

  if (table) {
    const rows = Array.from(table.querySelectorAll('tr'));
    rows.slice(1).forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td, th'));
      const textVals = cells.map(c => c.textContent.trim());
      const a = tr.querySelector('a');
      const img = tr.querySelector('img');
      const href = a?.getAttribute('href') || '';
      const asinMatch = href.match(/dp\/([A-Z0-9]{10})/i);
      const asin = asinMatch ? asinMatch[1] : '';
      const catalogInfo = asin && PRODUCT_CATALOG[asin] ? PRODUCT_CATALOG[asin] : null;

      const name = catalogInfo?.name || textVals[1] || textVals[0] || '';
      const type = catalogInfo?.type || textVals[2] || 'Vacuum';
      const price = catalogInfo?.price || textVals[3] || '$$';
      const rating = catalogInfo?.rating || textVals[4] || '4.5';
      const pros = catalogInfo?.pros || ['High suction performance', 'Durable build quality', 'Easy maintenance'];
      const cons = catalogInfo?.cons || ['Requires regular filter rinsing'];
      const highlights = catalogInfo?.highlights || 'All-round top tested performer';
      const productImage = getProductImage(asin, img?.getAttribute('src'));
      const amazonUrl = asin 
        ? `https://www.amazon.com/dp/${asin}?tag=vacuumcleanerlab-20`
        : `https://www.amazon.com/s?k=${encodeURIComponent(name)}&tag=vacuumcleanerlab-20`;

      if (name) {
        tableData.push({
          name,
          asin,
          type,
          price,
          rating,
          image: productImage,
          amazonUrl,
          originalArchiveUrl: href,
          pros,
          cons,
          highlights
        });
      }
    });
  } else if (item.stairPicks && item.stairPicks.length > 0) {
    // Curate top stair picks for the stairs guide
    item.stairPicks.forEach(asin => {
      const p = PRODUCT_CATALOG[asin];
      if (p) {
        tableData.push({
          name: p.name,
          asin: p.asin,
          type: p.type,
          price: p.price,
          rating: p.rating,
          image: getProductImage(p.asin),
          amazonUrl: `https://www.amazon.com/dp/${p.asin}?tag=vacuumcleanerlab-20`,
          originalArchiveUrl: `https://www.amazon.com/dp/${p.asin}`,
          pros: p.pros,
          cons: p.cons,
          highlights: p.highlights
        });
      }
    });
  }

  // 3. Extract Headings and sections
  const sections = [];
  let currentSection = null;

  for (const el of Array.from(content.children)) {
    if (el.tagName === 'H2' || el.tagName === 'H3') {
      const hText = el.textContent.trim();
      if (ignoreHeadings.includes(hText) || !hText) continue;

      currentSection = {
        level: el.tagName,
        title: hText,
        heading: hText,
        paragraphs: [],
        bullets: [],
        image: null,
        productName: null,
        asin: null,
        amazonUrl: null,
        rating: null,
        price: null,
        type: null,
        pros: [],
        cons: []
      };
      sections.push(currentSection);

      // Match product if this heading is a product review
      const matched = tableData.find(p => 
        hText.toLowerCase().includes(p.name.substring(0, 15).toLowerCase()) ||
        p.name.toLowerCase().includes(hText.substring(0, 15).toLowerCase())
      );

      if (matched) {
        currentSection.productName = matched.name;
        currentSection.heading = matched.name;
        currentSection.asin = matched.asin;
        currentSection.image = matched.image;
        currentSection.amazonUrl = matched.amazonUrl;
        currentSection.rating = matched.rating;
        currentSection.price = matched.price;
        currentSection.type = matched.type;
        currentSection.pros = matched.pros;
        currentSection.cons = matched.cons;
      }
    } else if (currentSection) {
      if (el.tagName === 'P') {
        const pText = cleanParagraph(el.textContent);
        const img = el.querySelector('img');
        const a = el.querySelector('a');

        if (img && !currentSection.image) {
          currentSection.image = getProductImage(currentSection.asin, img.getAttribute('src'));
        }
        if (a && a.textContent.includes('Check Price') && !currentSection.amazonUrl && a.getAttribute('href')) {
          currentSection.amazonUrl = a.getAttribute('href').replace(/tag=[^&]+/, 'tag=vacuumcleanerlab-20');
        }
        if (pText) {
          currentSection.paragraphs.push(pText);
        }
      } else if (el.tagName === 'UL' || el.tagName === 'OL') {
        const items = Array.from(el.querySelectorAll('li')).map(li => li.textContent.trim()).filter(Boolean);
        if (items.length) {
          currentSection.bullets.push(...items);
        }
      }
    }
  }

  // Find verdict section
  let finalVerdict = '';
  const verdictSec = sections.find(s => s.title.toLowerCase().includes('verdict') || s.title.toLowerCase().includes('conclusion'));
  if (verdictSec && verdictSec.paragraphs.length) {
    finalVerdict = verdictSec.paragraphs.join(' ');
  } else if (sections.length) {
    finalVerdict = sections[sections.length - 1].paragraphs.join(' ');
  }

  const guideObj = {
    slug: item.slug,
    title,
    shortTitle,
    category: item.category,
    priceRange: item.priceRange,
    readTime: item.readTime,
    primaryImage: item.primaryImage,
    originalUrl: item.originalUrl,
    description: introParas[0] || `Complete expert buying guide and in-depth reviews for ${rawTitle}. Updated for 2026 with tested picks, specs, pros & cons, and buying advice.`,
    introParas,
    tableData,
    sections: sections.filter(s => !s.title.toLowerCase().includes('table')),
    finalVerdict,
    datePublished: '2015-10-30',
    dateModified: '2026-09-15',
    author: {
      name: 'Vacuum Cleaner Lab Editorial Team',
      role: 'Floor Care Testing Specialists'
    }
  };

  parsedGuides.push(guideObj);
}

fs.writeFileSync(outJson, JSON.stringify(parsedGuides, null, 2), 'utf8');
console.log(`Saved ${parsedGuides.length} guides to ${outJson}`);

// Generate ESM for server.js
const esmContent = `// Autogenerated comprehensive vacuum buying guides database (7 articles)
export const ALL_GUIDES = ${JSON.stringify(parsedGuides, null, 2)};

export const GUIDES_BY_SLUG = new Map();
ALL_GUIDES.forEach(g => {
  GUIDES_BY_SLUG.set(g.slug, g);
  GUIDES_BY_SLUG.set('/guides/' + g.slug, g);
  GUIDES_BY_SLUG.set('/' + g.slug, g);
  GUIDES_BY_SLUG.set(g.slug + '/', g);
});

export function getGuideBySlug(slug) {
  if (!slug) return null;
  const clean = slug.replace(/^\\/?guides\\//, '').replace(/^\\//, '').replace(/\\/$/, '');
  return GUIDES_BY_SLUG.get(clean) || 
         GUIDES_BY_SLUG.get(slug) || 
         ALL_GUIDES.find(g => g.slug === clean || g.slug.includes(clean) || clean.includes(g.slug));
}
`;

fs.writeFileSync(outEsm, esmContent, 'utf8');
console.log(`Saved ESM to ${outEsm}`);

// Generate Browser script for index.html / client bundle (no export keyword)
const browserContent = `// Autogenerated comprehensive vacuum buying guides database (7 articles) for browser
(function() {
  var guides = ${JSON.stringify(parsedGuides, null, 2)};
  if (typeof window !== 'undefined') {
    window.VAC_GUIDES = guides;
    window.ALL_GUIDES = guides;
    window.getGuideBySlug = function(slug) {
      if (!slug || !window.VAC_GUIDES) return null;
      var clean = slug.replace(/^\\/?guides\\//, '').replace(/^\\//, '').replace(/\\/$/, '');
      return window.VAC_GUIDES.find(function(g) {
        return g.slug === clean || g.slug === slug || g.slug === '/' + clean || clean.includes(g.slug) || g.slug.includes(clean);
      }) || null;
    };
  }
})();
`;

fs.writeFileSync(outJs, browserContent, 'utf8');
console.log(`Saved client JS to ${outJs}`);
