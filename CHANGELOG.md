# Changelog

## 0.5.15
- Added optional `copLabel` (prefix before the COP value, e.g. COP CO / COP CWU / EER) and `copDetail` (small line under the daily readings).

## 0.5.14
- Shortened the right-hand coil bends while preserving the three front profiles, the straight return and the pipe positions.

## 0.5.13
- Used the same shallow profile for all three coil turns with a straight return outlet, and removed clipping from the foreground strokes.

## 0.5.12
- Used three identical coil passes and replaced rectangular clipping with a coil-shaped mask.

## 0.5.11
- Centered the supply and return pipes around the condenser midpoint and aligned their readings. Retained the cylinder and its vertical connections.

## 0.5.10
- Increased coil spacing to 56 SVG units and made the lower turn join the fixed blue return as one straight line.

## 0.5.9
- Increased the slope of the three coil turns and smoothed their transition into the fixed blue return pipe.

## 0.5.8
- Reworked the condenser coil into three evenly spaced turns, with one continuous path between the red supply and blue return.

## 0.5.7
- Removed clipping strip on coil turns.
- Coil stretched; last turn joins blue return in front of the condenser.

## 0.5.6
- Removed the top coil turn.
- Removed the lower loop behind the cylinder; connected directly to blue return.
- Retained the existing card layout and animations.

# Changelog

## 0.5.5
- Restore interpolated flow animation with explicit CSS length units.
- Replace visible coil hooks with inclined turns joined tangentially behind the cylinder.

## 0.5.4
- Continuous water path with a common animation phase and phase-aligned visible front turns.
- Supply and return joints pass behind the condenser.
- Refrigerant remains separate and flows clockwise.

## 0.5.3
- Przebudowana owijka: jedna logicznie ciągła spirala, cztery skośne przednie zwoje i cztery ukryte tylne odcinki.
- Połączenia czerwonego zasilania i niebieskiego powrotu wyłącznie z końcami spirali, za korpusem skraplacza.
- Kierunek animacji spirali: od niebieskiego powrotu u dołu do czerwonego zasilania u góry.
- Zachowane wszystkie pozostałe elementy.
