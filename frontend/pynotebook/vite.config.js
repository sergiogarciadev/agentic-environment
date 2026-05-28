import { defineConfig } from "vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    federation({
      name: "pynotebook",
      filename: "remoteEntry.js",
      exposes: {
        "./Notebook": "./src/Notebook.js",
      },
      shared: [],
    }),
  ],
  base: "http://localhost:5002/",
  build: {
    sourcemap: true,
    modulePreload: false,
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      input: "./src/main.js",
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5002,
    cors: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5002,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
