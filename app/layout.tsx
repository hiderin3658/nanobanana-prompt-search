export const metadata = {
  title: "Nano Banana Pro プロンプト検索",
  description: "Nano Banana Pro（Gemini画像生成）のプロンプトを意味検索できるMCPサーバー",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
