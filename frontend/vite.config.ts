import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import Inspector from 'unplugin-vue-dev-locator/vite'
import traeBadgePlugin from 'vite-plugin-trae-solo-badge'

const parseBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined) {
    return fallback
  }

  return value === 'true'
}

const parseSourceMap = (value: string | undefined) => {
  if (!value || value === 'false') {
    return false
  }

  if (value === 'true') {
    return true
  }

  return value === 'hidden' ? 'hidden' : false
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDevInspectorEnabled = parseBoolean(env.VITE_DEV_INSPECTOR)
  const isTraeBadgeEnabled = parseBoolean(env.VITE_TRAE_BADGE)
  const isTraeBadgeProdOnly = parseBoolean(env.VITE_TRAE_BADGE_PROD_ONLY, true)
  const sourceMapOption = parseSourceMap(env.VITE_SOURCE_MAP)

  return {
    build: {
      sourcemap: sourceMapOption,
    },
    plugins: [
      vue(),
      ...(isDevInspectorEnabled ? [Inspector()] : []),
      ...(isTraeBadgeEnabled ? [
        traeBadgePlugin({
          variant: 'dark',
          position: 'bottom-right',
          prodOnly: isTraeBadgeProdOnly,
          clickable: true,
          clickUrl: 'https://www.trae.ai/solo?showJoin=1',
          autoTheme: true,
          autoThemeTarget: '#app',
        }),
      ] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
