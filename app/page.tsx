/**
 * トップページ
 * MCPサーバーの情報を表示
 */

export default function Home() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "40px 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1>🍌 Nano Banana Pro プロンプト検索</h1>

      <p>
        このサーバーは、Nano Banana Pro（Gemini画像生成）のプロンプト集を
        Claude上から意味検索できるMCPサーバーです。
      </p>

      <h2>🔧 利用方法</h2>

      <h3>Claude.ai での利用</h3>
      <ol>
        <li>
          <a href="https://claude.ai" target="_blank" rel="noopener noreferrer">
            Claude.ai
          </a>
          にログイン（Pro/Max/Team/Enterprise プラン）
        </li>
        <li>左下の「⚙️」→「Integrations」を開く</li>
        <li>「Add custom connector」をクリック</li>
        <li>
          以下を入力:
          <ul>
            <li>
              <strong>名前</strong>: Nano Banana Prompts
            </li>
            <li>
              <strong>URL</strong>: <code>{`${process.env.VERCEL_URL || 'https://your-domain.vercel.app'}/api/mcp`}</code>
            </li>
          </ul>
        </li>
        <li>「追加」をクリック</li>
      </ol>

      <h2>🛠️ 利用可能なツール</h2>

      <h3>search_prompts</h3>
      <p>プロンプトを意味検索します。日本語・英語どちらでも検索可能です。</p>
      <pre
        style={{
          background: "#f5f5f5",
          padding: "15px",
          borderRadius: "8px",
          overflow: "auto",
        }}
      >
        {`例: "商品写真を撮りたい"
例: "anime portrait"
例: "ビジネス写真"`}
      </pre>

      <h3>list_categories</h3>
      <p>利用可能なカテゴリ一覧を取得します。</p>

      <h3>get_prompt_detail</h3>
      <p>特定のプロンプトの詳細情報を取得します。</p>

      <h2>📊 API エンドポイント</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "10px",
        }}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd" }}>
            <th style={{ textAlign: "left", padding: "10px" }}>エンドポイント</th>
            <th style={{ textAlign: "left", padding: "10px" }}>説明</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "10px" }}>
              <code>/api/mcp</code>
            </td>
            <td style={{ padding: "10px" }}>MCPプロトコルエンドポイント</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "10px" }}>
              <code>/api/health</code>
            </td>
            <td style={{ padding: "10px" }}>ヘルスチェック</td>
          </tr>
          <tr style={{ borderBottom: "1px solid #ddd" }}>
            <td style={{ padding: "10px" }}>
              <code>/api/sync</code>
            </td>
            <td style={{ padding: "10px" }}>データ同期（Cron Job）</td>
          </tr>
        </tbody>
      </table>

      <h2>📚 データソース</h2>
      <ul>
        <li>
          <a
            href="https://github.com/ZeroLu/awesome-nanobanana-pro"
            target="_blank"
            rel="noopener noreferrer"
          >
            ZeroLu/awesome-nanobanana-pro
          </a>
        </li>
      </ul>

      <hr style={{ margin: "40px 0", border: "none", borderTop: "1px solid #ddd" }} />

      <p style={{ color: "#666", fontSize: "14px" }}>
        Powered by{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          Vercel
        </a>{" "}
        +{" "}
        <a href="https://upstash.com" target="_blank" rel="noopener noreferrer">
          Upstash Vector
        </a>{" "}
        +{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Model Context Protocol
        </a>
      </p>
    </main>
  );
}
