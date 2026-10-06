// DAILY RATES: update every morning, at the same time as CEBS.
// Type the SAME spot rates you enter in CEBS (Rate Management -> Update Spot Rates).
// Spot = units of foreign currency per 1 USD, 4 decimals (CEBS rounds to 4).
// Check them first with: python3 Tools/check_rates.py
var FX_RATES = {
  date: "2026-10-06",
  branch: "Arrivals",
  spot: {
    ZAR: 16.6626,
    EUR: 0.8881,
    GBP: 0.7548,
    AED: 3.6725,
    CNY: 6.7050,
    CAD: 1.4246   // not set up in CEBS yet: add it there before trading
  }
};
