# Profil Sekolah and Stematel Next Pathway QA

Reference: [Figma 415:6487](https://www.figma.com/design/ca2iX76GpJSr0QC7Qyv9RV/Figma-MCP?node-id=415-6487&m=dev), plus the two supplied screenshots. Checked 8 November 2026.

## Implementation

- Reused About, native school video, vision/mission photos, timeline, hero and existing global layout. About now uses a thin red border and Plus Jakarta Sans matching the reference.
- Replaced the profile's four value cards with three connected Digital Skills, Global Exposure and Industry Partnership pillars. Existing value data and the separate teacher-page vision remain unchanged.
- Applied the supplied vision and five highlighted mission statements. Text remains in normal flow; the classroom photo follows mission copy so longer English text stays readable.
- Expanded the five historical milestones from the design. Retained the existing Next Gen label for 2023 and its historical digital transformation context.
- Added The Founder, The Scholar and Professional after the existing facilities section. Student cutouts, iconography and decorations are original Figma assets; headings and descriptions remain responsive HTML.
- Used the existing translation dictionary for every new Indonesian phrase and student alt. Official pathway/pillar names remain English in both languages.

## Files

- `frontend/src/pages/TentangPage.jsx`: adds Pathway after facilities.
- `frontend/src/components/tentang/TentangVisiMisiSection.jsx`: latest vision, mission list and three pillars.
- `frontend/src/components/tentang/TentangPathwaySection.jsx`: new Pathway cards.
- `frontend/src/data/profilePathway.js`: supplied mission, pillar and Pathway copy/assets.
- `frontend/src/data/dummyData.js`: timeline copy only.
- `frontend/src/data/translationsSchool.js`: ID/EN additions.
- `frontend/src/styles/profile.css`: localized profile layout and responsive styling; learning-method rules retained.
- `frontend/src/assets/tentang/profile/pillar-*`, `pathway-*`: 11 downloaded original Figma assets, approximately 792 KB total. Identical rays exports reuse one local file.
- `frontend/scripts/uji-profile-content.mjs`, `uji-profile-figma.mjs`: content/translation coverage and browser checks.

## Asset mapping

| Local asset | Figma layer |
| --- | --- |
| pillar-digital.svg | 415:6575 |
| pillar-global.svg | 415:7105 |
| pillar-industry.svg | 415:7107 |
| pathway-founder.png | 415:7142 |
| pathway-scholar.png | 415:7143 |
| pathway-professional.png | 415:7153 |
| pathway-lightbulb.svg | 415:7154 |
| pathway-graduation.svg | 415:7159 |
| pathway-motif.svg | 415:6903 |
| pathway-outline.png | 415:7017 |
| pathway-rays.png | 415:7161, 415:7162, 415:7163 |

Student images preserve the source layer crop percentages within isolated aspect-ratio containers. The supplied screenshot resolves the Scholar image/card coordinates that sit outside the main frame in Figma metadata. No full-section screenshots or temporary Figma URLs are used at runtime.

## Verification

- `npm.cmd run lint`: passed.
- `CI=true npm.cmd run build:ci`: passed; 100 public routes prerendered with offline CI fixtures. This output is for tests and must not be deployed.
- `node scripts/uji-profile-content.mjs`: passed, including five missions, three pillars, complete Pathway translations/alts, and retained section order.
- `node scripts/uji-video-profil.mjs`: passed, preserving unloaded native video facade and shared source wiring.
- `npm.cmd run bahasa:uji`: passed (including 81 rendered public content views).
- `npm.cmd run hero:uji`: passed (eight placements, original profile floating statistics retained).
- `node scripts/uji-profile-figma.mjs`: production-bundle checks at 1920, 1847, 1440, 1280, 1024, 768, 390 and 320 px in ID/EN. Checks three-pillar layout, equal pillar heights, five missions, all milestone text, local image decoding, student/text separation, shared container alignment and horizontal overflow. Keyboard activation and advancing playback time verified for the real school MP4 in both languages.
- `node scripts/uji-profile-teacher-rows.mjs`: passed at nine widths (1847 through 320 px), both languages; data, batik borders, pagination, animated transition and resize bounds retained.
- Adjacent-route smoke checks: Beranda, Fasilitas and Profil Guru passed at 1440/390 px in ID/EN, including global header/footer landmarks and horizontal overflow.
- Read-only independent code review: no important findings.
- `git diff --check`: passed.

Local visual evidence is in `outputs/profile-next-pathway/`: About, principles, timeline and Pathway screenshots for each viewport/language. Browser and build logs are in `outputs/profile-next-pathway-browser.log` and `outputs/profile-next-pathway-build.log`. Evidence is intentionally local rather than committed with source assets.

## Boundaries and dependencies

- No verified accreditation certificate URL or file was supplied/found. The certificate CTA is omitted rather than pointing to an unrelated page. Add it when the school supplies the actual certificate.
- All added institutional/program claims are the supplied Figma copy; external official-source fact checking is outside this implementation.
- Browser layout tests isolate the CMS with empty `/api/` fixtures. They do not verify production CMS, real admin authentication, backend integration, deployment or Safari/physical devices. The initial local dev preview hit the existing backend's CORS restriction for port 5181; backend configuration was not changed.
- The older `uji-profil-sekolah-layout.mjs` fails on its obsolete `mt-4 flex min-w-0 justify-center` CTA-class expectation. HEAD already uses the newer teacher pagination/CTA layout, and that component is unchanged here. The newer browser teacher-row suite passes.
- Hero, navbar, footer, backend and admin source were not modified. Pre-existing `.gitignore` edits and unrelated untracked files are excluded from commits.

## Git handoff for a later profile revision

The implementation is committed and pushed on `feat/profile-next-pathway`. If making further profile changes on this branch, stage only the intended files:

```powershell
git -C 'D:\LombaTelkom\smk-telkom-purwokerto' add -- frontend/src/pages/TentangPage.jsx frontend/src/components/tentang/TentangVisiMisiSection.jsx frontend/src/components/tentang/TentangPathwaySection.jsx frontend/src/data/profilePathway.js frontend/src/data/dummyData.js frontend/src/data/translationsSchool.js frontend/src/styles/profile.css frontend/src/assets/tentang/profile frontend/scripts/uji-profile-content.mjs frontend/scripts/uji-profile-figma.mjs docs/profile-next-pathway-qa.md
git -C 'D:\LombaTelkom\smk-telkom-purwokerto' commit -m "fix(profile): refine school profile layout"
git -C 'D:\LombaTelkom\smk-telkom-purwokerto' push origin feat/profile-next-pathway
```
