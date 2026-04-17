# ShieldShift — AI-Powered Parametric Insurance for India's Gig Workers

> **Guidewire DEVTrails 2026**

---

Pitch Deck : https://docs.google.com/presentation/d/1ZrmXNFMJcQOQCK2YKzYUHXn_7gRc236TWR1AAZeoI9g/edit?usp=sharing

---

## What Is ShieldShift?

Every day, millions of delivery workers cross flooded streets, brave pollution alerts, and lose entire shifts to curfews they never saw coming. They keep our cities fed and our packages delivered — but when the world stops, so does their income. No employer steps in. No safety net catches them. They just lose.

ShieldShift was built for them.

ShieldShift is an AI-powered parametric insurance platform designed exclusively for food delivery partners on Zomato and Swiggy. Our system watches the world so workers don't have to. When rainfall crosses a threshold, when pollution turns hazardous, when a curfew shuts down a zone — ShieldShift detects it automatically and transfers compensation directly to the worker's UPI account. No forms. No calls. No waiting. The event itself is the claim.

---

## Persona-Based Scenarios and Workflow

### Our Persona: The Food Delivery Partner

**Meet Arjun, 24, Chennai.**

Arjun delivers full-time for Swiggy, riding 8–10 hours a day across the city. His income is directly dependent on the number of completed deliveries — on a good day he earns ₹800. But when the northeast monsoon hits Chennai, entire zones flood within hours. Roads become impassable, restaurants shut early, and customers stop ordering. Arjun loses 3–4 days of income in a single week with nothing to fall back on.

With ShieldShift, the moment rainfall in his zone crosses 64.5mm in 3 hours, the system detects it automatically, cross-checks that Arjun was active in that zone, and triggers a payout directly to his UPI account. He doesn't file anything. He doesn't call anyone. The money just arrives.

**Meet Priya, 31, Delhi.**

Priya works night shifts on Zomato, typically 7 PM to 2 AM. One evening, a sudden government-imposed curfew shuts down her entire delivery zone with no warning. Her shift is wiped out. ShieldShift detects the civic alert, maps it against Priya's active zone and shift hours, calculates her expected earnings for that period, and automatically transfers compensation to her account before she even wakes up the next morning.

**Meet Kiran, 22, Bengaluru.**

Kiran delivers part-time on weekends for extra income. One Sunday, Swiggy goes down for 3 hours — a platform outage. No orders come through. ShieldShift monitors platform-level activity, detects the widespread inactivity, confirms the outage has crossed the 2-hour threshold, and automatically initiates a payout for all affected workers in Kiran's zone. No claim needed.

---

### Application Workflow

The application follows a structured pipeline to ensure accurate detection of disruptions and timely compensation:

1. **Data Collection:** The system collects real-time data from multiple sources including GPS location of workers, weather APIs, government alerts, and platform activity logs.
2. **Disruption Detection:** External data inputs are analyzed to identify events such as extreme weather, curfews, or platform outages. Predefined thresholds are used to classify these events as disruptions.
3. **Context Validation:** The system verifies whether a worker is genuinely affected by matching their location, activity status, and working hours with the detected disruption.
4. **Loss Estimation:** Expected earnings are calculated using historical data and behavioral patterns. This is compared with actual earnings during the disruption period to estimate income loss.
5. **Trigger Evaluation:** Parametric conditions are evaluated to determine whether the disruption qualifies for compensation. Only when predefined criteria are satisfied is the payout process initiated.
6. **Fraud Detection:** Before releasing payments, the system evaluates authenticity using the multi-signal composite trust score — GPS validation, cell tower triangulation, behavioral analysis, and peer density checks.
7. **Payout Processing:** If the event passes validation, the compensation amount is automatically credited to the worker's UPI/bank account. In cases of suspicious activity, the payout is temporarily held for further verification.

---

## Weekly Premium Model and Parametric Triggers

The system adopts a dynamic weekly premium model designed specifically for gig economy workers whose income and risk exposure vary frequently. Unlike traditional insurance systems that rely on fixed monthly or yearly payments, this model ensures affordability, flexibility, and personalization.

The weekly premium is determined using the following function:

**Premium = f(Delivery Zone, Season, Historical Disruption Frequency, Infrastructure, Rural/Urban, Activity Tier, Poverty Score)**

- **Delivery Zone:** the likelihood of disruptions based on geographic risk (e.g., flood-prone or high-traffic zones)
- **Season:** monsoon months carry a higher risk multiplier than winter months
- **Historical Disruption Frequency:** how often the worker's zone has been hit by disruptions in the past (based on last 10 years of data)
- **Infrastructure:** areas with poor drainage and slow recovery charge higher premiums
- **Rural/Urban:** rural areas have slower recovery times and higher payout exposure
- **Activity Tier:** less active workers pay proportionally less
- **Poverty Score:** workers closer to the poverty line receive a small premium subsidy

> Note: The insurance does not cover war, pandemics, and other catastrophic events. This is further ensured by analyzing government curfews, alerts, etc. By doing so, the viability of the product is preserved.

### AI-Based Pricing Model

A Random Forest Regressor is used to compute personalized premiums.

- **Algorithm:** Random Forest Regressor
- **Inputs:** City, delivery zone, season, historical disruption frequency, infrastructure quality, rural/urban classification, activity tier, poverty score
- **Output:** Predicted weekly premium for each worker
- **Training data:** 2,000 synthetic records based on 10-year historical disruption patterns across 10 Indian cities
- **Why Random Forest:** Handles both categorical and numerical data efficiently, is robust to outliers, and provides interpretability through feature importance scores
- **Model Accuracy:** MAE of ₹0.32 — predictions accurate to within 32 paise

**Feature Importance:**

| Feature | Importance |
|---------|------------|
| Zone | 61.3% |
| Rural/Urban | 18.8% |
| Season | 6.7% |
| Infrastructure | 6.3% |
| Activity Tier | 3.5% |
| City | 3.0% |
| Poverty Score | 0.4% |
| Disruption Frequency | 0.1% |

### Risk-Based Premium Tiers

| Risk Level | Description | Weekly Premium |
|------------|-------------|----------------|
| Low Risk | Stable zones with minimal disruptions | ₹20 – ₹30 |
| Medium Risk | Occasional disruptions | ₹30 – ₹40 |
| High Risk | Frequent weather-related disruptions | ₹40 – ₹55 |
| Critical Risk | Highly vulnerable zones (e.g., flood-prone) | ₹55 – ₹80 |

### Parametric Triggers

The system uses a parametric insurance model where payouts are triggered automatically when predefined conditions are met. This removes the need for manual claim filing and significantly reduces processing time.

**1. Weather-Based Trigger**
- Rainfall greater than 64.5mm in 3 hours → 60% payout
- Moderate rainfall greater than 35mm/hr → 30% payout
- Extreme heat above 45°C for 4+ hours → 60% payout

**2. Pollution Trigger**
- AQI > 400 (Hazardous) → 60% payout
- AQI > 300 (Very Unhealthy) → 30% payout

**3. Government / Policy Trigger**
- Curfews or lockdowns flagged in worker's active zone → 60% payout
- Emergency alerts from government feeds

**4. Platform Disruption Trigger**
- Platform downtime exceeding 2 hours
- Zomato/Swiggy API returns zero orders for 2+ consecutive hours

> All triggers are cross-checked against the worker's registered zone AND active shift hours. A trigger that fires outside a worker's shift does not initiate a payout.

### Payout Calculation

**Payout = Worker's Average Daily Earning × (Number of Disrupted Hours / 8)**

Capped at the policy's maximum weekly payout. Rural workers receive higher max payouts due to slower infrastructure recovery times.

| Coverage Tier | Weekly Premium | Max Payout/Week (Urban) | Max Payout/Week (Rural) |
|---------------|----------------|--------------------------|--------------------------|
| Basic | ~80% of base premium | ₹600 | ₹900 |
| Standard | Base premium | ₹1,200 | ₹1,800 |
| Premium | ~130% of base premium | ₹2,000 | ₹3,000 |

### Financial Sustainability — Stress Test Results

Our model maintains a target loss ratio of 0.55–0.70 (55–70 paise paid out per ₹1 collected).

| City | Type | Weekly Premium | Loss Ratio | Status |
|------|------|----------------|------------|--------|
| Mumbai | Urban | ₹50 | 0.68 | Sustainable |
| Chennai | Urban | ₹50 | 0.57 | Sustainable |
| Kolkata | Urban | ₹50 | 0.57 | Sustainable |
| Patna | Rural | ₹65 | 0.63 | Sustainable |
| **Overall** | | | **0.61** | **Sustainable** |

---

## Platform Choice: Web-Based Platform

The project is designed as a web-based platform with mobile-responsive design, ensuring accessibility across devices while maintaining centralized control and scalability.

**1. Universal Accessibility**
- Accessible on any device (mobile, tablet, desktop) via browser
- No installation required, reducing entry barriers for delivery workers

**2. Faster Development and Deployment**
- Single codebase for all users
- Easier to develop, test, and deploy compared to native mobile apps
- Rapid iteration cycles, critical during early-stage development

**3. Centralized System Control**
- All updates and fixes are deployed instantly on the server
- No dependency on app store approvals or user updates

**4. Integration with External APIs**
- Seamless integration with weather APIs, government alert systems, and payment gateways
- Web backend can process real-time data efficiently

---

## AI/ML Integration Plan

### 1. Dynamic Premium Pricing Model
- **Algorithm:** Random Forest Regressor
- **Inputs:** City, zone, season, historical disruption frequency, infrastructure, rural/urban, activity tier, poverty score
- **Output:** Personalized weekly premium + dynamic tier pricing
- **Training data:** 2,000 synthetic records based on 10-year historical disruption patterns
- **Why Random Forest:** Handles mixed input types well, robust to outliers, and provides feature importance scores

### 2. Fraud Detection Engine
- **Algorithm:** Autoencoder (Neural Network based anomaly detection)
- **Inputs:** GPS location logs, cell tower data, device telemetry, worker's registered zone vs active zone, peer density in disruption zone
- **Flags:** GPS coordinates inconsistent with cell tower data, GPS spoofing apps detected on device, worker's zone suddenly changed before a disruption event, abnormal density of workers in the same disruption zone
- **Output:** Reconstruction error score — high error = anomalous behaviour, payout withheld and routed to manual review
- **Why Autoencoder:** Since payouts trigger automatically based on weather data, fraud is not about fake claims but about workers spoofing their location into a declared disruption zone. The autoencoder learns normal worker location behaviour and flags any deviations automatically

### 3. Risk Profiling
- **Algorithm:** K-Means clustering to segment delivery zones by historical disruption patterns
- **Output:** Zone Risk Score (Low / Medium / High / Critical) used in premium calculation
- **Why K-Means:** Simple, interpretable, and effective for grouping zones into distinct risk tiers based on historical weather and disruption frequency data

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js (mobile-responsive web app) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| ML/AI | Python (scikit-learn, TensorFlow/Keras) |
| Weather API | OpenWeatherMap (free tier) |
| AQI API | CPCB / OpenAQ (free tier) |
| Auth | Firebase Auth |
| Version Control | GitHub |

---

##  Development Plan

### Phase 1 (March 4–20): Idea Creation 
- Problem research and persona definition
- Architecture design
- README and idea document
- 2-minute pitch video

### Phase 2 (March 21 – April 4): Building 
- Worker onboarding and registration flow
- Dynamic premium calculation (Random Forest model)
- Weather API integration and disruption triggers
- Insurance policy management
- Fraud detection MVP

### Phase 3 (April 5–17): Scale & Polish
- Advanced fraud detection (Autoencoder)
- Instant payout simulation
- Analytics dashboard (worker + admin views)
- Final pitch deck and 5-minute demo video

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Prankyche/shieldshift-devtrails.git
cd shieldshift-devtrails
```

### 2. Set Up the ML Models

```bash
cd ml/premium_model
pip install scikit-learn pandas numpy requests
python generate_data.py
python train_model.py
```

### 3. Set Up the Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` folder:

```
DATABASE_URL=postgresql://username:password@localhost:5432/shieldshift
OPENWEATHERMAP_API_KEY=your_api_key_here
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend will be running at `http://localhost:8000`

### 4. Set Up the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will be running at `http://localhost:3000`

### 5. Verify ML is Working

```bash
python ml/premium_model/predict.py
python ml/premium_model/stress_test.py
python ml/triggers/weather_trigger.py
```

### 6. Test the Premium API

```bash
curl -X POST http://localhost:8000/api/calculate-premium \
-H "Content-Type: application/json" \
-d '{"city": "Chennai", "season": "monsoon", "activity_tier": "high", "poverty_score": 0.8}'
```

Expected response:

```json
{
  "city": "Chennai",
  "zone": "high",
  "is_rural": false,
  "base_weekly_premium": 50,
  "tiers": {
    "basic": {"weekly_premium": 40, "max_payout_week": 600},
    "standard": {"weekly_premium": 50, "max_payout_week": 1200},
    "premium": {"weekly_premium": 65, "max_payout_week": 2000}
  },
  "expected_loss_ratio": 0.57,
  "sustainable": true
}
```

---

## Adversarial Defense & Anti-Spoofing Strategy

*Market Crash scenario: a coordinated ring of 500 delivery partners using GPS spoofing apps to fake their location into a declared disaster zone and trigger mass false payouts.*

### The Core Challenge

Simple GPS verification is dead. A worker's phone can report they're in a flood zone while they're safely at home. We need to catch the faker without punishing the genuinely stranded worker.

### How the Product Differentiates Real vs. Fake

We create a trust score which combines multiple factors.

**1. GPS Behavioral Pattern Analysis**
- Spoofed GPS typically shows unnaturally stable coordinates or jumps
- Real workers in a disruption zone show micro-movement
- We flag GPS coordinates that remain perfectly static for >30 minutes as suspicious

**2. Platform Order Activity Cross-Check**
- If a disruption is detected in a worker's zone but their Zomato/Swiggy session shows they accepted and completed orders during that period, the automatic payout is withheld
- Activity during "disruption" counts as fraud

**3. Network Cell Tower Triangulation**
- We cross-reference GPS with the worker's connected cell tower
- If GPS says "Area X flood zone" but the nearest tower is in Area Y, that's a red flag
- Spoofing apps can fake GPS but cannot fake cell tower pings

**4. Peer Density Validation**
- In a real disruption event, we expect a density cluster of workers in the affected zone
- A fraud ring operating from home creates an impossible spatial pattern: 50 workers all "in" the same 200m flood zone but none of their cell towers match
- We run a density anomaly check — if the claimed zone has 10x more insurance claimants than delivery activity normally supports, the entire batch is flagged

**5. Historical Behavior Baseline**
- Each worker has a behavioral fingerprint built over time: typical working hours, zones, device IDs
- A worker who has never operated in Zone X suddenly receiving a payout for a disruption there is a high-risk signal
- New accounts (<2 weeks old) with immediate high-value payouts are auto-flagged

### Fraud Ring Detection

A coordinated fraud ring leaves a detectable signature:
- Multiple payouts triggered within a narrow time window (< 5 minutes apart)
- Payout requests originating from the same IP address or device subnet
- Workers with overlapping social graph signals (same referral chain, same signup device)
- Unusual geographic clustering of workers who have never historically worked near each other

When our system detects 3+ of these signals simultaneously across a batch, it triggers a **Syndicate Alert** — the entire batch is frozen, not just individual payouts, and routed to a fraud analyst dashboard.

### Protecting Honest Workers

- Workers flagged as suspicious receive a soft hold on their payout, not an outright rejection
- They get a notification: *"We need to verify your location. It'll take up to 2 hours."*
- They can submit one corroborating signal: a photo with location metadata, or a voice note
- If verification passes, payout is released within 2 hours — still same day
- Workers with 6+ months of clean history get an automatic **Trust Fast Lane** — their payouts process instantly with only post-payment fraud checks

### Threshold Design

| Risk Score | Action |
|------------|--------|
| 0–30 | Location verified, payout releases automatically |
| 31–60 | Payout releases but flagged for post-hoc audit |
| 61–80 | Payout held, worker asked to verify their location |
| 81–100 | Payout frozen, manual review, alert triggered if multiple workers show same pattern |

---

## Demo Video

> https://youtu.be/0ZklXZ8LVZ0?si=4lKc87b1xVm-6ikK

---

## Team

> ShieldShift — Guidewire DEVTrails 2026

---

*Built for India's 15 million gig workers who deserve a safety net.*
