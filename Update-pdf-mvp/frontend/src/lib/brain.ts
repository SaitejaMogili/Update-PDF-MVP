import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export { ingestPdf, embedQuery } from "@/lib/tools/chat";

export interface BrainChunk {
  fileId: string;
  filename: string;
  content: string;
  pageNumber: number;
  similarity: number;
}

export async function searchBrain(
  queryEmbedding: number[],
  fileIds: string[],
  k = 8
): Promise<BrainChunk[]> {
  const service = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (service.rpc as any)("match_brain_embeddings", {
    query_embedding: queryEmbedding,
    match_file_ids: fileIds,
    match_count: k,
  });

  if (error) {
    console.error("[brain.searchBrain]", error);
    return [];
  }

  return (data ?? []).map(
    (row: {
      file_id: string;
      filename: string;
      content: string;
      page_number: number;
      similarity: number;
    }) => ({
      fileId: row.file_id,
      filename: row.filename,
      content: row.content,
      pageNumber: row.page_number,
      similarity: row.similarity,
    })
  );
}
