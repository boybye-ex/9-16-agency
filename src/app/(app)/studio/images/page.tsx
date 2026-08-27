"use client";

import { useState } from "react";

const styles = ["Cinematic", "UGC phone", "Bold product", "Neon night", "Clean studio"];

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState(
    "South African sneaker drop, model holding box, vertical ad, city night",
  );
  const [style, setStyle] = useState(styles[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; prompt: string } | null>(null);
  const [gallery, setGallery] = useState<{ url: string; prompt: string }[]>([]);

  async function generate() {
    if (!prompt.trim()) {
      setError("Add a prompt first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ prompt, style, aspect: "9:16" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult(data);
      setGallery((g) => [{ url: data.url, prompt: data.prompt }, ...g].slice(0, 8));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">AI Images</h1>
      <p className="mt-2 text-[#a8b3c2]">
        Higgsfield-style vertical image generation for ads and social.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="panel space-y-4 rounded-2xl p-6">
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="input resize-y"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-[#a8b3c2]">Style</label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyle(s)}
                  className={`rounded-full px-3 py-1.5 text-xs ${
                    style === s
                      ? "bg-[#c50337] text-white"
                      : "border border-[var(--line)] text-[#a8b3c2]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {error ? <p className="text-sm text-[#c50337]">{error}</p> : null}
          <button
            type="button"
            onClick={() => void generate()}
            disabled={loading}
            className="btn-primary rounded-xl px-5 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate 9:16 image"}
          </button>
        </div>

        <div className="panel overflow-hidden rounded-2xl">
          <div className="relative mx-auto aspect-[9/16] max-h-[70vh] w-full bg-black/40">
            {result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.url}
                alt={result.prompt}
                className="h-full w-full object-cover animate-rise"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#a8b3c2]">
                {loading ? "Generating your image…" : "Your generated image will show here"}
              </div>
            )}
          </div>
        </div>
      </div>

      {gallery.length > 0 ? (
        <div className="mt-10">
          <h2 className="font-display text-xl font-semibold">Recent</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {gallery.map((item, i) => (
              <button
                key={`${item.url}-${i}`}
                type="button"
                onClick={() => setResult(item)}
                className="overflow-hidden rounded-xl border border-[var(--line)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="aspect-[9/16] w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
