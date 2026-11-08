# School accreditation certificate

Implement the supplied specification and Figma 420:7184 within the existing profile timeline. Keep other milestones and page sections unchanged.

1. Add an assertion for the 2016 certificate data and its English UI labels to the existing profile content check; verify failure before implementation.
2. Store official school name, NPSN, address, expiry and original certificate image in a focused data module. Add a certificate property only to 2016. Add a native dialog following the existing CampusPreview lifecycle: native focus trap, Esc/backdrop/close, Lenis stop/start, body scroll restore and trigger focus restore. Use existing Framer Motion for enter/exit and reduced motion.
3. Reproduce the two-column Figma layout with original icons and an uncropped certificate image; stack on mobile. Keep official text unchanged and translate UI through translationsSchool.js.
4. Add browser checks for CTA placement, all close methods, focus trap/return, scroll lock/restoration, source image geometry, ID/EN and responsive bounds. Run profile regression, language checks, lint and CI build.
5. Review the scoped diff, commit tested source and QA evidence, push feat/profile-certificate and create a PR without merging.

Execution is already authorized by the detailed user request. Existing dirty .gitignore and unrelated untracked files must remain excluded. The shown certificate is the original 2021 extension valid through 31 December 2026; opening it from the historical 2016 milestone does not change the milestone date or issue date.
