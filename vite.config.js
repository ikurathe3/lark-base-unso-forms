import { defineConfig } from 'vite';

// GitHub Pages のサブパス（/<リポジトリ名>/）でも動くように相対パスで出力する
export default defineConfig({ base: './', build: { outDir: 'dist', target: 'es2020', chunkSizeWarningLimit: 1500 } });
