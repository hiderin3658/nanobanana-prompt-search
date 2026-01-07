/**
 * 初期データ投入スクリプト
 * GitHubからプロンプトを取得し、Upstash Vectorにupsert
 *
 * 使用方法:
 *   npm run seed
 *
 * 環境変数:
 *   UPSTASH_VECTOR_REST_URL - Upstash Vector REST URL
 *   UPSTASH_VECTOR_REST_TOKEN - Upstash Vector REST Token
 */

import * as dotenv from "dotenv";
import * as path from "path";

// .env.local を読み込み
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { fetchAllPrompts, fetchReadmeFromGitHub } from "../lib/github-parser";
import { upsertPrompts, getPromptCount, deleteAllPrompts } from "../lib/vector-store";
import { DATA_SOURCES } from "../lib/types";

async function main() {
  console.log("=".repeat(60));
  console.log("Nano Banana Pro プロンプト検索 - 初期データ投入");
  console.log("=".repeat(60));
  console.log();

  // 環境変数チェック
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error("❌ エラー: 環境変数が設定されていません");
    console.error("   .env.local ファイルに以下を設定してください:");
    console.error("   - UPSTASH_VECTOR_REST_URL");
    console.error("   - UPSTASH_VECTOR_REST_TOKEN");
    process.exit(1);
  }

  console.log("📡 環境変数を確認しました");
  console.log(`   URL: ${process.env.UPSTASH_VECTOR_REST_URL.substring(0, 30)}...`);
  console.log();

  // コマンドライン引数をチェック
  const args = process.argv.slice(2);
  const shouldReset = args.includes("--reset") || args.includes("-r");
  const shouldDryRun = args.includes("--dry-run") || args.includes("-d");

  if (shouldReset) {
    console.log("🗑️  --reset フラグが指定されました。既存データを削除します...");
    await deleteAllPrompts();
    console.log("   削除完了");
    console.log();
  }

  // 現在のプロンプト数を確認
  try {
    const currentCount = await getPromptCount();
    console.log(`📊 現在のプロンプト数: ${currentCount}件`);
    console.log();
  } catch (error) {
    console.log("📊 現在のプロンプト数: 取得できません（新規インデックス？）");
    console.log();
  }

  // データソースを表示
  console.log("📚 データソース:");
  for (const source of DATA_SOURCES) {
    console.log(`   - ${source.owner}/${source.repo}`);
  }
  console.log();

  // GitHubからプロンプトを取得
  console.log("🔄 GitHubからプロンプトを取得中...");
  const startTime = Date.now();

  try {
    const prompts = await fetchAllPrompts();
    const fetchTime = Date.now() - startTime;

    console.log(`   取得完了: ${prompts.length}件 (${fetchTime}ms)`);
    console.log();

    if (prompts.length === 0) {
      console.warn("⚠️  警告: プロンプトが取得できませんでした");
      console.warn("   GitHubリポジトリのREADME.md構造を確認してください");
      process.exit(1);
    }

    // カテゴリ別集計
    const categoryCount: Record<string, number> = {};
    for (const prompt of prompts) {
      categoryCount[prompt.category] = (categoryCount[prompt.category] || 0) + 1;
    }

    console.log("📈 カテゴリ別集計:");
    for (const [category, count] of Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )) {
      console.log(`   ${category}: ${count}件`);
    }
    console.log();

    // サンプルプロンプトを表示（各データソースから1件ずつ）
    console.log("📝 サンプルプロンプト:");

    // YouMindから1件
    const youmindPrompt = prompts.find(p => p.id.startsWith("youmind-"));
    if (youmindPrompt) {
      console.log(`   [${youmindPrompt.id}] ${youmindPrompt.title}`);
      console.log(`       カテゴリ: ${youmindPrompt.category}`);
      console.log(`       説明: ${youmindPrompt.description || "なし"}`);
      console.log(`       言語: ${youmindPrompt.language}`);
      console.log();
    }

    // ZeroLuから1件
    const zeroluPrompt = prompts.find(p => p.id.startsWith("zerolu-"));
    if (zeroluPrompt) {
      console.log(`   [${zeroluPrompt.id}] ${zeroluPrompt.title}`);
      console.log(`       カテゴリ: ${zeroluPrompt.category}`);
      console.log(`       説明: ${zeroluPrompt.description || "なし"}`);
      console.log(`       言語: ${zeroluPrompt.language}`);
      console.log();
    }

    if (shouldDryRun) {
      console.log("🔍 --dry-run フラグが指定されたため、アップロードはスキップします");
      console.log();
      process.exit(0);
    }

    // Upstash Vectorにupsert
    console.log("📤 Upstash Vectorにアップロード中...");
    const upsertStartTime = Date.now();
    const upsertedCount = await upsertPrompts(prompts);
    const upsertTime = Date.now() - upsertStartTime;

    console.log(`   アップロード完了: ${upsertedCount}件 (${upsertTime}ms)`);
    console.log();

    // 最終確認
    const finalCount = await getPromptCount();
    console.log("=".repeat(60));
    console.log("✅ 初期データ投入が完了しました");
    console.log(`   最終プロンプト数: ${finalCount}件`);
    console.log(`   所要時間: ${Date.now() - startTime}ms`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  }
}

// 実行
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
