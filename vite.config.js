import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 支持通过 VITE_BASE_PATH 部署到子路径（如 /census/）
  // 默认 './' 让构建产物在任意目录下打开都能正常加载（配合 hash 路由）
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || './'

  return {
    base,
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: false,
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: false,
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/variables.scss" as *;`,
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
    preview: {
      port: 4173,
      // host 默认 false，需要外部访问可改成 host: true
    },
    build: {
      // 关闭 source map 减小体积；如需调试线上可单独配置
      sourcemap: false,
      // 提高警告阈值（拆包后单 chunk 仍可能 > 500KB）
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // 手动拆包 —— 把重量级依赖拆出来，让首屏可以并行下载、长效缓存
          manualChunks: {
            'vendor-vue': ['vue', 'vue-router', 'pinia'],
            'vendor-element': ['element-plus', '@element-plus/icons-vue'],
            'vendor-echarts': ['echarts'],
            'vendor-excel': ['xlsx', 'file-saver'],
            'vendor-dexie': ['dexie'],
          },
        },
      },
    },
  }
})
