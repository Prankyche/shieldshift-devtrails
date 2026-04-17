const ML_BASE = process.env.ML_API_URL || "http://localhost:8000";

const mlRequest = async (endpoint, method = "GET", body = null) => {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${ML_BASE}${endpoint}`, options);
  if (!res.ok) {
    throw new Error(
      `ML service error: ${res.status} - ${await res.text()}`
    );
  }
  return res.json();
};

// Premium pricing
async function getPremiumPrices(city, season, activityTier, povertyScore) {
  return mlRequest("/api/prices", "POST", {
    city,
    season,
    activity_tier: activityTier,
    poverty_score: povertyScore,
  });
}

async function getDefaultPremiumPrices() {
  return mlRequest("/api/prices/default", "GET");
}

// Fraud detection
async function evaluateFraud(claim) {
  return mlRequest("/api/fraud/check", "POST", claim);
}

// Payout simulation
async function simulateEvent(payload) {
  return mlRequest("/api/simulate/event", "POST", payload);
}

module.exports = {
  getPremiumPrices,
  getDefaultPremiumPrices,
  evaluateFraud,
  simulateEvent,
};