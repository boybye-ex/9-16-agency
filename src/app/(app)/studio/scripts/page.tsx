"use client";

import { useState } from "react";

export default function ScriptsPage() {
  const [script, setScript] = useState(
    "Hey guys so today I wanted to talk about our new shoes they are really cool and you should buy them because they are on sale this weekend and also they look nice on camera thanks for watching please like and subscribe.",
  );
  const [goal, setGoal] = useState("more clicks to shop");
  const [length, setLength] = useState("15s");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function improve() {
    if (script.trim().length < 10) {
      setError("Paste a longer script to improve.");
      return;
    }
    setLoading(true);
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/ai/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, goal, length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data.improved || "No script returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Script Coach</h1>
      <p className="mt-2 text-[#a8b3c2]">
        Paste a rough script. Get a tighter hook, body, and CTA for vertical video.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="panel space-y-4 rounded-2xl p-6">
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Your script</label>
            <textarea
              className="input min-h-40"
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#a8b3c2]">Goal</label>
              <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#a8b3c2]">Length</label>
              <select
                className="input"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              >
                <option value="15s">15s</option>
                <option value="30s">30s</option>
                <option value="60s">60s</option>
              </select>
            </div>
          </div>
          {error ? <p className="text-sm text-[#c50337]">{error}</p> : null}
          <button
            type="button"
            onClick={() => void improve()}
            disabled={loading}
            className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Improving…" : "Improve script"}
          </button>
        </div>
        <div className="panel rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#a8b3c2]">Improved script</h2>
          <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#fafafa]">
            {loading ? "Improving your script…" : result || "Your improved script will appear here."}
          </pre>
        </div>
      </div>
    </div>
  );
}
