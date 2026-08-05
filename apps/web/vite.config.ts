import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri points its webview at a fixed port, so it must be stable and strict.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  clearScreen: false,
  server: { port: 3030, strictPort: true },
  build: { target: "es2021", outDir: "dist", emptyOutDir: true },
});
