import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const githubPagesBase = repositoryName ? `/${repositoryName}/` : './';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? githubPagesBase : './',
  resolve: {
    alias: {
      '@content': '/src/content',
      '@components': '/src/components',
      '@utils': '/src/utils',
      '@i18n': '/src/i18n',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          const chMatch = id.match(/src\/content\/zh-TW\/(ch\d+|appendix-[ab])\.ts/);
          if (chMatch) return `content-${chMatch[1]}`;
          if (id.includes('src/components/diagrams/')) return 'diagrams';
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
