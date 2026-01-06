/**
 * Upstash Vector 操作モジュール
 * ベクトルDBへのupsert/query/delete操作を提供
 */

import { Index } from "@upstash/vector";
import {
  ParsedPrompt,
  PromptMetadata,
  SearchResultItem,
  CategoryId,
  PromptSearchError,
  CATEGORIES,
} from "./types";

// Upstash Vector クライアント（シングルトン）
let vectorIndex: Index | null = null;

// Upstash Vector クライアントを取得
export function getVectorIndex(): Index {
  if (!vectorIndex) {
    const url = process.env.UPSTASH_VECTOR_REST_URL;
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

    if (!url || !token) {
      throw new PromptSearchError(
        "Upstash Vector の環境変数が設定されていません",
        "CONFIG_ERROR",
        500
      );
    }

    vectorIndex = new Index({
      url,
      token,
    });
  }

  return vectorIndex;
}

// プロンプトをベクトルDBにupsert
export async function upsertPrompts(prompts: ParsedPrompt[]): Promise<number> {
  const index = getVectorIndex();

  // Upstash Vectorのビルトインembeddingを使用するため、dataフィールドにテキストを渡す
  const vectors = prompts.map((prompt) => ({
    id: prompt.id,
    // embeddingはUpstash側で自動生成されるため、検索用テキストを渡す
    data: `${prompt.title} ${prompt.prompt} ${prompt.description || ""}`,
    metadata: {
      title: prompt.title,
      prompt: prompt.prompt,
      category: prompt.category,
      source: prompt.source,
      sourceUrl: prompt.sourceUrl,
      language: prompt.language,
      imageUrl: prompt.imageUrl || "",
      description: prompt.description || "",
    } as PromptMetadata,
  }));

  // バッチサイズ（Upstashの制限に合わせて調整）
  const batchSize = 100;
  let upsertedCount = 0;

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert(batch);
    upsertedCount += batch.length;
    console.log(`[VectorStore] Upserted ${upsertedCount}/${vectors.length}`);
  }

  return upsertedCount;
}

// プロンプトを意味検索
export async function searchPrompts(
  query: string,
  options: {
    category?: CategoryId;
    limit?: number;
  } = {}
): Promise<SearchResultItem[]> {
  const index = getVectorIndex();
  const { category, limit = 5 } = options;

  // フィルター条件を構築
  let filter: string | undefined;
  if (category) {
    filter = `category = '${category}'`;
  }

  // クエリ実行（ビルトインEmbedding使用）
  const results = await index.query({
    data: query, // テキストを直接渡すとUpstashが自動でembedding
    topK: Math.min(limit, 20), // 最大20件
    includeMetadata: true,
    filter,
  });

  // 結果を変換
  return results.map((result) => {
    const metadata = result.metadata as PromptMetadata;
    return {
      id: result.id as string,
      title: metadata.title,
      category: metadata.category as CategoryId,
      prompt: metadata.prompt,
      source: metadata.source,
      sourceUrl: metadata.sourceUrl,
      score: result.score,
      imageUrl: metadata.imageUrl || undefined,
    };
  });
}

// IDでプロンプトを取得
export async function getPromptById(
  id: string
): Promise<SearchResultItem | null> {
  const index = getVectorIndex();

  const results = await index.fetch([id], {
    includeMetadata: true,
  });

  if (!results || results.length === 0 || !results[0]) {
    return null;
  }

  const result = results[0];
  const metadata = result.metadata as PromptMetadata;

  return {
    id: result.id as string,
    title: metadata.title,
    category: metadata.category as CategoryId,
    prompt: metadata.prompt,
    source: metadata.source,
    sourceUrl: metadata.sourceUrl,
    score: 1.0, // fetchの場合はスコアなし
    imageUrl: metadata.imageUrl || undefined,
  };
}

// 全プロンプトを削除
export async function deleteAllPrompts(): Promise<void> {
  const index = getVectorIndex();
  await index.reset();
  console.log("[VectorStore] All prompts deleted");
}

// プロンプト数を取得
export async function getPromptCount(): Promise<number> {
  const index = getVectorIndex();
  const info = await index.info();
  return info.vectorCount;
}

// カテゴリ別のプロンプト数を取得（並列化でパフォーマンス改善）
export async function getPromptCountByCategory(): Promise<
  Record<CategoryId, number>
> {
  const index = getVectorIndex();

  // 各カテゴリのクエリを並列実行
  const countPromises = CATEGORIES.map(async (category) => {
    const results = await index.query({
      data: " ", // ダミークエリ
      topK: 1000, // 最大数
      includeMetadata: false,
      filter: `category = '${category.id}'`,
    });
    return [category.id, results.length] as const;
  });

  // 全てのクエリを並列実行し、結果を待つ
  const counts = await Promise.all(countPromises);

  // 配列をオブジェクトに変換
  return Object.fromEntries(counts) as Record<CategoryId, number>;
}

// ヘルスチェック
export async function checkVectorStoreHealth(): Promise<{
  healthy: boolean;
  vectorCount: number;
  error?: string;
}> {
  try {
    const index = getVectorIndex();
    const info = await index.info();
    return {
      healthy: true,
      vectorCount: info.vectorCount,
    };
  } catch (error) {
    return {
      healthy: false,
      vectorCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
