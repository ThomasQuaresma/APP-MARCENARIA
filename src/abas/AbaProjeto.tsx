import { useState, type Dispatch, type SetStateAction } from 'react';
import { BarraModulos } from '../componentes/BarraModulos';
import { CampoNumero, CampoTexto, Linha, Opcoes } from '../componentes/campos';
import { DesenhoMovel, type Mudanca } from '../componentes/DesenhoMovel';
import { EditorModulo } from '../componentes/editores';
import { novaParede, novoId, removerDaLista, salvarNaLista } from '../estado';
import { posicaoLivre, retanguloNaTela, sobrepoe, zonasDeCanto } from '../modulos';
import type { Ambiente, Modulo, Parede, Piso, Projeto } from '../types';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
  biblioteca: Modulo[];
  setBiblioteca: Dispatch<SetStateAction<Modulo[]>>;
}

const formatos = [
  { valor: 1, texto: 'Reto' },
  { valor: 2, texto: 'Em L' },
  { valor: 3, texto: 'Em U' },
];

export function AbaProjeto({ projeto, atualizar, biblioteca, setBiblioteca }: Props) {
  const { modulos, materiais, ajustes, paredes, ambiente } = projeto;
  const u = ajustes.unidade;
  const [paredeId, setParedeId] = useState(paredes[0].id);
  const [edicao, setEdicao] = useState<Modulo | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  if (materiais.length === 0) {
    return <p className="vazio">Cadastre pelo menos uma chapa na aba Chapas para começar.</p>;
  }

  const parede = paredes.find((p) => p.id === paredeId) ?? paredes[0];
  const daParede = modulos.filter((m) => m.paredeId === parede.id);
  const zonas = zonasDeCanto(projeto, parede.id);
  const mudarParede = (parcial: Partial<Parede>) =>
    atualizar({ paredes: paredes.map((p) => (p.id === parede.id ? { ...p, ...parcial } : p)) });
  const mudarAmbiente = (parcial: Partial<Ambiente>) => atualizar({ ambiente: { ...ambiente, ...parcial } });

  function mudarFormato(qtd: number) {
    if (qtd === paredes.length) return;
    if (qtd > paredes.length) {
      const novas = Array.from({ length: qtd - paredes.length }, (_, i) => novaParede(paredes.length + i + 1));
      atualizar({ paredes: [...paredes, ...novas] });
      return;
    }
    const removidas = paredes.slice(qtd).map((p) => p.id);
    const perdidos = modulos.filter((m) => removidas.includes(m.paredeId)).length;
    if (perdidos > 0 && !confirm(`Os ${perdidos} módulo(s) das paredes removidas serão apagados. Continuar?`)) return;
    atualizar({ paredes: paredes.slice(0, qtd), modulos: modulos.filter((m) => !removidas.includes(m.paredeId)) });
    if (removidas.includes(paredeId)) setParedeId(paredes[0].id);
  }

  const mudar = (id: string, mudanca: Mudanca) =>
    atualizar({ modulos: modulos.map((m) => (m.id === id ? { ...m, ...mudanca } : m)) });

  /** A cópia entra logo à direita do original, com a mesma altura do chão. */
  function duplicar(m: Modulo) {
    const r = retanguloNaTela(m, materiais);
    const copia = { ...m, id: novoId(), x: r.x + r.w };
    atualizar({ modulos: [...modulos, copia] });
    return copia.id;
  }

  // meio milímetro de tolerância para arredondamentos
  const foraDaParede = daParede.filter((m) => {
    const r = retanguloNaTela(m, materiais);
    return r.x < -0.5 || r.y < -0.5 || r.x + r.w > parede.largura + 0.5 || r.y + r.h > parede.altura + 0.5;
  });

  // equipamentos e painéis podem ficar sobre os móveis (TV no painel, cuba na bancada), e o envelope veste os módulos
  const solidos = daParede.filter(
    (m) => m.tipo !== 'objeto' && m.tipo !== 'envelope' && !(m.tipo === 'livre' && m.orientacao === 'frente'),
  );
  const sobrepostos: string[] = [];
  solidos.forEach((a, i) =>
    solidos.slice(i + 1).forEach((b) => {
      if (sobrepoe(retanguloNaTela(a, materiais), retanguloNaTela(b, materiais))) sobrepostos.push(`${a.nome} e ${b.nome}`);
    }),
  );
  const noCanto = solidos.filter((m) => zonas.some((z) => sobrepoe(retanguloNaTela(m, materiais), z))).map((m) => m.nome);

  /**
   * Um toque no bloco já põe o módulo na parede, sem abrir a edição: ele entra no primeiro lugar livre
   * na altura dele (o aéreo vai em cima do balcão) e fica selecionado. Editar é depois, tocando nele.
   */
  function inserir(escolhidos: Modulo[]) {
    const rets = escolhidos.map((m) => retanguloNaTela(m, materiais));
    const minX = Math.min(...rets.map((r) => r.x));
    const minY = Math.min(...rets.map((r) => r.y));
    const bloco = {
      x: 0,
      y: minY,
      w: Math.max(...rets.map((r) => r.x + r.w)) - minX,
      h: Math.max(...rets.map((r) => r.y + r.h)) - minY,
    };
    // equipamento sozinho só desvia de outro equipamento: a TV pode ir no painel, a cuba na bancada
    const soEquipamento = escolhidos.every((m) => m.tipo === 'objeto');
    const obstaculos = (soEquipamento ? daParede.filter((m) => m.tipo === 'objeto') : solidos).map((m) => retanguloNaTela(m, materiais));
    const inicio = Math.max(0, ...zonas.filter((z) => z.x === 0).map((z) => z.w));
    const x = posicaoLivre(bloco, [...obstaculos, ...zonas], inicio);
    const novos = escolhidos.map((m) => ({ ...m, id: novoId(), paredeId: parede.id, x: x + m.x - minX }));
    atualizar({ modulos: [...modulos, ...novos] });
    setSelecionado(novos[0].id);
  }

  return (
    <>
      <section className="cartao">
        <CampoTexto rotulo="Cliente" valor={projeto.cliente} aoMudar={(cliente) => atualizar({ cliente })} dica="Nome do cliente" />
        <Opcoes<number> rotulo="Formato do ambiente" valor={paredes.length} opcoes={formatos} aoMudar={mudarFormato} />
        <Linha>
          <label className="campo">
            <span>Cor da parede</span>
            <div className="campo-caixa">
              <input type="color" value={ambiente.corParede} onChange={(e) => mudarAmbiente({ corParede: e.target.value })} />
            </div>
          </label>
          <label className="campo">
            <span>Piso</span>
            <div className="campo-caixa">
              <select value={ambiente.piso} onChange={(e) => mudarAmbiente({ piso: e.target.value as Piso })}>
                <option value="porcelanato">Porcelanato claro</option>
                <option value="madeira">Madeira</option>
                <option value="cimento">Cimento queimado</option>
              </select>
            </div>
          </label>
        </Linha>
      </section>

      <section className="cartao">
        {paredes.length > 1 && (
          <>
            <div className="opcoes">
              {paredes.map((p) => (
                <button key={p.id} type="button" className={p.id === parede.id ? 'ativo' : ''} onClick={() => setParedeId(p.id)}>
                  {p.nome}
                </button>
              ))}
            </div>
            <p className="dica">
              As paredes seguem em sequência: o canto direito de uma encontra o canto esquerdo da próxima. Olhe cada parede de frente.
            </p>
          </>
        )}
        <Linha>
          <CampoNumero rotulo="Largura da parede" valor={parede.largura} unidade={u} aoMudar={(largura) => mudarParede({ largura })} />
          <CampoNumero rotulo="Altura da parede" valor={parede.altura} unidade={u} aoMudar={(altura) => mudarParede({ altura })} />
        </Linha>
        <DesenhoMovel
          modulos={daParede}
          materiais={materiais}
          parede={parede}
          zonas={zonas}
          unidade={u}
          aoMudar={mudar}
          aoTocar={setEdicao}
          aoDuplicar={duplicar}
          selecionado={selecionado}
          aoSelecionar={setSelecionado}
        />
        <BarraModulos
          materiais={materiais}
          biblioteca={biblioteca}
          unidade={u}
          aoEscolher={inserir}
          aoRemoverModelo={(id) => setBiblioteca((l) => removerDaLista(l, id))}
        />
        {zonas.length > 0 && <p className="dica">A área hachurada é ocupada pelos móveis da parede vizinha, que entram no canto.</p>}
        {foraDaParede.length > 0 && (
          <p className="alerta">Passa da parede: {foraDaParede.map((m) => m.nome).join(', ')}. Confira as medidas ou a posição.</p>
        )}
        {noCanto.length > 0 && <p className="alerta">Bate no móvel da parede vizinha: {noCanto.join(', ')}.</p>}
        {sobrepostos.length > 0 && (
          <p className="alerta">
            Um módulo em cima do outro: {sobrepostos.join('; ')}. Para prateleira dentro do armário, use "Por dentro" na edição do módulo.
          </p>
        )}
        <p className="dica">
          {daParede.length === 0
            ? 'Toque num bloco para colocar o módulo na parede. As peças e o custo são calculados sozinhos.'
            : 'Arraste para mudar de lugar; puxe as bolinhas dos cantos para mudar o tamanho. Toque no módulo selecionado para editar.'}
        </p>
      </section>

      {edicao && (
        <EditorModulo
          inicial={edicao}
          novo={false}
          materiais={materiais}
          ajustes={ajustes}
          aoFechar={() => setEdicao(null)}
          aoSalvar={(m) => {
            atualizar({ modulos: salvarNaLista(modulos, m) });
            setEdicao(null);
          }}
          aoExcluir={(id) => {
            atualizar({ modulos: removerDaLista(modulos, id) });
            setEdicao(null);
          }}
          aoSalvarModelo={(m) => setBiblioteca((l) => [...l, { ...m, id: novoId(), x: 0, y: 0 }])}
        />
      )}
    </>
  );
}
