import { Guide, GUIDE_SHAPE, parseGuide } from "./guide-schema";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b:free";
// Whole-doc stuffing has a context ceiling; cap the knowledge we send.
const MAX_KNOWLEDGE_CHARS = 60_000;

const SYSTEM_PROMPT = `You are a helpful IT assistant for a company's internal help desk. An employee describes an IT problem and you help them fix it themselves, using ONLY the company knowledge base provided in the user's message.

Rules:
- Use ONLY information found in the knowledge base. Do NOT invent steps or use outside knowledge.
- Write for someone who is not a computer expert. Each step is ONE simple action, in plain, friendly language.
- For EVERY step that involves clicking a button, opening a menu or window, typing in a field, or looking at something on the screen, you MUST fill in "screenshotSuggestion" with a short description of exactly what the screen should show at that step. Most steps have something visual, so most steps must have a screenshotSuggestion. Only use null for a step with nothing to see (for example "restart your computer").
- For each step, set "source" to the name of the document the step came from.
- If the knowledge base does not contain enough information to help safely, do NOT guess.

Respond with ONLY a raw JSON object (no markdown, no code fences, no commentary) in exactly this shape:
${GUIDE_SHAPE}

If you can help: set "status" to "ok", fill "title" and "steps", and set "message" to null.
If the knowledge base lacks the information: set "status" to "insufficient", set "steps" to [], and put a friendly explanation in "message" that tells the user to rephrase their problem or ask their IT admin to upload the relevant guide.`;

export async function generateGuide(
  problem: string,
  knowledge: string,
): Promise<Guide> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set. Add it to .env.local.");
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const trimmedKnowledge =
    knowledge.length > MAX_KNOWLEDGE_CHARS
      ? knowledge.slice(0, MAX_KNOWLEDGE_CHARS) + "\n\n[knowledge truncated]"
      : knowledge;

  const userMessage = `COMPANY KNOWLEDGE BASE:\n${
    trimmedKnowledge || "(no documents have been uploaded yet)"
  }\n\n---\n\nEMPLOYEE'S PROBLEM:\n${problem}`;

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "HelpDesk-Assist",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });
  } catch {
    throw new Error(
      "Could not reach the AI service. Check your connection and try again.",
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI service error (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }
  return parseGuide(content);
}
