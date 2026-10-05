import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Общий пакет с типами и схемами лежит в монорепозитории как TypeScript — Next.js его компилирует сам
  transpilePackages: ["@barbershop/shared"],
  // Не создавать служебные AGENTS.md / CLAUDE.md при каждом запуске next dev
  agentRules: false,
};

export default nextConfig;
