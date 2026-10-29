import { useState } from 'react';
import { medidasTv } from '../catalogo';
import { vaoSimples } from '../estado';
import { ferragensDoModulo, ladosDe, pecasDoModulo, vaosNaCaixa } from '../modulos';
import type { Ajustes, Frente, Material, Modulo, Orientacao, TipoModulo, Unidade, Vao } from '../types';
import { fmtDim, fmtMedida, fmtNum, fmtReais } from '../unidades';
import { CampoMaterial, CampoNumero, CampoTexto, Linha, Opcoes } from './campos';
import { PreviaModulo } from './DesenhoMovel';
import { Modal } from './Modal';

interface EditorProps<T> {
  inicial: T;
  novo: boolean;
  aoSalvar: (item: T) => void;
  aoExcluir: (id: string) => void;
  aoFechar: () => void;
}

const titulos: Record<TipoModulo, [novo: string, editar: string]> = {
  caixa: ['Novo módulo', 'Editar módulo'],
  prateleira: ['Nova prateleira', 'Editar prateleira'],
  livre: ['Nova peça livre', 'Editar peça livre'],
  objeto: ['Novo equipamento', 'Editar equipamento'],
  base: ['Nova base', 'Editar base'],
  envelope: ['Novo envelope', 'Editar envelope'],
};

interface PorDentroProps {
  m: Modulo;
  materiais: Material[];
  unidade: Unidade;
  mudar: (parcial: Partial<Modulo>) => void;
}

/** Divisórias, prateleiras e cabideiro de cada vão, com o desenho da caixa aberta. */
function PorDentro({ m, materiais, unidade: u, mudar }: PorDentroProps) {
  const vaos = vaosNaCaixa(m, materiais);
  const mudarVao = (i: number, parcial: Partial<Vao>) => mudar({ vaos: m.vaos.map((v, j) => (j === i ? { ...v, ...parcial } : v)) });
  const mudarDivisorias = (d: number) => {
    const qtd = Math.min(d, 9) + 1;
    const atuais = m.vaos.length ? m.vaos : [vaoSimples()];
    const novos = qtd > atuais.length ? [...atuais, ...Array.from({ length: qtd - atuais.length }, () => vaoSimples())] : atuais.slice(0, qtd);
    // o último vão sempre fica com o que sobrar da largura
    mudar({ vaos: novos.map((v, i) => (i === novos.length - 1 ? { ...v, largura: null } : v)) });
  };
  const apertado = vaos.some((v) => v.auto && v.w < 50);

  return (
    <>
      <h3 className="subtitulo">Por dentro</h3>
      <PreviaModulo m={m} materiais={materiais} />
      <CampoNumero rotulo="Divisórias (em pé)" valor={Math.max(0, vaos.length - 1)} inteiro aoMudar={mudarDivisorias} />
      {vaos.map((v, i) => {
        const ultimo = i === vaos.length - 1;
        return (
          <div key={i} className="vao-item">
            <strong>
              {vaos.length > 1 ? `Vão ${i + 1}` : 'Vão'} · {fmtMedida(v.w, u)} {u} livres
            </strong>
            <Linha>
              <CampoNumero rotulo="Prateleiras" valor={v.vao.prateleiras} inteiro aoMudar={(prateleiras) => mudarVao(i, { prateleiras })} />
              <Opcoes<'sim' | 'nao'>
                rotulo="Cabideiro"
                valor={v.vao.cabideiro ? 'sim' : 'nao'}
                opcoes={[
                  { valor: 'nao', texto: 'Não' },
                  { valor: 'sim', texto: 'Sim' },
                ]}
                aoMudar={(c) => mudarVao(i, { cabideiro: c === 'sim' })}
              />
            </Linha>
            {vaos.length > 1 && !ultimo && (
              <Linha>
                <Opcoes<'auto' | 'fixa'>
                  rotulo="Largura"
                  valor={v.vao.largura === null ? 'auto' : 'fixa'}
                  opcoes={[
                    { valor: 'auto', texto: 'Dividir igual' },
                    { valor: 'fixa', texto: 'Medida' },
                  ]}
                  aoMudar={(t) => mudarVao(i, { largura: t === 'auto' ? null : Math.round(v.w) })}
                />
                {v.vao.largura !== null && (
                  <CampoNumero rotulo="Vão livre" valor={v.vao.largura} unidade={u} aoMudar={(largura) => mudarVao(i, { largura })} />
                )}
              </Linha>
            )}
            {vaos.length > 1 && ultimo && <p className="dica">Este vão fica com o que sobrar da largura.</p>}
          </div>
        );
      })}
      {apertado && <p className="alerta">As medidas dos vãos passam da largura da caixa. Diminua alguma delas.</p>}
      {(m.frente === 'portas' || m.frente === 'correr' || m.frente === 'basculante') && (
        <p className="dica">No desenho, selecione o módulo e toque em "Abrir portas" para ver por dentro.</p>
      )}
    </>
  );
}

export function EditorModulo({
  inicial,
  novo,
  aoSalvar,
  aoExcluir,
  aoFechar,
  aoSalvarModelo,
  materiais,
  ajustes,
}: EditorProps<Modulo> & { materiais: Material[]; ajustes: Ajustes; aoSalvarModelo: (m: Modulo) => void }) {
  const [m, setM] = useState(inicial);
  const [modeloSalvo, setModeloSalvo] = useState(false);
  const mudar = (parcial: Partial<Modulo>) => {
    setM({ ...m, ...parcial });
    setModeloSalvo(false);
  };
  const u = ajustes.unidade;
  const pecas = pecasDoModulo(m, materiais, ajustes);
  const ferragens = ferragensDoModulo(m, ajustes);
  const medida = (rotulo: string, campo: 'largura' | 'altura' | 'profundidade') => (
    <CampoNumero key={campo} rotulo={rotulo} valor={m[campo]} unidade={u} aoMudar={(v) => mudar({ [campo]: v })} />
  );

  return (
    <Modal
      titulo={titulos[m.tipo][novo ? 0 : 1]}
      aoFechar={aoFechar}
      aoSalvar={() => aoSalvar(m)}
      aoExcluir={novo ? undefined : () => aoExcluir(m.id)}
    >
      <CampoTexto rotulo="Nome" valor={m.nome} aoMudar={(nome) => mudar({ nome })} dica="Ex: Aéreo pia" />

      {(m.tipo === 'caixa' || m.tipo === 'base' || m.tipo === 'envelope') && (
        <Linha>
          {medida('Largura', 'largura')}
          {medida('Altura', 'altura')}
          {medida('Profund.', 'profundidade')}
        </Linha>
      )}
      {m.tipo === 'prateleira' && (
        <Linha>
          {medida('Largura', 'largura')}
          {medida('Profund.', 'profundidade')}
        </Linha>
      )}
      {m.tipo === 'livre' && (
        <>
          <Opcoes<Orientacao>
            rotulo="Posição no móvel"
            valor={m.orientacao}
            opcoes={[
              { valor: 'frente', texto: 'De frente' },
              { valor: 'deitada', texto: 'Deitada' },
              { valor: 'lateral', texto: 'De lado' },
            ]}
            aoMudar={(orientacao) => mudar({ orientacao })}
          />
          <p className="dica">De frente: painel ou tamponamento. Deitada: tampo ou base. De lado: lateral ou divisória.</p>
          <Linha>
            {m.orientacao !== 'lateral' && medida('Largura', 'largura')}
            {m.orientacao !== 'deitada' && medida('Altura', 'altura')}
            {m.orientacao !== 'frente' && medida('Profund.', 'profundidade')}
          </Linha>
        </>
      )}

      {m.tipo === 'objeto' && (
        <>
          {m.objeto === 'tv' && (
            <CampoNumero
              rotulo="Tamanho da TV"
              valor={Math.round((m.largura - 30) / 0.8716 / 25.4)}
              sufixo="pol."
              inteiro
              aoMudar={(polegadas) => polegadas > 0 && mudar(medidasTv(polegadas))}
            />
          )}
          <Linha>
            {medida('Largura', 'largura')}
            {medida(m.objeto === 'bancada' ? 'Espessura' : m.objeto === 'cuba' ? 'Torneira' : 'Altura', 'altura')}
            {medida('Profund.', 'profundidade')}
          </Linha>
          <p className="dica">Equipamento: aparece no desenho e no 3D, mas não entra no corte nem no custo.</p>
        </>
      )}

      {m.tipo !== 'objeto' && (
        <CampoMaterial
          rotulo={m.tipo === 'caixa' ? 'Chapa da caixa' : 'Chapa'}
          valor={m.materialId}
          materiais={materiais}
          aoMudar={(id) => id && mudar({ materialId: id })}
        />
      )}

      {m.tipo === 'caixa' && (
        <>
          <CampoMaterial
            rotulo="Chapa do fundo"
            valor={m.materialFundoId}
            materiais={materiais}
            opcaoVazia="Sem fundo"
            aoMudar={(materialFundoId) => mudar({ materialFundoId })}
          />
          {/* são cinco tipos de frente: numa lista cabe melhor no celular do que em botões lado a lado */}
          <label className="campo">
            <span>Frente</span>
            <div className="campo-caixa">
              <select
                value={m.frente}
                onChange={(e) => {
                  const frente = e.target.value as Frente;
                  // porta de correr precisa de pelo menos duas folhas para abrir
                  const qtdFrente = frente === 'correr' ? Math.max(2, m.qtdFrente) : m.qtdFrente || (frente === 'basculante' ? 1 : 2);
                  mudar({ frente, qtdFrente });
                }}
              >
                <option value="nenhuma">Nenhuma (aberto)</option>
                <option value="portas">Portas de abrir</option>
                <option value="correr">Portas de correr</option>
                <option value="basculante">Basculante</option>
                <option value="gavetas">Gavetas</option>
              </select>
            </div>
          </label>
          {m.frente === 'basculante' && (
            <p className="dica">Porta que abre para cima. Cada uma soma 2 dobradiças, 2 pistões a gás e 1 puxador.</p>
          )}
          {m.frente === 'correr' && (
            <p className="dica">
              As folhas correm num trilho duplo na frente da caixa e passam uma por cima da outra. Cada folha soma o kit de Ajustes → "Ao
              colocar uma porta de correr, somar", e o trilho entra por metro.
            </p>
          )}
          {m.frente !== 'nenhuma' && (
            <>
              <CampoNumero
                rotulo={{ portas: 'Quantas portas', correr: 'Quantas folhas', basculante: 'Quantas portas (uma sobre a outra)', gavetas: 'Quantas gavetas' }[m.frente]}
                valor={m.qtdFrente}
                inteiro
                aoMudar={(qtdFrente) => mudar({ qtdFrente })}
              />
              <CampoMaterial
                rotulo="Chapa da frente"
                valor={m.materialFrenteId}
                materiais={materiais}
                aoMudar={(id) => id && mudar({ materialFrenteId: id })}
              />
            </>
          )}
        </>
      )}

      {m.tipo === 'caixa' && m.frente === 'gavetas' && m.qtdFrente > 0 && (
        <p className="dica">Cada gaveta soma o que está em Ajustes → "Ao colocar uma gaveta, somar" (corrediça, puxador, parafusos).</p>
      )}
      {m.tipo === 'caixa' && m.frente !== 'gavetas' && <PorDentro m={m} materiais={materiais} unidade={u} mudar={mudar} />}
      {m.tipo === 'prateleira' && <p className="dica">Prateleira fixada direto na parede, fora dos armários.</p>}
      {m.tipo === 'base' && <p className="dica">Quadro de rodapé: frente e trás inteiras, travessas entre elas. Coloque os módulos em cima.</p>}
      {m.tipo === 'envelope' && (
        <div className="campo">
          <span>Peças do tamponamento</span>
          <div className="opcoes">
            {(
              [
                ['esquerda', 'Lateral esq.'],
                ['direita', 'Lateral dir.'],
                ['tampo', 'Tampo'],
                ['fundo', 'Fundo'],
              ] as const
            ).map(([k, texto]) => (
              <button
                key={k}
                type="button"
                className={ladosDe(m)[k] ? 'ativo' : ''}
                onClick={() => mudar({ lados: { ...ladosDe(m), [k]: !ladosDe(m)[k] } })}
              >
                {texto}
              </button>
            ))}
          </div>
          <p className="dica">
            As laterais passam inteiras e o tampo fica entre elas. Só uma peça vira painel (fundo), cabeceira, lateral ou prateleira (tampo).
          </p>
        </div>
      )}

      {ferragens.length > 0 && (
        <>
          <h3 className="subtitulo">Ferragens</h3>
          <ul className="lista-simples">
            {ferragens.map((f, i) => (
              <li key={i}>
                <span>
                  {fmtNum(f.qtd)}× {f.nome}
                </span>
                <span>{fmtReais(f.qtd * f.preco)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {pecas.length > 0 && (
        <>
          <h3 className="subtitulo">Peças geradas</h3>
          <ul className="lista-simples">
            {pecas.map((p, i) => (
              <li key={i}>
                <span>
                  {p.qtd}× {p.nome}
                </span>
                <span>{fmtDim(p.comprimento, p.largura, u)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <button
        className="btn"
        disabled={modeloSalvo}
        onClick={() => {
          aoSalvarModelo(m);
          setModeloSalvo(true);
        }}
      >
        {modeloSalvo ? 'Salvo nos seus modelos ✓' : 'Salvar como modelo'}
      </button>
    </Modal>
  );
}

export function EditorMaterial({ inicial, novo, aoSalvar, aoExcluir, aoFechar, ajustes }: EditorProps<Material> & { ajustes: Ajustes }) {
  const [m, setM] = useState(inicial);
  const mudar = (parcial: Partial<Material>) => setM({ ...m, ...parcial });
  const u = ajustes.unidade;

  return (
    <Modal
      titulo={novo ? 'Nova chapa' : 'Editar chapa'}
      aoFechar={aoFechar}
      aoSalvar={() => aoSalvar(m)}
      aoExcluir={novo ? undefined : () => aoExcluir(m.id)}
    >
      <CampoTexto rotulo="Nome" valor={m.nome} aoMudar={(nome) => mudar({ nome })} dica="Ex: MDF Branco TX 18mm" />
      <Linha>
        <CampoNumero rotulo="Comprimento" valor={m.comprimento} unidade={u} aoMudar={(comprimento) => mudar({ comprimento })} />
        <CampoNumero rotulo="Largura" valor={m.largura} unidade={u} aoMudar={(largura) => mudar({ largura })} />
      </Linha>
      <Linha>
        <CampoNumero rotulo="Espessura" valor={m.espessura} sufixo="mm" aoMudar={(espessura) => mudar({ espessura })} />
        <CampoNumero rotulo="Preço da chapa" valor={m.preco} sufixo="R$" aoMudar={(preco) => mudar({ preco })} />
      </Linha>
      <Opcoes
        rotulo="Tem veio? (amadeirado)"
        valor={m.veio ? 'sim' : 'nao'}
        opcoes={[
          { valor: 'nao', texto: 'Não — pode girar peças' },
          { valor: 'sim', texto: 'Sim' },
        ]}
        aoMudar={(v) => mudar({ veio: v === 'sim' })}
      />
      <label className="campo">
        <span>Cor no desenho do móvel</span>
        <div className="campo-caixa">
          <input type="color" value={m.cor} onChange={(e) => mudar({ cor: e.target.value })} />
        </div>
      </label>
    </Modal>
  );
}
