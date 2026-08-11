// Split a document's text into overlapping chunks suitable for embedding.
// Targets ~800-char chunks on paragraph/sentence boundaries, with ~150 chars of
// overlap so context isn't lost at the seams.

const MAX_CHARS = 800;
const OVERLAP = 150;

export function chunkText(text: string): string[] {
  const clean = (text ?? "").replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (p.length > MAX_CHARS) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      for (const piece of splitLongParagraph(p)) chunks.push(piece);
      continue;
    }
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length > MAX_CHARS) {
      if (current) chunks.push(current);
      current = p;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  return addOverlap(chunks);
}

// Break a paragraph that is itself larger than MAX_CHARS along sentence bounds,
// hard-wrapping any single sentence that is still too long.
function splitLongParagraph(p: string): string[] {
  const sentences = p.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    const candidate = cur ? `${cur} ${s}` : s;
    if (candidate.length > MAX_CHARS) {
      if (cur) {
        out.push(cur.trim());
        cur = "";
      }
      if (s.length > MAX_CHARS) {
        for (let i = 0; i < s.length; i += MAX_CHARS) {
          out.push(s.slice(i, i + MAX_CHARS));
        }
      } else {
        cur = s;
      }
    } else {
      cur = candidate;
    }
  }
  if (cur) out.push(cur.trim());
  return out;
}

// Prepend a slice of the previous chunk to each chunk for continuity.
function addOverlap(chunks: string[]): string[] {
  if (chunks.length <= 1) return chunks;
  return chunks.map((c, i) => {
    if (i === 0) return c;
    const prev = chunks[i - 1];
    const tail = prev.slice(Math.max(0, prev.length - OVERLAP));
    return `${tail}\n${c}`.trim();
  });
}
