# Illustration

`apps/web/public/market.svg` and `portraits.svg` are original vector artwork created for this project. They are available under the repository's MIT license. No Waldo artwork is used. Fonts are Barlow Condensed and DM Sans (Google Fonts, SIL Open Font License); system sans-serif is the fallback.

The scene is 1200 × 800 units. Target artwork was placed, inspected in-browser, and bounded in that coordinate space. Portrait symbols are separate reusable drawings. The answer rectangles live only in the API seed, not the public API or web bundle.

| Target | Artwork extent (x, y, width, height) | Validation rectangle |
| --- | --- | --- |
| Miso | 888, 148, 48, 48 | 882, 142.4, 60, 60 |
| Bolt | 312, 507, 48, 72 | 306, 500.8, 60, 84 |
| Clementine | 997, 558, 60, 56 | 990, 552, 72, 72 |
| Moon teapot | 560, 338, 56, 50 | 552, 332, 72, 60 |

Bounds include small visual margins around the complete illustration. The seed divides x/width by 1200 and y/height by 800. SVG source can reveal object structure; this is a casual game rather than a competitive anti-cheat system.
