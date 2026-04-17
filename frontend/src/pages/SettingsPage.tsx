import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";


interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  work_type: string;
  experience: string | null;
  avg_daily_earnings: number | null;
}


export default function SettingsPage() {
  const [profile,         setProfile]         = useState<Partial<UserProfile>>({});
  const [loadingProfile,  setLoadingProfile]   = useState(true);
  const [savingProfile,   setSavingProfile]    = useState(false);

  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [savingPwd,   setSavingPwd]   = useState(false);

  useEffect(() => {
    api
      .get<{ success: boolean; data: { user: UserProfile } }>("/api/settings/profile")
      .then(({ data }) => setProfile(data.user))
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Failed to load profile.")
      )
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.patch<{ success: boolean; message: string; data: { user: UserProfile } }>(
        "/api/settings/profile",
        {
          full_name:          profile.full_name,
          city:               profile.city,
          work_type:          profile.work_type,
          experience:         profile.experience,
          avg_daily_earnings: profile.avg_daily_earnings,
        }
      );
      setProfile(res.data.user);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      window.dispatchEvent(new Event("userUpdated"));
      toast.success(res.message ?? "Profile updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) {
      toast.error("Please fill in both password fields.");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await api.patch<{ success: boolean; message: string }>(
        "/api/settings/password",
        { current_password: currentPwd, new_password: newPwd }
      );
      toast.success(res.message ?? "Password changed. Please log in again.");
      setCurrentPwd("");
      setNewPwd("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSavingPwd(false);
    }
  };


  if (loadingProfile) {
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
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
        </div>

        {/* ── Profile ────────────────────────────────────────── */}
        <div className="bg-card rounded-xl border p-6 card-shadow space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Profile Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              {/* Phone requires OTP flow — read-only per backend */}
              <Input value={profile.phone ?? ""} readOnly className="bg-muted/50 cursor-not-allowed" />
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={profile.city ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Work Type</Label>
              <Input
                value={profile.work_type ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, work_type: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Experience</Label>
              <Input
                value={profile.experience ?? ""}
                onChange={(e) => setProfile((p) => ({ ...p, experience: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Avg. Daily Earnings (₹)</Label>
              <Input
                type="number"
                value={profile.avg_daily_earnings ?? ""}
                onChange={(e) =>
                  setProfile((p) => ({
                    ...p,
                    avg_daily_earnings: e.target.value ? Number(e.target.value) : null,
                  }))
                }
              />
            </div>
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
          >
            {savingProfile ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>

        {/* ── Password ───────────────────────────────────────── */}
        <div className="bg-card rounded-xl border p-6 card-shadow space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Current Password</Label>
              <Input
                type="password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={savingPwd}
            variant="outline"
          >
            {savingPwd ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </span>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>

      </div>
    </AppLayout>
  );
}