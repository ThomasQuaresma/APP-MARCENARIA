import { useState } from 'react';
import { novaAbertura } from '../estado';
import type { Abertura, Parede, TipoAbertura, Unidade } from '../types';
import { CampoNumero, Linha, Opcoes } from './campos';
import { Modal } from './Modal';

const tipos: { valor: TipoAbertura; texto: string }[] = [
  { valor: 'porta', texto: 'Porta' },
  { valor: 'janela', texto: 'Janela' },
  { valor: 'passagem', texto: 'Passagem' },
];

interface Props {
  parede: Parede;
  /** A nova entra no meio da parede e já vem selecionada no desenho. */
  aoAdicionar: (a: Abertura) => void;
}

/** Portas, janelas e passagens da parede: os módulos desviam delas e o app avisa se algum tapar. */
export function Aberturas({ parede, aoAdicionar }: Props) {
  return (
    <div className="aberturas">
      <strong>Portas e janelas desta parede</strong>
      <div className="acoes-planta">
        {tipos.map((t) => (
          <button key={t.valor} type="button" className="btn" onClick={() => aoAdicionar(novaAbertura(t.valor, parede))}>
            + {t.texto}
          </button>
        ))}
      </div>
      {parede.aberturas.length > 0 && (
        <p className="dica">Toque na porta ou janela no desenho para arrastar, mudar o tamanho pelos cantos, editar ou excluir.</p>
      )}
    </div>
  );
}

interface EditorProps {
  inicial: Abertura;
  unidade: Unidade;
  aoFechar: () => void;
  aoSalvar: (a: Abertura) => void;
  aoExcluir: (id: string) => void;
}

/** As medidas da porta ou janela digitadas, para quando arrastar não basta. */
export function EditorAbertura({ inicial, unidade: u, aoFechar, aoSalvar, aoExcluir }: EditorProps) {
  const [a, setA] = useState(inicial);
  const mudar = (parcial: Partial<Abertura>) => setA((x) => ({ ...x, ...parcial }));
  return (
    <Modal
      titulo={tipos.find((t) => t.valor === a.tipo)?.texto ?? 'Porta ou janela'}
      aoFechar={aoFechar}
      // porta e passagem ficam no chão
      aoSalvar={() => aoSalvar(a.tipo === 'janela' ? a : { ...a, y: 0 })}
      aoExcluir={() => aoExcluir(a.id)}
    >
      <Opcoes<TipoAbertura> rotulo="Tipo" valor={a.tipo} opcoes={tipos} aoMudar={(tipo) => mudar({ tipo })} />
      <Linha>
        <CampoNumero rotulo="Do canto esquerdo" valor={a.x} unidade={u} aoMudar={(x) => mudar({ x })} />
        <CampoNumero rotulo="Largura" valor={a.largura} unidade={u} aoMudar={(largura) => mudar({ largura })} />
      </Linha>
      <Linha>
        <CampoNumero rotulo="Altura" valor={a.altura} unidade={u} aoMudar={(altura) => mudar({ altura })} />
        {a.tipo === 'janela' && <CampoNumero rotulo="Do chão (peitoril)" valor={a.y} unidade={u} aoMudar={(y) => mudar({ y })} />}
      </Linha>
    </Modal>
  );
}
