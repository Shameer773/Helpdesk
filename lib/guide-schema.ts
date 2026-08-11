// The structured shape the AI must return, and a lenient parser that turns
// whatever the model produces into that shape. Using structured output means
// the UI renders reliably instead of parsing free-form markdown.

export type GuideStep = {
  text: string;
  source?: string | null;
};

export type Guide = {
  status: "ok" | "insufficient";
  title: string;
  steps: GuideStep[];
  message?: string | null;
};

// Human-readable JSON shape embedded in the system prompt.
export const GUIDE_SHAPE = `{
  "status": "ok" or "insufficient",
  "title": "a short title for the guide",
  "steps": [
    {
      "text": "one simple action, in plain language",
      "source": "the name of the document this step came from, or null"
    }
  ],
  "message": "when status is insufficient, a friendly explanation; otherwise null"
}`;

function cleanStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.toLowerCase() === "null") return null;
  return t;
}

// Pull a JSON object out of a possibly-messy model response (code fences,
// stray prose before/after, etc.).
function extractJson(raw: string): string {
  let t = (raw ?? "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);
  return t;
}

export function parseGuide(raw: string): Guide {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(extractJson(raw)) as Record<string, unknown>;
  } catch {
    return {
      status: "insufficient",
      title: "Couldn't read the assistant's answer",
      steps: [],
      message:
        "The assistant returned an unexpected format. Please try again in a moment.",
    };
  }

  const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
  const steps: GuideStep[] = rawSteps
    .map((s): GuideStep => {
      const step = (s ?? {}) as Record<string, unknown>;
      return {
        text: typeof step.text === "string" ? step.text.trim() : "",
        source: cleanStr(step.source),
      };
    })
    .filter((s) => s.text.length > 0);

  let status: Guide["status"] =
    obj.status === "ok" || obj.status === "insufficient"
      ? (obj.status as Guide["status"])
      : steps.length > 0
        ? "ok"
        : "insufficient";
  if (status === "ok" && steps.length === 0) status = "insufficient";

  const title =
    typeof obj.title === "string" && obj.title.trim()
      ? obj.title.trim()
      : "Troubleshooting guide";

  return { status, title, steps, message: cleanStr(obj.message) };
}
