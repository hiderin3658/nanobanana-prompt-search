# セットアップ手順

このドキュメントでは、Nano Banana Pro プロンプト検索 MCPサーバーのセットアップ手順を説明します。

---

## 前提条件

- Node.js 18.0.0 以上
- npm
- Upstash アカウント
- Vercel アカウント（デプロイ用）
- Claude Pro/Max/Team/Enterprise プラン（MCPサーバー利用に必須）

---

## 1. 環境変数設定

プロジェクトルートに `.env.local` ファイルを作成し、Upstash認証情報を設定します：

```bash
UPSTASH_VECTOR_REST_URL=https://xxx.upstash.io
UPSTASH_VECTOR_REST_TOKEN=xxx
```

---

## 2. Upstash Vector インデックス作成

[Upstash Console](https://console.upstash.com/) にログインして、ベクトルインデックスを作成します。

### 手順

1. 「Vector」→「Create Index」をクリック
2. 以下の設定を入力:

| 項目 | 値 |
|------|-----|
| **Name** | `nano-banana-prompts` |
| **Region** | `us-east-1`（または最寄りのリージョン） |
| **Embedding Model** | `BAAI/bge-base-en-v1.5`（推奨）または他のモデル |
| **Dimensions** | モデルに応じて自動設定 |
| **Similarity** | `COSINE` |

3. 「Create」をクリック
4. 作成後、以下の情報をメモ:
   - `UPSTASH_VECTOR_REST_URL`
   - `UPSTASH_VECTOR_REST_TOKEN`

### 注意事項

- **無料枠**: 10,000ベクトル/月、10,000クエリ/日
- 本プロジェクトでは約70件のプロンプトを格納するため、無料枠で十分です

---

## 3. 依存関係インストール

```bash
npm install
```

---

## 4. 初期データ投入

GitHubからプロンプトを取得し、Upstash Vectorにアップロードします。

```bash
npm run seed
```

### オプション

| フラグ | 説明 |
|--------|------|
| `--dry-run` または `-d` | アップロードせずにパース結果のみ確認 |
| `--reset` または `-r` | 既存データを削除してから投入 |

### 実行例

```bash
# ドライラン（確認のみ）
npm run seed -- --dry-run

# 既存データをリセットして投入
npm run seed -- --reset
```

---

## 5. ローカル開発サーバー起動

```bash
npm run dev
```

### 確認用URL

| URL | 説明 |
|-----|------|
| http://localhost:3000 | トップページ（利用方法表示） |
| http://localhost:3000/api/health | ヘルスチェック |
| http://localhost:3000/api/mcp | MCPエンドポイント |

### ヘルスチェック例

```bash
curl http://localhost:3000/api/health
```

期待されるレスポンス:
```json
{
  "status": "healthy",
  "services": {
    "api": { "status": "healthy" },
    "vectorStore": { "status": "healthy", "vectorCount": 70 }
  }
}
```

---

## 6. Vercelデプロイ

### 方法1: Vercel CLI

```bash
# Vercel CLIをインストール（未インストールの場合）
npm install -g vercel

# デプロイ
vercel
```

### 方法2: GitHub連携

1. GitHubにリポジトリをプッシュ
2. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
3. 「Add New...」→「Project」
4. GitHubリポジトリを選択
5. 環境変数を設定:
   - `UPSTASH_VECTOR_REST_URL`
   - `UPSTASH_VECTOR_REST_TOKEN`
6. 「Deploy」をクリック

---

## 7. Claude.aiへの登録

デプロイ完了後、Claude.aiのIntegrationsに登録します。

### 手順

1. [Claude.ai](https://claude.ai) にログイン（Pro/Max/Team/Enterprise プラン）
2. 左下の「⚙️」アイコン →「Integrations」を開く
3. 「Add custom connector」をクリック
4. 以下を入力:
   - **名前**: `Nano Banana Prompts`
   - **URL**: `https://your-project.vercel.app/api/mcp`
5. 「追加」をクリック

### 利用方法

登録後、Claudeとの会話で以下のようにプロンプトを検索できます：

```
Nano Banana Proで商品写真を撮りたいんだけど、おすすめのプロンプトを探して
```

---

## トラブルシューティング

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

---

## 開発コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLintチェック |
| `npm run type-check` | TypeScript型チェック |
| `npm run seed` | 初期データ投入 |

---

## 参考リンク

- [MCP公式ドキュメント](https://modelcontextprotocol.io/)
- [Upstash Vector Documentation](https://upstash.com/docs/vector)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
