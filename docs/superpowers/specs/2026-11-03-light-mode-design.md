# Shared light mode for WebC

## Intent and agreed direction

Provide complete light and dark appearances for the admin, department, and
clearance portals. First-time visitors follow their device appearance setting.
The user selected shared theme colors and approved the visual direction shown
in the browser: cool off-white canvas, white surfaces, slate text, amber accents.
The mockup establishes a palette, not replacement layouts or new dashboard data.

## Scope and non-goals

Cover every reachable screen in `/admin`, `/department`, and `/clearance`, including
navigation, dashboards, tables, filters, forms, charts, calendars, loading and
empty states, notifications, toasts, drawers, dialogs, menus, and date controls.
Shared UI used by those screens is included. Preserve behavior, layout, branding,
and the current dark palette as closely as possible.

Do not redesign the login page or the separate `/student` interface. Do not add
account preferences, database changes, new dependencies, or alter exported
documents and uploaded image/document content. Keep unrelated routes visually
stable when introducing document-level theme state. Avoid partially themed
screens, unreadable status colors, inverted media, and a visible wrong-theme
flash during initial loading.

## Existing implementation

`next-themes` is already installed. `src/app/globals.css` defines semantic light
and dark variables and a class-based Tailwind dark variant. The root layout has
no theme provider. Each portal header has an inert moon button. Many portal
components bypass the existing variables with hardcoded navy surfaces, pale text,
and bright status colors. The root layout imports Sonner directly while the
existing `src/components/ui/sonner.tsx` wrapper reads theme state.

## Approaches considered

1. **Shared semantic colors — selected.** Reuse `next-themes` and central CSS
   variables, replacing hardcoded presentation colors at their owning components.
   This needs a broad initial migration but makes all three portals consistent
   and keeps future palette maintenance centralized.
2. **Per-component light/dark utilities.** Also reuse `next-themes`, but duplicate
   palette choices throughout the components. This fits Tailwind but increases
   maintenance and drift; the user chose the shared-color approach instead.

Do not globally reinterpret Tailwind's slate/white utilities or use CSS inversion
as a shortcut: a literal color can mean different things in different components.

## Theme behavior

Use one shared theme provider with `defaultTheme="system"`, system detection,
and class-based switching. Reuse its local storage and cross-tab synchronization.
With no explicit preference, device changes update the appearance. Clicking any
portal's existing header control switches to the opposite resolved appearance;
that explicit choice wins over later device changes and persists across reloads,
navigation, sign-out/sign-in, and the three portals on that browser/origin.
There is no server-side or cross-device preference synchronization.

Builder proposal: retain a binary header toggle for this release; a separate
"return to system" setting is outside scope. The user has approved device-based
initial appearance, not a three-choice menu. This decision is included for design
approval rather than treated as previously agreed.

Use one reusable accessible toggle in the three headers. Its name describes the
action ("Switch to light mode" or "Switch to dark mode"), with a corresponding
sun/moon icon, keyboard operation, visible focus, and an adequate hit target.
Avoid reading browser-only state during server render. Reserve the control's
space until theme-dependent UI is safe to render. Use the library's early theme
script and narrowly scoped hydration handling for the document attribute.

## Shared palette and ownership

Extend existing semantic variables rather than build a second styling system.
Define shared meanings for page canvas, card, inset/header surface, foreground,
muted text, border, hover/selection, focus, brand accent, and status foreground/
background pairs. Add a token only when an existing semantic token cannot express
the role without changing unrelated consumers.

Approved light direction (starting values, subject to contrast verification):

| Role | Light value |
| --- | --- |
| Canvas | `#f4f6fa` |
| Surface | `#ffffff` |
| Inset surface | `#f8fafc` |
| Text | `#172033` |
| Muted text | `#526078` |
| Divider | `#dce2eb` |
| Amber text / tint | `#92400e` / `#fef3c7` |
| Success text / tint | `#166534` / `#dcfce7` |
| Error text / tint | `#991b1b` / `#fee2e2` |

Retain current navy shades such as `#060a14`, `#0a101f`, and `#070c18` for their
respective dark surface roles. Preserve distinct warning, success, error, and
information meanings and pair color with existing labels/icons. Input boundaries
and focus indicators may need stronger colors than decorative dividers.

Theme state belongs at the document level so body-mounted Radix portals and
native dialogs inherit the same colors. Scope any portal-specific overrides so
unrelated pages do not change appearance. Audit actual shared-component callers
before changing defaults. Charts must use theme-aware labels, axes, grids, series,
and tooltips; retain meaningful series distinctions. Set native control color
scheme from the resolved theme and remove unconditional dark date-control styles.
Ensure the mounted toaster follows resolved theme through the existing wrapper
or an equally small extension of the current integration.

## Acceptance and proof

- Fresh browser contexts match both light and dark device settings on first load.
- Device changes update the theme until the user makes an explicit choice.
- Each header toggles the same preference; it survives navigation/reload and
  synchronizes to another open tab. Explicit choice survives device changes.
- All three portals remain readable in both themes, including body-mounted
  dialogs/menus, notifications, forms, chart tooltips, and native date inputs.
- No theme-related hydration warnings, layout shift from the toggle, or visible
  opposite-theme flash on initial load or reload.
- Text meets WCAG AA contrast (4.5:1 normal, 3:1 large); essential control
  boundaries and focus indicators meet applicable 3:1 contrast. Keyboard and
  reduced-motion behavior remain intact.
- Existing dark layouts, unrelated pages, document previews, and exports retain
  their intended appearance and behavior.

Add focused browser coverage for system preference, manual override, persistence,
cross-tab synchronization, and representative mounted portal components, reusing
the existing browser-test infrastructure where practical. Use desktop and narrow
viewport visual checks across the three portals and representative overlays.
Run relevant lint/type/build checks and disclose environment or authenticated-data
limitations. A source scan can locate remaining literals but cannot prove visual
correctness. Do not modify live user data merely to verify appearance.

## Builder discretion and risks

The builder chooses exact token names, safe provider placement/integration,
component migration order, stronger contrast values where needed, and focused
test fixtures. Trace actual route imports rather than assuming every file in a
portal directory is active. No authorization or backend behavior changes belong
to this feature.

The primary risks are missed hardcoded colors, global token effects outside the
portals, portaled overlays, and first-paint/hydration regressions. The palette
mockup has been served successfully but is not production validation. Product
implementation begins only after this document is approved.
