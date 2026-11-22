# Haier Heating Card

Animated Home Assistant dashboard card for a Haier heat-pump installation, including compressor, fan, refrigerant circuit, CWU tank, CO buffer, heating zones, pumps and temperature-dependent fills.

## Installation with HACS

1. In HACS open **Custom repositories**.
2. Add this GitHub repository as type **Dashboard**.
3. Install **Haier Heating Card**.
4. Reload the browser.

## Minimal configuration

```yaml
type: custom:haier-heating-card
```

The defaults match the original Franciszkow/Haier installation. Any entity can be overridden:

```yaml
type: custom:haier-heating-card
fit_height: true
pump_threshold_w: 30
entities:
  electric: sensor.haier_licznik_power
  compressor: sensor.haier_czestotliwosc_sprezarki
  fan: sensor.haier_predkosc_wentylatora_1_diag
  cwu: sensor.franciszkow_czujnik_cwu_temperatura
  bufferTop: sensor.franciszkow_czujnik_co_temperatura
  bufferMiddle: sensor.franciszkow_czujnik_dodatkowy_1_temperatura
  bufferBottom: sensor.franciszkow_czujnik_dodatkowy_2_temperatura
```

## Features

- SVG-based, no PNG background
- responsive height fitting
- animated fan, compressor, pumps and flows
- separate CWU and CO temperature palettes
- three-point CO buffer stratification
- configurable Haier circulation-pump threshold
- more-info on entity click
- direct toggling for switch controls

## Development

```bash
npm install
npm run build
```

## License

MIT

## Missing entity handling

Set `missing_entity_mode` globally:

```yaml
type: custom:haier-heating-card
missing_entity_mode: hide # hide | dash | zero
entities:
  fan: sensor.haier_predkosc_wentylatora_1_diag
```

- `hide` (default): hide values and device icons with no matching entity; hide an optional tank or zone when none of its mapped entities exist.
- `dash`: keep placeholders visible with `—`.
- `zero`: keep placeholders visible with `0` (display fallback only, not a real measurement).
- An entity that exists but is `unavailable` or `unknown` always shows `—`; it is not treated as a missing mapping.
- Both tanks are shown physically full. CO charge percentage remains a separate energy reading.

The visual editor includes the missing-entity selector. This is an initial HACS candidate, not yet validated against a live Home Assistant instance.

## Visual entity mapping (v0.3.0)

In the Lovelace card editor, expand any of the six groups: Pompa ciepła, Dom i pogoda, CWU, Bufor CO, Parter, Piętro. Each field has a Home Assistant entity picker, initially populated with the original installation's entity. Select any other entity to override the mapping, or use × to disable that field. All mappings are stored under `entities:`.

Example:

```yaml
type: custom:haier-heating-card
missing_entity_mode: hide
entities:
  fan: sensor.my_heat_pump_fan_speed
  cwu: sensor.my_tank_temperature
  upperPump: ''
```

This version restores the missing wind and heating/cooling control symbols to the initial plugin layout. The supplied full original button-card artwork remains the reference for further visual parity work. Test in a real HA dashboard before publishing a stable release.
