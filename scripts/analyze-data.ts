#!/usr/bin/env npx ts-node --project tsconfig.scripts.json
/**
 * データ分析スクリプト
 * Upstash Vectorに登録されているプロンプトデータを分析
 */

import dotenv from "dotenv";
import path from "path";

// 環境変数を読み込み
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getVectorIndex } from "../lib/vector-store";
import { CATEGORIES, CategoryId } from "../lib/types";

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

async function printAnalysis() {
  console.log("=".repeat(80));
  console.log("Nano Banana Pro プロンプトデータ分析");
  console.log("=".repeat(80));
  console.log("");

  try {
    const analysis = await analyzeData();

    // 1. 総数
    console.log("[1] データ総数");
    console.log("-".repeat(80));
    console.log(`  総プロンプト数: ${analysis.totalCount}件`);
    console.log("");

    // 2. カテゴリ別分布
    console.log("[2] カテゴリ別分布");
    console.log("-".repeat(80));

    // カテゴリを件数の多い順にソート
    const sortedCategories = Object.entries(analysis.categoryDistribution)
      .sort(([, a], [, b]) => b - a);

    console.log("┌─────────────────────┬───────┬────────┬──────────┐");
    console.log("│ カテゴリ            │ 件数  │ 割合   │ 状態     │");
    console.log("├─────────────────────┼───────┼────────┼──────────┤");

    for (const [categoryId, count] of sortedCategories) {
      const category = CATEGORIES.find((c) => c.id === categoryId);
      const name = category?.name || categoryId;
      const percentage = ((count / analysis.totalCount) * 100).toFixed(1);

      let status = "";
      if (count === 0) {
        status = "❌ データなし";
      } else if (count < 10) {
        status = "⚠️ 少ない";
      } else if (count < 20) {
        status = "⚠️ やや少ない";
      } else {
        status = "✅ 十分";
      }

      const nameCol = name.padEnd(20, "　");
      const countCol = count.toString().padStart(5);
      const percentCol = (percentage + "%").padStart(6);

      console.log(`│ ${nameCol} │ ${countCol} │ ${percentCol} │ ${status} │`);
    }
    console.log("└─────────────────────┴───────┴────────┴──────────┘");
    console.log("");

    // 3. 言語別分布
    console.log("[3] 言語別分布");
    console.log("-".repeat(80));

    const sortedLanguages = Object.entries(analysis.languageDistribution)
      .sort(([, a], [, b]) => b - a);

    for (const [language, count] of sortedLanguages) {
      const percentage = ((count / analysis.totalCount) * 100).toFixed(1);
      const langName = language === "ja" ? "日本語" : language === "en" ? "英語" : language;
      console.log(`  ${langName}: ${count}件 (${percentage}%)`);
    }
    console.log("");

    // 4. データソース別分布
    console.log("[4] データソース別分布");
    console.log("-".repeat(80));

    const sortedSources = Object.entries(analysis.sourceDistribution)
      .sort(([, a], [, b]) => b - a);

    for (const [source, count] of sortedSources) {
      const percentage = ((count / analysis.totalCount) * 100).toFixed(1);
      console.log(`  ${source}: ${count}件 (${percentage}%)`);
    }
    console.log("");

    // 5. 問題点の指摘
    console.log("[5] 問題点の指摘");
    console.log("-".repeat(80));

    const emptyCategories: string[] = [];
    const lowCategories: string[] = [];

    for (const [categoryId, count] of Object.entries(analysis.categoryDistribution)) {
      const category = CATEGORIES.find((c) => c.id === categoryId);
      const name = category?.name || categoryId;

      if (count === 0) {
        emptyCategories.push(name);
      } else if (count < 15) {
        lowCategories.push(`${name}（${count}件）`);
      }
    }

    if (emptyCategories.length > 0) {
      console.log("  🔴 データが存在しないカテゴリ:");
      emptyCategories.forEach((name) => {
        console.log(`     - ${name}`);
      });
      console.log("");
    }

    if (lowCategories.length > 0) {
      console.log("  ⚠️ データが少ないカテゴリ（15件未満）:");
      lowCategories.forEach((name) => {
        console.log(`     - ${name}`);
      });
      console.log("");
    }

    if (emptyCategories.length === 0 && lowCategories.length === 0) {
      console.log("  ✅ すべてのカテゴリに十分なデータがあります");
      console.log("");
    }

    // 6. カテゴリ別詳細（上位5件のタイトル）
    console.log("[6] カテゴリ別サンプル（各カテゴリ上位5件のタイトル）");
    console.log("-".repeat(80));

    for (const category of CATEGORIES) {
      const categoryId = category.id;
      const count = analysis.categoryDistribution[categoryId] || 0;

      if (count === 0) {
        console.log(`\n  ${category.name}（${categoryId}）: データなし`);
        continue;
      }

      console.log(`\n  ${category.name}（${categoryId}）: ${count}件`);

      const titles = analysis.categoryDetails[categoryId] || [];
      const sampleTitles = titles.slice(0, 5);

      sampleTitles.forEach((title, index) => {
        console.log(`    ${index + 1}. ${title}`);
      });

      if (titles.length > 5) {
        console.log(`    ... 他 ${titles.length - 5}件`);
      }
    }
    console.log("");

    // 7. 推奨アクション
    console.log("=".repeat(80));
    console.log("推奨アクション");
    console.log("=".repeat(80));

    if (emptyCategories.length > 0) {
      console.log("\n🔴 最優先: データが存在しないカテゴリの補強");
      emptyCategories.forEach((name) => {
        console.log(`  - ${name}: 0件 → 目標15件`);
      });
    }

    if (lowCategories.length > 0) {
      console.log("\n🟡 優先度高: データが少ないカテゴリの拡充");
      lowCategories.forEach((name) => {
        console.log(`  - ${name} → 目標20-30件`);
      });
    }

    // 目標データ件数
    const targetCount = 300;
    const additionalNeeded = targetCount - analysis.totalCount;

    console.log(`\n🎯 目標データ件数: ${targetCount}件`);
    console.log(`   現在: ${analysis.totalCount}件`);
    console.log(`   追加必要: ${additionalNeeded}件`);

    console.log("\n詳細な改善計画は docs/DATA_IMPROVEMENT_PLAN.md を参照してください");
    console.log("");

  } catch (error) {
    console.error("❌ 分析エラー:", error);
    if (error instanceof Error) {
      console.error("   ", error.message);
    }
    process.exit(1);
  }
}

// 実行
printAnalysis().catch((error) => {
  console.error("実行エラー:", error);
  process.exit(1);
});
