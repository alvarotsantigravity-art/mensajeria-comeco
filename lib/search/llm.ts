import "server-only";
import { parseExtraction, type Extraction } from "./schema";

export type LlmProvider = "gemini" | "groq";

const GEMINI_DEFAULT = "gemini-3.8-flash";
const GROQ_DEFAULT = "openai/gpt-oss-120b";

async function gemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Falta GEMINI_API_KEY.");
  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    },
  );
  if (!response.ok) throw new Error(`Gemini respondió ${response.status}.`);
  const data = (await response.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
}

async function groq(system: string, user: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Falta GROQ_API_KEY.");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_DEFAULT,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    }),
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Groq respondió ${response.status}.`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export const llmConfigured = () => Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);

/** Gemini primero; si falla (cuota, red o JSON inválido), Groq. */
export async function extract(system: string, user: string): Promise<{ data: Extraction; provider: LlmProvider }> {
  const errors: string[] = [];
  for (const [provider, run] of [
    ["gemini", gemini],
    ["groq", groq],
  ] as const) {
    try {
      return { data: parseExtraction(await run(system, user)), provider };
    } catch (error) {
      errors.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join(" · "));
}
