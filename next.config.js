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
        '10.0.10.18',
        '10.0.10.18:3000',
        '10.0.10.18:443',
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
    '10.0.10.18',
    '10.0.10.18:3000',
    '10.0.10.18:443',
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
  async redirects() {
    return [
      {
        source: "/learning-resources/nameplates",
        destination: "/teacher/bang-ten-phhs",
        permanent: true,
      },
      {
        source: "/learning-resources/:path*",
        destination: "/teacher",
        permanent: true,
      },
    ];
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
        source: "/parent/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/hocsinh/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
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
