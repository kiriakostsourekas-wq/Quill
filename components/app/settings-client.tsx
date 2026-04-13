"use client";

import { format } from "date-fns";
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
};

export function SettingsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [user, setUser] = useState<UserState | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [name, setName] = useState("");
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  async function loadSettings() {
    const [accountsRes, meRes, subscriptionRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/me"),
      fetch("/api/stripe/subscription"),
    ]);
    const accountsData = await accountsRes.json();
    const meData = await meRes.json();
    const subscriptionData = await subscriptionRes.json();
    setAccounts(accountsData.accounts ?? []);
    setUser(meData.user ?? null);
    setSubscription(subscriptionData ?? null);
    setName(meData.user?.name ?? "");
  }

  useEffect(() => {
    loadSettings().catch(() => undefined);
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (!connected) return;

    toast.success(connected === "linkedin" ? "LinkedIn account connected." : "X account connected.");

    const next = new URLSearchParams(searchParams.toString());
    next.delete("connected");
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

  async function manageBilling() {
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    toast.error(data.error ?? "Unable to open billing portal");
  }

  const linkedIn = accounts.find((account) => account.platform === "linkedin");
  const twitter = accounts.find((account) => account.platform === "twitter");
  const isAdminAccount = user?.role === "admin" || subscription?.plan === "admin";
  const displayedPlan = isAdminAccount ? "admin" : subscription?.plan ?? user?.plan ?? "free";

  const billingDateLabel = isAdminAccount
    ? "Admin account — no billing"
    : subscription?.currentPeriodEnd
      ? format(new Date(subscription.currentPeriodEnd), "PPP")
      : "Not available";

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage connected accounts, billing, and account details.</p>
      </div>

      <div className="quill-card divide-y divide-line">
        <section className="p-6">
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
          <h2 className="text-lg font-semibold text-ink">Subscription</h2>
          <div className="mt-5 flex flex-col gap-4 rounded-lg border border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted">Current plan</p>
              <div className="mt-2">
                <StatusBadge value={displayedPlan} />
              </div>
              <p className="mt-3 text-sm text-muted">Next billing date: {billingDateLabel}</p>
              {subscription?.cancelAtPeriodEnd && subscription.currentPeriodEnd && (
                <p className="mt-2 text-sm text-muted">
                  Cancellation is set for the end of the current billing period.
                </p>
              )}
            </div>
            <Button variant="outline" onClick={manageBilling}>
              Manage billing →
            </Button>
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
