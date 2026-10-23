const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RETRYABLE = new Set([429, 500, 503]);

export const basicConfirmation = (
    name: string,
    date: string,
    startTime: string,
    duration: number
) =>
    `Hi ${name}, your ${duration}-minute meeting is confirmed for ${date} at ${startTime}. See you then!`;

export async function confirmationMessage(
    name: string,
    date: string,
    startTime: string,
    duration: number
): Promise<string> {
  const fallback = basicConfirmation(name, date, startTime, duration);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return fallback;

  const prompt = `Write a short, friendly booking confirmation (max 2 sentences, no emojis) for ${name}, who booked a ${duration}-minute meeting on ${date} at ${startTime}.`;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          console.log("AI message used");
          return text;
        }
        return fallback;
      }

      console.log(`Gemini error ${res.status} (attempt ${attempt})`);
      if (!RETRYABLE.has(res.status)) return fallback;
    } catch (e) {
      console.log(`Gemini request failed (attempt ${attempt})`, e instanceof Error ? e.name : e);
      if (e instanceof Error && e.name === "TimeoutError") return fallback;
    }

    if (attempt < 2) await sleep(1000);
  }

  return fallback;
}