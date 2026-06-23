import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em dev, faz proxy das rotas da API para o servidor Express (porta 8080).
// Em produção, o próprio Express serve estes arquivos (mesma origem).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8080",
      "/auth": "http://localhost:8080",
      "/me": "http://localhost:8080",
      "/health": "http://localhost:8080",
    },
  },
  build: { outDir: "dist" },
});
