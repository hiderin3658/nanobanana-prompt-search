#!/usr/bin/env node

/**
 * Nano Banana Pro プロンプト検索 MCP Server (stdio)
 * Claude Desktop / Cursor などのローカルMCPクライアント用
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// .env.local を読み込み（開発用）
// ビルド後は dist/bin/mcp-server.js から実行されるため、2階層上を参照
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../../.env.local");
dotenv.config({ path: envPath });

// 動的インポート用の関数（ESM環境での遅延読み込み）
async function getVectorStore() {
  return await import("../lib/vector-store.js");
}

async function getTypes() {
  return await import("../lib/types.js");
}

// サーバー初期化
const server = new Server(
  {
    name: "nano-banana-prompts",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツール一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
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
});

// ツール実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "search_prompts": {
        const { searchPrompts } = await getVectorStore();
        const searchArgs = args as {
          query: string;
          category?: string;
          limit?: number;
        };

        const results = await searchPrompts(searchArgs.query, {
          category: searchArgs.category as any,
          limit: searchArgs.limit || 5,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  results,
                  total: results.length,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "list_categories": {
        const { CATEGORIES } = await getTypes();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ categories: CATEGORIES }, null, 2),
            },
          ],
        };
      }

      case "get_prompt_detail": {
        const { getPromptById } = await getVectorStore();
        const { CATEGORIES } = await getTypes();
        const detailArgs = args as { id: string };

        const prompt = await getPromptById(detailArgs.id);
        if (!prompt) {
          return {
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
        }

        const category = CATEGORIES.find((c) => c.id === prompt.category);
        return {
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
          }),
        },
      ],
      isError: true,
    };
  }
});

// stdio transport 起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // エラーハンドリング
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  // 環境変数チェック
  if (!process.env.UPSTASH_VECTOR_REST_URL || !process.env.UPSTASH_VECTOR_REST_TOKEN) {
    console.error("[MCP Server] Error: Upstash Vector environment variables not set");
    console.error("Please set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[MCP Server] Fatal error:", error);
  process.exit(1);
});
