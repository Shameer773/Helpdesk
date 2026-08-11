import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// gte-small produces 384-dimensional embeddings and runs locally on the Node
// server via onnxruntime-node. The model (~70MB) downloads and caches on first use.
const MODEL = "Supabase/gte-small";
export const EMBEDDING_DIM = 384;

let embedderPromise: Promise<FeatureExtractionPipeline> | null = null;

// Load the model once and reuse it across requests.
function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedderPromise) {
    embedderPromise = pipeline(
      "feature-extraction",
      MODEL,
    ) as Promise<FeatureExtractionPipeline>;
  }
  return embedderPromise;
}

// Embed a single string into a 384-length unit vector.
export async function embed(text: string): Promise<number[]> {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

// Embed many strings (sequentially — the model is single-instance).
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const vectors: number[][] = [];
  for (const t of texts) {
    vectors.push(await embed(t));
  }
  return vectors;
}
