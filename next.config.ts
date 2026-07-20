import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Sem isso o Next infere a raiz do workspace errado quando há outro
  // package-lock.json em uma pasta acima (ex: C:\Users\<user>), e o build
  // standalone acaba gerando server.js num caminho aninhado incorreto —
  // quebrando o Dockerfile, que espera ./server.js na raiz do output.
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Listas de contato podem ter 50k+ linhas e vídeos de template vão até
      // 16MB — eleva o limite padrão de 1MB com folga pros dois casos.
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
