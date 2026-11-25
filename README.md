# Haier Heating Card v0.5.11

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

## Odczyty dobowe

Dodatkowe encje można wybrać w edytorze karty lub przypisać w YAML:

```yaml
entities:
  energyDaily: sensor.haier_energia_dobowo_2
  heatDaily: sensor.haier_cieplo_dobowo
```

W górnym panelu wyświetlane są jako **Pobrano** i **Wytworzono**, z jednostką encji. Przytrzymanie odczytu lub ikony przez około 500 ms otwiera More Info.

## Skraplacz

Owijka wodna jest oddzielona od obiegu czynnika chłodniczego. Jej tylne fragmenty są zasłonięte przez metalowy korpus, a kolor przechodzi od niebieskiego na dole do czerwonego na górze.

## v0.5.11
- Centered the supply and return pipes around the condenser midpoint and aligned their readings. Retained the cylinder and its vertical connections.

## v0.5.10
- Increased coil spacing to 56 SVG units and made the lower turn join the fixed blue return as one straight line.

## v0.5.9
- Increased the slope of the three coil turns and smoothed their transition into the fixed blue return pipe.

## v0.5.8
- Reworked the condenser coil into three evenly spaced turns, with one continuous path between the red supply and blue return.

## v0.5.7

Ciągła owijka skraplacza z połączeniami ukrytymi za korpusem i gradientem od niebieskiego do czerwonego.
