#!/bin/sh
# Copies today's rates (and the pricing engine) to the Exchange Board, so both show the same rates.
# Run after editing rates.js:  ./sync_board.sh
cd "$(dirname "$0")" || exit 1
node test.js > /dev/null || { echo "test.js failed: not copying"; exit 1; }
echo "The Exchange Board now shows API market rates only; nothing to copy."
