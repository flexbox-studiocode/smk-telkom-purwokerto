# Profil Sekolah and Stematel Next Pathway

Goal: implement the supplied profile specification and Figma 415:6487 with existing React components, profile CSS, Plus Jakarta Sans and the existing ID/EN dictionary.

Scope: About border/proportions; Figma vision and five missions; three connected pillars; complete historical timeline; new alternating Pathway cards after FacilitiesSection. Keep hero, global layout, teachers, learning methods, backend and admin unchanged.

1. Inspect callers/assets/translations and run existing profile content/video checks. Create feat/profile-next-pathway; preserve unrelated local changes.
2. Extend profile content tests for five missions, three pillars, translated pathway copy/alts, retained section order and unchanged video facade. Observe failure before implementation.
3. Reuse existing About, vision/mission photos/icons and timeline. Download original Figma student/icon assets locally. Keep text in normal document flow; use grid and aspect-ratio for artwork. Update only profile-specific content and translations.
4. Adapt existing browser QA to new pillars and Pathway. Check 320/390/768/1024/1280/1440/1847/1920 widths in ID/EN, text containment, artwork geometry, section alignment, timeline and video playback. Run lint, build:ci, language/video/profile checks and relevant regression checks.
5. Review diff, record evidence and limitations, create tested atomic commits, push and open a PR without merging.

Decisions: execution is already authorized by the detailed user specification. Work on a separate feature branch in the current checkout, preserving local files. Keep 2023 Next Gen branding and its historical digital transformation description. Do not invent a certificate URL: omit its CTA if no source is supplied. Use the attached Pathway composition to resolve misplaced Scholar layer coordinates in the Figma frame. Program claims are supplied design copy, not independently verified outcomes.
