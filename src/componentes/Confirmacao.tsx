import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/**
 * Confirmações e avisos do app, no lugar dos popups do navegador (alert, confirm, prompt), que são
 * proibidos aqui: todas as mensagens saem nesta mesma janela, com título, texto e botões padronizados.
 */
interface Pedido {
  titulo: string;
  mensagem?: string;
  /** Texto do botão que confirma: "Excluir", "Continuar", "Entendi"… */
  botao: string;
  /** null: aviso, só com o botão de confirmar. */
  cancelar: string | null;
  /** Ação que apaga alguma coisa: o botão fica vermelho. */
  perigo: boolean;
  responder: (ok: boolean) => void;
}

let atual: Pedido | null = null;
const ouvintes = new Set<() => void>();

function mostrar(pedido: Pedido | null) {
  atual = pedido;
  ouvintes.forEach((f) => f());
}

interface Opcoes {
  titulo: string;
  mensagem?: string;
  botao?: string;
  perigo?: boolean;
}

/** Pergunta antes de fazer; responde true no botão de confirmar e false em Cancelar ou fora da janela. */
export function confirmar({ titulo, mensagem, botao = 'Continuar', perigo = false }: Opcoes): Promise<boolean> {
  return new Promise((responder) => {
    // uma pergunta nova fecha a anterior como cancelada
    atual?.responder(false);
    mostrar({ titulo, mensagem, botao, cancelar: 'Cancelar', perigo, responder });
  });
}

/** Avisa e espera o "Entendi". */
export function avisar(titulo: string, mensagem?: string): Promise<void> {
  return new Promise((responder) => {
    atual?.responder(false);
    mostrar({ titulo, mensagem, botao: 'Entendi', cancelar: null, perigo: false, responder: () => responder() });
  });
}

const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

/** Fica uma vez na raiz do app e mostra a confirmação ou o aviso da vez. */
export function Confirmacoes() {
  const pedido = useSyncExternalStore(assinar, () => atual);
  if (!pedido) return null;
  const responder = (ok: boolean) => {
    mostrar(null);
    pedido.responder(ok);
  };
  return createPortal(
    <div className="modal-fundo confirmacao-fundo" onClick={() => responder(false)}>
      <div className="modal confirmacao" role="alertdialog" aria-labelledby="confirmacao-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-corpo">
          <h2 id="confirmacao-titulo">{pedido.titulo}</h2>
          {pedido.mensagem && <p className="dica">{pedido.mensagem}</p>}
        </div>
        <footer>
          {pedido.cancelar && (
            <button className="btn" onClick={() => responder(false)}>
              {pedido.cancelar}
            </button>
          )}
          <button className={`btn ${pedido.perigo ? 'btn-perigo-cheio' : 'btn-principal'}`} autoFocus onClick={() => responder(true)}>
            {pedido.botao}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
