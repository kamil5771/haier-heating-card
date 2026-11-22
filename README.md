# Haier Heating Card v0.4.5 (test version)

Custom Home Assistant SVG dashboard card. The diagram geometry, gradients, pipes, controls and animation markup were transferred from the owner-provided `haier card.txt` without redesign.

## Install

Add this public repository to HACS as **Dashboard**, install, reload Home Assistant, and add:

```yaml
type: custom:haier-heating-card
missing_entity_mode: hide
fit_height: true
pump_threshold_w: 30
```

**No personal entity IDs are shipped as defaults.** Open the visual card editor to choose entities in six groups, or add an `entities:` mapping in YAML. See `examples/example.yaml`.

Missing entity modes: `hide`, `dash` (—), `zero` (0 placeholder). Existing `unavailable` entities display —.

The original artwork is rendered through a native custom card, not `custom:button-card`.

## Testing

Run `npm ci && npm test && npm run build`. Test the visual editor and all animations in Home Assistant before creating a release.

## License

MIT.

## v0.4.5 performance

SVG nodes and running animations remain mounted when sensor values change. Only modified readings, fills, and state-dependent animation elements are updated.

## v0.4.5 sizing

The card host now follows the same calculated width as the SVG, with a maximum of 640px. In Sections dashboards, the default grid width is 6 columns rather than full width. The card still fits the available viewport height when `fit_height: true`.

## v0.4.5

Sizing, SVG patching, switch-error notifications and missing-entity behavior improved. Water levels intentionally remain as in the original YAML. Live tablet and HACS validation are still required.

## v0.4.5

Stable CSS sizing. Card size does not change when scrolling. `fit_height: true` caps SVG height to viewport height minus 170px; `fit_height: false` uses up to 640px of available column width.

## v0.4.5 layout

The card uses the full width of its **assigned section column**, not the full dashboard. Its SVG is capped at 640px and optionally to available viewport height. Configure `max_width: 640` and `height_reserve: 170` if needed. The default Sections card width is 12/12 columns so it no longer renders at half width.
