"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/status-badge";

type Account = {
  platform: string;
  accountName: string | null;
};

type UserState = {
  email: string;
  name: string | null;
  avatar: string | null;
  plan: string;
  role: string;
};

type SubscriptionState = {
  plan: string;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  betaAccess?: boolean;
  message?: string;
};

export function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [user, setUser] = useState<UserState | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [name, setName] = useState("");
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadSettings() {
    const [accountsRes, meRes, subscriptionRes] = await Promise.allSettled([
      fetch("/api/accounts"),
      fetch("/api/me"),
      fetch("/api/stripe/subscription"),
    ]);

    let nextError: string | null = null;

    if (accountsRes.status === "fulfilled") {
      const accountsData = await accountsRes.value.json().catch(() => ({}));
      if (accountsRes.value.ok) {
        setAccounts(accountsData.accounts ?? []);
      } else {
        nextError = accountsData.error ?? "Unable to load connected accounts";
      }
    } else {
      nextError = "Unable to load connected accounts";
    }

    if (meRes.status === "fulfilled") {
      const meData = await meRes.value.json().catch(() => ({}));
      if (meRes.value.ok) {
        setUser(meData.user ?? null);
        setName(meData.user?.name ?? "");
      } else {
        nextError = nextError ?? meData.error ?? "Unable to load account settings";
      }
    } else {
      nextError = nextError ?? "Unable to load account settings";
    }

    if (subscriptionRes.status === "fulfilled") {
      const subscriptionData = await subscriptionRes.value.json().catch(() => ({}));
      if (subscriptionRes.value.ok) {
        setSubscription(subscriptionData ?? null);
      } else {
        nextError = nextError ?? subscriptionData.error ?? "Unable to load access details";
      }
    } else {
      nextError = nextError ?? "Unable to load access details";
    }

    setLoadError(nextError);
    setLoading(false);
  }

  useEffect(() => {
    loadSettings().catch((error) => {
      setLoadError(error instanceof Error ? error.message : "Unable to load settings");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (!connected) return;

    toast.success(connected === "linkedin" ? "LinkedIn account connected." : "X account connected.");

    const next = new URLSearchParams(searchParams.toString());
    next.delete("connected");
    router.replace(next.toString() ? `/settings?${next.toString()}` : "/settings");
  }, [router, searchParams]);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    if (error === "account_limit") {
      toast.message("Beta access currently includes LinkedIn and X for everyone.");
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("error");
    router.replace(next.toString() ? `/settings?${next.toString()}` : "/settings");
  }, [router, searchParams]);

  async function disconnect(platform: string) {
    const response = await fetch(`/api/accounts/${platform}`, { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error ?? "Unable to disconnect account");
      return;
    }
    toast.success(platform === "linkedin" ? "LinkedIn account disconnected." : "X account disconnected.");
    await loadSettings();
  }

  async function saveName() {
    const response = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast.error(data.error ?? "Unable to update name");
      return;
    }
    await loadSettings();
  }

  const linkedIn = accounts.find((account) => account.platform === "linkedin");
  const twitter = accounts.find((account) => account.platform === "twitter");
  const isAdminAccount = user?.role === "admin" || subscription?.plan === "admin";
  const displayedPlan = isAdminAccount ? "admin" : "beta";

  const billingDateLabel = isAdminAccount
    ? "Admin account — no billing"
    : "Free beta access";

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage connected accounts, beta access, and account details.</p>
      </div>

      {loadError && !loading && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {loadError}
        </div>
      )}

      <div className="quill-card divide-y divide-line">
        <section className="p-6" id="connections">
          <h2 className="text-lg font-semibold text-ink">Connected Accounts</h2>
          <div className="mt-5 space-y-4">
            {[
              { platform: "linkedin", label: "LinkedIn", account: linkedIn, color: "text-[#0A66C2]" },
              { platform: "twitter", label: "X", account: twitter, color: "text-black" },
            ].map((item) => (
              <div key={item.platform} className="flex flex-col gap-3 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={`font-medium ${item.color}`}>{item.label}</p>
                  <p className="mt-1 text-sm text-muted">{item.account?.accountName ?? "Not connected"}</p>
                </div>
                {item.account ? (
                  <Button variant="outline" onClick={() => disconnect(item.platform)}>
                    Disconnect
                  </Button>
                ) : (
                  <form
                    action={`/api/auth/${item.platform}`}
                    method="post"
                    onSubmit={() => setConnectingPlatform(item.platform)}
                  >
                    <Button type="submit" disabled={connectingPlatform === item.platform}>
                      {connectingPlatform === item.platform ? "Connecting..." : "Connect"}
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="p-6">
          <h2 className="text-lg font-semibold text-ink">Access</h2>
          <div className="mt-5 flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted">Current access</p>
              <div className="mt-2">
                <StatusBadge value={displayedPlan} />
              </div>
              <p className="mt-3 text-sm text-muted">
                {isAdminAccount
                  ? `Next billing date: ${billingDateLabel}`
                  : "You’re on free beta access"}
              </p>
              {!isAdminAccount && (
                <p className="mt-2 text-sm text-muted">
                  {subscription?.message ?? "All Pro features are unlocked during beta."}
                </p>
              )}
            </div>
            {!isAdminAccount && (
              <div className="rounded-lg border border-line bg-slate-50 px-4 py-3 text-sm text-muted">
                Billing is paused while Quill is in beta.
              </div>
            )}
          </div>
        </section>

        <section className="p-6">
          <h2 className="text-lg font-semibold text-ink">Account</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-line p-4">
              <p className="text-sm text-muted">Email</p>
              <p className="mt-1 font-medium text-ink">{user?.email ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-line p-4">
              <label className="text-sm text-muted">Name</label>
              <div className="mt-3 flex gap-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="quill-input"
                />
                <Button variant="outline" onClick={saveName}>
                  Save
                </Button>
              </div>
            </div>
            <form action="/api/logout" method="post">
              <Button type="submit" variant="danger">
                Log out
              </Button>
            </form>
          </div>
        </section>
      </div>
    </section>
  );
}
