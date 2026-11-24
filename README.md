# Haier Heating Card v0.4.7

Animowany schemat instalacji grzewczej dla dashboardu Home Assistant. Karta nie wymaga `custom:button-card` i nie zawiera domyślnych identyfikatorów encji.

## Instalacja / aktualizacja

W HACS dodaj repozytorium niestandardowe w kategorii **Dashboard**, zainstaluj kartę i przeładuj frontend. Po aktualizacji przez HACS pobierz nową wersję zasobu przed odświeżeniem przeglądarki.

```yaml
type: custom:haier-heating-card
fit_height: true
max_width: 640
height_reserve: 170
missing_entity_mode: hide
```

W edytorze wybierz encje z listy. Istniejące mapowania `entities:` zachowują te same klucze.

- `max_width`: limit w pikselach. `0` oznacza pełną dostępną szerokość przydzieloną przez dashboard. Karta nie deklaruje własnej liczby kolumn. Zapisane w dashboardzie ustawienia układu pozostają bez zmian.
- `fit_height`: dodatkowy limit szerokości wynikający z wysokości okna, przy zachowaniu proporcji 2:3.
- `height_reserve`: wysokość pozostawiona poza kartą przy dopasowaniu do ekranu.
- `missing_entity_mode`: `hide`, `dash` lub `zero`; niedostępna encja nadal może wyświetlać kreskę.
- `pump_threshold_w`: próg animacji pompy Haier (domyślnie 30 W).

## Testy

`npm test` uruchamia testy lokalne bez zależności. `npm run build` sprawdza składnię i kopiuje źródło do `dist/`.

## Licencja

MIT.
