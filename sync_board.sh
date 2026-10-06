#!/bin/sh
# Copies today's rates (and the pricing engine) to the Exchange Board, so both show the same rates.
# Run after editing rates.js:  ./sync_board.sh
cd "$(dirname "$0")" || exit 1
node test.js > /dev/null || { echo "test.js failed: not copying"; exit 1; }
cp rates.js fx.js "$HOME/Desktop/Exchange Board/" && echo "Exchange Board updated with rates for $(grep -o '[0-9]\{4\}-[0-9-]*' rates.js | head -1)"
