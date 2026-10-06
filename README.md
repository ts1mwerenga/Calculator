# Teller Calculator

Shows tellers exactly what to pay or take on a deal, using the same spot rates, rate bands,
rounding and $1 fee as CEBS. Open `index.html` (or serve the folder).

## Every morning
1. Run `python3 ~/Desktop/CEBS/Tools/check_rates.py` and update the spot rates in CEBS.
2. Type the **same** spot rates into `rates.js` here and change the date.
3. Run `./sync_board.sh`. It runs the tests, then copies the rates to the Exchange Board.

## Files
- `index.html`: the calculator.
- `rates.js`: today's spot rates. The master copy; the Exchange Board gets a copy via sync.
- `fx.js`: pricing engine (bands and margins from the tariff Excel, CEBS rounding, $1 buy fee, no sell fee).
- `test.js`: 94 checks against real CEBS live deals and bands (6 Oct 2026). `node test.js`.

## Rules for tellers
- CEBS is the record. Quote here, enter the deal in CEBS, pay out only when CEBS "We Pay" matches.
- If the customer names a USD amount on a sell, tick **Fixed Amount** in CEBS.
- CAD is on the calculator but is **not set up in CEBS yet**: don't trade it until it is.
