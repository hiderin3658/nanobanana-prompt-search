# Nano Banana Pro プロンプト検索 MCPサーバー

Nano Banana Pro（Gemini画像生成）のプロンプト集を**Claude.ai上から意味検索**できるリモートMCPサーバーです。

## ✨ 特徴

- 🔍 **意味検索**: 日本語・英語どちらでも自然言語検索が可能
- 🌐 **クロスリンガル対応**: 日本語で検索して英語プロンプトも見つかる
- 📚 **高品質キュレーション**: 厳選された200件のプロンプト
- 🆓 **完全無料**: Vercel + Upstash Vector の無料枠で運用
- 🔌 **Claude.ai統合**: MCPプロトコルでシームレスに利用可能

## 📊 データソース

| リポジトリ | プロンプト数 | 言語 | 説明 |
|-----------|-------------|------|------|
| [YouMind-OpenLab/awesome-nano-banana-pro-prompts](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts) | 130件 | 日本語 | 厳選3.2%の高品質プロンプト |
| [ZeroLu/awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro) | 70件 | 英語 | コミュニティ最大手（7,840スター） |

**合計**: 200件のプロンプト（190件登録：重複除外後）

## 🎯 検索例

Claude.aiで以下のように質問できます：

```
商品写真を撮りたいんだけど、おすすめのプロンプトを探して
```

```
professional headshot を作成するプロンプトを教えて
```

どちらの言語で検索しても、日本語で説明が表示されます。

## 🚀 セットアップ

### 前提条件

- Node.js 18.0.0 以上
- Upstash アカウント（無料）
- Vercel アカウント（デプロイ用）
- Claude Pro/Max/Team/Enterprise プラン

### 1. リポジトリクローン

```bash
git clone https://github.com/yourusername/nanobanana-prompt-search.git
cd nanobanana-prompt-search
```

### 2. 依存関係インストール

```bash
npm install
```

### 3. Upstash Vector セットアップ

[Upstash Console](https://console.upstash.com/) でベクトルインデックスを作成：

- **Name**: `nano-banana-prompts`
- **Region**: `us-east-1`（または最寄り）
- **Embedding Model**: `BAAI/bge-base-en-v1.5`
- **Similarity**: `COSINE`

作成後、以下の情報を取得：
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`

### 4. 環境変数設定

`.env.local` ファイルを作成：

```bash
UPSTASH_VECTOR_REST_URL=https://xxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxx
```

### 5. 初期データ投入

```bash
npm run seed
```

実行結果例：
```
✅ 初期データ投入が完了しました
   最終プロンプト数: 190件
```

### 6. ローカル開発サーバー起動

```bash
npm run dev
```

ヘルスチェック：
```bash
curl http://localhost:3000/api/health
```

## 📦 Vercelデプロイ

### GitHub連携

1. GitHubにリポジトリをプッシュ
2. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
3. 「Add New...」→「Project」
4. GitHubリポジトリを選択
5. 環境変数を設定：
   - `UPSTASH_VECTOR_REST_URL`
   - `UPSTASH_VECTOR_REST_TOKEN`
6. 「Deploy」をクリック

## 🔌 MCPクライアントでの使用

このプロジェクトは2つのプロトコルをサポートしています：

### 🌐 Claude.ai Integrations（Streamable HTTP）

**対応クライアント**: Claude.ai Web版

**登録手順**:
1. [Claude.ai](https://claude.ai) にログイン（Pro/Max/Team/Enterprise）
2. 左下の「⚙️」→「Integrations」
3. 「Add custom connector」をクリック
4. 入力：
   - **名前**: `Nano Banana Prompts`
   - **URL**: `https://your-project.vercel.app/api/mcp`
5. 「追加」をクリック

### 💻 Claude Desktop / Cursor（stdio）

**対応クライアント**: Claude Desktop, Cursor（※Cursorは実験的）

#### セットアップ手順

**1. プロジェクトをクローン**
```bash
git clone https://github.com/yourusername/nanobanana-prompt-search.git
cd nanobanana-prompt-search
```

**2. 依存関係インストール＆ビルド**
```bash
npm install
npm run build:mcp
```

**3. 環境変数設定**

`.env.local` ファイルを作成：
```bash
UPSTASH_VECTOR_REST_URL=https://xxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxx
```

**4. Claude Desktop設定**

Claude Desktopの設定ファイルを編集：

**macOS**:
```bash
code ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**Windows**:
```bash
code %APPDATA%\Claude\claude_desktop_config.json
```

**設定内容**:
```json
{
  "mcpServers": {
    "nano-banana-prompts": {
      "command": "node",
      "args": [
        "/absolute/path/to/nanobanana-prompt-search/dist/bin/mcp-server.js"
      ],
      "env": {
        "UPSTASH_VECTOR_REST_URL": "https://xxx.upstash.io",
        "UPSTASH_VECTOR_REST_TOKEN": "xxx"
      }
    }
  }
}
```

**重要**:
- `/absolute/path/to/` を実際のプロジェクトパスに置き換えてください
- Windows の場合は `C:\\Users\\...\\dist\\bin\\mcp-server.js` のように記載

**5. Claude Desktop を再起動**

設定完了後、Claude Desktop を再起動すると、MCPサーバーが利用可能になります。

#### 動作確認

Claude Desktopで以下のように質問してみてください：

```
商品写真を撮りたいんだけど、おすすめのプロンプトを探して
```

## 🛠️ 開発

### コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（HTTP） |
| `npm run build` | プロダクションビルド（HTTP のみ、Vercel用） |
| `npm run build:all` | 完全ビルド（HTTP + stdio） |
| `npm run build:mcp` | stdioサーバービルドのみ |
| `npm run start` | プロダクションサーバー起動 |
| `npm run mcp` | stdioサーバー起動（ローカルテスト用） |
| `npm run lint` | ESLintチェック |
| `npm run type-check` | TypeScript型チェック |
| `npm run seed` | 初期データ投入 |
| `npm run seed -- --dry-run` | ドライラン（確認のみ） |
| `npm run seed -- --reset` | 既存データ削除して投入 |

### ディレクトリ構成

```
nanobanana-prompt-search/
├── app/
│   └── api/
│       ├── mcp/route.ts        # MCPエンドポイント（HTTP）
│       ├── sync/route.ts       # データ同期API
│       └── health/route.ts     # ヘルスチェック
├── bin/
│   └── mcp-server.ts           # MCPエンドポイント（stdio）
├── lib/
│   ├── github-parser.ts        # GitHubデータパーサー
│   ├── vector-store.ts         # Upstash Vector操作
│   ├── types.ts                # 型定義
│   └── zerolu-descriptions-ja.ts # ZeroLu説明文の日本語翻訳
├── scripts/
│   └── seed-data.ts            # 初期データ投入スクリプト
└── docs/
    └── SETUP.md                # 詳細セットアップ手順
```

## 📝 MCPツール

### `search_prompts`

プロンプトを意味検索します。

**パラメータ**:
- `query` (string, required): 検索キーワード
- `category` (string, optional): カテゴリで絞り込み
- `limit` (number, optional): 取得件数（デフォルト: 5, 最大: 20）

**レスポンス例**:
```json
{
  "results": [
    {
      "id": "zerolu-7",
      "title": "Professional Headshot Creator",
      "description": "自撮りからプロフェッショナルなプロフィール写真を作成",
      "category": "photorealism",
      "prompt": "A professional, high-resolution profile photo...",
      "source": "ZeroLu/awesome-nanobanana-pro",
      "score": 0.87
    }
  ],
  "total": 1
}
```

### `list_categories`

利用可能なカテゴリ一覧を取得します。

### `get_prompt_detail`

特定のプロンプトの詳細情報を取得します。

**パラメータ**:
- `id` (string, required): プロンプトID

## 📊 カテゴリ一覧

| カテゴリID | 表示名 | 件数 |
|-----------|--------|------|
| creative | クリエイティブ | 56件 |
| marketing | マーケティング | 35件 |
| avatar | アバター・SNS | 24件 |
| photorealism | 写真・肖像 | 17件 |
| education | 教育・図解 | 16件 |
| ecommerce | EC・商品 | 16件 |
| other | その他 | 27件 |

## 🔧 トラブルシューティング

### 検索結果が返らない

1. ヘルスチェックで `vectorCount` を確認
2. 0件の場合は `npm run seed` を実行

### タイムアウトエラー

- Vercel Hobbyプランは10秒制限があります
- `limit` パラメータを小さくして検索

### Claude.aiで接続できない

1. URLが正しいか確認（末尾に `/api/mcp` が必要）
2. Vercelのデプロイが成功しているか確認
3. 環境変数が正しく設定されているか確認

## 📄 ライセンス

このプロジェクトは MIT License の元で公開されています。

### データソースのライセンス

- **YouMind-OpenLab/awesome-nano-banana-pro-prompts**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **ZeroLu/awesome-nanobanana-pro**: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

本プロジェクトでは、上記リポジトリのプロンプトデータを使用しています。
使用する際は、各リポジトリのライセンス条件に従ってください。

## 🙏 クレジット

- [YouMind-OpenLab](https://github.com/YouMind-OpenLab) - 高品質な日本語プロンプト集
- [ZeroLu](https://github.com/ZeroLu) - 包括的な英語プロンプト集
- [Upstash](https://upstash.com/) - ベクトルDBサービス
- [Vercel](https://vercel.com/) - ホスティングプラットフォーム

## 📚 参考リンク

- [MCP公式ドキュメント](https://modelcontextprotocol.io/)
- [Upstash Vector Documentation](https://upstash.com/docs/vector)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)

---

Made with ❤️ for the Nano Banana Pro community
