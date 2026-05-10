/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
  async rewrites() {
    // Strip BOM and whitespace from env var (Windows PowerShell pipe artefact)
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
      .replace(/^﻿/, '').trim();
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
