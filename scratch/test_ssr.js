const React = require('react');

// Mock next/navigation
require.extensions['.tsx'] = require.extensions['.js'];

// Let's check with ts-node or vitest
console.log('Testing tsx import via vitest or esbuild...');
