import { useState } from 'react';
import { catalogo } from '../catalogo';
import { medidasTexto } from '../modulos';
import type { Material, Modulo, Unidade } from '../types';

interface Props {
  materiais: Material[];
  biblioteca: Modulo[];
  unidade: Unidade;
  aoEscolher: (modulos: Modulo[]) => void;
  aoRemoverModelo: (id: string) => void;
  aoFechar: () => void;
}

const MODELOS = 'modelos';

export function Catalogo({ materiais, biblioteca, unidade, aoEscolher, aoRemoverModelo, aoFechar }: Props) {
  const [aba, setAba] = useState(biblioteca.length > 0 ? MODELOS : catalogo[0].id);
  const categoria = catalogo.find((c) => c.id === aba);

  return (
    <div className="modal-fundo" onClick={aoFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>Adicionar</h2>
          <button className="fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </header>
        <nav className="categorias">
          {biblioteca.length > 0 && (
            <button className={aba === MODELOS ? 'ativo' : ''} onClick={() => setAba(MODELOS)}>
              Seus modelos
            </button>
          )}
          {catalogo.map((c) => (
            <button key={c.id} className={c.id === aba ? 'ativo' : ''} onClick={() => setAba(c.id)}>
              {c.nome}
            </button>
          ))}
        </nav>
        <div className="modal-corpo">
          {categoria && (
            <div className="grade-catalogo">
              {categoria.itens.map((item) => (
                <button key={item.id} className="molde" onClick={() => aoEscolher(item.criar(materiais))}>
                  <span aria-hidden>{item.icone}</span>
                  {item.nome}
                </button>
              ))}
            </div>
          )}
          {categoria?.id === 'equipamentos' && (
            <p className="dica">Equipamentos aparecem no desenho e no 3D, mas não entram no corte nem no custo.</p>
          )}
          {aba === MODELOS && (
            <div className="modelos">
              {biblioteca.map((b) => (
                <div key={b.id} className="modelo">
                  <button onClick={() => aoEscolher([b])}>
                    <strong>{b.nome}</strong>
                    <small>{medidasTexto(b, unidade)}</small>
                  </button>
                  <button
                    className="remover"
                    aria-label={`Remover o modelo ${b.nome}`}
                    onClick={() => {
                      if (confirm(`Remover o modelo "${b.nome}"?`)) aoRemoverModelo(b.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
