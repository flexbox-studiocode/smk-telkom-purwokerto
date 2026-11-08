# Figma typography audit — 5 November 2026

Reference: [Figma page 0:1](https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=0-1&m=dev). Baseline commit: fa6fb19. The complete style inventory covers all 33 text-bearing frames and 185 distinct combinations of family, weight, size, line height, letter spacing, and alignment. `figma-all-frame-styles.json` preserves the source values and per-frame counts.

The before audit was completed before changing production typography. The original production bundle is preserved separately for browser comparisons. Detailed findings are in [academics-before.md](academics-before.md) and [content-facilities-before.md](content-facilities-before.md). Those reports distinguish source inspection from validated browser evidence.

## Shared and homepage findings

| Component | Before | Figma target at source size | Source node |
|---|---|---|---|
| Font delivery | Canonical Plus Jakarta Sans is missing from the loaded font stylesheet; two separately named aliases register the same local variable file | Register the original local Plus Jakarta Sans variable once, preserving 200–800 weights; retain original Poppins and Inter | All 33 frame style inventory |
| Public defaults | Inter body and Poppins headings, including unintentional fallback where JSX names Jakarta | Jakarta for public body/headings with explicit Poppins and Inter exceptions | 322:776–777, 322:1627, 367:1360–1411 |
| Navbar | Inter 13/500, tracking .08em | Jakarta 20/600, normal line height, tracking .12em; scale against the existing navbar width | 322:1622–1627 |
| Navbar CTA/language | Inter 14/700 and 12/600 | Jakarta 24/600/.12em and 24/500/.01em | 322:1630, 322:1636 |
| Homepage hero | Poppins 30/800 with negative tracking; Inter paragraph 14/400 | Jakarta 48/800/.05em; paragraph 14/500/.12em | 322:777, 322:776 |
| Hero buttons | Inherited Inter, 600 for both actions, no matching tracking | Jakarta 15/600 primary, 15/700 secondary, tracking .12em | 322:785–786 |
| Quick access | Poppins 16/700 title, Inter descriptions/actions | Jakarta 29/800/.05em title, 12/500/.08em description, 15/500/.08em action | 322:1000–1021 |
| Shared hero statistics | Poppins 20/800 and Inter 11/400 | Jakarta 40/800/.05em values, 20/500/.08em labels | 24:1851–1876 |
| Home about | Poppins title; body and badge copy lack source weights | Jakarta 48/800 heading, 20/500 body, 24/700 badge title, 16/700 badge copy, 24/700 CTA | 322:1494–1513 |
| Home statistics | Heading family Poppins, labels 500 | Jakarta values 64/600, labels 34/600; keep container proportions | 322:1484–1487 |
| Home departments | Poppins 30/700 heading, 18/700 subtitle, 16/700 card titles | Jakarta 60/800/.1em heading, 36/800/.05em subtitle, 24/700 titles, 15/500 body, 13/500/.08em links | 322:828–887 |
| Home achievements heading | Poppins 40/800 with negative tracking, subtitle Inter 18/400 | Jakarta 36/800/.05em, subtitle 20/800/.05em | 322:902–903 |
| FAQ help panel | Explicit Jakarta declarations currently fall back before a matching face is loaded | Load canonical Jakarta; preserve the panel's already matched distinct sizes, weights, and negative tracking | 322:1581–1616 |
| Digital Innovation | Correct original Jakarta alias and 600 weight, but 64px cap and negative tracking differ | Jakarta 96/600 at source scale, normal line height and zero tracking; preserve reveal/reel lifecycle | 322:1645–1647 |
| Marquee | Correct original Jakarta alias 48/800 | Reuse canonical face; preserve SVG text-path sizing and geometry | 322:760 ribbon |
| CTA | Poppins 24/700, Inter 14/400 description/button | Jakarta 36/700 heading, 20/700 description, 24/800/.01em button, scaled to existing CTA width | 322:1027–1031 |
| Footer | Poppins headings 12/700, Inter body 11/400 and 10px legal | Jakarta section headings20/800, links16/500 with25px source line height, tagline16/500, legal16/400, brand36/800/.05em | 322:934–985 |
| Nexa artwork | Typography is embedded in existing localized image assets | Preserve artwork; apply verified tokens only to actual HTML chat controls/headings | 322:1643 |

## Implementation constraints

- Keep layout, container dimensions, colors, assets, content, and viewport unchanged. Text reflow is allowed; CSS must not force source-frame sizes onto narrower existing cards.
- Convert Figma percentage tracking to em. AUTO line height means normal, not a blanket 1.5.
- Preserve Poppins in teacher/extracurricular heroes, extracurricular controls, facilities headings/filters, calendar headings, and profile learning methods. School Tour action links intentionally use Inter.
- Play and Podkova are used only for decorative arrow/info glyphs already implemented as SVG icons; they do not require new font downloads or replacement of the existing icons.
- No exact detail/article/dialog/login frame exists on page0:1. Apply shared family consistency without inventing page-specific sizes or claiming pixel parity for those screens.
- Existing ID/EN translations and animation logic remain intact. Font loading must complete before text-path/reveal measurements that already await `document.fonts.ready`.

## Validation and after report

The final verification report will record font registration, computed and actual rendered fonts, responsive ID/EN screenshots, text overflow, animation checks, lint, production bundle/SEO test mode, and remote CI results. Live feed or deployment failures are separate from typography failures.
