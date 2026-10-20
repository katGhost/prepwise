import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Build output lands directly in backend/static, so Flask serves the
// compiled app with zero extra copy step in the Dockerfile.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/static",
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Local dev only: `npm run dev` proxies /api to a locally running Flask.
      "/api": "http://localhost:8080",
    },
  },
});
