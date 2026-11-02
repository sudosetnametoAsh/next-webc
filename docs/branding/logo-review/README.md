# WebC — Handoff

The approved logo uses two opposing corners and a shared central record to represent clearance handoffs between people and offices.

## Artwork

- [Symbol](concept-c-handoff-v1.svg): monochrome vector master.
- [Horizontal logo](concept-c-handoff-lockup-v1.svg): symbol with the outlined WebC wordmark.
- [Browser SVG](../../../public/favicon.svg): amber `#F59E0B` on navy `#060A14`.
- [Browser ICO](../../../public/favicon.ico): 16, 32, and 48 px fallback frames.

The wordmark uses outlined Geist Bold, licensed under SIL Open Font License 1.1. Symbol artwork is custom vector geometry. Preserve the internal gaps and proportions; do not add text inside the browser icon. The amber/navy contrast ratio is 9.21:1.

## Browser integration

Next.js root metadata declares both browser icon formats. Tab titles are `WebC: A Clearance App` before login, `WebC - Admin`, `WebC - Client`, and `WebC - Department`. Both `/student` and `/clearance` use the client title.

The icon geometry and ICO frames were checked, and the production build and browser icon checks passed during integration. The final title text was separately verified in all metadata exports. Signed-in admin and department sessions and trademark clearance were not tested. ESLint is blocked by an existing configuration error.
