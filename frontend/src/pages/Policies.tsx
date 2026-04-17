import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Check, Star, Sparkles, Loader2 } from "lucide-react";
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
import { toast } from "sonner";
import { api } from "@/lib/api";


interface Plan {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  period: string;
  coverage: string[];
}

interface UiPlan extends Plan {
  color: string;
  badge: string | null;
}


const STYLE_MAP: Record<string, { color: string; badge: string | null }> = {
  basic:    { color: "border-border",                              badge: null },
  standard: { color: "border-secondary ring-2 ring-secondary/20", badge: "Most Popular" },
  premium:  { color: "border-border",                              badge: null },
  gold:     { color: "border-yellow-500/10 ring-2 ring-yellow-500/20", badge: "Best Value" },
  elite:    { color: "border-emerald-500/20 ring-2 ring-emerald-500/20", badge: "Premium" },
};

const DEFAULT_PLANS: UiPlan[] = [
  {
    id: "basic",
    slug: "basic",
    name: "Basic Protection",
    base_price: 299,
    period: "month",
    coverage: ["Accidental damage", "Package loss", "Delivery delay support"],
    color: STYLE_MAP.basic.color,
    badge: STYLE_MAP.basic.badge,
  },
  {
    id: "standard",
    slug: "standard",
    name: "Standard Shield",
    base_price: 599,
    period: "month",
    coverage: ["Accidental damage", "Package loss", "Delivery delay support", "Fraud assistance"],
    color: STYLE_MAP.standard.color,
    badge: STYLE_MAP.standard.badge,
  },
  {
    id: "premium",
    slug: "premium",
    name: "Premium Plus",
    base_price: 899,
    period: "month",
    coverage: ["Accidental damage", "Package loss", "Priority claims", "Medical reimbursement"],
    color: STYLE_MAP.premium.color,
    badge: STYLE_MAP.premium.badge,
  },
];

export default function Policies() {
  const navigate = useNavigate();
  const [plans,         setPlans]         = useState<UiPlan[]>([]);
  const [loadingPlans,  setLoadingPlans]  = useState(true);
  const [selectedPlan,  setSelectedPlan]  = useState<UiPlan | null>(null);
  const [confirming,    setConfirming]    = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: { plans: Plan[] } }>("/api/policies/plans")
      .then(({ data }) => {
        const ui: UiPlan[] = data.plans.map((p) => ({
          ...p,
          ...(STYLE_MAP[p.slug] ?? { color: "border-border", badge: null }),
        }));
        setPlans(ui.length ? ui : DEFAULT_PLANS);
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : "Failed to load plans. Showing default plan options.");
        setPlans(DEFAULT_PLANS);
      })
      .finally(() => setLoadingPlans(false));
  }, []);

  const saveActivePolicy = (policy: any) => {
    try {
      localStorage.setItem("shieldshift.activePolicy", JSON.stringify(policy));
    } catch {
      // ignore storage failures
    }
  };

  const handleConfirm = async () => {
    if (!selectedPlan) return;
    setConfirming(true);
    try {
      const res = await api.post<{ success: boolean; message: string; data?: { policy?: Plan } }>(
        "/api/policies/subscribe",
        { plan_slug: selectedPlan.slug }
      );
      toast.success(res.message ?? "Subscribed successfully!");
      const policy = res.data?.policy ?? {
        plan_name: selectedPlan.name,
        coverage: selectedPlan.coverage,
        price_paid: selectedPlan.base_price,
        expires_at: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        status: "active",
      };
      saveActivePolicy(policy);
      setSelectedPlan(null);
      navigate("/dashboard", { state: { policy } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Subscription failed.");
    } finally {
      setConfirming(false);
    }
  };


  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-secondary" />
            Prices personalised to your risk profile
          </p>
        </div>

        {loadingPlans ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
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
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">
                    ₹{Number(plan.base_price).toLocaleString("en-IN")}
                  </span>
                  <span className="text-muted-foreground">/{plan.period}</span>
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
                  onClick={() => setSelectedPlan(plan)}
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
        )}
      </div>

      {/* ── Confirmation dialog ────────────────────────────── */}
      <Dialog open={!!selectedPlan} onOpenChange={() => !confirming && setSelectedPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Selection</DialogTitle>
            <DialogDescription>
              You're about to subscribe to the <strong>{selectedPlan?.name}</strong>.
              Your coverage will begin immediately after confirmation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSelectedPlan(null)} disabled={confirming}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              {confirming ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing…
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