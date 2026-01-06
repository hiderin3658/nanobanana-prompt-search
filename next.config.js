/** @type {import('next').NextConfig} */
const nextConfig = {
  // 実験的機能
  experimental: {
    // サーバーアクションを有効化
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // 外部パッケージの設定
    serverComponentsExternalPackages: ['@modelcontextprotocol/sdk'],
  },
};

module.exports = nextConfig;
