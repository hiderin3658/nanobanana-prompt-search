/**
 * MCP エンドポイント
 * Streamable HTTP プロトコル対応
 */

import { NextRequest, NextResponse } from "next/server";

// JSON-RPC型定義（MCP SDK依存を避ける）
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// JSON-RPCリクエストを処理
async function handleJsonRpcRequest(
  request: JsonRpcRequest
): Promise<JsonRpcResponse> {
  const { method, params, id } = request;

  try {
    let result: unknown;

    switch (method) {
      case "initialize":
        result = {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: "nano-banana-prompts",
            version: "1.0.0",
          },
        };
        break;

      case "tools/list":
        result = {
          tools: [
            {
              name: "search_prompts",
              description:
                "Nano Banana Pro のプロンプトを意味検索します。日本語・英語どちらでも検索可能です。",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "検索キーワードまたは説明文",
                  },
                  category: {
                    type: "string",
                    description: "カテゴリで絞り込み（オプション）",
                    enum: [
                      "photorealism",
                      "creative",
                      "education",
                      "ecommerce",
                      "marketing",
                      "avatar",
                      "interior",
                      "editing",
                      "workplace",
                      "daily",
                      "other",
                    ],
                  },
                  limit: {
                    type: "number",
                    description: "取得件数（デフォルト: 5, 最大: 20）",
                    default: 5,
                  },
                },
                required: ["query"],
              },
            },
            {
              name: "list_categories",
              description: "利用可能なプロンプトカテゴリの一覧を取得します。",
              inputSchema: {
                type: "object",
                properties: {},
              },
            },
            {
              name: "get_prompt_detail",
              description: "特定のプロンプトの詳細情報を取得します。",
              inputSchema: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description: "プロンプトID",
                  },
                },
                required: ["id"],
              },
            },
          ],
        };
        break;

      case "tools/call":
        // ツール実行
        const toolParams = params as { name: string; arguments?: Record<string, unknown> };
        const { searchPrompts, getPromptById } = await import(
          "@/lib/vector-store"
        );
        const { CATEGORIES } = await import("@/lib/types");

        switch (toolParams.name) {
          case "search_prompts": {
            const args = toolParams.arguments as {
              query: string;
              category?: string;
              limit?: number;
            };
            const searchResults = await searchPrompts(args.query, {
              category: args.category as
                | import("@/lib/types").CategoryId
                | undefined,
              limit: args.limit || 5,
            });
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    {
                      results: searchResults,
                      total: searchResults.length,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
            break;
          }

          case "list_categories": {
            result = {
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ categories: CATEGORIES }, null, 2),
                },
              ],
            };
            break;
          }

          case "get_prompt_detail": {
            const detailArgs = toolParams.arguments as { id: string };
            const prompt = await getPromptById(detailArgs.id);
            if (!prompt) {
              result = {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      error: "プロンプトが見つかりませんでした",
                    }),
                  },
                ],
                isError: true,
              };
            } else {
              const category = CATEGORIES.find((c) => c.id === prompt.category);
              result = {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(
                      {
                        ...prompt,
                        categoryName: category?.name || "その他",
                      },
                      null,
                      2
                    ),
                  },
                ],
              };
            }
            break;
          }

          default:
            throw new Error(`Unknown tool: ${toolParams.name}`);
        }
        break;

      case "ping":
        result = {};
        break;

      case "notifications/initialized":
        // 初期化通知は応答不要
        result = {};
        break;

      default:
        throw new Error(`Unknown method: ${method}`);
    }

    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result,
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error",
      },
    };
  }
}

// POST: MCPリクエストを処理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 単一リクエストの場合
    if (!Array.isArray(body)) {
      const response = await handleJsonRpcRequest(body as JsonRpcRequest);
      return NextResponse.json(response);
    }

    // バッチリクエストの場合
    const responses = await Promise.all(
      body.map((req: JsonRpcRequest) => handleJsonRpcRequest(req))
    );
    return NextResponse.json(responses);
  } catch (error) {
    console.error("[MCP] Error:", error);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: "Parse error",
        },
      },
      { status: 400 }
    );
  }
}

// GET: SSE接続（Streamable HTTP）
export async function GET() {
  // SSEヘッダーを設定
  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // TextEncoderを使用
  const encoder = new TextEncoder();

  // ReadableStreamを作成
  const stream = new ReadableStream({
    start(controller) {
      // 接続確認メッセージを送信
      const message = JSON.stringify({
        jsonrpc: "2.0",
        method: "ping",
        params: {},
      });
      controller.enqueue(encoder.encode(`data: ${message}\n\n`));

      // 30秒後に接続を閉じる（Vercel Hobbyの制限対策）
      setTimeout(() => {
        controller.close();
      }, 30000);
    },
  });

  return new Response(stream, { headers });
}

// OPTIONS: CORSプリフライト
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Mcp-Session-Id",
    },
  });
}
