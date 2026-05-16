const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^\/api\/chat/,
      handler: 'NetworkFirst',
      options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 86400 } },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|mp4|webm)$/,
      handler: 'CacheFirst',
      options: { cacheName: 'asset-cache', expiration: { maxEntries: 200 } },
    },
    {
      urlPattern: /^\/$/,
      handler: 'NetworkFirst',
      options: { cacheName: 'pages-cache', expiration: { maxAgeSeconds: 86400 } },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

module.exports = withPWA(nextConfig);
