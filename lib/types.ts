/**
 * Nano Banana Pro プロンプト検索 MCPサーバー - 型定義
 */

// カテゴリID
export type CategoryId =
  | "photorealism"
  | "creative"
  | "education"
  | "ecommerce"
  | "marketing"
  | "avatar"
  | "interior"
  | "editing"
  | "workplace"
  | "daily"
  | "other";

// 言語コード
export type LanguageCode = "en" | "zh" | "ja";

// カテゴリ定義
export interface Category {
  id: CategoryId;
  name: string;
  description: string;
}

// カテゴリマスターデータ
export const CATEGORIES: Category[] = [
  { id: "photorealism", name: "写真・肖像", description: "写実的な写真、ポートレート" },
  { id: "creative", name: "クリエイティブ", description: "アート、実験的な表現" },
  { id: "education", name: "教育・図解", description: "インフォグラフィック、教材" },
  { id: "ecommerce", name: "EC・商品", description: "商品撮影、バーチャル試着" },
  { id: "marketing", name: "マーケティング", description: "広告、SNS用画像" },
  { id: "avatar", name: "アバター・SNS", description: "プロフィール画像、キャラクター" },
  { id: "interior", name: "インテリア", description: "部屋のデザイン、家具配置" },
  { id: "editing", name: "写真編集", description: "レタッチ、背景除去" },
  { id: "workplace", name: "ビジネス・仕事", description: "職場、プレゼンテーション" },
  { id: "daily", name: "日常・翻訳", description: "日常生活、言語翻訳" },
  { id: "other", name: "その他", description: "上記に該当しないもの" },
];

// プロンプトのメタデータ（Upstash VectorのDict型互換のためインデックスシグネチャを追加）
export interface PromptMetadata {
  [key: string]: string | undefined;
  title: string;
  prompt: string;
  category: string; // CategoryIdだがDict互換のためstringに
  source: string;
  sourceUrl: string;
  language: string; // LanguageCodeだがDict互換のためstringに
  imageUrl?: string;
  description?: string;
}

// ベクトルDBに保存するデータ構造
export interface PromptVector {
  id: string;
  vector?: number[];
  metadata: PromptMetadata;
}

// パース済みプロンプト（GitHubからパース後）
export interface ParsedPrompt {
  id: string;
  title: string;
  prompt: string;
  category: CategoryId;
  source: string;
  sourceUrl: string;
  language: LanguageCode;
  imageUrl?: string;
  description?: string;
}

// 検索結果の1件
export interface SearchResultItem {
  id: string;
  title: string;
  category: CategoryId;
  prompt: string;
  source: string;
  sourceUrl: string;
  score: number;
  imageUrl?: string;
  description?: string;
}

// search_prompts ツールのパラメータ
export interface SearchPromptsParams {
  query: string;
  category?: CategoryId;
  limit?: number;
}

// search_prompts ツールのレスポンス
export interface SearchPromptsResponse {
  results: SearchResultItem[];
  total: number;
}

// list_categories ツールのレスポンス
export interface ListCategoriesResponse {
  categories: Category[];
}

// get_prompt_detail ツールのパラメータ
export interface GetPromptDetailParams {
  id: string;
}

// get_prompt_detail ツールのレスポンス
export interface GetPromptDetailResponse {
  id: string;
  title: string;
  prompt: string;
  category: CategoryId;
  categoryName: string;
  source: string;
  sourceUrl: string;
  language: LanguageCode;
  imageUrl?: string;
  description?: string;
}

// GitHubリポジトリ設定
export interface GitHubRepoConfig {
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  sourceId: string;
}

// データソース設定
export const DATA_SOURCES: GitHubRepoConfig[] = [
  {
    owner: "YouMind-OpenLab",
    repo: "awesome-nano-banana-pro-prompts",
    branch: "main",
    filePath: "README_ja-JP.md",
    sourceId: "youmind",
  },
  {
    owner: "ZeroLu",
    repo: "awesome-nanobanana-pro",
    branch: "main",
    filePath: "README.md",
    sourceId: "zerolu",
  },
];

// セクション名からカテゴリへのマッピング
export const SECTION_TO_CATEGORY: Record<string, CategoryId> = {
  "photorealism & aesthetics": "photorealism",
  "photorealism": "photorealism",
  "creative experiments": "creative",
  "creative": "creative",
  "education & knowledge": "education",
  "education": "education",
  "e-commerce & virtual studio": "ecommerce",
  "ecommerce": "ecommerce",
  "workplace & productivity": "workplace",
  "workplace": "workplace",
  "photo editing & restoration": "editing",
  "photo editing": "editing",
  "interior design": "interior",
  "interior": "interior",
  "social media & marketing": "marketing",
  "marketing": "marketing",
  "daily life & translation": "daily",
  "daily life": "daily",
  "social networking & avatars": "avatar",
  "avatar": "avatar",
};

// エラー型
export class PromptSearchError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "PromptSearchError";
  }
}
