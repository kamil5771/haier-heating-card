# Haier Heating Card v0.4.1 (test version)

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

## v0.4.1 performance

SVG nodes and running animations remain mounted when sensor values change. Only modified readings, fills, and state-dependent animation elements are updated.
