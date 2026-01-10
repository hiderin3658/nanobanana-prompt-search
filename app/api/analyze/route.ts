/**
 * データ分析API
 * Upstash Vectorに登録されているプロンプトデータを分析
 */

import { NextResponse } from "next/server";
import { getVectorIndex } from "@/lib/vector-store";
import { CATEGORIES, CategoryId } from "@/lib/types";

interface AnalysisResult {
  totalCount: number;
  categoryDistribution: Record<CategoryId, number>;
  languageDistribution: Record<string, number>;
  sourceDistribution: Record<string, number>;
  categoryDetails: Record<CategoryId, string[]>;
}

async function analyzeData(): Promise<AnalysisResult> {
  const index = getVectorIndex();
  const result: AnalysisResult = {
    totalCount: 0,
    categoryDistribution: {} as Record<CategoryId, number>,
    languageDistribution: {},
    sourceDistribution: {},
    categoryDetails: {} as Record<CategoryId, string[]>,
  };

  // カテゴリ別にデータを取得
  for (const category of CATEGORIES) {
    const categoryId = category.id;

    // カテゴリでフィルタリングしてクエリ実行
    const results = await index.query({
      data: " ", // ダミークエリ
      topK: 1000, // 最大1000件取得
      includeMetadata: true,
      filter: `category = '${categoryId}'`,
    });

    const count = results.length;
    result.categoryDistribution[categoryId] = count;
    result.totalCount += count;

    // カテゴリ内のプロンプトタイトルを収集
    result.categoryDetails[categoryId] = results.map((r) => {
      const metadata = r.metadata as any;

      // 言語別カウント
      const language = metadata.language || "unknown";
      result.languageDistribution[language] = (result.languageDistribution[language] || 0) + 1;

      // データソース別カウント
      const source = metadata.source || "unknown";
      result.sourceDistribution[source] = (result.sourceDistribution[source] || 0) + 1;

      return metadata.title || "Untitled";
    });
  }

  return result;
}

export async function GET() {
  try {
    console.log("[Analyze] Starting data analysis...");
    const analysis = await analyzeData();

    // カテゴリを件数の多い順にソート
    const sortedCategories = Object.entries(analysis.categoryDistribution)
      .map(([categoryId, count]) => {
        const category = CATEGORIES.find((c) => c.id === categoryId);
        return {
          id: categoryId as CategoryId,
          name: category?.name || categoryId,
          count,
          percentage: ((count / analysis.totalCount) * 100).toFixed(1),
          status:
            count === 0
              ? "データなし"
              : count < 10
              ? "少ない"
              : count < 20
              ? "やや少ない"
              : "十分",
        };
      })
      .sort((a, b) => b.count - a.count);

    // 問題点の抽出
    const emptyCategories = sortedCategories.filter((c) => c.count === 0);
    const lowCategories = sortedCategories.filter((c) => c.count > 0 && c.count < 15);

    // レスポンス
    const response = {
      success: true,
      summary: {
        totalCount: analysis.totalCount,
        emptyCategories: emptyCategories.length,
        lowCategories: lowCategories.length,
        targetCount: 300,
        additionalNeeded: 300 - analysis.totalCount,
      },
      categories: sortedCategories,
      languages: analysis.languageDistribution,
      sources: analysis.sourceDistribution,
      issues: {
        emptyCategories: emptyCategories.map((c) => c.name),
        lowCategories: lowCategories.map((c) => ({
          name: c.name,
          count: c.count,
        })),
      },
      categoryDetails: analysis.categoryDetails,
      timestamp: new Date().toISOString(),
    };

    console.log(`[Analyze] Analysis completed: ${analysis.totalCount} prompts`);
    return NextResponse.json(response);
  } catch (error) {
    console.error("[Analyze] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
