import { useState, type Dispatch, type SetStateAction } from 'react';
import { Aberturas, EditorAbertura } from '../componentes/Aberturas';
import { confirmar } from '../componentes/Confirmacao';
import { BarraModulos } from '../componentes/BarraModulos';
import { CampoNumero, CampoTexto, Linha, Opcoes } from '../componentes/campos';
import { DesenhoMovel, type Mudanca } from '../componentes/DesenhoMovel';
import { EditorModulo } from '../componentes/editores';
import { anguloDoCanto, DesenharPlanta, giroDoAngulo, PlantaBaixa } from '../componentes/Planta';
import { Ver3D } from '../componentes/Ver3D';
import { novaParede, novoId, quatroParedes, removerDaLista, salvarNaLista } from '../estado';
import { espessuraDe, ladosPadrao, lateraisDosTamponamentos, moduloDoMolde, posicaoLivre, retangulosDasAberturas, retanguloNaTela, sobrepoe, zonasDeCanto } from '../modulos';
import { fecharPlanta, paredesDosPontos, type Ponto } from '../planta';
import { fmtMedida } from '../unidades';
import type { Abertura, Ambiente, Modulo, Parede, Piso, Projeto } from '../types';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
  biblioteca: Modulo[];
  setBiblioteca: Dispatch<SetStateAction<Modulo[]>>;
}

const modos = [
  { valor: 'simples' as const, texto: 'Simples' },
  { valor: 'avancada' as const, texto: 'Avançada (desenhar)' },
];

/** Parede nova com id único, para não confundir com uma que já foi apagada. */
const paredeNova = (numero: number) => ({ ...novaParede(numero), id: novoId() });

export function AbaProjeto({ projeto, atualizar, biblioteca, setBiblioteca }: Props) {
  const { modulos, materiais, ajustes, paredes, ambiente } = projeto;
  const u = ajustes.unidade;
  const [paredeId, setParedeId] = useState(paredes[0].id);
  const [edicao, setEdicao] = useState<Modulo | null>(null);
  const [edicaoAbertura, setEdicaoAbertura] = useState<Abertura | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [desenhando, setDesenhando] = useState(false);
  const [ver3d, setVer3d] = useState(false);
  const simples = projeto.planta === 'simples';

  if (materiais.length === 0) {
    return <p className="vazio">Cadastre pelo menos uma chapa na aba Chapas para começar.</p>;
  }

  const parede = paredes.find((p) => p.id === paredeId) ?? paredes[0];
  const daParede = modulos.filter((m) => m.paredeId === parede.id);
  const zonas = zonasDeCanto(projeto, parede.id);
  const mudarAmbiente = (parcial: Partial<Ambiente>) => atualizar({ ambiente: { ...ambiente, ...parcial } });

  /**
   * Troca as paredes do ambiente. Os módulos das paredes que saem são apagados (pergunta antes);
   * no ambiente fechado, a última parede é recalculada para encontrar a primeira.
   */
  async function trocarParedes(novas: Parede[], fechado: boolean, parcial: Partial<Projeto> = {}) {
    const ficam = novas.map((p) => p.id);
    const perdidos = modulos.filter((m) => !ficam.includes(m.paredeId)).length;
    if (
      perdidos > 0 &&
      !(await confirmar({
        titulo: 'Apagar os módulos dessas paredes?',
        mensagem: `${perdidos === 1 ? '1 módulo está' : `${perdidos} módulos estão`} nas paredes que saem e ${perdidos === 1 ? 'será apagado' : 'serão apagados'}.`,
        botao: 'Apagar e continuar',
        perigo: true,
      }))
    )
      return;
    atualizar({
      ...parcial,
      fechado,
      paredes: fechado ? fecharPlanta(novas) : novas,
      modulos: modulos.filter((m) => ficam.includes(m.paredeId)),
    });
    if (!ficam.includes(paredeId)) setParedeId(novas[0].id);
  }

  function mudarParede(parcial: Partial<Parede>, id = parede.id) {
    const i = paredes.findIndex((p) => p.id === id);
    let novas = paredes.map((p) => (p.id === id ? { ...p, ...parcial } : p));
    // no fechado simples, as paredes de frente uma para a outra têm a mesma medida
    const largura = parcial.largura;
    if (simples && projeto.fechado && largura !== undefined && novas.length === 4) {
      novas = novas.map((p, j) => (j === (i + 2) % 4 ? { ...p, largura } : p));
    }
    atualizar({ paredes: projeto.fechado ? fecharPlanta(novas) : novas });
  }

  /** O simples é sempre o ambiente fechado de 4 paredes em retângulo. */
  async function mudarModo(planta: Projeto['planta']) {
    if (planta === projeto.planta) return;
    if (planta === 'avancada') return atualizar({ planta });
    const retas = paredes.every((p, i) => i === 0 || p.giro === 90);
    if (retas && projeto.fechado && paredes.length === 4) return atualizar({ planta });
    const ok = await confirmar({
      titulo: 'Voltar para a planta simples?',
      mensagem: 'No modo simples o ambiente tem 4 paredes com cantos de 90°. A planta desenhada volta para esse formato.',
    });
    if (!ok) return;
    trocarParedes(quatroParedes(paredes), true, { planta });
  }

  function concluirDesenho(pontos: Ponto[], fechado: boolean) {
    setDesenhando(false);
    trocarParedes(paredesDosPontos(pontos, fechado, paredes, paredeNova), fechado);
  }

  /** No avançado, uma parede a mais no fim (no fechado, antes da última, que fecha sozinha). */
  function maisParede() {
    const nova = paredeNova(paredes.length + 1);
    const novas = projeto.fechado ? [...paredes.slice(0, -1), nova, paredes[paredes.length - 1]] : [...paredes, nova];
    trocarParedes(
      novas.map((p, i) => ({ ...p, nome: `Parede ${i + 1}` })),
      projeto.fechado,
    );
  }

  const tiraUltima = () => trocarParedes(paredes.slice(0, -1), projeto.fechado && paredes.length > 3);

  /** No fechado, a última parede vem do desenho das outras: a medida dela não se digita. */
  const calculada = (i: number) => projeto.fechado && i === paredes.length - 1;

  const mudar = (id: string, mudanca: Mudanca) =>
    atualizar({ modulos: modulos.map((m) => (m.id === id ? { ...m, ...mudanca } : m)) });

  /** A cópia entra logo à direita do original, com a mesma altura do chão. */
  function duplicar(m: Modulo) {
    const r = retanguloNaTela(m, materiais);
    const copia = { ...m, id: novoId(), x: r.x + r.w };
    atualizar({ modulos: [...modulos, copia] });
    return copia.id;
  }

  /**
   * Veste a caixa: laterais dos dois lados, tampo em cima e mais fundo que ela (o avanço dos Ajustes),
   * na chapa das portas. Encostada na parede, a caixa anda para o lado para caber a lateral.
   */
  function tamponar(m: Modulo) {
    const material = m.materialFrenteId || m.materialId;
    const e = espessuraDe(material, materiais);
    // laterais de tamponamentos vizinhos na mesma altura: a do lado vira a mesma lateral, não uma segunda
    const laterais = lateraisDosTamponamentos(daParede, materiais).filter((r) => r.y < m.y + m.altura && r.y + r.h > m.y);
    const naEsquerda = laterais.find((r) => r.x + r.w >= m.x - 1 && r.x + r.w <= m.x + e + 1);
    const x = naEsquerda ? naEsquerda.x : Math.max(0, m.x - e);
    // a caixa que invadia a lateral vizinha anda para depois dela
    const caixaX = naEsquerda ? Math.max(m.x, naEsquerda.x + naEsquerda.w) : x + e;
    const naDireita = laterais.find((r) => r.x >= caixaX + m.largura - e - 1 && r.x <= caixaX + m.largura + 1);
    const direita = naDireita ? naDireita.x + naDireita.w : caixaX + m.largura + e;
    const t: Modulo = {
      ...moduloDoMolde('envelope', 'Tamponamento', materiais),
      id: novoId(),
      paredeId: m.paredeId,
      materialId: material,
      x,
      y: m.y,
      largura: direita - x,
      altura: m.altura + e,
      profundidade: m.profundidade + ajustes.avancoTamponamento,
      lados: ladosPadrao,
    };
    atualizar({ modulos: [...modulos.map((o) => (o.id === m.id ? { ...o, x: caixaX } : o)), t] });
    return t.id;
  }

  /** Liga ou desliga o mármore em cima do balcão: só para mostrar ao cliente, não entra no custo. */
  const trocarPedra = (m: Modulo) => atualizar({ modulos: modulos.map((o) => (o.id === m.id ? { ...o, pedra: !o.pedra } : o)) });

  async function excluir(m: Modulo) {
    const ok = await confirmar({ titulo: `Excluir ${m.nome}?`, mensagem: 'O módulo sai do desenho e do orçamento.', botao: 'Excluir', perigo: true });
    if (!ok) return;
    atualizar({ modulos: removerDaLista(modulos, m.id) });
    setSelecionado(null);
  }

  const mudarAberturas = (aberturas: Abertura[]) => mudarParede({ aberturas });

  // meio milímetro de tolerância para arredondamentos
  const foraDaParede = daParede.filter((m) => {
    const r = retanguloNaTela(m, materiais);
    return r.x < -0.5 || r.y < -0.5 || r.x + r.w > parede.largura + 0.5 || r.y + r.h > parede.altura + 0.5;
  });

  const aberturas = retangulosDasAberturas(parede);
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
  const tapando = solidos.filter((m) => aberturas.some((a) => sobrepoe(retanguloNaTela(m, materiais), a))).map((m) => m.nome);
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
    const obstaculos = soEquipamento
      ? daParede.filter((m) => m.tipo === 'objeto').map((m) => retanguloNaTela(m, materiais))
      : [...solidos.map((m) => retanguloNaTela(m, materiais)), ...lateraisDosTamponamentos(daParede, materiais)];
    const inicio = Math.max(0, ...zonas.filter((z) => z.x === 0).map((z) => z.w));
    const x = posicaoLivre(bloco, [...obstaculos, ...zonas, ...aberturas], inicio);
    const novos = escolhidos.map((m) => ({ ...m, id: novoId(), paredeId: parede.id, x: x + m.x - minX }));
    atualizar({ modulos: [...modulos, ...novos] });
    setSelecionado(novos[0].id);
  }

  return (
    <>
      <section className="cartao">
        <CampoTexto rotulo="Cliente" valor={projeto.cliente} aoMudar={(cliente) => atualizar({ cliente })} dica="Nome do cliente" />
        <Opcoes<Projeto['planta']> rotulo="Planta" valor={projeto.planta} opcoes={modos} aoMudar={mudarModo} />
        {!simples && (
          <>
            {desenhando ? (
              <DesenharPlanta projeto={projeto} aoConcluir={concluirDesenho} aoCancelar={() => setDesenhando(false)} />
            ) : (
              <button type="button" className="btn" onClick={() => setDesenhando(true)}>
                Desenhar a planta
              </button>
            )}
            <div className="lista-paredes">
              {paredes.map((p, i) => (
                <div key={p.id} className="vao-item">
                  <strong>{p.nome}</strong>
                  {calculada(i) ? (
                    <p className="dica">
                      {fmtMedida(p.largura, u)} {u} · fecha o ambiente sozinha
                    </p>
                  ) : (
                    <Linha>
                      <CampoNumero rotulo="Comprimento" valor={p.largura} unidade={u} aoMudar={(largura) => mudarParede({ largura }, p.id)} />
                      {i > 0 && (
                        <CampoNumero
                          rotulo="Canto com a anterior"
                          valor={anguloDoCanto(p.giro)}
                          sufixo="°"
                          aoMudar={(angulo) => mudarParede({ giro: giroDoAngulo(angulo) }, p.id)}
                        />
                      )}
                    </Linha>
                  )}
                </div>
              ))}
              <p className="dica">90° é o canto comum; 270° é quina para fora (pilar); 135° é parede inclinada.</p>
              <div className="acoes-planta">
                <button type="button" className="btn" onClick={maisParede}>
                  + Parede
                </button>
                {paredes.length > 1 && (
                  <button type="button" className="btn" onClick={tiraUltima}>
                    Tirar a última
                  </button>
                )}
                {paredes.length >= 3 && (
                  <button type="button" className="btn" onClick={() => trocarParedes(paredes, !projeto.fechado)}>
                    {projeto.fechado ? 'Abrir o ambiente' : 'Fechar o ambiente'}
                  </button>
                )}
              </div>
            </div>
          </>
        )}
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
        {(paredes.length > 1 || !simples) && <PlantaBaixa projeto={projeto} paredeId={parede.id} aoEscolher={setParedeId} />}
        {paredes.length > 1 && (
          <>
            <div className="opcoes">
              {paredes.map((p) => (
                <button key={p.id} type="button" className={p.id === parede.id ? 'ativo' : ''} onClick={() => setParedeId(p.id)}>
                  {p.nome}
                </button>
              ))}
            </div>
          </>
        )}
        <Linha>
          {calculada(paredes.indexOf(parede)) && !simples ? (
            <p className="dica">
              Largura {fmtMedida(parede.largura, u)} {u}: fecha o ambiente sozinha
            </p>
          ) : (
            <CampoNumero rotulo="Largura da parede" valor={parede.largura} unidade={u} aoMudar={(largura) => mudarParede({ largura })} />
          )}
          <CampoNumero rotulo="Altura da parede" valor={parede.altura} unidade={u} aoMudar={(altura) => mudarParede({ altura })} />
        </Linha>
        <button type="button" className="btn" onClick={() => setVer3d(true)}>
          🧊 Ver em 3D
        </button>
        <DesenhoMovel
          modulos={daParede}
          materiais={materiais}
          parede={parede}
          zonas={zonas}
          unidade={u}
          aoMudar={mudar}
          aoTocar={setEdicao}
          aoDuplicar={duplicar}
          aoExcluir={excluir}
          aoTamponar={tamponar}
          aoTrocarPedra={trocarPedra}
          aoMudarAberturas={mudarAberturas}
          aoEditarAbertura={setEdicaoAbertura}
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
        {tapando.length > 0 && <p className="alerta">Tapa porta ou janela: {tapando.join(', ')}.</p>}
        {noCanto.length > 0 && <p className="alerta">Bate no móvel da parede vizinha: {noCanto.join(', ')}.</p>}
        {sobrepostos.length > 0 && (
          <p className="alerta">
            Um módulo em cima do outro: {sobrepostos.join('; ')}. Para prateleira dentro do armário, use "Por dentro" na edição do módulo.
          </p>
        )}
        <Aberturas
          parede={parede}
          aoAdicionar={(a) => {
            mudarAberturas([...parede.aberturas, a]);
            setSelecionado(a.id);
          }}
        />
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

      {ver3d && <Ver3D projeto={projeto} aoFechar={() => setVer3d(false)} />}

      {edicaoAbertura && (
        <EditorAbertura
          inicial={edicaoAbertura}
          unidade={u}
          aoFechar={() => setEdicaoAbertura(null)}
          aoSalvar={(a) => {
            mudarAberturas(salvarNaLista(parede.aberturas, a));
            setEdicaoAbertura(null);
          }}
          aoExcluir={(id) => {
            mudarAberturas(removerDaLista(parede.aberturas, id));
            setEdicaoAbertura(null);
            setSelecionado(null);
          }}
        />
      )}
    </>
  );
}
