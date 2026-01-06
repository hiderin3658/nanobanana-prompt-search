/**
 * データ同期API
 * GitHubからプロンプトを取得し、Upstash Vectorにupsert
 * Vercel Cron Jobs で日次実行（0:00 UTC）
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllPrompts } from "@/lib/github-parser";
import {
  upsertPrompts,
  getPromptCount,
  deleteAllPrompts,
} from "@/lib/vector-store";

// Vercel Cron Jobs用の認証（オプション）
const CRON_SECRET = process.env.CRON_SECRET;

// POST: 手動同期
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（CRON_SECRETが設定されている場合）
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    console.log("[Sync] Starting manual sync...");

    // GitHubからプロンプトを取得
    const prompts = await fetchAllPrompts();
    console.log(`[Sync] Fetched ${prompts.length} prompts from GitHub`);

    if (prompts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No prompts found",
        promptCount: 0,
      });
    }

    // ベクトルDBにupsert
    const upsertedCount = await upsertPrompts(prompts);
    console.log(`[Sync] Upserted ${upsertedCount} prompts to vector store`);

    // 最終カウントを取得
    const totalCount = await getPromptCount();

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      fetchedCount: prompts.length,
      upsertedCount,
      totalCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
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

// GET: Vercel Cron Jobs から呼び出される
export async function GET(request: NextRequest) {
  try {
    // Vercel Cron認証ヘッダーをチェック
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    // Vercel Cronからの呼び出し、またはCRON_SECRETによる認証
    if (!isVercelCron && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Sync] Starting scheduled sync...");

    // GitHubからプロンプトを取得
    const prompts = await fetchAllPrompts();
    console.log(`[Sync] Fetched ${prompts.length} prompts from GitHub`);

    if (prompts.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No prompts found",
        promptCount: 0,
      });
    }

    // ベクトルDBにupsert
    const upsertedCount = await upsertPrompts(prompts);
    console.log(`[Sync] Upserted ${upsertedCount} prompts to vector store`);

    // 最終カウントを取得
    const totalCount = await getPromptCount();

    return NextResponse.json({
      success: true,
      message: "Scheduled sync completed",
      fetchedCount: prompts.length,
      upsertedCount,
      totalCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Sync] Error:", error);
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

// DELETE: 全データ削除（開発用）
export async function DELETE(request: NextRequest) {
  try {
    // 認証チェック
    if (CRON_SECRET) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    // 本番環境では削除を禁止
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Delete operation is not allowed in production" },
        { status: 403 }
      );
    }

    console.log("[Sync] Deleting all prompts...");
    await deleteAllPrompts();

    return NextResponse.json({
      success: true,
      message: "All prompts deleted",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Sync] Delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
