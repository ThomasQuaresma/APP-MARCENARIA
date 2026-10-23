import { useState } from 'react';
import { medidasTv } from '../catalogo';
import { pecasDoModulo } from '../modulos';
import type { Ajustes, Frente, Material, Modulo, Orientacao, TipoModulo } from '../types';
import { fmtDim } from '../unidades';
import { CampoMaterial, CampoNumero, CampoTexto, Linha, Opcoes } from './campos';
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
};

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

      {m.tipo === 'caixa' && (
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
          <CampoNumero rotulo="Prateleiras" valor={m.prateleiras} inteiro aoMudar={(prateleiras) => mudar({ prateleiras })} />
          <Opcoes<Frente>
            rotulo="Frente"
            valor={m.frente}
            opcoes={[
              { valor: 'nenhuma', texto: 'Nenhuma' },
              { valor: 'portas', texto: 'Portas' },
              { valor: 'gavetas', texto: 'Gavetas' },
            ]}
            aoMudar={(frente) => mudar({ frente })}
          />
          {m.frente !== 'nenhuma' && (
            <>
              <CampoNumero
                rotulo={m.frente === 'portas' ? 'Quantas portas' : 'Quantas gavetas'}
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

      {m.tipo === 'caixa' && m.frente === 'portas' && m.prateleiras > 0 && (
        <p className="dica">As prateleiras ficam dentro do módulo, atrás das portas (tracejadas no desenho).</p>
      )}
      {m.tipo === 'prateleira' && <p className="dica">Prateleira fixada direto na parede, fora dos armários.</p>}

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
