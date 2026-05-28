import { defineConfig } from "vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    federation({
      name: "shell",
      remotes: {
        app1: "http://localhost:5001/assets/remoteEntry.js",
      },
      shared: [],
    }),
  ],
  base: "http://localhost:5000/",
  build: {
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
    port: 5000,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
  },
});
