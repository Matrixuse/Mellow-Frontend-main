
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    minify: 'terser', // Enable minification for production
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      },
      mangle: true
    },
    rollupOptions: {
      external: ['@capacitor/android', '@capacitor/push-notifications'], // Exclude mobile-only packages
      output: {
        // Split vendor libraries into separate chunk for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', '@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'],
          'vendor-other': ['axios', 'fuse.js'],
          'vendor-capacitor': ['@capacitor/core'] // Only include core, exclude mobile-specific packages
        }
      }
    },
    // Optimize build
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable source maps in production
    reportCompressedSize: false
  },

  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: {
      host: 'localhost',
      port: 5173,
      protocol: 'ws'
    },
    headers: {
      "Cache-Control": "no-store"
    }
  }
})