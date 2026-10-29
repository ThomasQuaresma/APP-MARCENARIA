import { useEffect, useId, useRef, useState, type PointerEvent as EventoPonteiro, type ReactNode } from 'react';
import type { Retangulo } from '../corte';
import {
  arrumacaoDoVao,
  eixosAjustaveis,
  encaixar,
  encaixarBorda,
  espessuraDe,
  ladosDe,
  retangulosDasAberturas,
  retangulosDeEncaixe,
  retanguloNaTela,
  vaosNaCaixa,
} from '../modulos';
import { novoId } from '../estado';
import type { Abertura, Material, Modulo, Parede, TipoObjeto, Unidade } from '../types';
import { fmtMedida } from '../unidades';
import { confirmar } from './Confirmacao';

/** Área do desenho no SVG. O eixo y do SVG desce, então y = −altura a partir do chão. */
interface Limites {
  x: number;
  y: number;
  w: number;
  h: number;
}

function limitesDe(rets: Retangulo[], parede: Parede): Limites {
  const minX = Math.min(0, ...rets.map((r) => r.x));
  const maxX = Math.max(parede.largura, 500, ...rets.map((r) => r.x + r.w));
  const maxY = Math.max(parede.altura, 500, ...rets.map((r) => r.y + r.h));
  const folga = Math.max(maxX - minX, maxY) * 0.06 + 30;
  return { x: minX - folga, y: -(maxY + folga), w: maxX - minX + 2 * folga, h: maxY + 2 * folga };
}

/** Alça puxada para mudar o tamanho: −1 é esquerda/baixo, +1 é direita/cima, 0 não mexe naquele eixo. */
interface Canto {
  sx: -1 | 0 | 1;
  sy: -1 | 0 | 1;
}

/** Menor medida que dá para deixar puxando a alça, em mm. */
const MINIMO = 50;

interface Arraste {
  id: string;
  /** Módulo ou porta/janela da parede: os dois se arrastam e mudam de tamanho do mesmo jeito. */
  alvo: 'modulo' | 'abertura';
  ponteiro: number;
  inicioTela: { x: number; y: number };
  inicioSvg: { x: number; y: number };
  original: Retangulo;
  ret: Retangulo;
  /** Sem canto, move inteiro; com canto, muda o tamanho. */
  canto: Canto | null;
  /** Tocar de novo no que já está selecionado abre a edição. */
  jaSelecionado: boolean;
  guias: { x: number | null; y: number | null };
  moveu: boolean;
  /** O enquadramento fica parado enquanto arrasta, para o desenho não pular. */
  limites: Limites;
}

export type Mudanca = Pick<Modulo, 'x' | 'y' | 'largura' | 'altura'>;

interface Props {
  /** Só os módulos desta parede. */
  modulos: Modulo[];
  materiais: Material[];
  parede: Parede;
  /** Áreas tomadas pelos móveis das paredes vizinhas, no canto. */
  zonas?: Retangulo[];
  unidade: Unidade;
  /** Sem esta função, o desenho é só para ver. */
  aoMudar?: (id: string, mudanca: Mudanca) => void;
  aoTocar?: (m: Modulo) => void;
  /** Cria a cópia e devolve o id dela, que passa a ficar selecionada. */
  aoDuplicar?: (m: Modulo) => string;
  aoExcluir?: (m: Modulo) => void;
  /** Veste a caixa com o tamponamento e devolve o id dele, que passa a ficar selecionado. */
  aoTamponar?: (m: Modulo) => string;
  /** Liga ou desliga a pedra em cima do balcão (só visual). */
  aoTrocarPedra?: (m: Modulo) => void;
  /** Portas e janelas mudadas no desenho (arrastadas, duplicadas, excluídas). */
  aoMudarAberturas?: (aberturas: Abertura[]) => void;
  aoEditarAbertura?: (a: Abertura) => void;
  /** Seleção controlada por fora (para o módulo recém-colocado já vir selecionado); sem ela, o desenho cuida sozinho. */
  selecionado?: string | null;
  aoSelecionar?: (id: string | null) => void;
}

/** Aplica o retângulo da tela nas medidas do módulo; a espessura da chapa não muda. */
function comRetangulo(m: Modulo, r: Retangulo): Modulo {
  const eixos = eixosAjustaveis(m);
  return { ...m, x: r.x, y: r.y, largura: eixos.w ? r.w : m.largura, altura: eixos.h ? r.h : m.altura };
}

function cantosDe(m: Modulo): Canto[] {
  const { w, h } = eixosAjustaveis(m);
  if (w && h) return [{ sx: -1, sy: -1 }, { sx: 1, sy: -1 }, { sx: -1, sy: 1 }, { sx: 1, sy: 1 }];
  if (w) return [{ sx: -1, sy: 0 }, { sx: 1, sy: 0 }];
  if (h) return [{ sx: 0, sy: -1 }, { sx: 0, sy: 1 }];
  return [];
}

/** Porta e passagem ficam no chão: só mudam a largura e a altura por cima. */
function cantosDaAbertura(a: Abertura): Canto[] {
  if (a.tipo !== 'janela') return [{ sx: -1, sy: 1 }, { sx: 1, sy: 1 }, { sx: 0, sy: 1 }];
  return [{ sx: -1, sy: -1 }, { sx: 1, sy: -1 }, { sx: -1, sy: 1 }, { sx: 1, sy: 1 }];
}

const retanguloDaAbertura = (a: Abertura): Retangulo => ({ x: a.x, y: a.y, w: a.largura, h: a.altura });
const comRetanguloAbertura = (a: Abertura, r: Retangulo): Abertura => ({ ...a, x: r.x, y: r.y, largura: r.w, altura: r.h });

const cursorDo = ({ sx, sy }: Canto) => (sx === 0 ? 'ns-resize' : sy === 0 ? 'ew-resize' : sx === sy ? 'nesw-resize' : 'nwse-resize');

export function DesenhoMovel(props: Props) {
  const { modulos, materiais, parede, zonas = [], unidade: u, aoMudar, aoTocar, aoDuplicar, aoExcluir, aoTamponar, aoTrocarPedra, aoMudarAberturas, aoEditarAbertura } =
    props;
  const svg = useRef<SVGSVGElement>(null);
  const idHachura = `hachura-${useId().replace(/:/g, '')}`;
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const [selecaoInterna, setSelecaoInterna] = useState<string | null>(null);
  const selecionado = props.selecionado !== undefined ? props.selecionado : selecaoInterna;
  const setSelecionado = props.aoSelecionar ?? setSelecaoInterna;
  /** Módulos com as portas abertas no desenho. */
  const [abertos, setAbertos] = useState<string[]>([]);
  const editavel = !!aoMudar;

  // no celular, o toque num módulo ou numa alça não pode rolar a página, senão o navegador cancela o arraste
  useEffect(() => {
    const el = svg.current;
    if (!el || !editavel) return;
    const segurar = (e: TouchEvent) => {
      if (e.target instanceof Element && e.target.closest('.arrastavel, .alca')) e.preventDefault();
    };
    el.addEventListener('touchstart', segurar, { passive: false });
    return () => el.removeEventListener('touchstart', segurar);
  }, [editavel]);

  // o módulo arrastado vai por último, para ficar por cima dos outros
  const posicionados = modulos
    .map((m) => (arraste?.id === m.id ? comRetangulo(m, arraste.ret) : m))
    .sort((a, b) => Number(a.id === arraste?.id) - Number(b.id === arraste?.id));
  const rets = posicionados.map((m) => retanguloNaTela(m, materiais));
  const aberturas = parede.aberturas.map((a) => (arraste?.id === a.id ? comRetanguloAbertura(a, arraste.ret) : a));
  const limites = arraste?.limites ?? limitesDe(rets, parede);
  const escala = Math.max(limites.w, limites.h);
  const retParede: Retangulo = { x: 0, y: 0, w: parede.largura, h: parede.altura };

  const larguraTotal = rets.length ? Math.max(...rets.map((r) => r.x + r.w)) - Math.min(...rets.map((r) => r.x)) : 0;
  const alturaTotal = rets.length ? Math.max(...rets.map((r) => r.y + r.h)) : 0;

  const iSel = editavel ? posicionados.findIndex((m) => m.id === selecionado) : -1;
  const sel = iSel >= 0 ? posicionados[iSel] : null;
  const abSel = editavel && aoMudarAberturas ? (aberturas.find((a) => a.id === selecionado) ?? null) : null;
  const retSel = iSel >= 0 ? rets[iSel] : abSel ? retanguloDaAbertura(abSel) : null;
  const cantosSel = sel ? cantosDe(sel) : abSel ? cantosDaAbertura(abSel) : [];
  const original = (id: string) => modulos.find((x) => x.id === id);
  const aberturaOriginal = (id: string) => parede.aberturas.find((x) => x.id === id);

  const pontoSvg = (e: EventoPonteiro) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  function iniciar(e: EventoPonteiro<SVGGElement>, m: Modulo | Abertura, canto: Canto | null) {
    if (!aoMudar || arraste) return;
    svg.current?.setPointerCapture(e.pointerId);
    const ehAbertura = !('nome' in m);
    const r = ehAbertura ? retanguloDaAbertura(m) : retanguloNaTela(m, materiais);
    setArraste({
      id: m.id,
      alvo: ehAbertura ? 'abertura' : 'modulo',
      ponteiro: e.pointerId,
      inicioTela: { x: e.clientX, y: e.clientY },
      inicioSvg: pontoSvg(e),
      original: r,
      ret: r,
      canto,
      jaSelecionado: selecionado === m.id,
      guias: { x: null, y: null },
      moveu: false,
      limites,
    });
    setSelecionado(m.id);
  }

  function mover(e: EventoPonteiro<SVGSVGElement>) {
    if (!arraste || e.pointerId !== arraste.ponteiro) return;
    // pequenos tremidos do dedo contam como toque, não como arraste
    if (!arraste.moveu && Math.hypot(e.clientX - arraste.inicioTela.x, e.clientY - arraste.inicioTela.y) < 8) return;
    const p = pontoSvg(e);
    const dx = p.x - arraste.inicioSvg.x;
    const dy = -(p.y - arraste.inicioSvg.y);
    const o = arraste.original;
    const tolerancia = escala / 30;
    // encaixa também nos cantos e no teto da parede, e nos móveis que vêm da parede vizinha
    const outros = [
      retParede,
      ...zonas,
      ...retangulosDasAberturas(parede).filter((_, i) => parede.aberturas[i].id !== arraste.id),
      ...modulos.filter((x) => x.id !== arraste.id).flatMap((x) => retangulosDeEncaixe(x, materiais)),
    ];
    const abertura = arraste.alvo === 'abertura' ? aberturaOriginal(arraste.id) : undefined;

    if (!arraste.canto) {
      const encaixe = encaixar({ ...o, x: o.x + dx, y: o.y + dy }, outros, tolerancia);
      let ret = { ...o, x: encaixe.x, y: encaixe.y };
      // porta e janela não saem da parede; porta e passagem ficam no chão
      if (abertura) {
        ret = {
          ...ret,
          x: Math.min(Math.max(0, ret.x), Math.max(0, parede.largura - o.w)),
          y: abertura.tipo === 'janela' ? Math.min(Math.max(0, ret.y), Math.max(0, parede.altura - o.h)) : 0,
        };
      }
      setArraste({ ...arraste, moveu: true, ret, guias: encaixe.guias });
      return;
    }

    // muda o tamanho: só a borda puxada anda, a do lado oposto fica no lugar
    const { sx, sy } = arraste.canto;
    const ret = { ...o };
    const guias: Arraste['guias'] = { x: null, y: null };
    if (sx !== 0) {
      const b = encaixarBorda(sx > 0 ? o.x + o.w + dx : o.x + dx, outros.flatMap((r) => [r.x, r.x + r.w]), tolerancia);
      guias.x = b.guia;
      if (sx > 0) ret.w = Math.max(MINIMO, b.valor - o.x);
      else {
        ret.x = Math.min(b.valor, o.x + o.w - MINIMO);
        ret.w = o.x + o.w - ret.x;
      }
    }
    if (sy !== 0) {
      const b = encaixarBorda(sy > 0 ? o.y + o.h + dy : o.y + dy, [0, ...outros.flatMap((r) => [r.y, r.y + r.h])], tolerancia);
      guias.y = b.guia;
      if (sy > 0) ret.h = Math.max(MINIMO, b.valor - o.y);
      else {
        ret.y = Math.max(0, Math.min(b.valor, o.y + o.h - MINIMO));
        ret.h = o.y + o.h - ret.y;
      }
    }
    if (abertura) {
      // não passa das bordas da parede
      if (ret.x < 0) {
        ret.w += ret.x;
        ret.x = 0;
      }
      ret.w = Math.min(ret.w, parede.largura - ret.x);
      ret.h = Math.min(ret.h, parede.altura - ret.y);
    }
    setArraste({ ...arraste, moveu: true, ret, guias });
  }

  function soltar(e: EventoPonteiro<SVGSVGElement>) {
    if (!arraste || e.pointerId !== arraste.ponteiro) return;
    setArraste(null);
    if (arraste.alvo === 'abertura') {
      const a = aberturaOriginal(arraste.id);
      if (!a) return;
      if (arraste.moveu) {
        const r = arraste.ret;
        const nova = { ...a, x: Math.round(r.x), y: Math.round(r.y), largura: Math.round(r.w), altura: Math.round(r.h) };
        aoMudarAberturas?.(parede.aberturas.map((x) => (x.id === a.id ? nova : x)));
      } else if (!arraste.canto && arraste.jaSelecionado) aoEditarAbertura?.(a);
      return;
    }
    const m = original(arraste.id);
    if (!m) return;
    if (arraste.moveu) {
      const { x, y, largura, altura } = comRetangulo(m, arraste.ret);
      aoMudar?.(m.id, { x, y, largura, altura });
    } else if (!arraste.canto && arraste.jaSelecionado) aoTocar?.(m);
  }

  const fonteCota = escala / 42;
  const afastamento = escala / 36;

  return (
    <figure className="movel">
      <svg
        ref={svg}
        viewBox={`${limites.x} ${limites.y} ${limites.w} ${limites.h}`}
        role="img"
        aria-label="Desenho do móvel visto de frente"
        onPointerDown={(e) => {
          // tocar fora dos módulos tira a seleção
          if (editavel && e.target instanceof Element && !e.target.closest('.mod, .alca, .abertura.arrastavel')) setSelecionado(null);
        }}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={() => setArraste(null)}
      >
        <defs>
          <pattern id={idHachura} width={escala / 60} height={escala / 60} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1={0} y1={0} x2={0} y2={escala / 60} className="hachura" />
          </pattern>
        </defs>
        <rect x={0} y={-parede.altura} width={parede.largura} height={parede.altura} className="parede" />
        {zonas.map((z, i) => (
          <rect key={i} x={z.x} y={-(z.y + z.h)} width={z.w} height={z.h} fill={`url(#${idHachura})`} className="canto" />
        ))}
        {aberturas.map((a) => (
          <FiguraAbertura
            key={a.id}
            a={a}
            escala={escala}
            selecionada={a.id === abSel?.id}
            aoTocar={editavel && aoMudarAberturas ? (e) => iniciar(e, aberturaOriginal(a.id) ?? a, null) : undefined}
          />
        ))}
        <line x1={limites.x} x2={limites.x + limites.w} y1={0} y2={0} className="chao" />
        {posicionados.map((m, i) => (
          <g
            key={m.id}
            className={`${editavel ? 'mod arrastavel' : 'mod'}${m.id === sel?.id ? ' selecionado' : ''}`}
            onPointerDown={(e) => iniciar(e, m, null)}
            onClick={!editavel && aoTocar ? () => aoTocar(m) : undefined}
          >
            <Figura m={m} r={rets[i]} materiais={materiais} escala={escala} aberto={abertos.includes(m.id)} />
          </g>
        ))}
        {arraste?.moveu && arraste.guias.x !== null && (
          <line x1={arraste.guias.x} x2={arraste.guias.x} y1={limites.y} y2={limites.y + limites.h} className="guia" />
        )}
        {arraste?.moveu && arraste.guias.y !== null && (
          <line x1={limites.x} x2={limites.x + limites.w} y1={-arraste.guias.y} y2={-arraste.guias.y} className="guia" />
        )}
        {retSel && <Cotas r={retSel} parede={parede} unidade={u} fonte={fonteCota} afastamento={afastamento} />}
        {retSel &&
          cantosSel.map((c) => {
            const topo = -(retSel.y + retSel.h);
            const cx = c.sx < 0 ? retSel.x : c.sx > 0 ? retSel.x + retSel.w : retSel.x + retSel.w / 2;
            const cy = c.sy > 0 ? topo : c.sy < 0 ? topo + retSel.h : topo + retSel.h / 2;
            return (
              <g
                key={`${c.sx}${c.sy}`}
                className="alca"
                style={{ cursor: cursorDo(c) }}
                onPointerDown={(e) => {
                  const alvo = sel ?? (abSel && aberturaOriginal(abSel.id));
                  if (alvo) iniciar(e, alvo, c);
                }}
              >
                {/* círculo grande e invisível, do tamanho de um dedo */}
                <circle cx={cx} cy={cy} r={escala / 26} className="alca-toque" />
                <circle cx={cx} cy={cy} r={escala / 110} className="alca-ponto" />
              </g>
            );
          })}
      </svg>
      {sel && (
        <div className="barra-selecao">
          <strong>{sel.nome}</strong>
          <button type="button" className="btn" onClick={() => aoTocar?.(original(sel.id) ?? sel)}>
            Editar
          </button>
          {sel.tipo === 'caixa' && (sel.frente === 'portas' || sel.frente === 'correr' || sel.frente === 'basculante') && sel.qtdFrente > 0 && (
            <button
              type="button"
              className="btn"
              onClick={() => setAbertos((l) => (l.includes(sel.id) ? l.filter((x) => x !== sel.id) : [...l, sel.id]))}
            >
              {abertos.includes(sel.id) ? 'Fechar portas' : 'Abrir portas'}
            </button>
          )}
          {aoDuplicar && (
            <button type="button" className="btn" onClick={() => setSelecionado(aoDuplicar(original(sel.id) ?? sel))}>
              Duplicar
            </button>
          )}
          {/* balcão: caixa que termina na altura de bancada */}
          {aoTrocarPedra && sel.tipo === 'caixa' && sel.y + sel.altura <= 1100 && (
            <button type="button" className="btn" onClick={() => aoTrocarPedra(original(sel.id) ?? sel)}>
              {sel.pedra ? 'Tirar pedra' : '+ Pedra'}
            </button>
          )}
          {aoTamponar && sel.tipo === 'caixa' && (
            <button type="button" className="btn" onClick={() => setSelecionado(aoTamponar(original(sel.id) ?? sel))}>
              Tamponar
            </button>
          )}
          {aoExcluir && (
            <button type="button" className="btn btn-perigo" onClick={() => aoExcluir(original(sel.id) ?? sel)}>
              Excluir
            </button>
          )}
        </div>
      )}
      {abSel && aoMudarAberturas && (
        <div className="barra-selecao">
          <strong>{nomesAbertura[abSel.tipo]}</strong>
          <button type="button" className="btn" onClick={() => aoEditarAbertura?.(aberturaOriginal(abSel.id) ?? abSel)}>
            Editar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              // a cópia entra logo à direita; se não couber, à esquerda
              const direita = abSel.x + abSel.largura;
              const x = direita + abSel.largura <= parede.largura ? direita : Math.max(0, abSel.x - abSel.largura);
              const copia = { ...abSel, id: novoId(), x };
              aoMudarAberturas([...parede.aberturas, copia]);
              setSelecionado(copia.id);
            }}
          >
            Duplicar
          </button>
          <button
            type="button"
            className="btn btn-perigo"
            onClick={async () => {
              const ok = await confirmar({
                titulo: `Excluir esta ${nomesAbertura[abSel.tipo].toLowerCase()}?`,
                mensagem: 'Ela sai do desenho, da planta e do 3D.',
                botao: 'Excluir',
                perigo: true,
              });
              if (!ok) return;
              aoMudarAberturas(parede.aberturas.filter((x) => x.id !== abSel.id));
              setSelecionado(null);
            }}
          >
            Excluir
          </button>
        </div>
      )}
      <figcaption>
        Parede {fmtMedida(parede.largura, u)} × {fmtMedida(parede.altura, u)} {u}
        {rets.length > 0 && ` · Móvel ${fmtMedida(larguraTotal, u)} × ${fmtMedida(alturaTotal, u)} ${u}`}
      </figcaption>
    </figure>
  );
}

export const nomesAbertura = { porta: 'Porta', janela: 'Janela', passagem: 'Passagem' };

interface FiguraAberturaProps {
  a: Abertura;
  escala: number;
  selecionada?: boolean;
  /** Sem esta função, a porta ou janela é só para ver. */
  aoTocar?: (e: EventoPonteiro<SVGGElement>) => void;
}

/** Porta, janela ou passagem na parede, por trás dos móveis. */
function FiguraAbertura({ a, escala, selecionada, aoTocar }: FiguraAberturaProps) {
  const topo = -(a.y + a.altura);
  const batente = Math.min(60, a.largura / 8);
  return (
    <g className={`abertura ${a.tipo}${aoTocar ? ' arrastavel' : ''}${selecionada ? ' selecionada' : ''}`} onPointerDown={aoTocar}>
      <rect x={a.x} y={topo} width={a.largura} height={a.altura} className="vao-abertura" />
      {a.tipo === 'porta' && (
        <>
          <rect x={a.x + batente} y={topo + batente} width={a.largura - 2 * batente} height={a.altura - batente} className="folha" />
          <circle cx={a.x + a.largura - batente * 2.2} cy={-(a.y + 1000)} r={escala / 160} className="macaneta" />
        </>
      )}
      {a.tipo === 'janela' && (
        <>
          <rect x={a.x + batente} y={topo + batente} width={a.largura - 2 * batente} height={a.altura - 2 * batente} className="vidro" />
          <line x1={a.x + a.largura / 2} x2={a.x + a.largura / 2} y1={topo + batente} y2={-a.y - batente} className="caixilho" />
        </>
      )}
      <text x={a.x + a.largura / 2} y={topo + a.altura / 2} fontSize={escala / 45} textAnchor="middle" dominantBaseline="middle">
        {nomesAbertura[a.tipo]}
      </text>
    </g>
  );
}

/** Um módulo sozinho, com as portas abertas, para ver por dentro enquanto edita. */
export function PreviaModulo({ m, materiais }: { m: Modulo; materiais: Material[] }) {
  const r = { ...retanguloNaTela(m, materiais), x: 0, y: 0 };
  const folga = Math.max(r.w, r.h) * 0.04;
  const escala = Math.max(r.w, r.h) + 2 * folga;
  return (
    <figure className="movel previa">
      <svg viewBox={`${-folga} ${-(r.h + folga)} ${r.w + 2 * folga} ${r.h + 2 * folga}`} role="img" aria-label="Módulo por dentro">
        <Figura m={{ ...m, nome: '' }} r={r} materiais={materiais} escala={escala} aberto />
      </svg>
    </figure>
  );
}

interface CotasProps {
  r: Retangulo;
  parede: Parede;
  unidade: Unidade;
  fonte: number;
  afastamento: number;
}

/**
 * Medidas do módulo selecionado: a largura em cima, a altura dos dois lados e, tracejado,
 * quanto sobra até cada canto da parede, até o chão e até o teto.
 */
function Cotas({ r, parede, unidade: u, fonte, afastamento: a }: CotasProps) {
  const topo = -(r.y + r.h);
  const meioY = topo + r.h / 2;
  // a linha da distância fica um pouco abaixo do meio, para não cruzar o nome do módulo
  const yDistancia = meioY + fonte * 1.6;
  const xDistancia = r.x + r.w / 2 + fonte * 1.6;
  const texto = (v: number) => `${fmtMedida(v, u)} ${u}`;
  const cabe = (comprimento: number) => comprimento > fonte * 4;
  const horizontais = [
    { de: 0, ate: r.x },
    { de: r.x + r.w, ate: parede.largura },
  ].filter((d) => d.ate - d.de > 1);
  const verticais = [
    { de: -r.y, ate: 0 },
    { de: -parede.altura, ate: topo },
  ].filter((d) => d.ate - d.de > 1);
  return (
    <>
      <g className="distancias">
        {horizontais.map((d, i) => (
          <g key={`h${i}`}>
            <line x1={d.de} x2={d.ate} y1={yDistancia} y2={yDistancia} />
            {cabe(d.ate - d.de) && (
              <text x={(d.de + d.ate) / 2} y={yDistancia - fonte * 0.35} fontSize={fonte} textAnchor="middle">
                {texto(d.ate - d.de)}
              </text>
            )}
          </g>
        ))}
        {verticais.map((d, i) => (
          <g key={`v${i}`}>
            <line x1={xDistancia} x2={xDistancia} y1={d.de} y2={d.ate} />
            {cabe(d.ate - d.de) && (
              <text
                x={xDistancia - fonte * 0.35}
                y={(d.de + d.ate) / 2}
                fontSize={fonte}
                textAnchor="middle"
                transform={`rotate(-90 ${xDistancia - fonte * 0.35} ${(d.de + d.ate) / 2})`}
              >
                {texto(d.ate - d.de)}
              </text>
            )}
          </g>
        ))}
      </g>
      <MedidasDoModulo r={r} unidade={u} fonte={fonte} afastamento={a} />
    </>
  );
}

function MedidasDoModulo({ r, unidade: u, fonte, afastamento: a }: Omit<CotasProps, 'parede'>) {
  const topo = -(r.y + r.h);
  const meioY = topo + r.h / 2;
  const traco = fonte * 0.4;
  const yLargura = topo - a;
  const esquerda = r.x - a;
  const direita = r.x + r.w + a;
  const altura = `${fmtMedida(r.h, u)} ${u}`;
  return (
    <g className="cotas">
      <line x1={r.x} x2={r.x + r.w} y1={yLargura} y2={yLargura} />
      <line x1={r.x} x2={r.x} y1={yLargura - traco} y2={yLargura + traco} />
      <line x1={r.x + r.w} x2={r.x + r.w} y1={yLargura - traco} y2={yLargura + traco} />
      <text x={r.x + r.w / 2} y={yLargura - fonte * 0.35} fontSize={fonte} textAnchor="middle">
        {fmtMedida(r.w, u)} {u}
      </text>
      {[esquerda, direita].map((x, i) => (
        <g key={i}>
          <line x1={x} x2={x} y1={topo} y2={topo + r.h} />
          <line x1={x - traco} x2={x + traco} y1={topo} y2={topo} />
          <line x1={x - traco} x2={x + traco} y1={topo + r.h} y2={topo + r.h} />
          <text
            x={x + (i === 0 ? -fonte * 0.35 : fonte * 0.35)}
            y={meioY}
            fontSize={fonte}
            textAnchor="middle"
            transform={`rotate(${i === 0 ? -90 : 90} ${x + (i === 0 ? -fonte * 0.35 : fonte * 0.35)} ${meioY})`}
          >
            {altura}
          </text>
        </g>
      ))}
    </g>
  );
}

interface FiguraProps {
  m: Modulo;
  r: Retangulo;
  materiais: Material[];
  escala: number;
  /** Portas abertas: mostra o que tem dentro. */
  aberto?: boolean;
}

export const coresObjeto: Record<TipoObjeto, string> = {
  cuba: '#b8bdc2',
  cooktop: '#1c1c1c',
  tv: '#1f1f1f',
  geladeira: '#d9dde0',
  fogao: '#cfd2d6',
  micro: '#2f2f2f',
  forno: '#2f2f2f',
  bancada: '#e9e6e1',
};

/** Desenha um módulo visto de frente: portas, gavetas ou o vão com prateleiras. */
function Figura({ m, r, materiais, escala, aberto = false }: FiguraProps) {
  const cor = (id: string | null) => materiais.find((x) => x.id === id)?.cor ?? '#eee';
  const topo = -(r.y + r.h);
  const n = m.qtdFrente;
  const detalhes: ReactNode[] = [];
  let fundo = cor(m.materialId);

  if (m.tipo === 'objeto') {
    fundo = coresObjeto[m.objeto ?? 'bancada'];
    if (m.objeto === 'cuba') {
      // de frente, a cuba some na bancada: aparece só a torneira e a borda
      fundo = 'transparent';
      const cx = r.x + r.w / 2;
      const base = topo + r.h;
      detalhes.push(
        <path
          key="torneira"
          d={`M ${cx} ${base} L ${cx} ${topo + r.h * 0.15} Q ${cx} ${topo} ${cx + r.w * 0.22} ${topo + r.h * 0.12} L ${cx + r.w * 0.22} ${topo + r.h * 0.35}`}
          className="torneira"
        />,
        <rect key="borda" x={r.x} y={base - 10} width={r.w} height={10} fill={coresObjeto.cuba} />,
      );
    }
    if (m.objeto === 'tv') {
      detalhes.push(<rect key="tela" x={r.x + 15} y={topo + 15} width={Math.max(0, r.w - 30)} height={Math.max(0, r.h - 30)} className="tela-tv" />);
    }
    if (m.objeto === 'geladeira') {
      const divisa = topo + r.h * 0.32;
      detalhes.push(<line key="porta" x1={r.x} x2={r.x + r.w} y1={divisa} y2={divisa} />);
    }
    if (m.objeto === 'forno' || m.objeto === 'micro' || m.objeto === 'fogao') {
      const vidroAlto = m.objeto === 'fogao' ? topo + r.h * 0.35 : topo + r.h * 0.18;
      const vidroW = m.objeto === 'micro' ? r.w * 0.68 : r.w * 0.84;
      detalhes.push(<rect key="vidro" x={r.x + r.w * 0.08} y={vidroAlto} width={vidroW} height={r.h * 0.5} className="vidro" />);
    }
  } else if (m.tipo === 'envelope') {
    // só as peças escolhidas aparecem; sem fundo, o vão de dentro fica livre para os módulos
    const e = espessuraDe(m.materialId, materiais);
    const l = ladosDe(m);
    const c = cor(m.materialId);
    fundo = l.fundo ? c : 'none';
    if (l.esquerda) detalhes.push(<rect key="le" x={r.x} y={topo} width={e} height={r.h} fill={c} />);
    if (l.direita) detalhes.push(<rect key="ld" x={r.x + r.w - e} y={topo} width={e} height={r.h} fill={c} />);
    if (l.tampo) detalhes.push(<rect key="tampo" x={r.x} y={topo} width={r.w} height={e} fill={c} />);
  } else if (m.tipo === 'caixa' && m.frente === 'portas' && n > 0 && !aberto) {
    fundo = cor(m.materialFrenteId);
    const dw = r.w / n;
    for (let i = 0; i < n; i++) {
      const esquerda = r.x + i * dw;
      if (i > 0) detalhes.push(<line key={`d${i}`} x1={esquerda} x2={esquerda} y1={topo} y2={topo + r.h} />);
      // puxador do lado que abre, perto do meio do módulo
      const px = esquerda + dw / 2 < r.x + r.w / 2 ? esquerda + dw * 0.88 : esquerda + dw * 0.12;
      detalhes.push(<line key={`p${i}`} x1={px} x2={px} y1={topo + r.h * 0.44} y2={topo + r.h * 0.56} className="puxador" />);
    }
  } else if (m.tipo === 'caixa' && m.frente === 'correr' && n > 0 && !aberto) {
    fundo = cor(m.materialFrenteId);
    const dw = r.w / n;
    const transpasse = Math.min(20, dw / 8);
    for (let i = 0; i < n; i++) {
      const esquerda = r.x + i * dw;
      // linha dupla onde uma folha passa por cima da outra
      if (i > 0) {
        detalhes.push(
          <line key={`a${i}`} x1={esquerda - transpasse} x2={esquerda - transpasse} y1={topo} y2={topo + r.h} />,
          <line key={`b${i}`} x1={esquerda + transpasse} x2={esquerda + transpasse} y1={topo} y2={topo + r.h} />,
        );
      }
      // puxador concha perto da borda que encontra a vizinha
      const cx = i === 0 ? esquerda + dw - transpasse - 50 : esquerda + transpasse + 30;
      detalhes.push(<rect key={`c${i}`} x={cx} y={topo + r.h * 0.44} width={20} height={r.h * 0.12} rx={10} className="concha" />);
    }
  } else if (m.tipo === 'caixa' && n > 0 && (m.frente === 'gavetas' || (m.frente === 'basculante' && !aberto))) {
    fundo = cor(m.materialFrenteId);
    const dh = r.h / n;
    for (let i = 0; i < n; i++) {
      const cima = topo + i * dh;
      if (i > 0) detalhes.push(<line key={`d${i}`} x1={r.x} x2={r.x + r.w} y1={cima} y2={cima} />);
      // a basculante abre para cima: o puxador fica embaixo da porta
      const py = m.frente === 'basculante' ? cima + dh * 0.88 : cima + dh / 2;
      detalhes.push(<line key={`p${i}`} x1={r.x + r.w * 0.38} x2={r.x + r.w * 0.62} y1={py} y2={py} className="puxador" />);
    }
  } else if (m.tipo === 'caixa') {
    // sem frente, ou com as portas abertas: mostra o que tem dentro
    detalhes.push(<Interior key="interior" m={m} r={r} materiais={materiais} />);
  }

  // equipamentos baixos (bancada, cooktop, cuba) ficam sem nome, para não poluir; o envelope tem módulos dentro
  const semNome = m.objeto === 'bancada' || m.objeto === 'cooktop' || m.objeto === 'cuba' || m.tipo === 'envelope';
  const fonte = semNome ? 0 : Math.min(escala / 26, r.w / (m.nome.length * 0.6 + 1), r.h * 0.45);
  // com frente ou com prateleiras à mostra, o nome sobe para não ficar em cima do puxador nem das prateleiras
  const nomeEmCima = m.tipo === 'caixa' && ((m.frente !== 'nenhuma' && n > 0) || m.vaos.some((v) => v.prateleiras > 0 || v.cabideiro));
  const yNome = nomeEmCima ? topo + Math.max(fonte * 0.9, r.h * 0.16) : topo + r.h / 2;

  return (
    <>
      {/* a pedra do balcão fica por cima da caixa, com 3 cm */}
      {m.pedra && m.tipo === 'caixa' && <rect x={r.x} y={topo - 30} width={r.w} height={30} className="pedra" />}
      <rect
        x={r.x}
        y={topo}
        width={r.w}
        height={r.h}
        fill={fundo}
        className={m.objeto === 'cuba' || m.tipo === 'envelope' ? 'corpo sem-borda' : 'corpo'}
      />
      {detalhes}
      {fonte > escala / 55 && (
        <text x={r.x + r.w / 2} y={yNome} fontSize={fonte} textAnchor="middle" dominantBaseline="central" className="nome">
          {m.nome}
        </text>
      )}
    </>
  );
}

/** Por dentro da caixa: vãos, divisórias, prateleiras e cabideiro. */
function Interior({ m, r, materiais }: { m: Modulo; r: Retangulo; materiais: Material[] }) {
  const e = espessuraDe(m.materialId, materiais);
  const corpo = materiais.find((x) => x.id === m.materialId)?.cor ?? '#eee';
  const topo = -(r.y + r.h);
  /** Altura a partir do chão do módulo, no eixo do SVG. */
  const naTela = (y: number) => -(r.y + y);
  const alturaVao = Math.max(0, r.h - 2 * e);
  return (
    <>
      {vaosNaCaixa(m, materiais).map((v, i) => {
        const { prateleiras, cabideiro } = arrumacaoDoVao(v.vao, r.h, e);
        const x = r.x + v.x;
        return (
          <g key={i}>
            <rect x={x} y={topo + e} width={Math.max(0, v.w)} height={alturaVao} className="vao" />
            {i > 0 && <rect x={x - e} y={topo + e} width={e} height={alturaVao} fill={corpo} />}
            {prateleiras.map((y, k) => (
              <rect key={k} x={x} y={naTela(y + e)} width={Math.max(0, v.w)} height={e} fill={corpo} />
            ))}
            {cabideiro !== null && <Cabide x={x} w={v.w} y={naTela(cabideiro)} />}
          </g>
        );
      })}
    </>
  );
}

/** Tubo do cabideiro com alguns cabides pendurados. */
function Cabide({ x, w, y }: { x: number; w: number; y: number }) {
  const meia = Math.min(w / 9, 70);
  const qtd = w > 350 ? 3 : w > 180 ? 1 : 0;
  return (
    <>
      <line x1={x + 15} x2={x + w - 15} y1={y} y2={y} className="cabide" />
      {Array.from({ length: qtd }, (_, k) => {
        const cx = x + (w * (k + 1)) / (qtd + 1);
        return <path key={k} d={`M ${cx} ${y} L ${cx - meia} ${y + meia * 0.7} L ${cx + meia} ${y + meia * 0.7} Z`} className="cabide-gancho" />;
      })}
    </>
  );
}
