import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5174",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/react-router") ||
            id.includes("/node_modules/@tanstack/")
          ) {
            return "vendor-react";
          }
          if (id.includes("recharts")) {
            return "vendor-charts";
          }
          if (id.includes("jspdf")) {
            return "vendor-pdf";
          }
          if (id.includes("html2canvas")) {
            return "vendor-canvas";
          }
          if (id.includes("dompurify")) {
            return "vendor-purify";
          }
          if (id.includes("html5-qrcode")) {
            return "vendor-scanner";
          }
          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "vendor-ui";
          }
          return undefined;
        },
      },
    },
  },
});
