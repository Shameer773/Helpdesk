import { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunk";
import { embedBatch } from "./embeddings";

// Chunk a document's text, embed each chunk, and (re)store the chunks for that
// document. Returns the number of chunks written. Existing chunks for the
// document are cleared first so this is safe to call repeatedly (reindex).
export async function indexDocument(
  supabase: SupabaseClient,
  documentId: string,
  contentText: string,
): Promise<number> {
  await supabase.from("document_chunks").delete().eq("document_id", documentId);

  const chunks = chunkText(contentText);
  if (chunks.length === 0) return 0;

  const embeddings = await embedBatch(chunks);
  const rows = chunks.map((content, i) => ({
    document_id: documentId,
    chunk_index: i,
    content,
    // Store as a vector literal string so pgvector parses it reliably.
    embedding: JSON.stringify(embeddings[i]),
  }));

  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) throw error;
  return rows.length;
}
