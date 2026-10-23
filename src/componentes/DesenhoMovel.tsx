import { useId, useRef, useState, type PointerEvent as EventoPonteiro, type ReactNode } from 'react';
import type { Retangulo } from '../corte';
import { encaixar, espessuraDe, retanguloNaTela } from '../modulos';
import type { Material, Modulo, Parede, TipoObjeto, Unidade } from '../types';
import { fmtMedida } from '../unidades';

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

interface Arraste {
  id: string;
  ponteiro: number;
  inicioTela: { x: number; y: number };
  inicioSvg: { x: number; y: number };
  original: { x: number; y: number };
  x: number;
  y: number;
  guias: { x: number | null; y: number | null };
  moveu: boolean;
  /** O enquadramento fica parado enquanto arrasta, para o desenho não pular. */
  limites: Limites;
}

interface Props {
  /** Só os módulos desta parede. */
  modulos: Modulo[];
  materiais: Material[];
  parede: Parede;
  /** Áreas tomadas pelos móveis das paredes vizinhas, no canto. */
  zonas?: Retangulo[];
  unidade: Unidade;
  /** Sem esta função, o desenho é só para ver. */
  aoMover?: (id: string, x: number, y: number) => void;
  aoTocar?: (m: Modulo) => void;
}

export function DesenhoMovel({ modulos, materiais, parede, zonas = [], unidade: u, aoMover, aoTocar }: Props) {
  const svg = useRef<SVGSVGElement>(null);
  const idHachura = `hachura-${useId().replace(/:/g, '')}`;
  const [arraste, setArraste] = useState<Arraste | null>(null);

  // o módulo arrastado vai por último, para ficar por cima dos outros
  const posicionados = modulos
    .map((m) => (arraste?.id === m.id ? { ...m, x: arraste.x, y: arraste.y } : m))
    .sort((a, b) => Number(a.id === arraste?.id) - Number(b.id === arraste?.id));
  const rets = posicionados.map((m) => retanguloNaTela(m, materiais));
  const limites = arraste?.limites ?? limitesDe(rets, parede);
  const escala = Math.max(limites.w, limites.h);
  const retParede: Retangulo = { x: 0, y: 0, w: parede.largura, h: parede.altura };

  const larguraTotal = rets.length ? Math.max(...rets.map((r) => r.x + r.w)) - Math.min(...rets.map((r) => r.x)) : 0;
  const alturaTotal = rets.length ? Math.max(...rets.map((r) => r.y + r.h)) : 0;

  const pontoSvg = (e: EventoPonteiro) => {
    const ctm = svg.current?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  function iniciar(e: EventoPonteiro<SVGGElement>, m: Modulo) {
    if (!aoMover || arraste) return;
    svg.current?.setPointerCapture(e.pointerId);
    setArraste({
      id: m.id,
      ponteiro: e.pointerId,
      inicioTela: { x: e.clientX, y: e.clientY },
      inicioSvg: pontoSvg(e),
      original: { x: m.x, y: m.y },
      x: m.x,
      y: m.y,
      guias: { x: null, y: null },
      moveu: false,
      limites,
    });
  }

  function mover(e: EventoPonteiro<SVGSVGElement>) {
    if (!arraste || e.pointerId !== arraste.ponteiro) return;
    // pequenos tremidos do dedo contam como toque, não como arraste
    if (!arraste.moveu && Math.hypot(e.clientX - arraste.inicioTela.x, e.clientY - arraste.inicioTela.y) < 8) return;
    const m = modulos.find((x) => x.id === arraste.id);
    if (!m) return;
    const p = pontoSvg(e);
    const r = {
      ...retanguloNaTela(m, materiais),
      x: arraste.original.x + (p.x - arraste.inicioSvg.x),
      y: arraste.original.y - (p.y - arraste.inicioSvg.y),
    };
    // encaixa também nos cantos e no teto da parede, e nos móveis que vêm da parede vizinha
    const outros = [retParede, ...zonas, ...modulos.filter((x) => x.id !== m.id).map((x) => retanguloNaTela(x, materiais))];
    const encaixe = encaixar(r, outros, escala / 30);
    setArraste({ ...arraste, moveu: true, x: encaixe.x, y: encaixe.y, guias: encaixe.guias });
  }

  function soltar(e: EventoPonteiro<SVGSVGElement>) {
    if (!arraste || e.pointerId !== arraste.ponteiro) return;
    setArraste(null);
    const m = modulos.find((x) => x.id === arraste.id);
    if (!m) return;
    if (arraste.moveu) aoMover?.(m.id, arraste.x, arraste.y);
    else aoTocar?.(m);
  }

  return (
    <figure className="movel">
      <svg
        ref={svg}
        viewBox={`${limites.x} ${limites.y} ${limites.w} ${limites.h}`}
        role="img"
        aria-label="Desenho do móvel visto de frente"
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
        <line x1={limites.x} x2={limites.x + limites.w} y1={0} y2={0} className="chao" />
        {posicionados.map((m, i) => (
          <g
            key={m.id}
            className={aoMover ? 'mod arrastavel' : 'mod'}
            onPointerDown={(e) => iniciar(e, m)}
            onClick={!aoMover && aoTocar ? () => aoTocar(m) : undefined}
          >
            <Figura m={m} r={rets[i]} materiais={materiais} escala={escala} />
          </g>
        ))}
        {arraste?.moveu && arraste.guias.x !== null && (
          <line x1={arraste.guias.x} x2={arraste.guias.x} y1={limites.y} y2={limites.y + limites.h} className="guia" />
        )}
        {arraste?.moveu && arraste.guias.y !== null && (
          <line x1={limites.x} x2={limites.x + limites.w} y1={-arraste.guias.y} y2={-arraste.guias.y} className="guia" />
        )}
      </svg>
      <figcaption>
        Parede {fmtMedida(parede.largura, u)} × {fmtMedida(parede.altura, u)} {u}
        {rets.length > 0 && ` · Móvel ${fmtMedida(larguraTotal, u)} × ${fmtMedida(alturaTotal, u)} ${u}`}
      </figcaption>
    </figure>
  );
}

interface FiguraProps {
  m: Modulo;
  r: Retangulo;
  materiais: Material[];
  escala: number;
}

export const coresObjeto: Record<TipoObjeto, string> = {
  cuba: '#b8bdc2',
  cooktop: '#1c1c1c',
  tv: '#1f1f1f',
  geladeira: '#d9dde0',
  fogao: '#cfd2d6',
  micro: '#2f2f2f',
  forno: '#2f2f2f',
  bancada: '#4a4744',
};

/** Desenha um módulo visto de frente: portas, gavetas ou o vão com prateleiras. */
function Figura({ m, r, materiais, escala }: FiguraProps) {
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
  } else if (m.tipo === 'caixa' && m.frente === 'portas' && n > 0) {
    fundo = cor(m.materialFrenteId);
    const dw = r.w / n;
    for (let i = 0; i < n; i++) {
      const esquerda = r.x + i * dw;
      if (i > 0) detalhes.push(<line key={`d${i}`} x1={esquerda} x2={esquerda} y1={topo} y2={topo + r.h} />);
      // puxador do lado que abre, perto do meio do módulo
      const px = esquerda + dw / 2 < r.x + r.w / 2 ? esquerda + dw * 0.88 : esquerda + dw * 0.12;
      detalhes.push(<line key={`p${i}`} x1={px} x2={px} y1={topo + r.h * 0.44} y2={topo + r.h * 0.56} className="puxador" />);
    }
    // prateleiras internas, atrás das portas: tracejadas, como num raio-x
    const e = espessuraDe(m.materialId, materiais);
    for (let k = 1; k <= m.prateleiras; k++) {
      const y = topo + e + (k * (r.h - 2 * e)) / (m.prateleiras + 1);
      detalhes.push(<line key={`o${k}`} x1={r.x + e} x2={r.x + r.w - e} y1={y} y2={y} className="oculta" />);
    }
  } else if (m.tipo === 'caixa' && m.frente === 'gavetas' && n > 0) {
    fundo = cor(m.materialFrenteId);
    const dh = r.h / n;
    for (let i = 0; i < n; i++) {
      const cima = topo + i * dh;
      if (i > 0) detalhes.push(<line key={`d${i}`} x1={r.x} x2={r.x + r.w} y1={cima} y2={cima} />);
      const py = cima + dh / 2;
      detalhes.push(<line key={`p${i}`} x1={r.x + r.w * 0.38} x2={r.x + r.w * 0.62} y1={py} y2={py} className="puxador" />);
    }
  } else if (m.tipo === 'caixa') {
    const e = espessuraDe(m.materialId, materiais);
    detalhes.push(<rect key="vao" x={r.x + e} y={topo + e} width={Math.max(0, r.w - 2 * e)} height={Math.max(0, r.h - 2 * e)} className="vao" />);
    for (let k = 1; k <= m.prateleiras; k++) {
      const y = topo + e + (k * (r.h - 2 * e)) / (m.prateleiras + 1);
      detalhes.push(<line key={`s${k}`} x1={r.x + e} x2={r.x + r.w - e} y1={y} y2={y} />);
    }
  }

  // equipamentos baixos (bancada, cooktop, cuba) ficam sem nome, para não poluir
  const semNome = m.objeto === 'bancada' || m.objeto === 'cooktop' || m.objeto === 'cuba';
  const fonte = semNome ? 0 : Math.min(escala / 26, r.w / (m.nome.length * 0.6 + 1), r.h * 0.45);
  // com portas ou gavetas, o nome sobe para não ficar em cima do puxador
  const temFrente = m.tipo === 'caixa' && m.frente !== 'nenhuma' && n > 0;
  const yNome = temFrente ? topo + Math.max(fonte * 0.9, r.h * 0.16) : topo + r.h / 2;

  return (
    <>
      <rect x={r.x} y={topo} width={r.w} height={r.h} fill={fundo} className={m.objeto === 'cuba' ? 'corpo sem-borda' : 'corpo'} />
      {detalhes}
      {fonte > escala / 55 && (
        <text x={r.x + r.w / 2} y={yNome} fontSize={fonte} textAnchor="middle" dominantBaseline="central" className="nome">
          {m.nome}
        </text>
      )}
    </>
  );
}
