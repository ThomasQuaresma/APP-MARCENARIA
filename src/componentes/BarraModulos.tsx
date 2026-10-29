import { useState } from 'react';
import { catalogo } from '../catalogo';
import { confirmar } from './Confirmacao';
import { medidasTexto } from '../modulos';
import type { Material, Modulo, Unidade } from '../types';

interface Props {
  materiais: Material[];
  biblioteca: Modulo[];
  unidade: Unidade;
  /** Um toque no bloco já coloca o módulo (ou o conjunto) na parede. */
  aoEscolher: (modulos: Modulo[]) => void;
  aoRemoverModelo: (id: string) => void;
}

const MODELOS = 'modelos';

/** Blocos prontos embaixo do desenho, por ambiente: cozinha, quarto… */
export function BarraModulos({ materiais, biblioteca, unidade, aoEscolher, aoRemoverModelo }: Props) {
  const [aba, setAba] = useState(catalogo[0].id);
  const categoria = catalogo.find((c) => c.id === aba);

  return (
    <div className="barra-modulos">
      <nav className="categorias">
        {catalogo.map((c) => (
          <button key={c.id} type="button" className={c.id === aba ? 'ativo' : ''} onClick={() => setAba(c.id)}>
            {c.nome}
          </button>
        ))}
        {biblioteca.length > 0 && (
          <button type="button" className={aba === MODELOS ? 'ativo' : ''} onClick={() => setAba(MODELOS)}>
            Seus modelos
          </button>
        )}
      </nav>
      <div className="blocos">
        {categoria?.itens.map((item) => (
          <button key={item.id} type="button" className="bloco" onClick={() => aoEscolher(item.criar(materiais))}>
            <span aria-hidden>{item.icone}</span>
            {item.nome}
          </button>
        ))}
        {aba === MODELOS &&
          biblioteca.map((b) => (
            <div key={b.id} className="bloco modelo-bloco">
              <button type="button" onClick={() => aoEscolher([b])}>
                <strong>{b.nome}</strong>
                <small>{medidasTexto(b, unidade)}</small>
              </button>
              <button
                type="button"
                className="remover"
                aria-label={`Remover o modelo ${b.nome}`}
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: `Remover o modelo "${b.nome}"?`,
                    mensagem: 'Ele sai dos seus modelos salvos. Os orçamentos que já usam esse módulo não mudam.',
                    botao: 'Remover',
                    perigo: true,
                  });
                  if (ok) aoRemoverModelo(b.id);
                }}
              >
                ×
              </button>
            </div>
          ))}
      </div>
      {categoria?.id === 'equipamentos' && <p className="dica">Equipamentos aparecem no desenho e no 3D, mas não entram no custo.</p>}
    </div>
  );
}
