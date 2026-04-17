/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'http://localhost:3000',
    'localhost:3000',
    'localhost',
    '192.168.6.121',
  ]
};

module.exports = nextConfig;

// trigger reload 1775572215623