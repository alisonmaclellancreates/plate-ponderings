# What the Plate? complete website asset pack — v2

October 15, 2026. This pack supersedes the original 18-image website pack. It contains 22 web assets: 17 unchanged source illustrations retained from v1, a replacement hero, and four additions. Larger PNG masters are supplied in a separate archive. Original v1 files remain untouched.

## Give to Lovelace and Sully

Use the web ZIP for the build. It contains image assets and written instructions only: no code, page mockups, contact sheets or generated screen images. The separate masters ZIP is for Rowan's archive and future exports.

## Homepage assembly

1. Header: existing logo and live navigation.
2. Hero: homepage-hero-v2 at full opacity. Desktop headline and search sit on its quiet left side; keep the car visible on the right. A localized cream gradient may support the text if needed; do not fade the whole image. On mobile, stack live content and the illustration rather than cropping away the car or relying on tiny text over scenery.
3. Two action cards: existing look-up and spot illustrations; text and card backgrounds are live interface elements.
4. How it works: new how-it-works-landscape-v2 behind the three EXISTING individual signposts. Keep Lovelace's approved wording and step order; filenames do not define order. No buttons. On mobile stack the three steps; the scenery is decorative. The old combined road is an optional alternative, not a fourth step or an additional image to stack here.
5. Plate of the Day: new plate-of-the-day-landscape-v2 behind a separate generic plate component and live heading, invitation, status badge and button. Keep a solid cream surface or localized gradient behind copy when necessary. Do not put the status or button into an image.
6. Recently Featured: four existing-style cards with generic plates and dynamic text. Same component is used in Explore. Scenic jurisdiction plates in the mockup are stretch-goal illustrations, not base-build requirements.
7. Footer: footer-landscape-v2, existing tagline-sign-v1 with live “Little plates. Big stories.”, live links, and the new footer-pines-emblem-v2 on navy. The navy footer shape is page styling. Do not add the archive landscape here as well; it remains for Explore.

Fit without distortion. Preserve transparent backgrounds. All decorative scenery should have empty alternative text; meaningful controls and plate components need live accessible names. Keep artwork at full opacity; place text on suitable surfaces. Do not enlarge small exports beyond their intended size when masters are available. Lazy-load scenery below the hero. The website should request only the assets it needs; the ZIP is not a single page download.

## License plate experiment: status correction

Alison confirmed on October 15 that Quinn and Wiggins's experiment SUCCEEDED, and jurisdiction-specific plate rendering is a STRETCH GOAL. It is not unresolved or failed. This pack uses the existing generic fallback for the main build and includes no speculative Washington, Ontario or California backgrounds. If the stretch goal is taken up, use the successful experiment's assets and Reproduction Brief as a separate handoff. This pack is not evidence of that experiment and does not replace its brief. Generic background tinting and text placement remain implementation work for Sully from Lovelace's written instructions.

## Retained versus illustration-only

The full-page mockup is a composition reference, not a source of new requirements. Its redrawn logo, action icons, signboards, dates, sample plates and decorative details do not supersede approved assets or copy. Retain the selected v1 logo, action illustrations and signposts. The new backdrops reproduce the scenic direction, not every pixel of the generated mockup. Text on signposts remains live and follows Lovelace's approved copy, rather than newly invented labels in the mockup. No extra features or fields are introduced.

The generic plate is the existing raster fallback, not a newly proven tintable vector system. No new seed story photos are included. The image pack does not prove photo detection or privacy processing. No profile portraits, verified-owner marks or privacy checkmarks are supplied.

## Functional palette

Teal #287C80; decorative coral #D66B50; golden yellow #E9B85C; cream #FAF6ED; navy #24344D. Primary coral buttons and error text: #C14B2D; hover #A93F24; pressed #923520. Buttons use white text. Keyboard focus: 2px navy ring with a small gap. Coral badges: navy on pale #F2D7CA. Yellow uses navy text. Do not sample approximate UI colours from raster artwork. Font choice and Soft Slate should follow the latest decisions document; this pack does not resolve those choices.

## Asset map

| Web filename | Use | Pixel size |
| --- | --- | --- |
| `what-the-plate-logo-v1.webp` | Header logo; retain selected Road Trip raster logo | 480 × 240 |
| `homepage-hero-v2.webp` | Homepage hero; replaces homepage-hero-v1; car on right, headline on left | 1600 × 800 |
| `look-up-a-plate-v1.webp` | Look Up a Plate action illustration | 700 × 467 |
| `spot-a-plate-v1.webp` | Spot a Plate action illustration | 700 × 467 |
| `how-i-know-owner-v1.webp` | Story choice: It's my plate | 700 × 467 |
| `how-i-know-knows-owner-v1.webp` | Story choice: I know the owner | 700 × 467 |
| `how-i-know-asked-driver-v1.webp` | Story choice: I asked the driver | 700 × 467 |
| `how-i-know-guess-v1.webp` | Story choice: My best guess | 700 × 640 |
| `sasquatch-v1.webp` | Shared rejection, error and not found character | 700 × 727 |
| `search-no-match-v1.webp` | Homepage inline no-match illustration | 700 × 467 |
| `signpost-v1.webp` | Shared decorative roadside signpost | 700 × 1050 |
| `tagline-sign-v1.webp` | Blank sign; overlay Little plates. Big stories. as live text | 1200 × 400 |
| `archive-landscape-v1.webp` | Explore introduction landscape | 1600 × 533 |
| `how-it-works-road-v1.webp` | Optional alternative combined composition; do not stack with the three individual signposts | 1400 × 512 |
| `how-it-works-signpost-lookup-v1.webp` | Individual How it works magnifying-glass signpost; use Lovelace step copy/order | 700 × 743 |
| `how-it-works-signpost-plate-v1.webp` | Individual How it works plate signpost; use Lovelace step copy/order | 700 × 825 |
| `how-it-works-signpost-story-v1.webp` | Individual How it works story signpost; use Lovelace step copy/order | 700 × 735 |
| `generic-plate-background-v1.webp` | Base-build generic plate artwork; jurisdiction and plate text remain dynamic | 900 × 450 |
| `how-it-works-landscape-v2.webp` | New scenery behind How it works; no labels or signposts baked in | 1600 × 533 |
| `plate-of-the-day-landscape-v2.webp` | New scenery behind Plate of the Day; overlay real plate component | 1600 × 533 |
| `footer-landscape-v2.webp` | New footer scenery; overlay existing blank tagline sign and live copy | 1600 × 533 |
| `footer-pines-emblem-v2.webp` | New cream pine-and-road decorative emblem for navy footer | 256 × 237 |

## Validation

All 22 WebP files were reopened after export, dimensions checked, and transparent assets checked for a transparent alpha minimum. Retained PNG masters are byte-for-byte copies of v1. New illustrations were visually inspected during generation. Alpha presence alone does not guarantee perfect edges at every scale; generated painted fringes should be reviewed on cream/navy surfaces during implementation. No full website behavior or formal Step 5 consistency review is claimed.
