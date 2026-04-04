from predict import predict_premium

print("=== STRESS TEST: Monsoon hits multiple cities simultaneously ===\n")

test_cases = [
    {"city": "Mumbai",  "season": "monsoon", "activity_tier": "high", "poverty_score": 0.7},
    {"city": "Chennai", "season": "monsoon", "activity_tier": "high", "poverty_score": 0.8},
    {"city": "Kolkata", "season": "monsoon", "activity_tier": "high", "poverty_score": 0.9},
    {"city": "Patna",   "season": "monsoon", "activity_tier": "high", "poverty_score": 0.9},
]

total_premium = 0
total_payout = 0
any_unsustainable = False

for case in test_cases:
    result = predict_premium(**case)
    weekly = result['base_weekly_premium']
    monthly = weekly * 4
    payout = monthly * result['expected_loss_ratio']
    total_premium += monthly
    total_payout += payout

    status = "SUSTAINABLE" if result['sustainable'] else "NOT SUSTAINABLE"
    print(f"{case['city']} ({'Rural' if result['is_rural'] else 'Urban'}) | "
          f"₹{weekly}/week | Loss Ratio: {result['expected_loss_ratio']} {status}")

    if not result['sustainable']:
        any_unsustainable = True

print(f"\nTotal monthly premiums collected: ₹{total_premium}")
print(f"Total expected payouts: ₹{round(total_payout)}")
print(f"Overall loss ratio: {round(total_payout/total_premium, 2)}")

if any_unsustainable:
    print("\n WARNING: Some cities have unsustainable loss ratios.")
    print("Action: Consider suspending new enrolments in those zones.")
else:
    print("\n All cities sustainable under monsoon stress scenario.")