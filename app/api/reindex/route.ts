import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { indexDocument } from "@/lib/indexing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// Rebuild embeddings for every document from its stored text. Useful to backfill
// documents uploaded before RAG existed, or after an embedding-model change.
export async function POST() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, content_text");
    if (error) throw error;

    let totalChunks = 0;
    let indexedDocs = 0;
    for (const doc of data ?? []) {
      const n = await indexDocument(supabase, doc.id, doc.content_text ?? "");
      totalChunks += n;
      if (n > 0) indexedDocs += 1;
    }

    return NextResponse.json({
      ok: true,
      documents: data?.length ?? 0,
      indexedDocuments: indexedDocs,
      totalChunks,
    });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Reindex failed.") },
      { status: 500 },
    );
  }
}
