import { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import type { Projeto } from '../types';

// o 3D é pesado: só baixa quando o marceneiro pede para ver
const Movel3D = lazy(() => import('./Movel3D'));

interface Props {
  projeto: Projeto;
  aoFechar: () => void;
}

/** O ambiente inteiro em 3D, direto do desenho, sem passar pelo orçamento. */
export function Ver3D({ projeto, aoFechar }: Props) {
  return createPortal(
    <div className="documento-fundo">
      <div className="documento-barra">
        <button className="btn" onClick={aoFechar}>
          ← Voltar ao desenho
        </button>
      </div>
      <article className="documento">
        <Suspense fallback={<p className="dica">Carregando o 3D…</p>}>
          <Movel3D projeto={projeto} reserva={<p className="vazio">Este aparelho não consegue mostrar o 3D.</p>} />
        </Suspense>
      </article>
    </div>,
    document.body,
  );
}
