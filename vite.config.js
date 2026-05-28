import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/static/",
  build: {
    manifest: true,
    outDir: resolve(__dirname, "frontend/dist"),
    rollupOptions: {
      input: {
        main: resolve(__dirname, "frontend/src/main.ts"),
      },
    },
  },
  server: {
    port: 5000,
    host: "0.0.0.0",
    strictPort: true,
    cors: true,
    hmr: {
      host: "localhost",
      port: 5000,
    },
  },
});
