module.exports = {
  output: 'standalone',
  // Increase API route limits to handle large bundle files
  experimental: {
    // Increase the default API route response size limit
    serverComponentsExternalPackages: [],
  },
  // Configure API routes
  async headers() {
    return [
      {
        source: '/api/assets',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
