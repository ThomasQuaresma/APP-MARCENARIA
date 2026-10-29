import { useState } from 'react';
import { AbaAjustes } from './abas/AbaAjustes';
import { AbaChapas } from './abas/AbaChapas';
import { AbaOrcamento } from './abas/AbaOrcamento';
import { AbaProjeto } from './abas/AbaProjeto';
import { ListaOrcamentos } from './abas/ListaOrcamentos';
import { AvisoAtualizacao } from './componentes/AvisoAtualizacao';
import { Confirmacoes } from './componentes/Confirmacao';
import { useBiblioteca, useOrcamentos } from './estado';

// o plano de corte fica guardado (AbaCorte), mas fora do menu: o app é para orçar, não para cortar
type Aba = 'projeto' | 'chapas' | 'orcamento' | 'ajustes';

const abas: { id: Aba; texto: string; icone: string }[] = [
  { id: 'projeto', texto: 'Projeto', icone: '📐' },
  { id: 'chapas', texto: 'Chapas', icone: '🪵' },
  { id: 'orcamento', texto: 'Orçamento', icone: '💰' },
  { id: 'ajustes', texto: 'Ajustes', icone: '⚙️' },
];

export default function App() {
  const { orcamentos, geral, projeto, semEspaco, atualizar, abrir, novo, duplicar, excluir } = useOrcamentos();
  const [biblioteca, setBiblioteca] = useBiblioteca();
  const [aba, setAba] = useState<Aba>('projeto');
  // todo orçamento abre no desenho
  const entrar = (acao: () => void) => {
    setAba('projeto');
    acao();
  };

  const aviso = semEspaco && (
    <p className="alerta">O aparelho está sem espaço para guardar. Exclua orçamentos antigos para não perder o que está fazendo.</p>
  );

  if (!projeto) {
    return (
      <div className="app">
        <header className="topo">
          <h1>App Marcenaria</h1>
        </header>
        <AvisoAtualizacao />
        <main>
          {aviso}
          <ListaOrcamentos
            orcamentos={orcamentos}
            geral={geral}
            aoAbrir={(id) => entrar(() => abrir(id))}
            aoCriar={() => entrar(novo)}
          />
        </main>
        <Confirmacoes />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topo">
        <button className="voltar" onClick={() => abrir(null)}>
          ← Orçamentos
        </button>
        <span>
          Nº {projeto.codigo}
          {projeto.cliente && ` · ${projeto.cliente}`}
        </span>
      </header>
      <AvisoAtualizacao />
      <main key={projeto.id}>
        {aviso}
        {aba === 'projeto' && (
          <AbaProjeto projeto={projeto} atualizar={atualizar} biblioteca={biblioteca} setBiblioteca={setBiblioteca} />
        )}
        {aba === 'chapas' && <AbaChapas projeto={projeto} atualizar={atualizar} />}
        {aba === 'orcamento' && (
          <AbaOrcamento
            projeto={projeto}
            atualizar={atualizar}
            aoDuplicar={() => entrar(() => duplicar(projeto.id))}
            aoExcluir={() => excluir(projeto.id)}
          />
        )}
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
      <Confirmacoes />
    </div>
  );
}
