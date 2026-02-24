import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
    hmr: {
      port: 3000,
    },
    proxy: {
      "/uploads": {
        target:
          process.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, "") ||
          "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress TypeScript unused variable warnings
        if (warning.code === "UNUSED_EXTERNAL_IMPORT") return;
        warn(warning);
      },
    },
  },
  esbuild: {
    // Suppress TypeScript unused variable warnings during build
    logOverride: { "this-is-undefined-in-esm": "silent" },
  },
  publicDir: 'public', // Ensure public directory is served
});
