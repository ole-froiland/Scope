# Scope hero — selected direction 2

Source visual truth: `/Users/ole-froiland/.codex/generated_images/01a12cf0-e35a-70f3-a705-cb850b4910be/exec-599ad6ad-33d2-4218-b132-3f1b31e9fe43.png`.

Implementation: `/notion`, Netlify preview `6acc24f15ab3e8abbd6b91a3`.
Screenshots: `output/playwright/notion-ai-hero-1440-final.png` and `output/playwright/notion-ai-hero-390-final.png`.

Viewport: 1440 × 900 CSS pixels at density 1. Source pixels 1586 × 992, uniformly fitted to 1440 × 900 for comparison with a subpixel-ratio rounding crop. Implementation pixels 1440 × 900. Same video frame at 8 seconds, top of page, cookie notice dismissed.

Full-view comparison: `output/playwright/notion-ai-hero-comparison-final.png`. Focused headline, body, buttons and note comparison: `output/playwright/notion-ai-hero-comparison-copy.png`. Both comparisons were opened and inspected together, source left and implementation right.

## Findings

No remaining actionable P0/P1/P2 differences.

- Fonts and typography: existing Inter retained; 82px desktop headline, bold two-line hierarchy, blue AI-rådgiver emphasis. Mobile type grows to 34.71px at 390px while fitting at 320px. No truncation or clipped headline.
- Spacing and layout rhythm: centered headline, two-line explanation, actions and small reassurance line match the selected composition. Existing header, hero height and demo placement retained. Desktop hero height 914px and demo y=918px at 1440 × 900.
- Colors and tokens: existing Scope blue, near-black type, white secondary button and integration strip retained. No new palette or decorative surfaces.
- Image quality and asset fidelity: existing real licensed restaurant video and original brand/integration assets reused. The previously approved bottom-anchored chair crop remains; small photographic differences from the generated mock are intentional preservation of the live video.
- Copy and content: headline and explanation match direction 2. Requested line reads exactly “Klar på 1-2-3. Ingen bindingstid.” below the actions. One semantic h1, without a stale slogan aria-label.

## Comparison history

1. Initial desktop comparison found a P2: body/actions sat roughly 25–35px too low versus the selected target. Reduced desktop headline size/line height, tightened paragraph and action spacing, and adjusted desktop bottom padding. Post-fix full and focused comparisons align the intended hierarchy and rhythm.
2. Initial mobile screenshot found a P2: 26px headline was too small relative to the actions. Added a bounded mobile type scale. Post-fix 390px screenshot shows the stronger hierarchy; 320px, 390px, 768px and 1920px checks show no horizontal overflow, clipped titles or hidden actions/reassurance.

## Verification

- Existing suite: 142 passed, 0 failed. Site build passed.
- Primary CTA destinations checked: existing test-customer and demo mailto links preserved.
- Integration band verified paused at page start and running after reaching its natural slot.
- Local browser layout and Netlify preview visually inspected. Published production `6acc24f15ab3e8abbd6b91a3` verified in a fresh browser tab: correct copy/CSS, no overflow, real video playing without error, and no browser console errors. Live screenshot: `output/playwright/notion-ai-hero-live.png`.
- All 228 published file hashes verified; 226 unrelated published files preserved.

## Follow-up polish

- P3: retain existing button widths and live photo crop rather than approximate minor raster-mock differences.

final result: passed
