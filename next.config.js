module.exports = {
  output: 'standalone',
  // External packages that should not be bundled
  serverExternalPackages: ['pg', 'adm-zip'],
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
