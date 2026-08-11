import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Supabase Edge Function: turns text into a 384-dim embedding using the
// gte-small model that runs natively in the Supabase Edge Runtime. The Next.js
// app calls this over HTTP (see lib/embeddings.ts) so it needs no native ML
// packages and deploys cleanly to Vercel.
//
// Deployed with verify_jwt=false: it only converts text to a vector and touches
// no data. To lock it down, re-enable JWT verification (call it with a valid
// anon JWT) or add a shared-secret header check.

const session = new Supabase.ai.Session("gte-small");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }
  try {
    const { input } = await req.json();
    if (typeof input !== "string" || !input.trim()) {
      return json({ error: "Body must include a non-empty 'input' string." }, 400);
    }
    const embedding = await session.run(input, {
      mean_pool: true,
      normalize: true,
    });
    return json({ embedding });
  } catch (e) {
    return json(
      { error: e instanceof Error ? e.message : "Embedding failed." },
      500,
    );
  }
});
