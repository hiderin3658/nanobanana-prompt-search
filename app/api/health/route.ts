/**
 * ヘルスチェックAPI
 * サーバーとベクトルDBの状態を確認
 */

import { NextResponse } from "next/server";
import { checkVectorStoreHealth, getPromptCount } from "@/lib/vector-store";

export async function GET() {
  try {
    // ベクトルストアのヘルスチェック
    const vectorHealth = await checkVectorStoreHealth();

    const health = {
      status: vectorHealth.healthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        api: {
          status: "healthy",
        },
        vectorStore: {
          status: vectorHealth.healthy ? "healthy" : "unhealthy",
          vectorCount: vectorHealth.vectorCount,
          error: vectorHealth.error,
        },
      },
      version: "1.0.0",
    };

    const statusCode = vectorHealth.healthy ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
