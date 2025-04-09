import vue from '@vitejs/plugin-vue';
import AutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue'],
      dts: './src/types/auto-imports.d.ts'
    }),
    viteSingleFile()
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    minify: 'esbuild', // 使用 esbuild 压缩
    target: 'esnext', // 可选，指定目标环境
    rollupOptions: {
      output: {
        // 额外的 Rollup 输出配置
      },
    }
  },
  esbuild: {
    drop: ['console'], // 移除所有 console.* 调用
  },
  server: {
    watch: {
      // 包含 public 目录
      ignored: ['!**/public/**']
    }
  }
});