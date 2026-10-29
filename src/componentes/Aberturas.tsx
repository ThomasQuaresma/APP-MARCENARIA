import { novaAbertura } from '../estado';
import type { Abertura, Parede, TipoAbertura, Unidade } from '../types';
import { CampoNumero, Linha } from './campos';

interface Props {
  parede: Parede;
  unidade: Unidade;
  aoMudar: (aberturas: Abertura[]) => void;
}

const tipos: { tipo: TipoAbertura; nome: string }[] = [
  { tipo: 'porta', nome: 'Porta' },
  { tipo: 'janela', nome: 'Janela' },
  { tipo: 'passagem', nome: 'Passagem' },
];

/** Portas, janelas e passagens da parede: os módulos desviam delas e o app avisa se algum tapar. */
export function Aberturas({ parede, unidade: u, aoMudar }: Props) {
  const lista = parede.aberturas;
  const mudar = (id: string, parcial: Partial<Abertura>) => aoMudar(lista.map((a) => (a.id === id ? { ...a, ...parcial } : a)));

  return (
    <div className="aberturas">
      <strong>Portas e janelas desta parede</strong>
      {lista.map((a) => (
        <div key={a.id} className="vao-item">
          <div className="vao-topo">
            <strong>{tipos.find((t) => t.tipo === a.tipo)?.nome}</strong>
            <button
              type="button"
              className="remover"
              aria-label="Remover"
              onClick={() => aoMudar(lista.filter((x) => x.id !== a.id))}
            >
              ×
            </button>
          </div>
          <Linha>
            <CampoNumero rotulo="Do canto esquerdo" valor={a.x} unidade={u} aoMudar={(x) => mudar(a.id, { x })} />
            <CampoNumero rotulo="Largura" valor={a.largura} unidade={u} aoMudar={(largura) => mudar(a.id, { largura })} />
          </Linha>
          <Linha>
            <CampoNumero rotulo="Altura" valor={a.altura} unidade={u} aoMudar={(altura) => mudar(a.id, { altura })} />
            {a.tipo === 'janela' && <CampoNumero rotulo="Do chão (peitoril)" valor={a.y} unidade={u} aoMudar={(y) => mudar(a.id, { y })} />}
          </Linha>
        </div>
      ))}
      <div className="acoes-planta">
        {tipos.map((t) => (
          <button key={t.tipo} type="button" className="btn" onClick={() => aoMudar([...lista, novaAbertura(t.tipo, parede)])}>
            + {t.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
