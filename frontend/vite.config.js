import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * =============================================================================
 * VITE CONFIGURATION
 * =============================================================================
 * 
 * WHAT IS VITE?
 * Vite is a modern build tool that's faster than webpack.
 * It uses native ES modules for development (no bundling needed)
 * and Rollup for production builds.
 * 
 * CONFIGURATION:
 * - plugins: React plugin for JSX support
 * - server.proxy: Routes /api calls to backend during development
 * 
 * =============================================================================
 */

export default defineConfig({
  plugins: [react()],
  
  server: {
    // Development server port
    port: 3000,
    
    // Proxy API requests to backend
    // When you call /api/..., it goes to http://localhost:5000/api/...
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  build: {
    // Output directory for production build
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: true,
  },
});
