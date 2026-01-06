/**
 * GitHub README.md パーサー
 * ZeroLu/awesome-nanobanana-pro リポジトリからプロンプトを抽出
 */

import {
  ParsedPrompt,
  CategoryId,
  GitHubRepoConfig,
  DATA_SOURCES,
  SECTION_TO_CATEGORY,
  PromptSearchError,
} from "./types";

// GitHubからREADME.mdを取得
export async function fetchReadmeFromGitHub(
  config: GitHubRepoConfig
): Promise<string> {
  const url = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${config.filePath}`;

  const response = await fetch(url, {
    headers: {
      Accept: "text/plain",
      "User-Agent": "NanoBanana-MCP-Server/1.0",
    },
    next: { revalidate: 3600 } as any, // Next.js拡張のnextプロパティ
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

// セクション名からカテゴリIDを取得
function getCategoryFromSection(sectionName: string): CategoryId {
  const normalized = sectionName.toLowerCase().trim();

  // 完全一致を先にチェック
  if (SECTION_TO_CATEGORY[normalized]) {
    return SECTION_TO_CATEGORY[normalized];
  }

  // 部分一致をチェック
  for (const [key, category] of Object.entries(SECTION_TO_CATEGORY)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  return "other";
}

// コードブロックからプロンプトを抽出
function extractPromptFromCodeBlock(content: string): string | null {
  // ```で囲まれたコードブロックを探す
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/g;
  const matches = [...content.matchAll(codeBlockRegex)];

  if (matches.length === 0) {
    return null;
  }

  // 最初のコードブロックの内容を返す
  return matches[0][1].trim();
}

// Source行から出典URLを抽出
function extractSourceUrl(content: string): string | null {
  // *Source: [@handle](url) - [Post](link)* パターン
  const sourceRegex = /\*Source:.*?\[(?:Post|Link|Source)\]\((https?:\/\/[^\)]+)\)/i;
  const match = content.match(sourceRegex);

  if (match) {
    return match[1];
  }

  // シンプルなURLパターン
  const simpleUrlRegex = /\*Source:.*?(https?:\/\/[^\s\)]+)/i;
  const simpleMatch = content.match(simpleUrlRegex);

  return simpleMatch ? simpleMatch[1] : null;
}

// 画像URLを抽出
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
function generatePromptId(
  sourceId: string,
  sectionIndex: number,
  promptIndex: number
): string {
  return `${sourceId}-${sectionIndex}-${promptIndex}`;
}

// セクション単位でREADMEを分割
interface Section {
  name: string;
  level: number;
  content: string;
  startIndex: number;
}

function splitIntoSections(markdown: string): Section[] {
  const lines = markdown.split("\n");
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let contentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ## または ### のヘッダーを検出
    const headerMatch = line.match(/^(#{2,3})\s+(.+)$/);

    if (headerMatch) {
      // 前のセクションを保存
      if (currentSection) {
        currentSection.content = contentLines.join("\n");
        sections.push(currentSection);
      }

      const level = headerMatch[1].length;
      const name = headerMatch[2].trim();

      currentSection = {
        name,
        level,
        content: "",
        startIndex: i,
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // 最後のセクションを保存
  if (currentSection) {
    currentSection.content = contentLines.join("\n");
    sections.push(currentSection);
  }

  return sections;
}

// メインのパース関数
export function parseReadme(
  markdown: string,
  config: GitHubRepoConfig
): ParsedPrompt[] {
  const prompts: ParsedPrompt[] = [];
  const sections = splitIntoSections(markdown);

  let currentCategory: CategoryId = "other";
  let sectionIndex = 0;
  let promptIndexInSection = 0;

  for (const section of sections) {
    // ## レベルはカテゴリ
    if (section.level === 2) {
      currentCategory = getCategoryFromSection(section.name);
      sectionIndex++;
      promptIndexInSection = 0;
      continue;
    }

    // ### レベルはプロンプト
    if (section.level === 3) {
      // スキップすべきセクションをチェック
      const skipSections = [
        "resources",
        "contributing",
        "license",
        "acknowledgments",
        "table of contents",
      ];
      if (skipSections.some((s) => section.name.toLowerCase().includes(s))) {
        continue;
      }

      // プロンプトを抽出
      const prompt = extractPromptFromCodeBlock(section.content);
      if (!prompt) {
        continue;
      }

      promptIndexInSection++;

      const id = generatePromptId(
        config.sourceId,
        sectionIndex,
        promptIndexInSection
      );

      const sourceUrl =
        extractSourceUrl(section.content) ||
        `https://github.com/${config.owner}/${config.repo}`;

      const imageUrl = extractImageUrl(section.content);

      // タイトルから番号を除去（例: "1.5 Title" -> "Title"）
      const titleWithoutNumber = section.name.replace(/^\d+\.?\d*\s*/, "").trim();

      prompts.push({
        id,
        title: titleWithoutNumber || section.name,
        prompt,
        category: currentCategory,
        source: `${config.owner}/${config.repo}`,
        sourceUrl,
        language: "en",
        imageUrl: imageUrl || undefined,
        description: section.content.split("\n")[0]?.trim() || undefined,
      });
    }
  }

  return prompts;
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
