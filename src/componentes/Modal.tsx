import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  aoFechar: () => void;
  aoSalvar: () => void;
  aoExcluir?: () => void;
  children: ReactNode;
}

export function Modal({ titulo, aoFechar, aoSalvar, aoExcluir, children }: Props) {
  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{titulo}</h2>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-corpo">{children}</div>
        <footer>
          {aoExcluir && (
            <button
              className="btn btn-perigo"
              onClick={() => {
                if (confirm('Excluir este item?')) aoExcluir();
              }}
            >
              Excluir
            </button>
          )}
          <button className="btn btn-principal" onClick={aoSalvar}>
            Salvar
          </button>
        </footer>
      </div>
    </div>
  );
}
