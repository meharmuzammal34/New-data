# Vacuum Cleaner Review Articles

This directory contains the review articles for the **Reviews** section at `/reviews` and individual review articles at `/reviews/:slug`.

## How to Add a New Review Article in the Future

To publish a new review article, simply open `data/review-articles.json` and add a new JSON object to the array:

```json
{
  "id": "review-your-model-slug",
  "slug": "your-model-slug-review",
  "title": "Brand Model Name Review: Comprehensive Lab Test & Verdict",
  "productModel": "Brand Model Name",
  "brand": "Brand",
  "productSlug": "brand-model-slug",
  "category": "Cordless Stick",
  "categorySlug": "cordless-stick",
  "publishDate": "2026-04-01",
  "updatedDate": "2026-04-01",
  "author": "Your Name",
  "authorRole": "Vacuum Testing Specialist",
  "rating": 4.8,
  "score": 95,
  "price": "$599",
  "excerpt": "A short summary excerpt of the review testing results and conclusions.",
  "coverImage": "https://example.com/image.jpg",
  "testedMetrics": {
    "suctionKpa": 22.5,
    "batteryRuntimeMin": 60,
    "noiseDb": 68,
    "dustCapacityL": 0.8,
    "weightLbs": 7.0,
    "hepa": true
  },
  "scores": {
    "suction": 9.5,
    "carpets": 9.4,
    "hardFloors": 9.8,
    "petHair": 9.6,
    "batteryLife": 9.0,
    "easeOfUse": 9.3
  },
  "pros": [
    "First major advantage",
    "Second major advantage"
  ],
  "cons": [
    "First drawback or limitation"
  ],
  "verdict": "Overall summary verdict and recommendation.",
  "sections": [
    {
      "heading": "Suction & Deep Cleaning Performance",
      "body": "Detailed paragraph describing your hands-on laboratory test findings."
    },
    {
      "heading": "Battery Runtime & Usability",
      "body": "Details about battery life, weight, ergonomics, and daily handling."
    }
  ]
}
```

Once added, the new review will automatically appear on:
1. The **Review Archive** at `/reviews` with live search, category filtering, and sorting.
2. Its own dedicated SEO-optimized **Review Article page** at `/reviews/your-model-slug-review`.
3. The **Recent Reviews** and **Top Rated** sidebars across the review section.
