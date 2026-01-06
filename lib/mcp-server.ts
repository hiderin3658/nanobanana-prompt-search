/**
 * MCPサーバー実装
 * Nano Banana Pro プロンプト検索ツールを提供
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  searchPrompts,
  getPromptById,
} from "./vector-store";
import {
  CATEGORIES,
  CategoryId,
  SearchPromptsResponse,
  ListCategoriesResponse,
  GetPromptDetailResponse,
} from "./types";

// ツール定義
const TOOLS: Tool[] = [
  {
    name: "search_prompts",
    description:
      "Nano Banana Pro のプロンプトを意味検索します。日本語・英語どちらでも検索可能です。画像生成のアイデアやプロンプトのテンプレートを探すのに便利です。",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "検索キーワードまたは説明文（例: '商品写真を撮りたい', 'anime portrait', 'ビジネス写真'）",
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
    description:
      "利用可能なプロンプトカテゴリの一覧を取得します。検索前にどんなカテゴリがあるか確認できます。",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_prompt_detail",
    description:
      "特定のプロンプトの詳細情報を取得します。検索結果のIDを指定して、完全なプロンプトテキストを取得できます。",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "string",
          description: "プロンプトID（search_promptsの結果から取得）",
        },
      },
      required: ["id"],
    },
  },
];

// パラメータのバリデーションスキーマ
const SearchPromptsParamsSchema = z.object({
  query: z.string().min(1, "検索クエリは必須です"),
  category: z
    .enum([
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
    ])
    .optional(),
  limit: z.number().min(1).max(20).default(5),
});

const GetPromptDetailParamsSchema = z.object({
  id: z.string().min(1, "プロンプトIDは必須です"),
});

// search_prompts ツールの実行
async function handleSearchPrompts(
  params: unknown
): Promise<SearchPromptsResponse> {
  const validated = SearchPromptsParamsSchema.parse(params);

  const results = await searchPrompts(validated.query, {
    category: validated.category as CategoryId | undefined,
    limit: validated.limit,
  });

  return {
    results,
    total: results.length,
  };
}

// list_categories ツールの実行
function handleListCategories(): ListCategoriesResponse {
  return {
    categories: CATEGORIES,
  };
}

// get_prompt_detail ツールの実行
async function handleGetPromptDetail(
  params: unknown
): Promise<GetPromptDetailResponse | null> {
  const validated = GetPromptDetailParamsSchema.parse(params);

  const prompt = await getPromptById(validated.id);

  if (!prompt) {
    return null;
  }

  const category = CATEGORIES.find((c) => c.id === prompt.category);

  return {
    id: prompt.id,
    title: prompt.title,
    prompt: prompt.prompt,
    category: prompt.category,
    categoryName: category?.name || "その他",
    source: prompt.source,
    sourceUrl: prompt.sourceUrl,
    language: "en",
    imageUrl: prompt.imageUrl,
  };
}

// MCPサーバーを作成
export function createMcpServer(): Server {
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

  // ツール一覧のハンドラー
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  // ツール実行のハンドラー
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_prompts": {
          const result = await handleSearchPrompts(args);
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "list_categories": {
          const result = handleListCategories();
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "get_prompt_detail": {
          const result = await handleGetPromptDetail(args);
          if (!result) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify({
                    error: "プロンプトが見つかりませんでした",
                    id: (args as { id: string }).id,
                  }),
                },
              ],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({
                  error: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: errorMessage,
            }),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
