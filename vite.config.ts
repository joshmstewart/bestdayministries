import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Generate build version at build time
const BUILD_VERSION = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Inject build version as environment variable
  define: {
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(BUILD_VERSION),
  },
  server: {
    host: "::",
    port: 8080,
  },
  preview: {
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: true,
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // React core - rarely changes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI framework - changes infrequently
          'ui-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // Query and state management
          'data-vendor': ['@tanstack/react-query', 'zustand'],
          // Supabase client
          'supabase-vendor': ['@supabase/supabase-js'],
          // Form handling
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Rich text editor
          'editor-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
          ],
          // Date utilities
          'date-vendor': ['date-fns'],
          // Icons - large bundle, cache separately
          'icons-vendor': ['lucide-react'],
        },
      },
    },
    // Enable source maps for debugging (can be disabled in prod)
    sourcemap: mode !== 'production',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'lucide-react',
    ],
  },
}));
