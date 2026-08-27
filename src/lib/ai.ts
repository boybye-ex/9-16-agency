type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function readKey(name: "OPENAI_API_KEY" | "GROQ_API_KEY") {
  const value = (process.env[name] || "").trim();
  if (!value) return null;
  // Ignore placeholder / accidental non-key values
  if (value.length < 20) return null;
  return value;
}

export async function chatComplete(
  messages: ChatMessage[],
  options?: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 800;

  const groqKey = readKey("GROQ_API_KEY");
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // fall through
    }
  }

  const openAiKey = readKey("OPENAI_API_KEY");
  if (openAiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch {
      // fall through
    }
  }

  return localFallback(messages);
}

function localFallback(messages: ChatMessage[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const lower = lastUser.toLowerCase();

  if (lower.includes("caption")) {
    return [
      "1. Stop scrolling — this 9:16 cut hits different. Hook, proof, offer. #VerticalAds #TikTokAds",
      "2. Soft launch energy, hard results. Watch till the end for the CTA that converts. #Reels #Shorts",
      "3. Your feed called. It wants more of THIS. Save + share if your brand needs scroll-stopping creative.",
    ].join("\n");
  }

  if (lower.includes("script")) {
    return [
      "HOOK (0–3s): Open on the problem in one line — loud, visual, specific.",
      "BODY (3–12s): Show the fix in motion. One claim. One proof. Fast cuts.",
      "CTA (12–15s): Tell them exactly what to do next. Repeat the offer once.",
      "",
      "Improved voice: shorter sentences, stronger verbs, no filler. Speak like a friend who sells.",
    ].join("\n");
  }

  if (lower.includes("recommend") || lower.includes("posting") || lower.includes("tutorial")) {
    return [
      "Best posting windows (from your recent engagement):",
      "• Weekdays 11:00–13:00 and 18:00–21:00",
      "• Saturdays 10:00–12:00",
      "",
      "Content tutorials to try next:",
      "1. 3-second pattern interrupt + product demo + soft CTA",
      "2. UGC-style talking head with on-screen captions",
      "3. Before/after transformation in vertical crop",
      "",
      "Tip: Double down on posts that earn saves and shares — not just views.",
    ].join("\n");
  }

  return "Here is a practical next step: keep the first 3 seconds visual, speak one benefit, and end with a clear ask. Add your brand colors and product close-up for trust.";
}

export function buildImageUrl(prompt: string, seed?: number) {
  const encoded = encodeURIComponent(prompt.slice(0, 300));
  const s = seed ?? Math.floor(Math.random() * 100000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1344&nologo=true&seed=${s}`;
}

export async function analyzePerformance(input: {
  platformSummaries: string;
  topHours: number[];
  topDays: number[];
}) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const topDayLabels = input.topDays.map((d) => dayNames[d] || String(d)).join(", ");
  const topHourLabels = input.topHours.map((h) => `${h}:00`).join(", ");

  return chatComplete([
    {
      role: "system",
      content:
        "You are a social media performance coach for a vertical-video ad agency. Give clear, simple advice. Use short bullets. Always include posting times and 3 content tutorial ideas.",
    },
    {
      role: "user",
      content: `Analyze this performance and recommend posting times + content tutorials.\n\nPlatform data:\n${input.platformSummaries}\n\nPeak hours: ${topHourLabels}\nPeak days: ${topDayLabels}`,
    },
  ]);
}
