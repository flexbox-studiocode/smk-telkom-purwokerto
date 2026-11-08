# Local Google Fonts

Inter v20 (300–900), Poppins v24 (300–900), Plus Jakarta Sans v12 (400–800).

The active Latin stylesheet registers the original Jakarta variable font as 200–800 and Inter as 100–900, matching their actual fvar axes. Poppins retains its original static files at 300/400/500/600/700/800. One 27,348-byte Jakarta file is preloaded; other fonts load when used. Its local Arial fallback uses measured metrics: 103.36% size adjustment, 100.42% ascent, 21.48% descent, and zero line gap. Original OFL licenses remain alongside the files.

Downloaded from the Google Fonts CSS2 response used by the application on 2026-10-03. Original WOFF2 bytes remain unchanged. The active `font-faces-optimized.css` declares the verified variable ranges and static weights; `font-faces.css` preserves the complete original subset catalog.

The four program detail frames use Arimo for their overview. The original Arimo v36 Latin files provide normal 400–700 and bold italic 700. Their font faces are declared in the stylesheet for program detail pages and use the [Arimo license](Arimo-OFL.txt).

`sources.json` records original gstatic URLs and SHA-256 hashes. Each family retains its SIL Open Font License in the adjacent `*-OFL.txt`. Binary font files are served separately by Vite: unused subsets and weights are not embedded into the critical stylesheet. The shared HTML entry preloads only the canonical Jakarta Latin face.

These files are intentional runtime assets, including the subsets that are not requested by the current Indonesian/English homepage. Preserve them when cleaning assets; removing them changes the original glyph coverage.
