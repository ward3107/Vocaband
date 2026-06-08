import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Minimal config for the screenshot harness. Root stays at the project root so
// Tailwind v4 scans src/ (and generates every class the real components use);
// only the entry html differs.
const r = (p: string) => path.resolve(__dirname, "..", p);

export default defineConfig({
  root: r("."),
  plugins: [react(), tailwindcss()],
  build: {
    outDir: r("snapshots-dist"),
    emptyOutDir: true,
    rollupOptions: { input: r("snapshots/index.html") },
  },
});
