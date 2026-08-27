"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Clip {
  id: string;
  name: string;
  type: "video" | "image" | "text";
  src?: string;
  text?: string;
  start: number;
  duration: number;
  trimStart: number;
  color: string;
}

const COLORS = ["#00bbff", "#c50337", "#fafafa", "#3ddc97", "#ffb020"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function VideoEditorPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = clips.find((c) => c.id === selectedId) || null;
  const totalDuration = useMemo(
    () => Math.max(8, ...clips.map((c) => c.start + c.duration), 8),
    [clips],
  );

  const activeClips = useMemo(
    () =>
      clips.filter((c) => playhead >= c.start && playhead < c.start + c.duration),
    [clips, playhead],
  );

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPlayhead((p) => {
        const next = p + dt;
        if (next >= totalDuration) {
          setPlaying(false);
          return totalDuration;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalDuration]);

  const drawFrame = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#02060e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const clip of activeClips) {
      if (clip.type === "text") {
        ctx.fillStyle = "rgba(2,6,14,0.45)";
        ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.18);
        ctx.fillStyle = "#fafafa";
        ctx.font = "bold 42px Syne, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(clip.text || "", canvas.width / 2, canvas.height * 0.84);
        continue;
      }

      if (clip.type === "image" && clip.src) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = clip.src;
        await new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }
        });
        drawCover(ctx, img, canvas.width, canvas.height);
        continue;
      }

      if (clip.type === "video" && clip.src) {
        const el = videoRefs.current[clip.id];
        if (el) {
          const localTime = clip.trimStart + (playhead - clip.start);
          if (Math.abs(el.currentTime - localTime) > 0.2) {
            try {
              el.currentTime = Math.max(0, localTime);
            } catch {
              /* ignore seek errors */
            }
          }
          if (playing && el.paused) void el.play().catch(() => undefined);
          if (!playing && !el.paused) el.pause();
          drawCover(ctx, el, canvas.width, canvas.height);
        }
      }
    }
  }, [activeClips, playhead, playing]);

  useEffect(() => {
    void drawFrame();
  }, [drawFrame]);

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next: Clip[] = [];
    let cursor = clips.reduce((m, c) => Math.max(m, c.start + c.duration), 0);

    Array.from(files).forEach((file, index) => {
      const src = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      const duration = isVideo ? 5 : 3;
      next.push({
        id: uid(),
        name: file.name,
        type: isVideo ? "video" : "image",
        src,
        start: cursor,
        duration,
        trimStart: 0,
        color: COLORS[index % COLORS.length],
      });
      cursor += duration;
    });

    setClips((c) => [...c, ...next]);
    if (next[0]) setSelectedId(next[0].id);
  }

  function addTextOverlay() {
    const start = playhead;
    const clip: Clip = {
      id: uid(),
      name: "Text",
      type: "text",
      text: "Your hook here",
      start,
      duration: 3,
      trimStart: 0,
      color: "#c50337",
    };
    setClips((c) => [...c, clip]);
    setSelectedId(clip.id);
  }

  function updateSelected(patch: Partial<Clip>) {
    if (!selectedId) return;
    setClips((list) =>
      list.map((c) => (c.id === selectedId ? { ...c, ...patch } : c)),
    );
  }

  function splitSelected() {
    if (!selected || selected.type === "text") return;
    const local = playhead - selected.start;
    if (local <= 0.2 || local >= selected.duration - 0.2) return;
    const left: Clip = { ...selected, duration: local, id: uid() };
    const right: Clip = {
      ...selected,
      id: uid(),
      start: selected.start + local,
      duration: selected.duration - local,
      trimStart: selected.trimStart + local,
    };
    setClips((list) => [
      ...list.filter((c) => c.id !== selected.id),
      left,
      right,
    ]);
    setSelectedId(right.id);
  }

  async function saveProject() {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Video edit ${new Date().toLocaleString()}`,
        type: "VIDEO",
        data: {
          clips: clips.map(({ id, name, type, start, duration, trimStart, text }) => ({
            id,
            name,
            type,
            start,
            duration,
            trimStart,
            text,
          })),
          duration: totalDuration,
        },
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  async function exportVideo() {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.captureStream) return;
    setExporting(true);
    setPlaying(false);
    setPlayhead(0);

    await new Promise((r) => setTimeout(r, 100));

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm",
    });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const done = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
    });

    recorder.start();
    setPlaying(true);

    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!playing && playhead >= totalDuration - 0.05) {
          /* handled below */
        }
      }, 200);
      const endAt = performance.now() + totalDuration * 1000;
      const wait = () => {
        if (performance.now() >= endAt) {
          clearInterval(check);
          resolve();
          return;
        }
        requestAnimationFrame(wait);
      };
      wait();
    });

    setPlaying(false);
    recorder.stop();
    const blob = await done;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "916-adds-export.webm";
    a.click();
    setExporting(false);
  }

  const pxPerSec = 64;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Video Editor</h1>
          <p className="mt-2 text-[#a8b3c2]">
            CapCut-style timeline: upload, trim, split, text, play, export.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="btn-secondary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Import media
          </button>
          <button
            type="button"
            onClick={addTextOverlay}
            className="btn-secondary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            Add text
          </button>
          <button
            type="button"
            onClick={saveProject}
            className="btn-secondary rounded-xl px-4 py-2 text-sm font-semibold"
          >
            {saved ? "Saved" : "Save project"}
          </button>
          <button
            type="button"
            onClick={() => void exportVideo()}
            disabled={exporting || clips.length === 0}
            className="btn-primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="video/*,image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="panel space-y-4 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-[#a8b3c2]">Clip settings</h2>
          {selected ? (
            <>
              <p className="text-sm">{selected.name}</p>
              {selected.type === "text" ? (
                <input
                  className="input"
                  value={selected.text || ""}
                  onChange={(e) => updateSelected({ text: e.target.value })}
                />
              ) : null}
              <label className="block text-xs text-[#a8b3c2]">
                Start (s)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="input mt-1"
                  value={Number(selected.start.toFixed(1))}
                  onChange={(e) =>
                    updateSelected({ start: Math.max(0, Number(e.target.value)) })
                  }
                />
              </label>
              <label className="block text-xs text-[#a8b3c2]">
                Duration (s)
                <input
                  type="number"
                  min={0.5}
                  step={0.1}
                  className="input mt-1"
                  value={Number(selected.duration.toFixed(1))}
                  onChange={(e) =>
                    updateSelected({
                      duration: Math.max(0.5, Number(e.target.value)),
                    })
                  }
                />
              </label>
              {selected.type !== "text" ? (
                <button
                  type="button"
                  onClick={splitSelected}
                  className="btn-secondary w-full rounded-xl px-3 py-2 text-sm"
                >
                  Split at playhead
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setClips((c) => c.filter((x) => x.id !== selected.id));
                  setSelectedId(null);
                }}
                className="w-full rounded-xl border border-[#c50337]/40 px-3 py-2 text-sm text-[#c50337]"
              >
                Delete clip
              </button>
            </>
          ) : (
            <p className="text-sm text-[#a8b3c2]">Select a clip on the timeline.</p>
          )}
        </div>

        <div className="panel overflow-hidden rounded-2xl p-4">
          <div className="mx-auto aspect-[9/16] max-h-[55vh] w-full max-w-[320px] overflow-hidden rounded-xl bg-black">
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setPlayhead(0)}
              className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <span className="text-sm text-[#a8b3c2]">
              {playhead.toFixed(1)}s / {totalDuration.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      <div className="panel mt-6 overflow-x-auto rounded-2xl p-4 scrollbar-thin">
        <div
          className="relative h-36"
          style={{ width: Math.max(720, totalDuration * pxPerSec + 80) }}
        >
          <div
            className="absolute bottom-0 top-0 z-20 w-0.5 bg-[#00bbff]"
            style={{ left: playhead * pxPerSec }}
          />
          {clips.map((clip, index) => (
            <button
              key={clip.id}
              type="button"
              onClick={() => setSelectedId(clip.id)}
              className={`absolute h-12 rounded-lg px-2 text-left text-xs font-medium text-[#02060e] ${
                selectedId === clip.id ? "ring-2 ring-white" : ""
              }`}
              style={{
                left: clip.start * pxPerSec,
                width: Math.max(36, clip.duration * pxPerSec),
                top: 16 + (index % 2) * 56,
                background: clip.color,
              }}
            >
              <span className="line-clamp-2">{clip.name}</span>
            </button>
          ))}
          <input
            type="range"
            min={0}
            max={totalDuration}
            step={0.05}
            value={playhead}
            onChange={(e) => {
              setPlaying(false);
              setPlayhead(Number(e.target.value));
            }}
            className="absolute bottom-1 left-0 right-0"
          />
        </div>
      </div>

      <div className="hidden">
        {clips
          .filter((c) => c.type === "video" && c.src)
          .map((c) => (
            <video
              key={c.id}
              ref={(el) => {
                videoRefs.current[c.id] = el;
              }}
              src={c.src}
              muted
              playsInline
              preload="auto"
            />
          ))}
      </div>
    </div>
  );
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const sw =
    "videoWidth" in (source as HTMLVideoElement) &&
    (source as HTMLVideoElement).videoWidth
      ? (source as HTMLVideoElement).videoWidth
      : "naturalWidth" in (source as HTMLImageElement) &&
          (source as HTMLImageElement).naturalWidth
        ? (source as HTMLImageElement).naturalWidth
        : width;
  const sh =
    "videoHeight" in (source as HTMLVideoElement) &&
    (source as HTMLVideoElement).videoHeight
      ? (source as HTMLVideoElement).videoHeight
      : "naturalHeight" in (source as HTMLImageElement) &&
          (source as HTMLImageElement).naturalHeight
        ? (source as HTMLImageElement).naturalHeight
        : height;

  if (!sw || !sh) {
    ctx.fillStyle = "#0b1520";
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const scale = Math.max(width / sw, height / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}
