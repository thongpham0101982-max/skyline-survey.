/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  
  experimental: {
    serverActions: {
      allowedOrigins: [
        'ssm.skylineschool.edu.vn',
        '*.skylineschool.edu.vn',
        'localhost:3000',
        'localhost',
        '127.0.0.1:3000',
        '127.0.0.1',
        '192.168.10.239:3000',
        '192.168.10.239',
      ],
    },
  },
  allowedDevOrigins: [
    '192.168.10.239',
    '192.168.10.239:3000',
    'localhost',
    'localhost:3000',
    '127.0.0.1',
    '127.0.0.1:3000',
    'ssm.skylineschool.edu.vn',
    '*.skylineschool.edu.vn',
  ],
  outputFileTracingIncludes: {
    '/api/**': ['./dev.db', './prisma/dev.db'],
    '/**': ['./dev.db', './prisma/dev.db'],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=(self)",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/teacher/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
