// Checks the calculator against real CEBS live data (Client 739, Arrivals, 6 Oct 2026).
// Run: node test.js   -> every line must say OK.
const FX = require("./fx.js");
const SPOT = { ZAR: 16.6626, EUR: 0.8881, GBP: 0.7548, AED: 3.6725, CNY: 6.7050 };
let fails = 0;
function check(name, got, want) {
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}: got ${got}, CEBS ${want}`);
}

// 1. The 7 deals as CEBS recorded them (View Transactions report + receipt details).
const deals = [
  { r: "17687", code: "ZAR", side: "sell", in: { usd: 106 }, foreign: 1667, rate: 15.726415, usd: 106, cash: 106 },
  { r: "17686", code: "ZAR", side: "buy", in: { foreign: 200 }, rate: 17.820651, usd: 11.22, cash: 10.22 },
  { r: "17685", code: "ZAR", side: "sell", in: { foreign: 1500 }, rate: 15.719497, usd: 95.42, cash: 95.42 },
  { r: "17684", code: "AED", side: "buy", in: { foreign: 1300 }, rate: 3.927739, usd: 330.98, cash: 329.98 },
  { r: "17683", code: "CNY", side: "buy", in: { foreign: 100 }, rate: 7.209886, usd: 13.87, cash: 12.87 },
  // CEBS showed the $1 fee but did not deduct it on this one (We Pay 14.59). Correct is 13.59.
  { r: "17682", code: "ZAR", side: "buy", in: { foreign: 260 }, rate: 17.820651, usd: 14.59, cash: 13.59 },
  { r: "1", code: "GBP", side: "buy", in: { foreign: 10 }, rate: 0.811636, usd: 12.32, cash: 11.32 }
];
for (const d of deals) {
  const q = FX.quote(d.code, SPOT[d.code], d.side, d.in);
  check(`${d.r} rate`, q.rate, d.rate);
  check(`${d.r} amount in USD`, q.usd, d.usd);
  check(`${d.r} ${d.side === "buy" ? "we pay" : "they pay"}`, q.cash, d.cash);
  if (d.foreign) check(`${d.r} foreign amount`, q.foreign, d.foreign);
}

// 2. All 25 bands as shown on CEBS Rate Band (Arrivals, 6 Oct): band, up limit, buy rate, sell rate.
const live = `AED 1 238.71 3.949039 3.432319|AED 2 1836.25 3.927739 3.448478|AED 3 3672.5 3.898726 3.471247|AED 4 5508.75 3.865673 3.497689|AED 5 x 3.845475 3.514215
CNY 1 435.82 7.209886 6.266493|CNY 2 3352.5 7.170998 6.295995|CNY 3 6705 7.118028 6.337566|CNY 4 10057.5 7.057683 6.385842|CNY 5 x 7.020805 6.416015
EUR 1 57.73 0.954974 0.830018|EUR 2 444.05 0.949823 0.833926|EUR 3 888.1 0.942807 0.839432|EUR 4 1332.15 0.934814 0.845826|EUR 5 x 0.92993 0.849823
GBP 1 49.06 0.811636 0.705436|GBP 2 377.4 0.807259 0.708757|GBP 3 754.8 0.801296 0.713437|GBP 4 1132.2 0.794502 0.718872|GBP 5 x 0.790351 0.722268
ZAR 1 1083.07 17.820651 15.646181|ZAR 2 8331.3 17.725674 15.719497|ZAR 3 16662.6 17.689016 15.74949|ZAR 4 24993.9 17.577377 15.839468|ZAR 5 x 17.539053 15.86946`;
for (const row of live.split(/[|\n]/)) {
  const [code, band, up, buy, sell] = row.trim().split(" ");
  const b = FX.bands(code, SPOT[code])[Number(band) - 1];
  if (up !== "x") check(`${code} band ${band} limit`, b.up, Number(up));
  check(`${code} band ${band} buy rate`, b.buyRate, Number(buy));
  check(`${code} band ${band} sell rate`, b.sellRate, Number(sell));
}
// CEBS USD limits shown on Rate Band for AED band 1 (buy 60.45, sell 69.55).
const aed1 = FX.bands("AED", SPOT.AED)[0];
check("AED band 1 USD buy limit", aed1.usdBuyUp, 60.45);
check("AED band 1 USD sell limit", aed1.usdSellUp, 69.55);

console.log(fails ? `\n${fails} FAILED` : "\nALL MATCH CEBS");
process.exit(fails ? 1 : 0);
