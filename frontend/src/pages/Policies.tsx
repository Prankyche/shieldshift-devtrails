import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Check, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/AppLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface Plan {
  name: string;
  price: string;
  period: string;
  coverage: string[];
  premium: string;
  color: string;
  badge: string | null;
}

const fallbackPlans: Plan[] = [
  {
    name: "Basic Plan",
    price: "—",
    period: "/month",
    coverage: ["Weather disruption coverage", "Basic accident cover", "24/7 support"],
    premium: "Low",
    color: "border-border",
    badge: null,
  },
  {
    name: "Standard Plan",
    price: "—",
    period: "/month",
    coverage: ["Weather disruption coverage", "Traffic incident coverage", "Earning loss protection", "Priority support"],
    premium: "Medium",
    color: "border-secondary ring-2 ring-secondary/20",
    badge: "Most Popular",
  },
  {
    name: "Premium Plan",
    price: "—",
    period: "/month",
    coverage: ["Weather disruption coverage", "Traffic incident coverage", "Health & accident cover", "Earning loss protection", "Family coverage add-on", "Dedicated manager"],
    premium: "High",
    color: "border-border",
    badge: null,
  },
];

const ML_API_URL = "http://localhost:8001";

async function fetchMLPrices(): Promise<{ basic: number; standard: number; premium: number }> {
  try {
    const response = await fetch(`${ML_API_URL}/api/prices/default`);
    if (!response.ok) throw new Error("ML API unavailable");
    return await response.json();
  } catch (error) {
    console.warn("ML backend not available, using fallback prices:", error);
    return { basic: 29, standard: 49, premium: 79 };
  }
}

export default function Policies() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [plans, setPlans] = useState<Plan[]>(fallbackPlans);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    fetchMLPrices().then((prices) => {
      setPlans((prev) =>
        prev.map((plan) => {
          if (plan.name === "Basic Plan") return { ...plan, price: `₹${prices.basic}` };
          if (plan.name === "Standard Plan") return { ...plan, price: `₹${prices.standard}` };
          if (plan.name === "Premium Plan") return { ...plan, price: `₹${prices.premium}` };
          return plan;
        })
      );
      setLoadingPrices(false);
    });
  }, []);

  const handleSelect = (planName: string) => {
    setSelectedPlan(planName);
  };

  const handleConfirm = () => {
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      setSelectedPlan(null);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-secondary" />
            Prices calculated by our AI model based on your risk profile
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border bg-card p-6 card-shadow hover:card-shadow-hover transition-all duration-300 ${plan.color}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                    <Star className="h-3 w-3" /> {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-4 pt-2">
                <Shield className="h-8 w-8 text-secondary mb-3" />
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">Premium: {plan.premium}</p>
              </div>

              <div className="mb-6">
                {loadingPrices ? (
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Calculating...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </>
                )}
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.coverage.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSelect(plan.name)}
                className={`w-full ${
                  plan.badge
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                Select Plan
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedPlan} onOpenChange={() => setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Selection</DialogTitle>
            <DialogDescription>
              You're about to subscribe to the <strong>{selectedPlan}</strong>. Your coverage will begin immediately after payment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedPlan(null)}>Cancel</Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Confirm & Subscribe"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
