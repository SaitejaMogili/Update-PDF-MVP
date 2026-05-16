import "server-only";
import { openai } from "@/lib/openai";
import { createServiceClient } from "@/lib/supabase/service";
import { extractPdfPages } from "@/lib/pdf-text";

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 150;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + CHUNK_SIZE).trim();
    if (chunk.length > 40) chunks.push(chunk);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

export async function ingestPdf(buffer: ArrayBuffer, fileId: string): Promise<number> {
  const service = createServiceClient();

  // Skip if already ingested
  const { count } = await service
    .from("chat_embeddings")
    .select("id", { count: "exact", head: true })
    .eq("file_id", fileId);

  if ((count ?? 0) > 0) return count!;

  const pages = await extractPdfPages(buffer);
  if (pages.length === 0) return 0;

  // Build chunks with page attribution
  const chunks: Array<{ content: string; chunkIndex: number; pageNumber: number }> = [];
  let chunkIndex = 0;
  for (const { text, pageNumber } of pages) {
    for (const content of chunkText(text)) {
      chunks.push({ content, chunkIndex: chunkIndex++, pageNumber });
    }
  }

  if (chunks.length === 0) return 0;

  // Embed in batches of 100 (OpenAI limit)
  type EmbeddingRow = {
    file_id: string;
    chunk_index: number;
    page_number: number;
    content: string;
    embedding: string;
  };
  const rows: EmbeddingRow[] = [];
  for (let i = 0; i < chunks.length; i += 100) {
    const batch = chunks.slice(i, i + 100);
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch.map((c) => c.content),
    });
    for (let j = 0; j < batch.length; j++) {
      rows.push({
        file_id: fileId,
        chunk_index: batch[j].chunkIndex,
        page_number: batch[j].pageNumber,
        content: batch[j].content,
        embedding: JSON.stringify(res.data[j].embedding),
      });
    }
  }

  await service.from("chat_embeddings").insert(rows);
  return chunks.length;
}

export async function embedQuery(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

export interface Chunk {
  content: string;
  pageNumber: number;
  similarity: number;
}

export async function searchChunks(
  queryEmbedding: number[],
  fileId: string,
  k = 5
): Promise<Chunk[]> {
  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (service.rpc as any)("match_chat_embeddings", {
    query_embedding: queryEmbedding,
    match_file_id: fileId,
    match_count: k,
  });
  return (data ?? []).map((row: { content: string; page_number: number; similarity: number }) => ({
    content: row.content,
    pageNumber: row.page_number,
    similarity: row.similarity,
  }));
}
