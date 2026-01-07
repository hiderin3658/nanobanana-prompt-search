/**
 * GitHub README パーサー
 * YouMind-OpenLab/awesome-nano-banana-pro-prompts リポジトリからプロンプトを抽出
 */

import {
  ParsedPrompt,
  CategoryId,
  GitHubRepoConfig,
  DATA_SOURCES,
  PromptSearchError,
} from "./types";
import { ZEROLU_DESCRIPTIONS_JA } from "./zerolu-descriptions-ja";

// GitHubからREADMEを取得
export async function fetchReadmeFromGitHub(
  config: GitHubRepoConfig
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.filePath}`;

  const response = await fetch(url, {
    headers: {
      Accept: "text/plain",
      "User-Agent": "NanoBanana-MCP-Server/1.0",
    },
  });

  if (!response.ok) {
    throw new PromptSearchError(
      `GitHub README取得失敗: ${response.status} ${response.statusText}`,
      "GITHUB_FETCH_ERROR",
      response.status
    );
  }

  return response.text();
}

// カテゴリ名を正規化してCategoryIdにマッピング
function normalizeCategoryToId(categoryText: string): CategoryId {
  const normalized = categoryText.toLowerCase().trim();

  // 日本語カテゴリ名からCategoryIdへのマッピング
  const categoryMap: Record<string, CategoryId> = {
    "プロフィール": "avatar",
    "アバター": "avatar",
    "profile": "avatar",
    "avatar": "avatar",
    "ソーシャルメディア": "marketing",
    "social media": "marketing",
    "インフォグラフィック": "education",
    "教育": "education",
    "infographic": "education",
    "education": "education",
    "youtube": "marketing",
    "コミック": "creative",
    "comic": "creative",
    "storyboard": "creative",
    "プロダクト": "ecommerce",
    "product": "ecommerce",
    "ecommerce": "ecommerce",
    "ゲーム": "creative",
    "game": "creative",
    "ポスター": "marketing",
    "poster": "marketing",
    "flyer": "marketing",
    "アプリ": "creative",
    "web": "creative",
    "design": "creative",
    "写真": "photorealism",
    "photography": "photorealism",
    "photorealism": "photorealism",
    "シネマティック": "creative",
    "cinematic": "creative",
    "アニメ": "creative",
    "anime": "creative",
    "イラスト": "creative",
    "illustration": "creative",
    "スケッチ": "creative",
    "sketch": "creative",
    "3d": "creative",
    "render": "creative",
    "ピクセル": "creative",
    "pixel": "creative",
    "油絵": "creative",
    "oil painting": "creative",
    "水彩": "creative",
    "watercolor": "creative",
    "レトロ": "creative",
    "retro": "creative",
    "vintage": "creative",
    "サイバーパンク": "creative",
    "cyberpunk": "creative",
    "ミニマリズム": "creative",
    "minimalism": "creative",
    "ポートレート": "photorealism",
    "portrait": "photorealism",
    "インフルエンサー": "marketing",
    "influencer": "marketing",
    "キャラクター": "creative",
    "character": "creative",
    "製品": "ecommerce",
    "食品": "ecommerce",
    "food": "ecommerce",
    "ファッション": "ecommerce",
    "fashion": "ecommerce",
    "動物": "creative",
    "animal": "creative",
    "車両": "creative",
    "vehicle": "creative",
    "建築": "interior",
    "architecture": "interior",
    "interior": "interior",
    "インテリア": "interior",
    "風景": "creative",
    "landscape": "creative",
    "街並み": "creative",
    "cityscape": "creative",
    "図": "education",
    "diagram": "education",
    "chart": "education",
    "テキスト": "creative",
    "text": "creative",
    "typography": "creative",
    "編集": "editing",
    "edit": "editing",
    "ビジネス": "workplace",
    "business": "workplace",
    "workplace": "workplace",
  };

  // 部分一致でマッピング
  for (const [key, value] of Object.entries(categoryMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return "other";
}

// コードブロックからプロンプトを抽出
function extractPromptFromCodeBlock(content: string): string | null {
  // ```で囲まれたコードブロックを探す
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  if (matches.length === 0) {
    return null;
  }

  // 最初のコードブロックの内容を返す
  const promptText = matches[0][1].trim();

  // JSON形式の場合は整形
  if (promptText.startsWith('{') && promptText.endsWith('}')) {
    try {
      const parsed = JSON.parse(promptText);
      // プロンプト部分のみを抽出（オブジェクト全体ではなく）
      if (typeof parsed === 'string') {
        return parsed;
      }
      // オブジェクトの場合は、そのまま文字列化
      return promptText;
    } catch {
      return promptText;
    }
  }

  return promptText;
}

// 説明を抽出（#### 📖 説明 の後）
function extractDescription(content: string): string | null {
  const descRegex = /####\s*📖\s*説明\s*\n\n?([\s\S]*?)(?=####|$)/;
  const match = content.match(descRegex);

  if (match) {
    return match[1].trim().split('\n')[0].trim();
  }

  return null;
}

// ソースURLを抽出（#### 📌 詳細 の後）
function extractSourceUrl(content: string): string | null {
  // - **ソース:** [text](url) パターン
  const sourceRegex = /-\s*\*\*ソース:\*\*\s*\[([^\]]+)\]\(([^\)]+)\)/;
  const match = content.match(sourceRegex);

  if (match) {
    return match[2];
  }

  // - **Source:** [text](url) パターン（英語版）
  const sourceEnRegex = /-\s*\*\*Source:\*\*\s*\[([^\]]+)\]\(([^\)]+)\)/;
  const matchEn = content.match(sourceEnRegex);

  return matchEn ? matchEn[2] : null;
}

// 画像URLを抽出（#### 🖼️ 生成画像 の後）
function extractImageUrl(content: string): string | null {
  // <img src="url" /> パターン
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["']/i;
  const imgMatch = content.match(imgTagRegex);

  if (imgMatch) {
    return imgMatch[1];
  }

  // ![alt](url) パターン
  const mdImageRegex = /!\[[^\]]*\]\(([^\)]+)\)/;
  const mdMatch = content.match(mdImageRegex);

  return mdMatch ? mdMatch[1] : null;
}

// プロンプトIDを生成
function generatePromptId(sourceId: string, promptNumber: number): string {
  return `${sourceId}-${promptNumber}`;
}

// ZeroLu形式のREADMEをパース
function parseReadmeZeroLu(
  markdown: string,
  config: GitHubRepoConfig
): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  let currentCategory: CategoryId = "other";
  let promptCounter = 1;

  // "##" で主要セクション分割
  const lines = markdown.split('\n');
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // カテゴリセクション検出（## 1. Photorealism & Aesthetics）
    const categoryMatch = line.match(/^##\s+\d+\.\s+(.+)/);
    if (categoryMatch) {
      const categoryText = categoryMatch[1].toLowerCase().trim();

      // カテゴリマッピング（ZeroLu README形式用）
      if (categoryText.includes("photorealism")) {
        currentCategory = "photorealism";
      } else if (categoryText.includes("creative")) {
        currentCategory = "creative";
      } else if (categoryText.includes("education")) {
        currentCategory = "education";
      } else if (categoryText.includes("e-commerce") || categoryText.includes("virtual studio")) {
        currentCategory = "ecommerce";
      } else if (categoryText.includes("workplace") || categoryText.includes("productivity")) {
        currentCategory = "workplace";
      } else if (categoryText.includes("photo editing") || categoryText.includes("restoration")) {
        currentCategory = "editing";
      } else if (categoryText.includes("interior")) {
        currentCategory = "interior";
      } else if (categoryText.includes("social media") || categoryText.includes("marketing")) {
        currentCategory = "marketing";
      } else if (categoryText.includes("daily life") || categoryText.includes("translation")) {
        currentCategory = "daily";
      } else if (categoryText.includes("social networking") || categoryText.includes("avatar")) {
        currentCategory = "avatar";
      } else {
        currentCategory = "other";
      }

      continue;
    }

    // プロンプトタイトル検出（### 1.1. Title）
    const titleMatch = line.match(/^###\s+(\d+\.\d+)\.\s+(.+)/);
    if (titleMatch) {
      const title = titleMatch[2].trim();

      // プロンプト本文を検索（次のセクションまで）
      let j = i + 1;
      let sectionContent = '';

      while (j < lines.length && !lines[j].match(/^###\s+\d+\.\d+\./)) {
        sectionContent += lines[j] + '\n';
        j++;
      }

      // プロンプト抽出
      const promptMatch = sectionContent.match(/\*\*Prompt:\*\*\s*```(?:\w+)?\n([\s\S]*?)```/);
      if (!promptMatch) {
        continue;
      }

      const prompt = promptMatch[1].trim();

      // 説明抽出（日本語マッピングを優先、なければ英語説明）
      const englishDescMatch = sectionContent.match(/^\*(.+?)\*\n/);
      const description = ZEROLU_DESCRIPTIONS_JA[title] ||
        (englishDescMatch ? englishDescMatch[1].trim() : undefined);

      // ソースURL抽出
      const sourceMatch = sectionContent.match(/\*Source:\s*\[([^\]]+)\]\(([^\)]+)\)\*/);
      const sourceUrl = sourceMatch
        ? sourceMatch[2]
        : `https://github.com/${config.owner}/${config.repo}`;

      // 画像URL抽出
      const imageMatch = sectionContent.match(/<img[^>]+src=[\"']([^\"']+)[\"']/);
      const imageUrl = imageMatch ? imageMatch[1] : undefined;

      // プロンプトIDを生成
      const id = generatePromptId(config.sourceId, promptCounter);
      promptCounter++;

      prompts.push({
        id,
        title,
        prompt,
        category: currentCategory,
        source: `${config.owner}/${config.repo}`,
        sourceUrl,
        language: "en",
        imageUrl,
        description,
      });
    }
  }

  return prompts;
}

// YouMind-OpenLab形式のREADMEをパース
function parseReadmeYouMind(
  markdown: string,
  config: GitHubRepoConfig
): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];

  // "### No. X:" で始まる行でプロンプトを分割
  const promptSections = markdown.split(/(?=### No\. \d+:)/);

  for (const section of promptSections) {
    // プロンプト番号とタイトルを抽出
    const headerMatch = section.match(/### No\. (\d+):\s*(.+)/);
    if (!headerMatch) {
      continue;
    }

    const promptNumber = parseInt(headerMatch[1], 10);
    const fullTitle = headerMatch[2].trim();

    // カテゴリとタイトルを分離（"カテゴリ - タイトル" 形式）
    const titleParts = fullTitle.split(' - ');
    const categoryText = titleParts.length > 1 ? titleParts[0].trim() : '';
    const title = titleParts.length > 1 ? titleParts.slice(1).join(' - ').trim() : fullTitle;

    // カテゴリIDを決定
    const category = categoryText ? normalizeCategoryToId(categoryText) : "other";

    // プロンプト本文を抽出
    const prompt = extractPromptFromCodeBlock(section);
    if (!prompt) {
      continue;
    }

    // 説明を抽出
    const description = extractDescription(section);

    // ソースURLを抽出
    const sourceUrl = extractSourceUrl(section) ||
      `https://github.com/${config.owner}/${config.repo}`;

    // 画像URLを抽出
    const imageUrl = extractImageUrl(section);

    // プロンプトIDを生成
    const id = generatePromptId(config.sourceId, promptNumber);

    prompts.push({
      id,
      title,
      prompt,
      category,
      source: `${config.owner}/${config.repo}`,
      sourceUrl,
      language: "ja", // YouMind-OpenLabの日本語版を使用
      imageUrl: imageUrl || undefined,
      description: description || undefined,
    });
  }

  return prompts;
}

// READMEをパース（データソースに応じて適切なパーサーを選択）
export function parseReadme(
  markdown: string,
  config: GitHubRepoConfig
): ParsedPrompt[] {
  if (config.sourceId === "zerolu") {
    return parseReadmeZeroLu(markdown, config);
  } else if (config.sourceId === "youmind") {
    return parseReadmeYouMind(markdown, config);
  } else {
    // デフォルトはYouMind形式
    return parseReadmeYouMind(markdown, config);
  }
}

// 全データソースからプロンプトを取得
export async function fetchAllPrompts(): Promise<ParsedPrompt[]> {
  const allPrompts: ParsedPrompt[] = [];

  for (const config of DATA_SOURCES) {
    try {
      const markdown = await fetchReadmeFromGitHub(config);
      const prompts = parseReadme(markdown, config);
      allPrompts.push(...prompts);
      console.log(
        `[GitHubParser] ${config.owner}/${config.repo}: ${prompts.length}件のプロンプトを取得`
      );
    } catch (error) {
      console.error(
        `[GitHubParser] ${config.owner}/${config.repo}の取得に失敗:`,
        error
      );
    }
  }

  return allPrompts;
}

// 特定のリポジトリからプロンプトを取得
export async function fetchPromptsFromRepo(
  config: GitHubRepoConfig
): Promise<ParsedPrompt[]> {
  const markdown = await fetchReadmeFromGitHub(config);
  return parseReadme(markdown, config);
}
