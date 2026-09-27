import { defineConfig } from 'vitest/config';

// 開発時は /api を server へ流し、web からは同じ origin に見せる(design.md D5)。
const apiTarget = `http://localhost:${process.env.API_PORT ?? 8787}`;

export default defineConfig({
  server: {
    proxy: {
      '/api': apiTarget,
    },
  },
  test: {
    environment: 'jsdom',
  },
});
