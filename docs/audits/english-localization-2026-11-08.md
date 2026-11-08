# English localization audit — 2026-11-08

Scope: every public page of the website in English (EN) mode. Admin screens (`/login`, `/dashboard`) are Indonesian by design, and `/spmb*`, `/ppdb*`, `/ketentuan-spmb`, `/lupa-sandi` redirect to the official external portal (`ppdb.telkomschools.sch.id`), which is not part of this repository.

## How the i18n system works

`t('Indonesian text')` looks the string up in `src/data/translations.js` (the merged `translations*.js` files) and falls back to the Indonesian text when no key exists. A missing key therefore never errors; it silently shows Indonesian. That is why the audit renders pages instead of only reading the dictionaries.

## Method

1. **Rendered crawl** of 32 static routes plus detail pages (programs, projects, BKK guides/internships/roadmap, teacher profiles) in ID and EN. Every text node, `alt`, `aria-label`, `title`, `placeholder`, option, document title and meta/OG description was compared between the two languages.
2. **Interactive crawl**: every button, tab and disclosure on 20 pages, plus no-match searches, to reach dialogs, dropdowns, empty states and filters.
3. **Flows**: the full NextTel quiz through its result, the NEXA widget and page chat (including the error state), the language switch in both directions at 1440px and 390px.
4. **Mocked API**: database-shaped records for news, announcements, achievements, events and BKK, to check card and detail-page chrome that the offline backend cannot show.
5. **Static checks**: every `t('…')` literal and every Indonesian data string against the dictionary; a dictionary lint for untranslated values, placeholder mismatches, doubled words, spelling and terminology.
6. **Layout**: horizontal overflow and clipped/over-wide text, ID vs EN, at 390 / 768 / 1024 / 1440px on 19 routes.
7. **Images**: contact sheets of every image rendered on those pages.

## Translation errors found and fixed

| Area | Problem | Fix |
|---|---|---|
| NextTel quiz | All 8 questions and 32 answer options stayed Indonesian (rendered without `t()`, no dictionary entries). The old portal test asserted this on purpose. | `translationsNextTel.js`, `t()` in the questionnaire and option components, test updated. Scoring still uses answer IDs only. |
| Announcements | Date buckets "Hari Ini / Besok / Minggu Ini / Bulan Ini" and the stats "Deadline Terdekat", "Agenda Minggu Ini". | Added entries. |
| Achievements | "Tingkat Nasional", "Tingkat Internasional", "Juara 1" labels. | Added entries. |
| NEXA | Suggested question "Kapan SPMB gelombang 2 ditutup?" had no English text; clicking any suggestion put the Indonesian text in the user's chat bubble and sent it to the assistant. | Added entry; suggestions are now sent translated. |
| SEO | Titles and descriptions for `/galeri`, `/bkk/panduan`, `/jurusan/faq`, `/jurusan/perbandingan`, `/pengumuman/*`, `/berita/trending`, `/berita/agenda`, `/prestasi/galeri`, `/stela`. | Added entries. |
| Achievement detail | "Lihat post Instagram" had no entry. | Added entry. |
| Terminology | "major" (FAQ, NEXA answer) vs "program" elsewhere. | "program" everywhere. |
| Spelling | "fibre", "organisational/organised" mixed with US spelling. | US spelling. |
| Labels | "A ACCREDITATION" in the marquee and "Accredited A". | "GRADE A ACCREDITED", "Grade A accredited". |
| Pronouns | "his" assumed from first names in three quoted summaries. | Gender-neutral wording. |
| Image | Partners card on the Achievements page had Indonesian copy in the image. | `partnersCard-en.png`, chosen by language; alt text updated. |

Dictionary lint after the fixes: 2,360 entries, no untranslated values, no values containing Indonesian words, no placeholder mismatches, no doubled words or stray spacing, no remaining "major". Two keys still contain "PPDB" and three English values add a final period the key lacks; both are harmless (`PPDB` is rewritten to `SPMB` on display).

## Image assets that still need an English version

These contain Indonesian text inside the artwork. They are layered or photographic, so they cannot be edited cleanly in code and need a revised export from the design source.

| Asset | Where it shows | Text in the image |
|---|---|---|
| `src/assets/banners/prestasi-{640,960,1106}.webp` | Achievements hero, Home carousel slide | Large watermark "PRESTASI" (EN: "ACHIEVEMENTS") |
| `src/assets/banners/berita-{640,960,1106}.webp` | News hero, Home carousel slide | Watermark "BERITA" (EN: "NEWS") |
| `src/assets/drive/jurusan-hero-artwork.webp` | Programs hero, Home carousel slide | Watermark "JURUSAN" (EN: "PROGRAMS") |
| `src/assets/kalender/hero-calendar-lossless.webp` | Calendar hero | Sample event titles: "Lomba Kompetensi Siswa", "Seminar Karir & Dunia Kerja", "MPLD …", "Workshop Desain Grafis", "Pelatihan Hari Guru Nasional" |
| `src/assets/ekstrakurikuler/organisasi/osis.jpg` | Extracurricular, OSIS card | "Pengurus HARIAN" (EN: "Executive Board") |
| `src/assets/showcase/tim-dinacom-2023.jpeg` | Achievements showcase | Whole results poster ("JUARA 2 DINACOM 2023 … Diselenggarakan Oleh …") |
| `src/assets/landing/beranda-poster.webp` and the video it fronts | Home, school profile video | Burned-in Indonesian subtitle on the poster; the video's own audio/subtitles are Indonesian |
| `https://smktelkom-pwt.sch.id/wp-content/uploads/2026/08/Hanif-Rizki-Ardianto.jpg` | News data (remote image) | Mixed Indonesian/English announcement poster; hosted on the school's WordPress site |

Not an issue, left as is: "TELKOM" and "BKK" watermarks, the `RUPANTARA` / "Cinta, Bangga, dan Paham Rupiah" product packaging (a proper name), event photos that happen to show signs or banners, and logos.

Already localized earlier: the profile hero (`profil-hero-en.jpeg`, both versions now read `#NextGen`) and the NEXA promo card (`nexa-en-*`, `stela-card-en-*`).

## Not verified

- **Database-driven content** (news, announcements, achievements, events, BKK vacancies, SPMB information). The `/api` backend (MySQL) was not running, so real records could not be loaded. Card and detail-page chrome was checked with mock records, but the Indonesian wording of real articles can only be shown in English when its exact text exists in the dictionary (the imported articles do). New articles need their own English text, either added to the dictionary or stored as an English field.
- **External SPMB portal** (`ppdb.telkomschools.sch.id`): registration, login and its form validation messages.
- **Admin dashboard** (Indonesian only by design) and the error messages shown there.
- **Video content**: spoken language and subtitles inside the YouTube/self-hosted videos.
- **Static HTML shell**: `index.html` and the prerendered pages carry Indonesian titles and descriptions (`<html lang="id">`); the language is switched in the browser, after the page loads. Search engines indexing the prerendered HTML will see Indonesian. A separate `/en` route set with `hreflang` would be needed for English indexing.
- **Native review**: wording was checked for grammar, consistency and natural phrasing, but not by a professional English proofreader.

## Content inconsistencies noticed (not changed)

- The admissions quick link says "tahun ajaran 2026/2027" while the hero, SPMB copy and schedule say 2027/2028 (same in Indonesian).
- The "Selesai" key is translated "Complete", which reads slightly odd as the last button of the NextTel quiz; it is shared with other uses.

## Results

- `npm run lint` passes. `CI=true npm run build:ci` passes.
- `npm run bahasa:uji` (language, portal and content suites) and `npm run nexttel:bilingual` pass.
- New `npm run bahasa:halaman` renders 32 routes in ID and EN and passes: no untranslated dictionary keys, no unchanged Indonesian copy, correct `<html lang>`, translated metadata, alt and aria text, translated NextTel quiz.
- Language switch: ID ⇄ EN changes `<html lang>`, page title and content, survives navigation and reloads, and the toggle's own label follows the active language. Checked at 1440px and 390px.
- Layout: no horizontal scrolling and no English-only clipped or over-wide text at 390, 768, 1024 and 1440px on the 19 routes checked.
- `npm run seo:uji` was not usable here: it checks the indexing policy of a production build, and the CI-mode build used for this audit is intentionally `noindex`.
