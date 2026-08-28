import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Docker içinde API'ye hizmet adı üzerinden (http://api:4000), native
// geliştirmede localhost üzerinden proxy yapılır
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': apiProxyTarget,
    },
    // Docker Desktop (VirtioFS) bazen dosya olaylarını iletmez; polling
    // modu güvenilir ama CPU tüketir — yalnız USE_POLLING=1 ile açılır
    watch: process.env.USE_POLLING === '1' ? { usePolling: true } : undefined,
  },
});
