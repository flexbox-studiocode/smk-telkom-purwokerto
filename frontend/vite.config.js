import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { stelaDevPlugin } from './vite-plugin-stela.js'

export default defineConfig({
  plugins: [react(), tailwindcss(), stelaDevPlugin()],
  build: {
    manifest: true,
    // Keep bitmap assets cacheable instead of embedding them in the initial JavaScript.
    assetsInlineLimit: (file) => /\.(woff2|webp|avif|png|jpe?g)$/.test(file) ? false : undefined,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Shared school content is cacheable data, not application bootstrap code.
          if (id.replace(/\\/g, '/').endsWith('/src/data/dummyData.js')) return 'school-content';
          if (id.includes('node_modules/react-dom/')) return 'react-vendor';
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id.replace(/\\/g, '/'))) return 'motion-vendor';
          if (id.includes('node_modules/gsap/')) return 'gsap-vendor';
          if (id.includes('node_modules/lenis/')) return 'lenis-vendor';
        },
      },
    },
  },
})
