import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { generateGuide } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

// Take the employee's problem, stuff all document text into the prompt, and
// return a grounded, structured guide.
export async function POST(req: NextRequest) {
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
    const { data, error } = await supabase
      .from("documents")
      .select("name, content_text")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const knowledge = (data ?? [])
      .filter((d) => d.content_text && d.content_text.trim().length > 0)
      .map((d) => `### DOCUMENT: ${d.name}\n${d.content_text}`)
      .join("\n\n");

    const guide = await generateGuide(problem, knowledge);
    return NextResponse.json({ guide, docCount: data?.length ?? 0 });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Something went wrong generating your guide.") },
      { status: 500 },
    );
  }
}
