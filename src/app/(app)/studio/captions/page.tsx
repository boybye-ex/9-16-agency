"use client";

import { useState } from "react";

export default function CaptionsPage() {
  const [topic, setTopic] = useState("Weekend flash sale on our new 9:16 sneaker drop");
  const [platform, setPlatform] = useState("tiktok");
  const [tone, setTone] = useState("bold and friendly");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (!topic.trim()) {
      setError("Tell us what the post is about.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/ai/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform, tone, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data.captions || "No captions returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">AI Captions</h1>
      <p className="mt-2 text-[#a8b3c2]">
        Write social captions for Instagram, TikTok, and Facebook in plain language.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-4 rounded-2xl p-6">
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">What is the post about?</label>
            <textarea
              className="input min-h-28"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#a8b3c2]">Platform</label>
              <select
                className="input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#a8b3c2]">Tone</label>
              <input
                className="input"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-[#c50337]">{error}</p> : null}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Writing…" : "Generate captions"}
          </button>
        </div>
        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#a8b3c2]">Results</h2>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#fafafa]">
            {loading ? "Writing captions…" : result || "Your captions will appear here."}
          </pre>
        </div>
      </div>
    </div>
  );
}
