import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Cada publicação ganha uma versão. O app compara a sua com a de versao.json
 * para avisar que há atualização, e o sw.js muda junto, para o navegador trocar o cache.
 */
function versaoPwa(): Plugin {
  const versao = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  return {
    name: 'versao-pwa',
    config: () => ({ define: { __VERSAO__: JSON.stringify(versao) } }),
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao }) });
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync('sw-modelo.js', 'utf8').replace('__VERSAO__', versao) });
    },
  };
}

export default defineConfig({
  // caminhos relativos: funciona no GitHub Pages (usuario.github.io/repositorio/) e em qualquer outro endereço
  base: './',
  plugins: [react(), versaoPwa()],
});
