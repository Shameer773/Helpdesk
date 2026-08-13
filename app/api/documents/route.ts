import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServiceClient, KNOWLEDGE_BUCKET } from "@/lib/supabase";
import { extractPdfText } from "@/lib/pdf";
import { indexDocument } from "@/lib/indexing";
import { requireAdmin } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// List all knowledge-base documents.
export async function GET() {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, category, created_at, content_text")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Tally how many chunks each document has been indexed into.
    const { data: chunkRows } = await supabase
      .from("document_chunks")
      .select("document_id");
    const chunkCounts = new Map<string, number>();
    for (const row of chunkRows ?? []) {
      chunkCounts.set(
        row.document_id,
        (chunkCounts.get(row.document_id) ?? 0) + 1,
      );
    }

    const documents = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      created_at: d.created_at,
      chars: d.content_text ? d.content_text.length : 0,
      chunks: chunkCounts.get(d.id) ?? 0,
    }));
    return NextResponse.json({ documents });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Failed to load documents.") },
      { status: 500 },
    );
  }
}

// Upload a document: store the original file, extract its text, save the row.
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  try {
    const form = await req.formData();
    const file = form.get("file");
    const category = (form.get("category") as string | null)?.trim() || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file was uploaded." }, { status: 400 });
    }

    const name = file.name;
    const lower = name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let contentText = "";
    if (lower.endsWith(".pdf")) {
      contentText = await extractPdfText(buffer);
    } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
      contentText = buffer.toString("utf8").trim();
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PDF, TXT, or MD file." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const storagePath = `${randomUUID()}-${name}`;
    const { error: upErr } = await supabase.storage
      .from(KNOWLEDGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: row, error: insErr } = await supabase
      .from("documents")
      .insert({
        name,
        category,
        content_text: contentText,
        storage_path: storagePath,
      })
      .select("id, name, category, created_at")
      .single();
    if (insErr) throw insErr;

    // Chunk + embed the text so it's retrievable via vector search.
    const chunks = await indexDocument(supabase, row.id, contentText);

    const warning =
      contentText.length < 20
        ? "We couldn't extract much text from this file. If it's a scanned PDF (an image), the assistant won't be able to read it."
        : chunks === 0
          ? "No searchable text was indexed from this file, so the assistant won't be able to use it."
          : null;

    return NextResponse.json({
      document: { ...row, chars: contentText.length, chunks },
      warning,
    });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Upload failed.") },
      { status: 500 },
    );
  }
}

// Remove a document (its stored file and its row).
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) return gate;
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing document id." }, { status: 400 });
    }
    const supabase = getServiceClient();
    const { data: doc, error: selErr } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", id)
      .single();
    if (selErr) throw selErr;
    if (doc?.storage_path) {
      await supabase.storage.from(KNOWLEDGE_BUCKET).remove([doc.storage_path]);
    }
    const { error: delErr } = await supabase.from("documents").delete().eq("id", id);
    if (delErr) throw delErr;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Delete failed.") },
      { status: 500 },
    );
  }
}
