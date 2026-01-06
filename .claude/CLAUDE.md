# プロジェクト AI ガイド（Nano Banana Pro プロンプト検索 MCPサーバー）

> このファイルは、**Nano Banana Pro プロンプト検索 MCPサーバー専用の AI 向けルール集**です。
> 共通ルール（`~/.claude/AI_COMMON_RULES.md`）に加えて、このプロジェクト固有の前提・例外・開発規約を定義します。

---

## 1. プロジェクト概要

- **プロジェクト名**: Nano Banana Pro プロンプト検索 MCPサーバー
- **概要**:
  - Nano Banana Pro（Gemini画像生成）のプロンプト集をClaude上から意味検索できるリモートMCPサーバー
  - Vercel上にデプロイし、Claude.aiのIntegrationsから利用可能
  - 日本語・英語両方のプロンプトを意味検索可能
- **想定ユーザー**:
  - Claude Pro/Max/Team/Enterprise プランユーザー
  - Nano Banana Pro を利用する画像生成クリエイター

---

## 2. 技術スタック

### 2.1 インフラ・サービス

| レイヤー | 技術 | プラン | 月額コスト |
|---------|------|--------|-----------|
| ホスティング | Vercel | Hobby | $0 |
| ベクトルDB | Upstash Vector | Free | $0 |
| Embedding | Upstash Vector ビルトイン | Free枠内 | $0 |
| データソース | GitHub API | 無料 | $0 |

### 2.2 開発技術

| 項目 | 技術 |
|------|------|
| 言語 | TypeScript |
| フレームワーク | Next.js (App Router) |
| MCPライブラリ | @modelcontextprotocol/sdk |
| MCP Vercelアダプタ | @vercel/mcp-adapter |
| ベクトルDB SDK | @upstash/vector |
| パッケージマネージャ | npm |

### 2.3 MCPプロトコル

| 項目 | 仕様 |
|------|------|
| プロトコル | Streamable HTTP（MCP 2025-03-26仕様） |
| 認証 | なし（公開サーバー） |
| エンドポイント | `/api/mcp`（POST/GET） |

> AI への指示：
> 「このプロジェクトでは TypeScript と Next.js App Router を使用します。
> MCPサーバーは Streamable HTTP プロトコルで実装してください。」

---

## 3. ディレクトリ構成ルール

```text
nanobanana-prompt-search/
├── app/
│   └── api/
│       ├── mcp/
│       │   └── route.ts        # MCPエンドポイント（Streamable HTTP）
│       ├── sync/
│       │   └── route.ts        # データ同期API (Cron Job)
│       └── health/
│           └── route.ts        # ヘルスチェック
├── lib/
│   ├── mcp-server.ts           # MCPサーバー実装
│   ├── vector-store.ts         # Upstash Vector操作
│   ├── github-parser.ts        # GitHubデータパーサー
│   └── types.ts                # 型定義
├── scripts/
│   └── seed-data.ts            # 初期データ投入スクリプト
├── docs/
│   └── nano-banana-mcp-server-design.md  # 設計書
├── .claude/
│   └── CLAUDE.md               # プロジェクト固有AIルール
├── vercel.json                 # Vercel設定（Cron Jobs）
├── package.json
├── tsconfig.json
└── .env.local                  # 環境変数（コミット禁止）
```

### ディレクトリに関するルール

- `app/api/`: Next.js API Routes（MCPエンドポイント含む）
- `lib/`: 共有ライブラリ・ユーティリティ
- `scripts/`: 初期データ投入などの実行スクリプト
- `.env.local`: Upstash認証情報（絶対にコミットしない）

> AI への指示例：
> 「新しいモジュールはlib/以下に配置し、APIエンドポイントはapp/api/以下に配置してください。」

---

## 4. データソース

### 4.1 採用リポジトリ

| リポジトリ | プロンプト数 | 言語 | パース難易度 |
|-----------|-------------|------|-------------|
| **ZeroLu/awesome-nanobanana-pro** | 約70件 | 英語 | 低い（初期実装） |
| xianyu110/awesome-nanobananapro-prompts | 約30件+ | 中国語 | 中程度（後日追加） |

### 4.2 パース戦略（ZeroLu）

1. `##` で主要セクション（カテゴリ）を識別
2. `###` でプロンプト単位を識別
3. コードブロック（```）でプロンプト本文を抽出
4. `Source:` 行から出典情報を取得

### 4.3 カテゴリマッピング

| カテゴリID | 表示名 | 説明 |
|-----------|--------|------|
| photorealism | 写真・肖像 | 写実的な写真、ポートレート |
| creative | クリエイティブ | アート、実験的な表現 |
| education | 教育・図解 | インフォグラフィック、教材 |
| ecommerce | EC・商品 | 商品撮影、バーチャル試着 |
| marketing | マーケティング | 広告、SNS用画像 |
| avatar | アバター・SNS | プロフィール画像、キャラクター |
| interior | インテリア | 部屋のデザイン、家具配置 |
| editing | 写真編集 | レタッチ、背景除去 |
| other | その他 | 上記に該当しないもの |

---

## 5. MCPツール設計

### 5.1 ツール一覧

| ツール名 | 説明 | パラメータ |
|---------|------|-----------|
| `search_prompts` | プロンプトを意味検索 | `query`, `category?`, `limit?` |
| `list_categories` | カテゴリ一覧を取得 | なし |
| `get_prompt_detail` | プロンプト詳細を取得 | `id` |

### 5.2 レスポンス形式

```typescript
// search_prompts レスポンス例
{
  results: [
    {
      id: "zerolu-1-5",
      title: "One-Click Business Photo (Silicon Valley Style)",
      category: "photorealism",
      prompt: "Keep the facial features of the person...",
      source: "ZeroLu/awesome-nanobanana-pro",
      score: 0.92
    }
  ],
  total: 5
}
```

---

## 6. コーディング規約

### 6.1 TypeScript コーディングスタイル

```typescript
// ✅ 良い例：型定義を明確に
interface PromptVector {
  id: string;
  vector: number[];
  metadata: {
    title: string;
    prompt: string;
    category: string;
    source: string;
    sourceUrl: string;
    language: "en" | "zh" | "ja";
    imageUrl?: string;
  };
}

// ✅ 良い例：エラーハンドリング
async function searchPrompts(query: string): Promise<SearchResult> {
  try {
    const results = await vectorStore.query(query);
    return { results, total: results.length };
  } catch (error) {
    logger.error("検索エラー:", error);
    throw new Error("プロンプト検索に失敗しました");
  }
}
```

### 6.2 Next.js API Routes パターン

```typescript
// app/api/mcp/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  // Streamable HTTP対応
  const body = await request.json();
  // MCPリクエスト処理
  return NextResponse.json(response);
}

export async function GET(request: NextRequest) {
  // SSE対応（必要な場合）
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### 6.3 Upstash Vector 操作パターン

```typescript
import { Index } from "@upstash/vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
});

// クエリ実行（ビルトインEmbedding使用）
const results = await index.query({
  data: "商品写真を撮りたい",  // テキストを直接渡す
  topK: 5,
  includeMetadata: true,
});
```

---

## 7. 環境変数

### 7.1 必須環境変数

```bash
# .env.local（ローカル開発用）
UPSTASH_VECTOR_REST_URL=https://xxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxx
```

### 7.2 Vercel環境変数

Vercel Dashboardで以下を設定：
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`

> **注意**: `.env.local` は絶対にコミットしない

---

## 8. ビルド・リンタエラー解消ルール

### 8.1 実装完了時の必須チェック

```bash
# TypeScriptコンパイル
npx tsc --noEmit

# ESLint
npx eslint . --ext .ts,.tsx

# Next.js ビルド
npm run build
```

### 8.2 Vercel Hobby枠の制限

| 項目 | 制限 |
|------|------|
| 帯域幅 | 100GB/月 |
| Serverless Function実行時間 | 10秒/リクエスト |
| Cron Jobs | 2回/日まで |
| ビルド時間 | 6000分/月 |

> AI への指示：
> 「実装完了時は必ず `npm run build` を実行し、すべてのエラーを解消してください。
> Function実行時間が10秒を超えないよう注意してください。」

---

## 9. デプロイ手順

### 9.1 Vercel設定（vercel.json）

```json
{
  "crons": [
    {
      "path": "/api/sync",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### 9.2 Claude.aiへの登録

1. [Claude.ai](https://claude.ai) にログイン
2. 左下の「⚙️」→「Integrations」
3. 「Add custom connector」をクリック
4. 入力:
   - **名前**: `Nano Banana Prompts`
   - **URL**: `https://your-project.vercel.app/api/mcp`
5. 「追加」をクリック

---

## 10. テスト方針

### 10.1 単体テスト

```bash
# Jest実行
npm test

# 特定のテストのみ
npm test -- --testPathPattern=github-parser
```

### 10.2 重要なテスト項目

- GitHubからのMarkdownパース
- Upstash Vectorへのupsert/query
- MCPツールのレスポンス形式
- エラーハンドリング

---

## 11. トラブルシューティング

### 11.1 よくある問題と解決策

| 症状 | 原因 | 解決策 |
|------|------|--------|
| 検索結果が返らない | ベクトルDBが空 | `/api/sync` を手動実行 |
| タイムアウト | 10秒制限超過 | クエリ最適化、limit削減 |
| Claude.aiで接続できない | URL間違い | URLを再確認 |
| Embedding失敗 | Upstash設定不備 | Index設定でEmbeddingモデルを確認 |

---

## 12. AI への依頼テンプレート（このプロジェクト専用）

```text
あなたは TypeScript/Next.js を使用した MCPサーバーの開発アシスタントです。

共通ルール（~/.claude/AI_COMMON_RULES.md）に加えて、
次のプロジェクト固有ルールを守ってください：
- Next.js App Router のパターンに従う
- MCPは Streamable HTTP プロトコルで実装
- Upstash Vector のビルトインEmbeddingを使用
- 認証なし（公開サーバー）として実装
- 実装完了後は `npm run build` でエラーチェック

【依頼内容】
[ここに具体的な依頼を記載]

コード提示後、ビルドチェック結果も含めて報告してください。
```

---

## 13. このファイルの運用ルール

- 新機能追加時は該当セクションを更新
- ツール追加時はセクション5を更新
- エラーパターンが見つかったら「よくある問題」に追記
- 月次でドキュメントの整合性を確認

---

### 更新履歴

- 2026-01-06: 初版作成（設計書に基づく）
