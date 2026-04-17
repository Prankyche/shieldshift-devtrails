import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloudRain, MapPin, Clock, IndianRupee,
  FileText, CheckCircle2, AlertCircle, XCircle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/AppLayout";
import { toast } from "sonner";
import { api } from "@/lib/api";


interface Claim {
  id: string;
  claim_ref: string;
  event_type: string;
  area: string | null;
  duration_hrs: number | null;
  est_payout: number | null;
  status: "pending" | "processing" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
}


const statusIcon = {
  approved:   <CheckCircle2 className="h-4 w-4 text-accent" />,
  pending:    <AlertCircle  className="h-4 w-4 text-amber-500" />,
  processing: <AlertCircle  className="h-4 w-4 text-amber-500" />,
  rejected:   <XCircle      className="h-4 w-4 text-destructive" />,
};

const statusStyle = {
  approved:   "bg-accent/10 text-accent",
  pending:    "bg-amber-50 text-amber-600",
  processing: "bg-amber-50 text-amber-600",
  rejected:   "bg-destructive/10 text-destructive",
};

const statusLabel = {
  approved:   "Approved",
  pending:    "Pending",
  processing: "Processing",
  rejected:   "Rejected",
};

const fmt = {
  currency: (n: number | null) => (n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—"),
  date: (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
};

export default function Claims() {
  const navigate = useNavigate();
  const [activeClaim, setActiveClaim]   = useState<Claim | null>(null);
  const [pastClaims,  setPastClaims]    = useState<Claim[]>([]);
  const [loading,     setLoading]       = useState(true);
  const [submitting,  setSubmitting]    = useState(false);
  const [area,        setArea]          = useState("");
  const [amount,      setAmount]        = useState<string>("");
  const [duration,    setDuration]      = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const [activeRes, allRes] = await Promise.all([
          api.get<{ success: boolean; data: { claim: Claim | null } }>("/api/claims/active"),
          api.get<{ success: boolean; data: { claims: Claim[] } }>("/api/claims"),
        ]);

        setActiveClaim(activeRes.data.claim);

        const past = allRes.data.claims.filter(
          (c) => c.status === "approved" || c.status === "rejected"
        );
        setPastClaims(past);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to load claims.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleRequest = async () => {
    setSubmitting(true);

    const requestedAmount = amount ? Number(amount) : 0;
    if (!requestedAmount || requestedAmount <= 0) {
      toast.error("Please enter a valid insurance amount.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post<{ success: boolean; data: { claim: Claim }; message: string }>(
        "/api/claims",
        {
          event_type: "Weather Disruption",
          area: area.trim() || null,
          duration_hrs: duration ? Number(duration) : null,
          est_payout: requestedAmount,
        }
      );
      toast.success(res.message ?? "Claim submitted successfully!");
      setActiveClaim(res.data.claim);
      navigate("/dashboard", { state: { claim: res.data.claim, refreshClaims: true } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit claim.");
    } finally {
      setSubmitting(false);
    }
  };


  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Claims Management</h1>
          <p className="text-muted-foreground mt-1">Track and manage your insurance claims</p>
        </div>

        {/* ── Active Claim ──────────────────────────────────── */}
        <div className="bg-card rounded-xl border card-shadow p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Active Claim</h2>
            {activeClaim ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold capitalize">
                <AlertCircle className="h-3.5 w-3.5" /> {activeClaim.status}
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                None
              </span>
            )}
          </div>

          {activeClaim ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <CloudRain className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Event</p>
                    <p className="text-sm font-semibold text-foreground">{activeClaim.event_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <MapPin className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Area</p>
                    <p className="text-sm font-semibold text-foreground">{activeClaim.area ?? "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-secondary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-semibold text-foreground">
                      {activeClaim.duration_hrs != null ? `${activeClaim.duration_hrs} hrs` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <IndianRupee className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Est. Payout</p>
                    <p className="text-sm font-semibold text-accent">{fmt.currency(activeClaim.est_payout)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => toast.info(`Tracking claim ${activeClaim.claim_ref}…`)}
                >
                  Track Claim
                </Button>
              </div>
            </>
          ) : (
            /* No active claim — show submit form */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-dashed">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No active claim. Submit one below if you experienced a weather disruption today.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm text-foreground">
                  <span>Insurance Amount</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="₹0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>Area</span>
                  <Input
                    type="text"
                    placeholder="e.g. Koramangala"
                    value={area}
                    onChange={(event) => setArea(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm text-foreground">
                  <span>Duration (hrs)</span>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 4"
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                  />
                </label>
              </div>
              <Button
                onClick={handleRequest}
                disabled={submitting}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </span>
                ) : (
                  "Request Claim"
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Past Claims ───────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Past Claims</h2>

          {pastClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No past claims yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-card rounded-xl border card-shadow overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Claim ID</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Date</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pastClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 text-sm font-medium text-foreground">{claim.claim_ref}</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{fmt.date(claim.created_at)}</td>
                        <td className="px-5 py-4 text-sm font-semibold text-foreground">{fmt.currency(claim.est_payout)}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[claim.status]}`}>
                            {statusIcon[claim.status]}
                            {statusLabel[claim.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {pastClaims.map((claim) => (
                  <div key={claim.id} className="bg-card rounded-xl border card-shadow p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{claim.claim_ref}</p>
                      <p className="text-xs text-muted-foreground">{fmt.date(claim.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{fmt.currency(claim.est_payout)}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[claim.status]}`}>
                        {statusIcon[claim.status]}
                        {statusLabel[claim.status]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}