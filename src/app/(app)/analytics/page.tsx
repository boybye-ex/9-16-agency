"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface PlatformData {
  id: string;
  platform: string;
  accountName: string;
  connected: boolean;
  totalViews: number;
  engagementRate: number;
  topHours: number[];
  topDays: number[];
  topPosts: { title: string; views: number; engagement: number }[];
  hourly: { hour: number; engagement: number }[];
}

interface AnalyticsPayload {
  platforms: PlatformData[];
  overall: {
    totalViews: number;
    engagementRate: number;
    topHours: number[];
    topDays: number[];
  };
  recommendations: string;
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [platform, setPlatform] = useState("INSTAGRAM");
  const [accountName, setAccountName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function connectAccount(e: FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setMessage("");
    try {
      const res = await fetch("/api/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, accountName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not connect");
      setMessage(json.message);
      setAccountName("");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    } finally {
      setConnecting(false);
    }
  }

  const chartData =
    data?.platforms
      .flatMap((p) => p.hourly)
      .reduce<{ hour: number; engagement: number }[]>((acc, row) => {
        const existing = acc.find((a) => a.hour === row.hour);
        if (existing) existing.engagement += row.engagement;
        else acc.push({ ...row });
        return acc;
      }, [])
      .sort((a, b) => a.hour - b.hour) || [];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Social Analytics AI</h1>
      <p className="mt-2 text-[#a8b3c2]">
        Connect Instagram, TikTok, and Facebook. See what works and when to post.
      </p>

      <form
        onSubmit={connectAccount}
        className="panel mt-8 grid gap-3 rounded-2xl p-5 md:grid-cols-[180px_1fr_auto]"
      >
        <select
          className="input"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="FACEBOOK">Facebook</option>
        </select>
        <input
          className="input"
          placeholder="@account or page name"
          value={accountName}
          onChange={(e) => setAccountName(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={connecting}
          className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {connecting ? "Connecting…" : "Connect"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-[#00bbff]">{message}</p> : null}

      {loading ? (
        <p className="mt-10 text-sm text-[#a8b3c2]">Loading insights…</p>
      ) : error ? (
        <p className="mt-10 text-sm text-[#c50337]">{error}</p>
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="panel rounded-2xl p-5">
              <p className="text-xs uppercase text-[#a8b3c2]">Total views</p>
              <p className="mt-2 font-display text-3xl font-bold">
                {data.overall.totalViews.toLocaleString()}
              </p>
            </div>
            <div className="panel rounded-2xl p-5">
              <p className="text-xs uppercase text-[#a8b3c2]">Engagement rate</p>
              <p className="mt-2 font-display text-3xl font-bold">
                {data.overall.engagementRate}%
              </p>
            </div>
            <div className="panel rounded-2xl p-5">
              <p className="text-xs uppercase text-[#a8b3c2]">Best days</p>
              <p className="mt-2 font-display text-xl font-bold">
                {data.overall.topDays.map((d) => dayNames[d]).join(", ") || "—"}
              </p>
            </div>
          </div>

          <div className="panel mt-8 rounded-2xl p-5">
            <h2 className="font-display text-lg font-semibold">Engagement by hour</h2>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="rgba(250,250,250,0.06)" vertical={false} />
                  <XAxis dataKey="hour" stroke="#a8b3c2" tickFormatter={(v) => `${v}h`} />
                  <YAxis stroke="#a8b3c2" />
                  <Tooltip
                    contentStyle={{
                      background: "#071018",
                      border: "1px solid rgba(250,250,250,0.08)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="engagement" fill="#00bbff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {data.platforms.map((p) => (
              <div key={p.id} className="panel rounded-2xl p-5">
                <p className="text-xs uppercase tracking-wide text-[#c50337]">
                  {p.platform}
                </p>
                <h3 className="mt-1 font-display text-lg font-semibold">{p.accountName}</h3>
                <p className="mt-3 text-sm text-[#a8b3c2]">
                  {p.totalViews.toLocaleString()} views · {p.engagementRate}% eng
                </p>
                <p className="mt-2 text-xs text-[#a8b3c2]">
                  Peak hours: {p.topHours.map((h) => `${h}:00`).join(", ")}
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  {p.topPosts.slice(0, 3).map((post) => (
                    <li key={post.title} className="flex justify-between gap-3">
                      <span>{post.title}</span>
                      <span className="text-[#a8b3c2]">{post.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="panel mt-8 rounded-2xl p-6">
            <h2 className="font-display text-xl font-semibold">AI recommendations</h2>
            <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#fafafa]">
              {data.recommendations}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
