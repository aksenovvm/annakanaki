import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Mini App открывается внутри Telegram по HTTPS-адресу (через туннель — см. docs/telegram-miniapp.md).
 * Запросы /api/* Vite пересылает на наш API (localhost:4000) — так Mini App и API живут на одном адресе
 * и не нужен второй туннель и настройки CORS.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // адреса туннелей cloudflared и ngrok, через которые Telegram открывает Mini App
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
