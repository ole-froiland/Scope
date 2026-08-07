# Design QA — Scope Kombi

## Comparison target

- Source visual truth: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/source-kombi-option-3.png` (`819 × 1920` px).
- Combined comparison evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/final-comparison.png`.
- Browser-rendered implementation:
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-desktop-hero.png`
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-desktop-process.png`
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-desktop-advice.png`
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-desktop-testcustomers.png`
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-mobile-hero.png`
  - `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/implementation-mobile-process.png`
- Route and state: `/kombi`, light theme; hero, process, advice selection, test-customer CTA, validation modal and mobile menu tested.
- Viewports: desktop `1280 × 720` CSS px for the final section captures; desktop advice interaction was also checked at `1440 × 1000`; mobile `390 × 844` CSS px.
- Density normalization: browser captures are 1× and match their CSS viewport dimensions. The source is a tall generated-page mock, so the full-page source and the sequence of same-state browser viewport captures were placed together in `final-comparison.png` rather than stretched to one pixel grid.

## Full-view comparison evidence

`final-comparison.png` places the complete selected design next to the implemented hero, process, advice and test-customer captures. The implementation preserves the source's white editorial canvas, forest-green serif typography, restrained yellow accents, exact photo order, compact four-step explanation and green photo-led ending. The page no longer contains the earlier extra FAQ block, so its final section order matches the source.

## Focused region comparison evidence

- Hero: `implementation-desktop-hero.png` confirms the real chef photo, direct translucent typographic ribbon, exact supplied Scope wordmark, two-line promise and primary CTA.
- Process: `implementation-desktop-process.png` confirms the four-step vertical index paired with the server-and-plate photograph and pale yellow offset field.
- Advice: `implementation-desktop-advice.png` confirms the oversized serif heading, three rule-separated advice rows and short explanation. The rows were exercised and update pressed state, label and explanatory copy.
- Test customers: `implementation-desktop-testcustomers.png` confirms the full-bleed outdoor photo, deep-green overlay, white/yellow typography and two working actions.
- Mobile: `implementation-mobile-hero.png` and `implementation-mobile-process.png` confirm that the editorial hierarchy becomes one column without horizontal overflow. The hero promise remains visible in the first mobile viewport.

## Required fidelity surfaces

- Fonts and typography: DM Serif Display carries the source's editorial headlines and DM Sans handles navigation, labels and body copy. Display sizes, line heights, weights and wraps were inspected on desktop and mobile; no truncation remains.
- Spacing and layout rhythm: sections use consistent white space, hairline dividers and a restrained two-column desktop grid. Mobile collapses to one column, with `390 px` document width matching viewport width.
- Colors and visual tokens: the palette is limited to white, deep forest green and the logo's warm yellow. No blue, orange wash, red or decorative gradient was introduced. Contrast remains readable over both image treatments.
- Image quality and asset fidelity: the exact user-supplied logo was cropped without redrawing and is reused as a real raster asset. The three real restaurant photographs appear exactly once each. Existing Heroicons are used for the four system sources; there are no placeholder images, emoji, CSS illustrations or handcrafted SVG replacements.
- Copy and content: the page keeps the selected promise, `Klar på 1–2–3. Ingen bindingstid.`, four-step explanation, concrete advice examples, system sources and test-customer offer.
- Accessibility and behavior: semantic landmarks and heading order, skip link, visible focus treatment, reduced-motion handling, keyboard-operable buttons, menu expanded state, form labels and validation message are present.

## Findings

No actionable P0, P1 or P2 findings remain.

- [P3] The supplied raster wordmark has a white background rather than true transparency.
  - Location: header and footer logo.
  - Evidence: the exact supplied source is shown cleanly on the white header; the footer contains a small white logo field on dark green.
  - Impact: brand fidelity is preserved, but a future transparent master logo would make the footer lockup slightly cleaner.
  - Follow-up: replace only when an official transparent export is available.

## Comparison history

### Iteration 1 — blocked

- [P2] The hero ribbon was initially hidden during the first mobile capture by the generic reveal animation.
  - Fix: removed delayed reveal behavior from the above-the-fold hero ribbon.
- [P2] The initial implementation inserted a full FAQ block between the source-system story and the test-customer ending.
  - Fix: removed the extra block and made `Testkunder` the final navigation destination.
- [P2] The test-customer form's close control sat beneath the sticky header's stacking layer.
  - Fix: raised the test overlay while the form is open, preserving a visible and keyboard-accessible close action.

### Iteration 2 — passed

- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/design-qa/final-comparison.png`.
- Desktop document width matched the `1280 px` viewport with no horizontal overflow.
- Mobile document width matched the `390 px` viewport with no horizontal overflow.
- Advice selection changed active count, pressed state and explanatory copy correctly.
- Mobile menu opened with `aria-expanded="true"`, locked the page and closed again.
- Test-customer CTA opened the form; empty submission produced `Fyll ut de obligatoriske feltene.` without transmitting data.
- Browser console warnings/errors: none in the final implementation checks.

### Iteration 22 — square detail card without visible Auto control passed

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-f677d13f-66de-4e6a-b3e5-35c089cf91e2.png` (`1468 × 1016 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-square-detail-no-auto.png` (`1280 × 720 px`) captured from `/enkel?preview=60` at a `1280 × 720` CSS viewport and density `1`.
- Same-state full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-square-detail-no-auto-comparison.png`; both sides show the orange menu recommendation, with readable detail-card edges and controls. A separate focused crop was not needed because the requested corner and Auto-control changes are clearly visible at this scale.
- [P2] The detail panel still used rounded corners after the left recommendation cards had moved to a square visual language.
  - Fix: set the detail panel radius to `0`, retaining the category-colored top rule and border so the active state remains clear.
- [P2] The visible `Auto` pill added a secondary control the user no longer wanted.
  - Fix: removed the control from the markup while keeping the automatic four-advice rotation active in the background.
- Typography: DM Sans hierarchy, weights, wrapping and uppercase labels are unchanged; the orange title and description remain fully visible.
- Spacing and layout: the detail panel remains a fixed `390 px` desktop region and reports equal client/scroll dimensions (`388 px` high and `662 px` wide), so squaring the corners introduced no clipping or overflow.
- Colors and tokens: the orange state continues to share one category accent across the list border, detail rule, metric and CTA; neutral white surfaces remain unchanged.
- Image and icon fidelity: no new assets were introduced; existing logo and Heroicons remain sharp and correctly scaled.
- Copy and content: all four recommendations, descriptions, metrics and sources are unchanged.
- Interaction and accessibility: automatic rotation advanced from item one to item two in one interval, exactly one recommendation remained pressed, and the removed control is absent from both the visual tree and markup. Browser console logs were empty.
- Comparison history: the first combined comparison used mismatched automatic states (orange source versus blue implementation). The implementation was recaptured immediately after selecting the orange state, producing the same-state comparison above; no actionable P0/P1/P2 mismatch remained.
- Automated verification: all 83 tests pass; JavaScript syntax and diff whitespace checks pass.

### Iteration 23 — compact equal-height workspace with animated chart passed

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-645193ed-b874-4bb9-8560-99d405a5276b.png` (`1396 × 818 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-compact-animated-advice.png` (`1280 × 720 px`) captured from `/enkel?preview=65` at a `1280 × 720` CSS viewport and density `1`.
- Same-state full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-compact-animated-advice-comparison.png`; both sides show the red fourth recommendation. The full implementation viewport was retained so the equal-height relationship between the four-card rail and detail card remains visible; labels, borders, icon and CTA are readable without a separate crop.
- [P2] The accent-colored inset shadow read as an overly thick top edge on the detail card.
  - Fix: removed the inset top rule and retained a quiet one-pixel category border with a soft external shadow.
- [P2] The greeting, daily handoff and `Dagens fire grep` label added vertical overhead while the four recommendation cards needed more room.
  - Fix: removed all three lines and moved the two-column grid directly below the compact browser bar.
- [P2] The detail card felt taller than the four-choice group and lacked a visual explanation cue.
  - Fix: set both desktop columns to the same fixed `370 px` height, allowing the four choices to grow, and added the existing Heroicons chart asset with a restrained vertical float animation. The icon follows each category color and the existing content transition continues on automatic advice changes.
- Typography: DM Sans hierarchy, optical weight, wrapping and compact uppercase labels remain consistent; removing the intro does not remove any advice content.
- Spacing and layout: browser measurements report `370 px` for both menu and detail columns. All four detail states have equal `368 px` client/scroll heights and `662 px` client/scroll widths, confirming no clipping or overflow.
- Colors and tokens: the four blue, orange, green and red semantic accents remain consistent across selection, border, metric, CTA and chart icon; the heavy top accent has been removed.
- Image and icon fidelity: the animated graphic uses the existing `heroicons-chart-bar-square.svg` asset rather than a CSS drawing or placeholder. It remains sharp and changes color with the selected advice.
- Copy and content: only the requested greeting, handoff and section label were removed; all four recommendation titles, descriptions, sources and metrics remain intact.
- Interaction and accessibility: all four manual selections retain exactly one pressed state and no overflow; automatic rotation advanced from the fourth advice to the first. The chart animation is disabled by `prefers-reduced-motion`. Browser console logs were empty.
- Comparison history: an initial implementation used a second light-bulb icon that became visually blocky at the compact display size. It was removed, leaving one clear animated chart asset; the recaptured comparison above has no actionable P0/P1/P2 issue.
- Automated verification: full suite, JavaScript syntax and diff whitespace checks pass.

### Iteration 24 — taller workspace with square lower corners passed

- Source/problem capture: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-0fd9e238-8e89-499e-923c-0c1e0391d4e5.png` (`2312 × 1024 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-taller-square-bottom-advice.png` (`1280 × 720 px`) captured from `/enkel?preview=67` at a `1280 × 720` CSS viewport and density `1`.
- Same-state full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-taller-square-bottom-advice-comparison.png`; both sides show the green third recommendation and expose the complete lower edge. No focused crop was needed because the lower radii and column heights are clearly visible.
- [P2] The browser workspace still had rounded lower corners, conflicting with the requested square lower edge.
  - Fix: changed the outer window radius to `24px 24px 0 0`; browser-computed bottom-left and bottom-right radii are both `0 px`.
- [P2] The compact `370 px` columns felt slightly too short.
  - Fix: increased both the four-card menu and detail panel to `390 px`, preserving exact equal-height alignment.
- Typography: font families, weights, sizes, wrapping and hierarchy are unchanged and remain fully readable.
- Spacing and layout: both columns measure exactly `390 px`; the active detail has a `388 px` client/scroll height, so the added height introduces no clipping or dead overflow.
- Colors and tokens: category colors, white surfaces and neutral border treatments are unchanged.
- Image and icon fidelity: the existing animated Heroicons chart remains sharp and correctly tinted; no new or approximate assets were introduced.
- Copy and content: all four advice states remain unchanged.
- Interaction and accessibility: exactly one recommendation remains pressed, automatic rotation remains active, and the page has no horizontal overflow. Browser console logs were empty.
- Automated verification: all 83 tests pass; JavaScript syntax and diff whitespace checks pass.

### Iteration 26 — five-step flowing photo carousel passed

- Source visual truth: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-before-v50.png` (`1280 × 720 px`), showing the previous four edge-to-edge process cards at a `1280 × 720` CSS viewport and density `1`.
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-carousel-v52-desktop.png` (`1280 × 720 px`) captured from `/enkel?preview=109` at the same viewport and density.
- Same-size full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-carousel-v52-comparison.png` (`2560 × 784 px`). No focused desktop crop was needed because titles, numbering, image crops and gaps remain readable at native scale. Mobile evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-carousel-v52-mobile.png` (`390 × 844 px`).
- [P2] The four cards touched edge-to-edge and behaved as a static strip, so the section lacked the requested visual flow and breathing room.
  - Fix: rebuilt the process area as a horizontal snap carousel with `22–34 px` white gutters, larger fixed-width cards and restrained active-card emphasis. Automatic playback moves smoothly through the sequence and reverses at either end instead of jumping back across the full track.
- [P2] The process began at data retrieval and omitted the requested onboarding step.
  - Fix: added `1 Koble opp systemene dine` with the promise `Kasse, regnskap og bemanning kobles opp på under 30 minutter`, then renumbered the existing process as steps `2–5`.
- [P2] The initial mobile pass inherited `display: contents` from the legacy stacked-card layout, collapsing the carousel items to nearly zero width.
  - Fix: explicitly set the carousel items to `display: block` with matching width, minimum width and flex basis. Post-fix mobile cards measure approximately `320 × 420 px` inside a `390 px` viewport with zero document-level horizontal overflow.
- Typography: existing Scope display and body faces, weights and contrast are preserved; the larger card format improves title hierarchy without introducing clipping.
- Spacing and layout: desktop cards measure approximately `538 × 672 px` at `1280 px`; the track provides visible white gutters and partial neighboring cards to communicate swipe/scroll affordance. Mobile uses an `18 px` gutter and preserves the same rhythm.
- Colors and visual tokens: the white page and gutters remain neutral while each real restaurant photograph carries the section's visual energy. The active card uses opacity and a slight scale change rather than a new decorative color treatment.
- Image quality and asset fidelity: five existing real photographic assets render with no broken images. Crops use the established cover treatment; no placeholder, CSS-drawn or synthetic image substitutes were introduced.
- Copy and content: all five steps are visible in DOM order, with concise process-specific supporting copy and numbering `1–5`.
- Interaction: automatic playback changed both the selected card and horizontal scroll position; manual scroll remains available through native snap behavior. `prefers-reduced-motion` removes visual transitions. Browser console warnings/errors: none.
- Automated verification: all 86 tests pass; JavaScript syntax and diff whitespace checks pass.

## Implementation checklist

- [x] Selected option 3 recreated on `/kombi`.
- [x] Exact user logo and three real supplied photo assets placed.
- [x] Desktop and mobile layouts browser-verified.
- [x] Navigation, advice rows, mobile menu and test-customer form verified.
- [x] Source and implementation placed together in one comparison artifact.
- [x] Reduced-motion and keyboard focus states included.
- [x] Full automated suite passed: 79 tests.
- [x] Diff whitespace check passed.

## Follow-up polish

- Swap in an official transparent Scope wordmark if one becomes available.

final result: passed

### Iteration 25 — three phones on white passed

- Source visual truth: the earlier three-phone product direction in `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-11501f4a-f205-4fec-a826-1922ffce4953.png` (`2940 × 1912 px`) plus the user's explicit final constraint: only three phones, no decorative background.
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-three-phones-v50.png` (`1280 × 720 px`) captured from `/enkel?preview=100` at the default desktop viewport and density `1`.
- Full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-three-phones-v50-comparison.png`. The earlier source section was cropped to its product area and normalized to `1050 × 720 px`; the implementation remains `1280 × 720 px`. The comparison keeps all three complete UI states readable, so no focused crop was necessary.
- [P2] The prior iteration still included an editorial copy column, a tab menu and a red decorative plane, contrary to the clarified product-only direction.
  - Fix: hid the entire copy/menu column and decorative plane, changed the stage to a centered three-column grid, and made Råd, Hjem and Bruker visible simultaneously.
- [P2] Reusing the single-phone tab behavior would have hidden two phones after interaction or horizontal scrolling.
  - Fix: added a dedicated all-phone showcase mode that bypasses the single-panel state machine while preserving that behavior elsewhere.
- Typography: all phone typography is existing product UI, with consistent weights, labels and readable supporting text. No new display copy competes with the phones.
- Spacing and layout: the final desktop layout uses three equal columns, even gaps, a common baseline and consistent device scale. The page has no horizontal overflow.
- Colors and tokens: the section is white with restrained black device frames and existing Scope blue/green product states. The red plane and all other decorative background color are absent.
- Image and asset fidelity: the phones are live HTML/CSS product screens using the real existing icon system. No screenshots, placeholders or broken image assets are present.
- Copy and content: each phone retains realistic Scope content for Råd, Hjem and Bruker; no unrelated section copy remains visible.
- Responsive behavior: at `390 × 844`, all three phones remain present in a horizontal snap track. Page overflow is `0`; only the intentional track has horizontal overflow (`631 px`). The mobile section now holds a full viewport of white before the next section.
- Browser quality: exactly three phones are visible, both removed visual regions compute to `display: none`, and the console contains no warnings or errors.
- Automated verification: all 86 tests pass; JavaScript syntax and diff whitespace checks pass.
- Comparison history: the only P2 findings were the unwanted narrative/background treatment and the incompatible single-phone state logic. Both were removed or isolated, then browser-recaptured. No actionable P0/P1/P2 mismatch remains.

final result: passed

### Iteration 24 — single-phone product story passed

- Source visual truth: `/Users/ole-froiland/.codex/generated_images/019fcce1-1b94-70d1-860a-b04152ff2c48/exec-cfb5430e-ba1a-40cc-91bc-00a7b034be5b.png` (`1536 × 1024 px`, density `1`) as confirmed by the user's corrected reference capture `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-49bc8b1e-e871-418d-8cb7-70684da19283.png`.
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-mobile-showcase-red-v48-section.png` (`1280 × 900 px`) captured from `/enkel?preview=96` at a `1280 × 900` CSS viewport and density `1` with the Råd state active and the scroll-hiding site header out of view.
- Full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-mobile-showcase-red-v48-comparison.png`. The source was normalized to `1350 × 900 px` and placed beside the `1280 × 900 px` implementation. No separate focused crop was needed because the complete copy, navigation, phone UI and decorative color field remain readable at native comparison scale.
- [P2] The first responsive pass inherited the old three-column mobile tab layout, which compressed and clipped the Bruker label.
  - Fix: the small-screen breakpoint now forces a one-column tab list with full-width rows. Browser verification at `390 × 844` reported `scrollWidth === clientWidth === 390`, all three controls measured `350 px`, and exactly one phone remained visible.
- [P2] The first desktop pass used a fixed `780 px` section, exposing the next blue section in the `900 px` QA viewport and weakening the full-canvas composition from the source.
  - Fix: the product layout, visual field and phone track now use a viewport-aware minimum height. The final browser capture reports a `900 px` demo height and keeps the white/red composition continuous to the bottom edge.
- Typography: the implementation preserves the source's compact blue eyebrow, heavy black two-line headline, quiet gray supporting copy and restrained product UI hierarchy. Line wrapping and optical weight match the intended editorial composition without truncation.
- Spacing and layout: both artifacts use a left narrative/menu column and one large right-aligned phone. The implementation keeps the phone visually dominant, aligns the navigation rows to the copy column, and holds the red plane behind rather than over the device.
- Colors and tokens: white, near-black, Scope blue and a saturated red field reproduce the source balance. The implementation intentionally uses the site's existing solid red token instead of the mock's subtle red-orange tonal variation so it remains consistent with the established landing-page palette.
- Image and asset fidelity: the phone is the real HTML product UI rather than a screenshot or placeholder. Existing Heroicons are used for Råd, Hjem and Bruker; no broken images were found.
- Copy and content: `Scope for restauranter`, `Hele driften. Ett klart neste steg.`, the supporting copy and `Åpne demoen` match the selected concept. The in-phone content uses the existing realistic Scope demo data.
- Interaction: Råd, Hjem and Bruker were each selected in the in-app browser. Each selection produced exactly one visible/active phone panel and the correct hidden state for the other two panels. The launch link remains functional.
- Browser quality: no console warnings or errors, no broken images, and no horizontal overflow were found. The scroll-hiding top menu also entered `is-scroll-hidden` during the section capture.
- Automated verification: all 86 tests pass; the targeted showcase suite passes 6/6; JavaScript syntax and diff whitespace checks pass.
- Comparison history: the clipped mobile control row and the short desktop canvas were the only actionable P2 findings. Both were fixed and re-captured; the final side-by-side comparison contains no remaining P0/P1/P2 mismatch. The solid red field is an intentional existing-token choice and is classified as acceptable rather than actionable drift.

final result: passed

---

# Design QA — Enkel mobile showcase redesign

## Evidence

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-11501f4a-f205-4fec-a826-1922ffce4953.png` (`2940 × 1912` px).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-mobile-showcase-v46.png` and `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-mobile-showcase-v46-phones.png` (both `1280 × 720` px).
- Combined same-input comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-mobile-showcase-v46-comparison.png` (`2560 × 1440` px).
- Route and state: `/enkel?preview=91`, desktop layout, `Råd` selected.
- Viewport and density: `1280 × 720` CSS px at 1× density. The taller section is represented by two adjacent viewport captures in the combined comparison; no density scaling was used for the implementation.

## Comparison result

- Full-view evidence: the comparison shows the supplied white three-phone gallery beside the rebuilt dark product stage. The redesign intentionally replaces the flat equal-weight gallery with a stronger editorial heading, restrained product copy and one clearly emphasized phone while preserving all three screens.
- Focused evidence: the lower implementation capture keeps the phone UI readable enough to verify selection, product content, blue active outline and the deliberate de-emphasis of the other two screens. No additional crop was required.
- Typography: the large display heading, compact uppercase kicker and neutral UI labels create a clearer hierarchy without truncation or awkward wrapping.
- Spacing and layout: heading, tabs and phones share one left edge; the three-phone row remains balanced, with every phone contained inside the `1216 px` stage and the active phone visibly larger.
- Colors and tokens: the deep navy stage is paired with white text and one semantic accent per screen—blue for `Råd`, orange for `Hjem`, green for `Bruker`. Contrast and active-state visibility are materially stronger than the source state.
- Image and asset fidelity: the phone interfaces remain code-rendered product UI from the existing implementation; no placeholder images, generated assets or approximate decorative graphics were added.
- Copy and content: the original three views and `Åpne demoen` action remain, while the heading is tightened to `Hele driften i lomma.` and supported by one concise explanatory line.
- Interaction and accessibility: tab selection updates `aria-selected`, exactly one phone receives the active state, and `Hjem` was exercised successfully. Reduced-motion rules remain present.

## Comparison history

### Iteration 1 — blocked

- [P2] The initial browser state did not apply the active class to `Råd`, so all three phones appeared equally muted until the first tab click.
  - Fix: added the initial `is-active` state to the advice phone in the rendered markup.
- [P2] The first active scaling value made the outer phone edge too tight against the stage boundary.
  - Fix: reduced active scaling from `1.035` to `1.02`; the active phone remains visibly larger than the `0.91` inactive state, and the complete row stays inside the `32–1248 px` stage bounds.

### Iteration 2 — passed

- Post-fix capture shows `Råd` at full color and increased scale, with `Hjem` and `Bruker` visibly secondary.
- The tab interaction changes both the selected tab color and emphasized phone without changing layout height.
- No actionable P0, P1 or P2 findings remain.

## Follow-up polish

- [P3] A future iteration could add subtle phone-content transitions between tabs, but the current static emphasis is intentionally restrained and does not block handoff.

final result: passed

---

# Design QA — Enkel advice showcase

## Source truth and implementation evidence

- Primary source: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-9b61f2b6-43a8-4805-888a-aa112b2cbdd7.png`.
- Saved source copy: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-reference.png`.
- Full design context: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-d1954f38-0d64-4157-9e75-23785c3e211d.png`.
- Existing-page context: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-0e095a71-cadf-4442-b763-c4bc7804f415.png`.
- Desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-desktop-final.png`.
- Mobile list implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-mobile-list-v2.png`.
- Mobile detail implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-mobile-detail.png`.
- Combined source/implementation comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-comparison-final.png`.
- Overlap source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-reference.png` (`2940 × 1912` px).
- Overlap desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-desktop.png` (`1440 × 1000` px at 1× density).
- Overlap mobile implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-mobile.png` (`390 × 844` px at 1× density).
- Overlap combined comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-comparison.png` (`1440 × 1000` px).
- Lower-placement source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-lower-reference.png` (`2940 × 1912` px).
- Lower-placement desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-lower-desktop.png` (`1440 × 1000` px at 1× density).
- Lower-placement mobile implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-lower-mobile.png` (`390 × 844` px at 1× density).
- Lower-placement combined comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-lower-comparison.png` (`1440 × 1000` px).
- Original watermarked video frame: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-watermark-before.png` (`1280 × 720` px).
- Clean video frame: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-watermark-after.png` (`1280 × 720` px).
- Extended-hero desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-extended-clean.png` (`1440 × 1000` px at 1× density).
- Extended-hero mobile implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-extended-clean-mobile-top.png` (`390 × 844` px at 1× density).
- Scrolled overlap implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-overlap-clean-final.png` (`1440 × 1000` px at 1× density).
- Extended-hero combined comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-extended-comparison.png` (`1440 × 1000` px).
- Compact-card source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-compact-source.png` (`2940 × 1912` px).
- Compact-card desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-compact-white.png` (`1440 × 1000` px at 1× density).
- Compact-card mobile implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-compact-white-mobile.png` (`390 × 844` px at 1× density).
- Compact-card combined comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-compact-comparison.png` (`1440 × 1000` px).
- White-background correction source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-white-background-source.png` (`2048 × 803` px).
- White-background correction implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-white-background-final.png` (`1440 × 1000` px at 1× density).
- White-background correction comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-white-background-comparison.png` (`1440 × 1000` px).
- Seamless-transition source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-section-transition-source.png` (`2024 × 268` px).
- Seamless-transition desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-seamless-section-transition.png` (`1440 × 1000` px at 1× density).
- Seamless-transition focused crop: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-section-transition-implementation-crop.png` (`1440 × 188` px).
- Seamless-transition comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-section-transition-comparison.png` (`1440 × 1000` px).
- Stacked “Slik virker Scope” before capture: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-stacked-before.png` (`1440 × 1000` px at 1× density).
- Horizontal “Slik virker Scope” desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-how-horizontal-desktop-focused.png` (`1440 × 1000` px at 1× density).
- Compact-and-color source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-color-source.png` (`2354 × 1190` px).
- Compact-and-color desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-stronger-colors-focused.png` (`1440 × 1000` px at 1× density).
- Compact-and-color focused crop: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-stronger-colors-crop.png` (`1120 × 493` px).
- Compact-and-color comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-color-comparison.png` (`1440 × 1000` px).
- Editorial dashboard source: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-25f1f456-2591-4be1-ba81-f54abc953da5.png` (`2028 × 1234` px).
- Editorial dashboard normalized source: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-reference-normalized.png` (`1120 × 681` px).
- Editorial dashboard desktop implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-final.png` (`1440 × 1000` px at 1× density).
- Editorial dashboard focused implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-final-crop.png` (`1120 × 680` px).
- Editorial dashboard mobile implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-mobile.png` (`390 × 844` px at 1× density).
- Editorial dashboard combined comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-comparison.png` (`1200 × 1600` px).
- Route and state: `/enkel?preview=4`; the desktop comparison shows the selected `Omtaler · helgen` state.
- Viewports: desktop `1440 × 1000` CSS px at 1× density; mobile `390 × 844` CSS px at 1× density.

## Full-view comparison evidence

The combined comparison places the supplied dashboard-card reference beside the browser-rendered `/enkel` implementation. The implementation matches the reference hierarchy: rounded browser-style shell, compact status bar, four stacked advice choices, one larger selected-advice panel, source badges, outcome metric and a primary action. It is positioned directly below the existing hero and uses the page's established blue, green, white and light-neutral design language.

## Focused region comparison evidence

- Desktop: the final capture confirms the two-column composition, consistent rounded corners, contained selection dots, readable heading scale and aligned metric/CTA footer.
- Mobile list: the advice choices collapse into a single column without clipping or horizontal overflow.
- Mobile detail: the selected-advice panel follows the list with a readable content hierarchy and a full-width action.
- Interaction: selecting the third advice updates the selected state, title, description, source and metric. `Sett i gang` opens the existing onboarding flow and displays `Finn selskapet ditt`.

## Required fidelity surfaces

- Typography: the existing `/enkel` type system is preserved. Display and body sizes were tuned to maintain the reference hierarchy without oversized or overlapping text.
- Layout and spacing: the component follows the reference's browser-window frame and desktop split, then stacks cleanly below `900 px`.
- Colors: the source structure is adapted to the live page's blue/green visual system; cream/orange accents were intentionally not introduced.
- Images and icons: this component is UI-only in the supplied reference, so no missing raster asset or substitute illustration was required.
- Copy: the four advice examples, source labels, selected insight, metric and CTA are complete and realistic.
- Behavior and accessibility: advice choices are native buttons with synchronized `aria-pressed`; reduced-motion styling is included; the onboarding CTA uses the existing page behavior.

## Findings

No actionable P0, P1 or P2 findings remain.

- [P3] The implementation intentionally uses the existing `/enkel` colors and typography rather than the cream/orange editorial treatment in the source.
  - Impact: structural fidelity is retained while the new section remains visually consistent with the page around it.
  - Follow-up: none unless the whole `/enkel` page is later re-themed.

## Comparison history

### Iteration 1 — changes required

- [P1] Detail updates initially used page-level selectors and could overwrite content inside the first advice button.
  - Fix: scoped all detail selectors to `.advice-preview-detail`.
- [P2] Selection dots sat outside the advice-card bounds and the detail heading was too large relative to the supplied reference.
  - Fix: positioned dots inside each card and reduced the responsive heading scale.

### Iteration 2 — passed

- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-comparison-final.png`.
- Desktop and mobile layouts had no visible clipping or horizontal overflow.
- All four advice choices remained interactive after the selector fix.
- The selected title, description, source and metric updated together.
- The onboarding CTA opened the existing flow successfully.
- Browser console warnings/errors: none.

### Iteration 3 — overlap follow-up passed

- [P2] The dashboard originally began after the hero instead of crossing the hero-to-content boundary shown in the new source.
  - Fix: introduced one responsive overlap token, moved the showcase upward by that amount and kept the same amount of its section background transparent so the hero remains visible behind the upper card edge.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-comparison.png`.
- Desktop overlap: `176 px`; the card crosses from the hero image into the light content background without clipping.
- Mobile overlap: `64 px`; the smaller overlap preserves the reference effect without crowding the compact hero.
- Desktop and mobile document widths match their viewports with no horizontal overflow.
- Typography, colors, copy, imagery, card states and interactions are unchanged from iteration 2.

### Iteration 4 — lower first-load placement passed

- [P2] Roughly the full status bar of the advice box remained visible at the bottom of the initial desktop viewport, competing with the hero before the user scrolled.
  - Fix: reduced the desktop overlap from `176 px` to a responsive maximum of `104 px`, and the mobile overlap from `64 px` to `40 px`.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-overlap-lower-comparison.png`.
- At `1440 × 1000`, only about `25 px` of the card is visible on first load, providing a subtle continuation cue.
- At `390 × 844`, the card is below the initial viewport while retaining a `40 px` overlap after scrolling.
- Desktop and mobile document widths still match their viewports; no layout, typography, content or behavior outside the requested placement changed.

### Iteration 5 — extended hero and clean media passed

- [P2] Increasing the overlap alone would have exposed more of the advice box on first load.
  - Fix: extended the desktop hero by `72 px` and the mobile hero by `40 px`, then restored a `176 px` desktop and `72 px` mobile overlap. The first-load card teaser remains about `25 px` on desktop and stays below the fold on mobile.
- [P1] The source hero video and animated fallback contained a burned-in `Runway` watermark in the lower-right corner.
  - Fix: created `assets/hero-restaurant-clean.mp4` from a proportional top-left crop that removes the watermark, and changed the fallback to the existing clean PNG.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-hero-extended-comparison.png`.
- The hero video plays from the clean asset, the overlap measures about `173 px` in-browser, and the document width equals the viewport on desktop and mobile.
- Browser console warnings/errors: none.

### Iteration 6 — white section and compact card passed

- [P2] The showcase occupied too much width and height, and the light-gray section remained visible around and below it.
  - Fix: changed the post-overlap section color to white, reduced the window maximum width from `1240 px` to `1120 px`, and tightened the bar, grid, advice rows, detail panel and bottom spacing.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-compact-comparison.png`.
- At `1440 × 1000`, the window measures `1120 × 568 px`; the detail panel is `410 px` tall.
- At `390 × 844`, the window measures `358 px` wide and the document matches the viewport with no horizontal overflow.
- Copy, selected state, CTA behavior, hero overlap and clean hero media remain unchanged.

### Iteration 7 — blue-tinted shadow correction passed

- [P2] The section background was white, but the dashboard's large navy-tinted shadow made the area behind the box appear light blue.
  - Fix: replaced `rgba(18, 37, 89, 0.14)` with a lighter neutral-black shadow and bumped the stylesheet cache key.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-showcase-white-background-comparison.png`.
- Desktop and mobile computed section backgrounds resolve to white after the overlap; the shadow resolves to neutral `rgba(0, 0, 0, 0.08)`.
- At `390 × 844`, the card remains `358 px` wide and document width equals viewport width.
- Browser console warnings/errors: none.
- Full automated suite passed: 83 tests.

### Iteration 8 — seamless transition into “Slik virker Scope” passed

- [P2] The advice showcase ended on white while `#how` began on warm beige, leaving a visible horizontal color break and a hairline divider between the sections.
  - Fix: removed the showcase's bottom border and scoped `#how` to the same white background in `enkel-showcase.css`.
- Focused source/implementation evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-section-transition-comparison.png`.
- Desktop and mobile resolve both adjacent areas to `rgb(255, 255, 255)` with no divider; document width continues to match viewport width.
- Typography, spacing, cards, interactions and section content are unchanged.
- Browser console warnings/errors: none.
- Full automated suite passed: 83 tests.

### Iteration 9 — compact horizontal process cards passed

- [P2] The four process cards were full-width sticky panels and made the desktop section almost `3000 px` tall.
  - Fix: changed desktop to a compact responsive grid: four columns from `1100 px`, two columns from `861 px`, and preserved the existing single-column sticky presentation below that breakpoint.
- At `1440 × 1000`, all four cards share one row at approximately `331 × 377 px`, and the section height is reduced from about `2973 px` to `659 px`.
- At `900 px`, the cards form a balanced two-column grid; at `390 px`, the original readable mobile stack remains intact.
- Desktop, tablet and mobile document widths match their viewports with no horizontal overflow.
- Card copy, colors, order and illustrations are unchanged.
- Browser console warnings/errors: none.
- Full automated suite passed: 83 tests.

### Iteration 10 — shorter advice box and stronger colors passed

- [P2] The advice showcase still felt tall and its pale blue surfaces were difficult to distinguish from white at a glance.
  - Fix: reduced the status bar, grid padding, advice-row height, gaps and detail-panel minimum height; strengthened the blue surfaces and green status badges while keeping the existing palette.
- At `1440 × 1000`, the window is reduced from `568 px` to `493 px` tall. Advice rows are `72 px`, the bar is `60 px`, and the detail panel is about `367 px` tall.
- Post-fix combined evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-color-comparison.png`.
- Selecting another advice still updates exactly one active state, `aria-pressed`, title, copy, source and metric.
- Mobile remains free of horizontal overflow; wrapped content grows beyond minimum heights rather than clipping.
- Typography, copy, layout structure, CTA behavior and the surrounding sections are unchanged.
- Browser console warnings/errors: none.
- Full automated suite passed: 83 tests.

### Iteration 11 — Scope-green advice palette passed

- [P2] The blue status surfaces, selected state and CTA felt disconnected from Scope's greener visual identity.
  - Fix: changed only the advice component to a Scope-green palette: pale mint surfaces, a saturated green selected state and CTA, and dark-green heading and metric text.
- Before evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-compact-stronger-colors-focused.png`.
- After evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-green-main.png`.
- At `1440 × 1000`, the window remains `1120 × 493 px`; only its color system changed.
- Selecting another advice still produces exactly one active item with the correct `aria-pressed` state.
- At `390 × 844`, the window remains `358 px` wide with no horizontal overflow.
- Full automated suite passed: 83 tests; JavaScript syntax and diff whitespace checks passed.

### Iteration 12 — blue advice palette with red action accents passed

- [P2] The green advice treatment was reverted after review; the page needed stronger separation between the product preview and its surrounding actions.
  - Fix: restored the compact advice window's blue surfaces and selected state, then changed the header and hero `Book Demo` actions plus the floating chat bubble to Scope red with darker red hover states.
- Hero and action evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-red-buttons-blue-advice-hero.png`.
- Advice and chat evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-blue-advice-red-chat.png`.
- The advice window remains `1120 × 493 px` at `1440 × 1000`; its layout and interaction are unchanged.
- At `390 × 844`, the red actions and blue selected state resolve correctly with no horizontal overflow.
- Full automated suite passed: 83 tests; JavaScript syntax and diff whitespace checks passed.

### Iteration 13 — split blue, red and green actions passed

- [P3] Using the same red treatment for both demo actions and the chat bubble made the actions feel less distinct.
  - Fix: restored the header `Book Demo` action to Scope blue, kept the hero `Book demo` action red, and changed the floating chat bubble to Scope green. Hover states use darker shades of their respective colors.
- Visual evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-blue-red-green-actions.png`.
- Desktop computed colors resolve to blue `rgb(6, 77, 255)`, red `rgb(255, 60, 56)` and green `rgb(0, 189, 123)` in the requested locations.
- At `390 × 844`, the same color roles remain intact with no horizontal overflow.
- Full automated suite passed: 83 tests; JavaScript syntax and diff whitespace checks passed.

### Iteration 14 — editorial four-advice dashboard passed

- [P2] The compact tinted dashboard did not match the new source's white browser shell, numbered list, editorial detail card or four-item hierarchy.
  - Fix: rebuilt the showcase with a two-tier browser header, all four numbered advice rows, a contained selected state, `Se alle innsikter`, serif insight typography, source badges, effect area, primary action and matching Heroicons-based visual cues.
- [P2] In the first browser pass, the first advice title wrapped unnecessarily and the CTA label inherited the muted uppercase metric style.
  - Fix: widened the left column, tightened the inter-column gap and added a CTA-specific white text style.
- Pre-fix evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-first-pass.png`.
- Post-fix comparison evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-editorial-comparison.png`.
- The source was normalized from `2028 × 1234` to `1120 × 681`; the focused implementation is `1120 × 680`, allowing equal-scale comparison without density distortion.
- Typography: Georgia provides the source's editorial serif hierarchy; DM Sans remains the compact UI face. Labels, line-height and wrapping remain legible at desktop and mobile sizes.
- Spacing and layout: the implementation matches the source's browser chrome, separate brand bar, left list/right detail split, white surfaces, hairline borders and restrained shadow. The live window measures `1120 × 680 px` at `1440 × 1000`.
- Colors and tokens: blue remains the selected/action color, green marks quality, and neutral white/gray surfaces match the source while retaining Scope's existing palette.
- Image and icon fidelity: existing Heroicons assets provide the chart, user, chevron and menu cues; all load successfully with no broken assets.
- Copy and content: all four supplied advice points remain visible and selectable; selecting item four updates the title, description, source and metric with exactly one active/pressed item.
- Responsiveness: at `390 × 844`, the `358 px` window stacks the list and detail card without horizontal overflow or clipped controls.
- Behavior: `Sett i gang` opens the existing onboarding dialog at `Finn selskapet ditt`.
- Full automated suite passed: 83 tests; JavaScript syntax and diff whitespace checks passed.

### Iteration 15 — fixed desktop advice height passed

- [P2] The detail card used only a minimum height, so longer advice text made the complete dashboard jump by up to `78 px` when switching between the four choices.
  - Fix: locked the desktop detail card to the measured maximum content height of `554 px`; below `901 px`, content keeps its natural responsive height to avoid clipping.
- Browser measurements are now identical for all four choices at `1440 × 1000`: detail card `554 px`, advice window `758 px`, and showcase section `846 px`.
- All titles, descriptions, source badges, effect metrics and actions remain visible, including the longest advice.
- The interaction, selected state, mobile layout and surrounding sections are unchanged.

### Iteration 16 — 25 percent shorter fixed dashboard passed

- [P2] The fixed editorial dashboard still occupied more vertical space than requested.
  - Fix: compacted the desktop browser chrome, brand bar, grid padding, four advice rows, detail typography, footer, CTA and decorative icon while preserving the existing structure and palette.
- At `1440 × 1000`, the complete advice window is reduced from `758 px` to `565 px`, a `25.5%` reduction.
- All four choices measure the same `565 px` window and `420 px` detail card height.
- Each detail card reports a `418 px` scroll height inside its `420 px` frame, confirming that no title, description, metric or action is clipped.
- The compact rules apply only above `900 px`; the readable mobile presentation is unchanged.

### Iteration 17 — professional automatic advice rotation passed

- [P2] The compact dashboard still showed a malformed undersized logo, a redundant `Se alle innsikter` link and one blue treatment for every advice category.
  - Fix: restored the three-circle Scope mark's correct proportions, removed the redundant link, and introduced restrained blue, orange, green and red category accents across selected rows, detail borders, metrics, actions and product icons.
- [P2] The advice preview required manual selection and did not demonstrate the changing product experience on its own.
  - Fix: added a `4.8 s` automatic rotation with a visible pause/resume control, manual selection reset, page-visibility handling and `prefers-reduced-motion` support.
- Browser verification confirmed automatic blue → orange progression, exactly one pressed row, matching row/detail tones, and a stable `565 px` desktop window throughout.
- Pause verification held the same selected tone for more than one full interval; manual selection and CTA behavior remain functional.
- At `390 × 844`, the window stays within the `390 px` document, the control collapses to a clear status dot, and the stacked content remains readable without horizontal overflow.
- Combined reference/implementation evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-professional-comparison.png`.

### Iteration 18 — clean full-height advice workspace passed

- [P2] The browser chrome, repeated Scope identity and restaurant metadata consumed a full horizontal band without helping users understand the advice.
  - Fix: removed the entire simulated browser/header layer and moved the automatic-view control into the compact `Dagens fire grep` heading.
- [P2] The connected four-row list left a large unused area below it and the advice states felt like one generic table.
  - Fix: rebuilt the left side as four independent full-height cards with consistent `86 px` rows, individual blue/orange/green/red surfaces, contained number tiles, rounded borders and matching selected/focus states.
- [P2] The detail card's oversized serif typography and decorative chart/user icons made it feel less like a polished product action.
  - Fix: removed both decorative icons, changed to a restrained DM Sans hierarchy, added a category label and aligned the metric with the primary action in a compact footer.
- At `1440 × 1000`, the menu and detail panel both measure exactly `420 px`; the full workspace is reduced to `478 px` while preserving all four fixed states without overflow.
- All four desktop states report `418 px` client and scroll heights inside the `420 px` detail frame, so no content is clipped.
- At `390 × 844`, the component remains `358 px` wide inside a `390 px` document, with natural stacked heights and no horizontal overflow.
- Combined issue/reference and implementation evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-clean-redesign-comparison.png`.

### Iteration 19 — sketched browser workspace passed

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-96de845a-3f6f-475f-b290-83a20edb85d9.png` (`1320 × 890 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-browser-workspace-component.png` (`1120 × 585 px`) captured from `/enkel?preview=54` at a `1280 × 720` CSS viewport and device density `1`.
- Combined full-view comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-browser-workspace-comparison.png`. A separate focused crop was not needed because the component crop preserves readable labels, titles, controls and card boundaries at native scale.
- [P2] The previous clean card did not follow the newly supplied browser-window composition or provide the personal greeting shown above the advice workspace.
  - Fix: added a restrained browser bar with an address field, introduced `God morgen, Ida` and a short daily handoff line, and kept the automatic rotation control as a small secondary status action.
- [P2] The source allocates a compact left rail to four choices and a larger right canvas to the active advice.
  - Fix: changed the desktop grid to a `0.72fr / 1.28fr` split, set both columns to a fixed `390 px`, and distributed the four colored choices into equal `83.5 px` rows.
- Typography: DM Sans preserves the existing Scope voice while matching the source hierarchy through a strong greeting, quieter supporting line, compact uppercase category labels and a clearly dominant active-advice title.
- Spacing and layout: the final browser window measures `1120 × 585 px`; the four-item rail and detail card both measure `390 px` and no horizontal overflow is present.
- Colors and tokens: the neutral browser shell matches the wireframe's framing, while blue, orange, green and red category accents keep each recommendation distinct without overwhelming the white workspace.
- Image and icon fidelity: the source contains no product imagery. Existing Heroicons chevrons remain sharp; the browser traffic-light treatment is decorative and hidden from assistive technology.
- Copy and content: the greeting and daily handoff mirror the source intent, while all four production-style advice examples remain intact.
- Interaction: all four advice buttons were selected in the in-app browser. Each produced exactly one active/pressed state, the correct tone/title and a detail panel with no content overflow. Automatic rotation advanced from item four back to item one after one interval. Browser console logs were empty.
- Responsive behavior: the existing stack breakpoints remain in place; below `900 px` the columns stack, and below `620 px` the browser bar, greeting and card padding compact without hiding the active advice or its CTA.
- Automated verification: all 83 tests pass; JavaScript syntax and diff whitespace checks pass.

### Iteration 20 — white cards with enlarged active advice passed

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-7ac3d67e-e4d0-4599-9b4c-082b255d10f5.png` (`804 × 756 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-white-active-component.png` (`400 × 380 px`) captured from `/enkel?preview=56` at a `1280 × 720` CSS viewport and density `1`.
- Same-state focused comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-white-active-comparison.png`; both sides show the green third recommendation as active. The source was normalized to `400 px` width for direct comparison.
- [P2] The reference's four tinted card backgrounds made the list visually busy, while the requested direction was a calmer white set with a stronger active recommendation.
  - Fix: set normal, hover and focus card surfaces to solid white; category identity now remains in the number tile, uppercase label, border and chevron.
- [P2] The selected recommendation needed to read as physically larger without changing the fixed list height during automatic rotation.
  - Fix: applied a `1.035` desktop scale, stronger accent border and shadow, plus slightly larger selected label, title and number tile. The transform does not reflow the list; reduced-motion users receive the same emphasis without scaling.
- Typography: the existing DM Sans weights and compact hierarchy remain unchanged for inactive cards; only the active card receives a restrained type increase, with no wrapping or truncation regression in the compared state.
- Spacing and layout: inactive cards remain `373.68 × 83.5 px`; the active card renders at `386.76 × 86.42 px`, a visible `3.5%` enlargement. The outer workspace height remains `584.68 px` with no horizontal overflow.
- Colors and tokens: browser-computed backgrounds for all four cards are exactly `rgb(255, 255, 255)`. Blue, orange, green and red remain semantic accents rather than card fills.
- Image and icon fidelity: the only visible asset in this focused region is the existing Heroicons chevron; it remains sharp and correctly inherits the active category color.
- Copy and content: all four advice labels and titles are unchanged.
- Interaction: automatic rotation advanced from item four to item one, retained exactly one pressed item and kept all four backgrounds white. Browser console logs were empty.
- Automated verification: all 83 tests pass; JavaScript syntax and diff whitespace checks pass.

### Iteration 21 — unambiguously white square advice cards passed

- Source/problem capture: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-f06c74ef-7eb2-493c-ba71-2eaf837d7b44.png` (`808 × 768 px`).
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-square-white-component.png` (`400 × 380 px`) captured from `/enkel?preview=58` at a `1280 × 720` CSS viewport and density `1`.
- Same-state comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-advice-square-white-comparison.png`; both sides show the green third recommendation as selected.
- [P2] The cards were technically white, but tinted number tiles, colored drop shadows and large corner radii made their surfaces read as softly colored.
  - Fix: forced every card and number tile to solid white, removed background images and inactive shadows, and set all card and number radii to `0`.
- [P2] Removing every selection cue would make the active recommendation ambiguous.
  - Fix: retained only a crisp category-colored border and `4 px` inset leading rule on the active card; its existing `1.035` scale continues to provide the requested size emphasis.
- Typography: card labels and titles are unchanged and remain readable; the active card keeps its restrained type increase.
- Spacing and layout: square corners remove the inflated pill-like silhouette without changing row height, grid spacing or the fixed workspace height.
- Colors and tokens: browser-computed card and number-tile backgrounds are all `rgb(255, 255, 255)`; every radius is `0 px`; inactive box shadows compute to `none`.
- Image and icon fidelity: the existing Heroicons chevrons are unchanged and remain the only image assets in the focused area.
- Copy and content: all four labels and advice titles are unchanged.
- Interaction and accessibility: exactly one item remains selected, scaling remains disabled for reduced-motion users, no horizontal overflow is present and the browser console is empty.
- Automated verification: all 83 tests pass; JavaScript syntax and diff whitespace checks pass.

## Implementation checklist

- [x] Dashboard/advice box inserted directly below the `/enkel` hero.
- [x] Four interactive advice choices and one detail panel implemented.
- [x] Desktop and mobile layouts browser-verified.
- [x] Existing onboarding CTA behavior reused and verified.
- [x] Source and implementation combined into a comparison artifact.
- [x] Automated suite passed: 83 tests.
- [x] JavaScript syntax and diff whitespace checks passed.

final result: passed

### Iteration 27 — compact test-customer invitation passed

- Source visual truth: `/var/folders/bx/x598dj4x52163bx0hbhdrw3c0000gn/T/codex-clipboard-f7bf4d6b-f38a-462e-8af9-0d2d04d2d251.png` (`2940 × 1912 px`), showing the previous tall blue invitation on `/enkel`.
- Browser-rendered implementation: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-testkunder-compact-v53.png` (`1440 × 1000 px`) captured from `/enkel?preview=111` at a `1440 × 1000` CSS viewport and density `1`.
- Same-width focused comparison: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-testkunder-compact-v53-comparison.png` (`2024 × 496 px`). The blue region was cropped from each screenshot and normalized to `1000 px` width so its relative height and content density can be compared directly. Mobile evidence: `/Users/ole-froiland/Desktop/Prosjekter/Scope-1/output/product-design/enkel-testkunder-compact-v53-mobile.png` (`390 × 844 px`).
- [P2] The desktop invitation used oversized vertical padding, a very large heading and broad column spacing, making it dominate more of the page than requested.
  - Fix: reduced only the desktop section padding, heading scale, column gap and internal vertical margins. The blue section now measures approximately `534 px` tall at `1440 px`, while all original copy and actions remain visible.
- Typography: the existing family, weight and condensed headline hierarchy are preserved; the heading now computes to `85.6 px` at the QA viewport with no clipping or awkward wrapping.
- Spacing and layout: desktop padding resolves to `72 px` above and below, and the two-column content block measures approximately `390 px` tall. Mobile keeps the established single-column rhythm and remains approximately `666 px` tall.
- Colors and visual tokens: the Scope blue background, white type, green checks and off-white CTA remain unchanged.
- Image quality and asset fidelity: this section contains no photographic or generated imagery; the existing check icons render unchanged and sharply.
- Copy and content: no text, list item, CTA or link target was removed or rewritten.
- Interaction and responsiveness: the CTA remains present, mobile has zero document-level horizontal overflow, and browser console warnings/errors are empty.
- Automated verification: all 86 tests pass; JavaScript syntax and diff whitespace checks pass.

final result: passed
