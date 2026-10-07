// Pricing engine: copies how CEBS prices a deal, so the numbers match CEBS exactly.
// Margins come from "Dolphin FX Tarif table and service fees.xlsx" (see Live Setup guide, Step 6).
// Tested against the live CEBS deals of 6 Oct 2026: run `node test.js`.
(function (root) {
  // Band upper limits in USD. Band 5 has no limit.
  var TIERS_USD = [65, 500, 1000, 1500];
  var TIER_LABELS = ["Under $65", "$65 – $500", "$501 – $1,000", "$1,001 – $1,500", "Over $1,500"];

  // [buy margin %, sell margin %] per band. Chosen so we keep exactly the Excel % of each deal.
  var MARGINS = {
    ZAR: [[6.95, 6.1], [6.38, 5.66], [6.16, 5.48], [5.49, 4.94], [5.26, 4.76]],
    STD: [[7.53, 6.54], [6.95, 6.1], [6.16, 5.48], [5.26, 4.76], [4.71, 4.31]]
  };
  // % we keep per band, straight from the Excel (board margin 1% + service fee).
  var KEEP = { ZAR: [6.5, 6.0, 5.8, 5.2, 5.0], STD: [7.0, 6.5, 5.8, 5.0, 4.5] };

  // CEBS takes $1 off every Retail Buy. Retail Sell fee is inactive (CEBS resets it to 0).
  // Note: the Excel only charges +$1 under $65; CEBS can't limit it, so we copy CEBS.
  var BUY_FEE = 1;
  var SELL_FEE = 0;

  var CURRENCIES = {
    ZAR: { name: "South African rand", flag: "🇿🇦", symbol: "R" },
    EUR: { name: "Euro", flag: "🇪🇺", symbol: "€" },
    GBP: { name: "Pound sterling", flag: "🇬🇧", symbol: "£" },
    AED: { name: "UAE dirham", flag: "🇦🇪", symbol: "AED " },
    CNY: { name: "Chinese yuan", flag: "🇨🇳", symbol: "¥" },
    CAD: { name: "Canadian dollar", flag: "🇨🇦", symbol: "C$" }
  };

  // Rounds the way CEBS does: from the exact stored value of the number, so a "half"
  // the computer stores just below .5 goes down (65 x 6.705 -> 435.82) and one just above goes up.
  // Checked against all 50 live band rates and 20 limits.
  function round(x, dp) {
    return Number(x.toFixed(dp));
  }

  // Band BUY rates are worked out by the CEBS server when spot is saved, and it rounds an exact
  // half UP (6.705 x 1.0753 = 7.2098865 -> 7.209887). Seen on live 7 Oct 2026 (AED 4, CNY 1, CNY 5).
  function roundHalfUp(x, dp) {
    var f = Math.pow(10, dp);
    return Math.round(Number((x * f).toPrecision(12))) / f;
  }

  // The 5 bands for a currency, built the way CEBS builds them.
  // limitSpot: the spot the CEBS band limits were worked out from. CEBS keeps the limits
  // when spot changes (they're only recalculated after a 5% move), so pass it when they differ.
  function bands(code, spot, limitSpot) {
    var ls = limitSpot || spot;
    var m = MARGINS[code === "ZAR" ? "ZAR" : "STD"];
    var keep = KEEP[code === "ZAR" ? "ZAR" : "STD"];
    var out = [];
    var low = 0.01;
    for (var i = 0; i < 5; i++) {
      var up = i < 4 ? round(TIERS_USD[i] * ls, 2) : Infinity;
      var buyRate = roundHalfUp(spot * (1 + m[i][0] / 100), 6);
      var sellRate = round(spot * (1 - m[i][1] / 100), 6);
      out.push({
        band: i + 1, label: TIER_LABELS[i], keep: keep[i],
        low: low, up: up,
        buyMargin: m[i][0], sellMargin: m[i][1],
        buyRate: buyRate, sellRate: sellRate,
        // CEBS also stores the USD equivalent of each limit, per side.
        usdBuyUp: up === Infinity ? Infinity : round(up / buyRate, 2),
        usdSellUp: up === Infinity ? Infinity : round(up / sellRate, 2)
      });
      low = round(up + 0.01, 2);
    }
    return out;
  }

  function bandForForeign(list, amount) {
    for (var i = 0; i < list.length; i++) if (amount <= list[i].up) return list[i];
    return list[list.length - 1];
  }

  function bandForUsd(list, usd, side) {
    for (var i = 0; i < list.length; i++) {
      var up = side === "buy" ? list[i].usdBuyUp : list[i].usdSellUp;
      if (usd <= up) return list[i];
    }
    return list[list.length - 1];
  }

  // side: "buy"  = customer gives us foreign currency, we pay USD.
  //       "sell" = customer takes foreign currency, pays us USD.
  // input: { foreign: n } or, for sells only, { usd: n } (CEBS "Fixed Amount").
  function quote(code, spot, side, input, limitSpot) {
    var list = bands(code, spot, limitSpot);
    var b, foreign, rate, usd;
    if (input.usd != null) {
      if (side !== "sell") throw new Error("A fixed USD amount is only for sells");
      // CEBS Fixed Amount: rand = USD x band rate, rounded UP to a whole note,
      // then the rate is worked back from the rounded figure.
      usd = round(input.usd, 2);
      b = bandForUsd(list, usd, "sell");
      foreign = Math.ceil(round(usd * b.sellRate, 6));
      rate = round(foreign / usd, 6);
    } else {
      foreign = input.foreign;
      b = bandForForeign(list, foreign);
      rate = side === "buy" ? b.buyRate : b.sellRate;
      usd = round(foreign / rate, 2);
    }
    var fee = side === "buy" ? BUY_FEE : SELL_FEE;
    var cash = side === "buy" ? round(usd - fee, 2) : round(usd + fee, 2);
    var market = foreign / spot;
    var kept = side === "buy" ? market - cash : cash - market;
    return {
      code: code, side: side, band: b, foreign: foreign, rate: rate,
      usd: usd, fee: fee,
      cash: cash,              // buy: USD we PAY the customer. sell: USD the customer PAYS us.
      kept: round(kept, 2), keptPct: round(kept / market * 100, 2)
    };
  }

  root.FX = {
    CURRENCIES: CURRENCIES, TIER_LABELS: TIER_LABELS, BUY_FEE: BUY_FEE, SELL_FEE: SELL_FEE,
    bands: bands, quote: quote, round: round
  };
  if (typeof module !== "undefined") module.exports = root.FX;
})(typeof window !== "undefined" ? window : globalThis);
