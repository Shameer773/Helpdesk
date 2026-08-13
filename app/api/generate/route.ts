import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateGuide } from "@/lib/openrouter";
import { embed } from "@/lib/embeddings";
import { requireUser } from "@/lib/api-auth";

// How many of the most-similar chunks to retrieve for each question.
const MATCH_COUNT = 6;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// Take the employee's problem, stuff all document text into the prompt, and
// return a grounded, structured guide.
export async function POST(req: NextRequest) {
  const gate = await requireUser();
  if (gate instanceof NextResponse) return gate;
  try {
    const body = await req.json().catch(() => ({}));
    const problem = (body?.problem as string | undefined)?.trim();
    if (!problem) {
      return NextResponse.json(
        { error: "Please describe your IT problem first." },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();

    // Retrieval-Augmented Generation: embed the question, then fetch only the
    // most relevant chunks via pgvector instead of stuffing every document.
    const queryEmbedding = await embed(problem);
    const { data: matches, error } = await supabase.rpc("match_document_chunks", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: MATCH_COUNT,
    });
    if (error) throw error;

    const knowledge = (matches ?? [])
      .map(
        (m: { name: string; content: string }) =>
          `### FROM: ${m.name}\n${m.content}`,
      )
      .join("\n\n");

    const guide = await generateGuide(problem, knowledge);
    return NextResponse.json({ guide, matchCount: matches?.length ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Something went wrong generating your guide.") },
      { status: 500 },
    );
  }
}
