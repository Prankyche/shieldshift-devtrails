import { useEffect, useState } from "react";
import { Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LineChart } from "recharts";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import { mlApi } from "@/lib/mlApi";
import { Loader2, Shield, TrendingUp } from "lucide-react";

interface FraudTrendPoint {
  date: string;
  fraud_rate: number;
  total_claims: number;
}

interface PredictedDisruption {
  city: string;
  season: string;
  predicted_loss_ratio: number;
  sustainable: boolean;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<FraudTrendPoint[]>([]);
  const [lossRatio, setLossRatio] = useState(0);
  const [claimCount, setClaimCount] = useState(0);
  const [predictions, setPredictions] = useState<PredictedDisruption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await mlApi.getAdminDashboard();
        setTrendData(res.fraud_trends);
        setLossRatio(res.loss_ratio_overview.loss_ratio);
        setClaimCount(res.loss_ratio_overview.total_claims);
        setPredictions(res.predicted_disruptions);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Fraud trends, loss ratios, and disruption predictions.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-56">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Claims" value={String(claimCount)} icon={Loader2} />
              <StatCard title="Loss Ratio" value={`${(lossRatio * 100).toFixed(1)}%`} icon={TrendingUp} />
              <StatCard title="Prediction Models" value={`${predictions.length} cities`} icon={Shield} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-xl border p-5">
                <h2 className="text-lg font-semibold text-foreground mb-4">Fraud Trend</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 1]} tickFormatter={(value) => `${value * 100}%`} />
                    <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
                    <Line type="monotone" dataKey="fraud_rate" stroke="#7c3aed" strokeWidth={3} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h2 className="text-lg font-semibold text-foreground mb-4">Predicted Disruptions</h2>
                <div className="space-y-4">
                  {predictions.map((item) => (
                    <div key={`${item.city}-${item.season}`} className="rounded-2xl border border-border p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{item.city}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.season}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Loss ratio: {(item.predicted_loss_ratio * 100).toFixed(1)}% — {item.sustainable ? "Sustainable" : "At risk"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
