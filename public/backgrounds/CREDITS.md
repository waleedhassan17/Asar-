# Background photo credits

Every image in this folder is **CC0 / public domain**: free for commercial use with
no attribution required. The credits below are kept anyway — it costs nothing and it
means the provenance of each file can be checked later.

All were sourced through the [Openverse](https://openverse.org) API filtered to
`license=cc0,pdm`, then centre-cropped to 16:9, resized to 2000px wide and
re-compressed. Faces are avoided on purpose: for marketing use, an identifiable
person would need a model release, so these are hands, candles, silhouettes and
scenery.

| File | What it is | Source | License |
|---|---|---|---|
| `hero-01.jpg` | Candles and a small lantern house | [stocksnap](https://stocksnap.io/photo/chistmas-house-G033A6MYVN) | CC0 |
| `hero-02.jpg` | Cupped hands holding soil | [rawpixel](https://www.rawpixel.com/image/3284609/free-photo-image-agriculture-cc0-creative-commons) | CC0 |
| `hero-03.jpg` | Four people silhouetted against a sunset | [stocksnap](https://stocksnap.io/photo/silhouette-family-Q7UIKF58IR) | CC0 |
| `hero-04.jpg` | Books and a plant on a windowsill | [stocksnap](https://stocksnap.io/photo/book-interior-KLXLJSBKJI) | CC0 |
| `hero-05.jpg` | Plates of food and flatbread from above | [wordpress](https://wordpress.org/photos/photo/79569f9e90/) | CC0 |
| `hero-06.jpg` | A pine seedling on the forest floor | [rawpixel](https://www.rawpixel.com/image/8732352/photo-image-plant-tree-public-domain) | CC0 |

## Replacing these

The design only needs a soft, low-detail, landscape image ≥2000px wide — a busy
photo fights the type. Drop a replacement in with the same filename and update the
`alt` text in `src/lib/backgrounds.ts`. Licensed sources that allow commercial use
with no attribution:

- Unsplash — <https://unsplash.com/s/photos/birthday-candles>, <https://unsplash.com/s/photos/helping-hands>
- Pexels — <https://www.pexels.com/search/community%20meal/>, <https://www.pexels.com/search/planting%20tree/>
- Pixabay — <https://pixabay.com/images/search/helping%20hands/>

If a replacement shows an identifiable person, prefer one marked with a model
release. Text is never placed on a raw photo: `PhotoBackground` always lays a
scrim over it.
