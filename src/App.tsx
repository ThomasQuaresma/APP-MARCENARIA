import { useState } from 'react';
import { AbaAjustes } from './abas/AbaAjustes';
import { AbaChapas } from './abas/AbaChapas';
import { AbaOrcamento } from './abas/AbaOrcamento';
import { AbaProjeto } from './abas/AbaProjeto';
import { AvisoAtualizacao } from './componentes/AvisoAtualizacao';
import { useBiblioteca, useProjeto } from './estado';
import type { Projeto } from './types';

// o plano de corte fica guardado (AbaCorte), mas fora do menu: o app é para orçar, não para cortar
type Aba = 'projeto' | 'chapas' | 'orcamento' | 'ajustes';

const abas: { id: Aba; texto: string; icone: string }[] = [
  { id: 'projeto', texto: 'Projeto', icone: '📐' },
  { id: 'chapas', texto: 'Chapas', icone: '🪵' },
  { id: 'orcamento', texto: 'Orçamento', icone: '💰' },
  { id: 'ajustes', texto: 'Ajustes', icone: '⚙️' },
];

export default function App() {
  const [projeto, setProjeto] = useProjeto();
  const [biblioteca, setBiblioteca] = useBiblioteca();
  const [aba, setAba] = useState<Aba>('projeto');
  const atualizar = (parcial: Partial<Projeto>) => setProjeto((p) => ({ ...p, ...parcial }));

  return (
    <div className="app">
      <header className="topo">
        <h1>App Marcenaria</h1>
        {projeto.cliente && <span>{projeto.cliente}</span>}
      </header>
      <AvisoAtualizacao />
      <main>
        {aba === 'projeto' && (
          <AbaProjeto projeto={projeto} atualizar={atualizar} biblioteca={biblioteca} setBiblioteca={setBiblioteca} />
        )}
        {aba === 'chapas' && <AbaChapas projeto={projeto} atualizar={atualizar} />}
        {aba === 'orcamento' && <AbaOrcamento projeto={projeto} atualizar={atualizar} />}
        {aba === 'ajustes' && <AbaAjustes projeto={projeto} atualizar={atualizar} />}
      </main>
      <nav className="abas">
        {abas.map((a) => (
          <button key={a.id} className={a.id === aba ? 'ativo' : ''} onClick={() => setAba(a.id)}>
            <span aria-hidden>{a.icone}</span>
            {a.texto}
          </button>
        ))}
      </nav>
    </div>
  );
}
