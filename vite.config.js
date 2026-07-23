
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
      output: {
        // Split vendor libraries into separate chunk for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', '@fortawesome/fontawesome-svg-core', '@fortawesome/free-solid-svg-icons', '@fortawesome/react-fontawesome'],
          'vendor-other': ['axios', 'fuse.js'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/android', '@capacitor/push-notifications']
        }
      }
    },
    // Optimize build
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable source maps in production
    reportCompressedSize: false
  },

  server: {
    headers: {
      "Cache-Control": "public, max-age=3600" // Enable caching for static assets
    }
  }
})