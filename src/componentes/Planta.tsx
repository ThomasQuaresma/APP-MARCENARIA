import { useState, type PointerEvent as EventoPonteiro } from 'react';
import { profundidadeTotal, retanguloNaTela } from '../modulos';
import { normalDe, normalizarGiro, radianos, tracado, type Ponto } from '../planta';
import type { Abertura, Projeto } from '../types';
import { fmtMedida } from '../unidades';

interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

function caixaDe(pontos: Ponto[], minimo: number): Caixa {
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  // deixa a planta com um tamanho mínimo, para uma parede só não virar um risco no meio da tela
  if (x1 - x0 < minimo) [x0, x1] = [(x0 + x1 - minimo) / 2, (x0 + x1 + minimo) / 2];
  if (y1 - y0 < minimo * 0.6) [y0, y1] = [(y0 + y1 - minimo * 0.6) / 2, (y0 + y1 + minimo * 0.6) / 2];
  const folga = Math.max(x1 - x0, y1 - y0) * 0.12;
  return { x: x0 - folga, y: y0 - folga, w: x1 - x0 + 2 * folga, h: y1 - y0 + 2 * folga };
}

const soma = (a: Ponto, b: Ponto, k = 1): Ponto => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const direcaoDe = (graus: number): Ponto => ({ x: Math.cos(radianos(graus)), y: Math.sin(radianos(graus)) });
const pts = (ps: Ponto[]) => ps.map((p) => `${p.x},${p.y}`).join(' ');

interface PlantaProps {
  projeto: Projeto;
  paredeId: string;
  aoEscolher: (id: string) => void;
}

/** O ambiente visto de cima: paredes numeradas com as medidas, os móveis, portas e janelas. Toque numa parede para vê-la de frente. */
export function PlantaBaixa({ projeto, paredeId, aoEscolher }: PlantaProps) {
  const { paredes, modulos, materiais } = projeto;
  const u = projeto.ajustes.unidade;
  const { pontos, direcoes } = tracado(paredes);
  const caixa = caixaDe(pontos, 2500);
  const escala = Math.max(caixa.w, caixa.h);
  const fonte = escala / 28;

  return (
    <figure className="planta">
      <svg viewBox={`${caixa.x} ${caixa.y} ${caixa.w} ${caixa.h}`} role="img" aria-label="Planta do ambiente vista de cima">
        {projeto.fechado && <polygon points={pts(pontos)} className="piso-planta" />}
        {modulos.map((m) => {
          const i = paredes.findIndex((p) => p.id === m.paredeId);
          if (i < 0) return null;
          const r = retanguloNaTela(m, materiais);
          const d = direcaoDe(direcoes[i]);
          const n = normalDe(direcoes[i]);
          const a = soma(pontos[i], d, r.x);
          const b = soma(pontos[i], d, r.x + r.w);
          const fundo = profundidadeTotal(m, materiais);
          return <polygon key={m.id} points={pts([a, b, soma(b, n, fundo), soma(a, n, fundo)])} className={`pegada ${m.tipo}`} />;
        })}
        {paredes.map((p, i) => {
          const a = pontos[i];
          const b = pontos[i + 1];
          const d = direcaoDe(direcoes[i]);
          const n = normalDe(direcoes[i]);
          const meio = soma(a, d, p.largura / 2);
          // número e medida do lado de fora do ambiente
          const rotulo = soma(meio, n, -fonte * 1.6);
          const ativo = p.id === paredeId;
          let angulo = direcoes[i] % 360;
          if (angulo > 90 && angulo <= 270) angulo -= 180;
          if (angulo < -90) angulo += 180;
          return (
            <g key={p.id} className={`parede-planta${ativo ? ' ativa' : ''}`} onClick={() => aoEscolher(p.id)}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="toque" />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="traco" />
              {p.aberturas.map((ab) => (
                <AberturaNaPlanta key={ab.id} ab={ab} inicio={a} d={d} n={n} />
              ))}
              <text
                x={rotulo.x}
                y={rotulo.y}
                fontSize={fonte}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${angulo} ${rotulo.x} ${rotulo.y})`}
              >
                {i + 1} · {fmtMedida(p.largura, u)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption>Vista de cima · toque numa parede para ver de frente</figcaption>
    </figure>
  );
}

/** Porta com o arco de abertura para dentro; janela como linha dupla; passagem como vão. */
function AberturaNaPlanta({ ab, inicio, d, n }: { ab: Abertura; inicio: Ponto; d: Ponto; n: Ponto }) {
  const a = soma(inicio, d, ab.x);
  const b = soma(inicio, d, ab.x + ab.largura);
  const corte = <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="corte-abertura" />;
  if (ab.tipo === 'porta') {
    const aberta = soma(a, n, ab.largura);
    return (
      <>
        {corte}
        <line x1={a.x} y1={a.y} x2={aberta.x} y2={aberta.y} className="folha-planta" />
        <path d={`M ${b.x} ${b.y} A ${ab.largura} ${ab.largura} 0 0 1 ${aberta.x} ${aberta.y}`} className="arco-planta" />
      </>
    );
  }
  if (ab.tipo === 'janela') {
    return (
      <>
        {corte}
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="janela-planta" />
      </>
    );
  }
  return corte;
}

interface DesenharProps {
  projeto: Projeto;
  aoConcluir: (pontos: Ponto[], fechado: boolean) => void;
  aoCancelar: () => void;
}

/** Ponto mais perto da grade, em mm. */
const GRADE = 50;
const naGrade = (v: number) => Math.round(v / GRADE) * GRADE;

/**
 * Desenho livre da planta, como no Promob: toque nos cantos, um depois do outro. Segurando o dedo,
 * dá para arrastar e ver a medida antes de soltar. A parede puxa para o reto (0°, 45°, 90°…) quando
 * está perto, e tocar no primeiro ponto fecha o ambiente.
 */
export function DesenharPlanta({ projeto, aoConcluir, aoCancelar }: DesenharProps) {
  const u = projeto.ajustes.unidade;
  const [area] = useState(() => {
    const c = caixaDe(tracado(projeto.paredes).pontos, 6000);
    return { ...c, h: Math.max(c.h, c.w * 0.75) };
  });
  const escala = Math.max(area.w, area.h);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [cursor, setCursor] = useState<Ponto | null>(null);
  const tolerancia = escala / 25;

  function encaixar(p: Ponto): { ponto: Ponto; fecha: boolean } {
    if (pontos.length >= 3 && Math.hypot(p.x - pontos[0].x, p.y - pontos[0].y) < tolerancia) return { ponto: pontos[0], fecha: true };
    const ultimo = pontos[pontos.length - 1];
    if (!ultimo) return { ponto: { x: naGrade(p.x), y: naGrade(p.y) }, fecha: false };
    const comprimento = naGrade(Math.hypot(p.x - ultimo.x, p.y - ultimo.y));
    let angulo = (Math.atan2(p.y - ultimo.y, p.x - ultimo.x) * 180) / Math.PI;
    const reto = Math.round(angulo / 45) * 45;
    angulo = Math.abs(angulo - reto) < 8 ? reto : Math.round(angulo);
    return { ponto: soma(ultimo, direcaoDe(angulo), comprimento), fecha: false };
  }

  const pontoSvg = (e: EventoPonteiro<SVGSVGElement>) => {
    const ctm = e.currentTarget.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  function soltar(e: EventoPonteiro<SVGSVGElement>) {
    setCursor(null);
    const { ponto, fecha } = encaixar(pontoSvg(e));
    if (fecha) return aoConcluir(pontos, true);
    const ultimo = pontos[pontos.length - 1];
    if (ultimo && Math.hypot(ponto.x - ultimo.x, ponto.y - ultimo.y) < GRADE) return;
    setPontos([...pontos, ponto]);
  }

  const previa = cursor ? encaixar(cursor) : null;
  const ultimo = pontos[pontos.length - 1];
  const linhas: number[] = [];
  for (let v = Math.ceil(Math.min(area.x, area.y) / 500) * 500; v < Math.max(area.x + area.w, area.y + area.h); v += 500) linhas.push(v);
  const fonte = escala / 32;

  return (
    <div className="planta desenhando">
      <svg
        viewBox={`${area.x} ${area.y} ${area.w} ${area.h}`}
        role="img"
        aria-label="Desenhe a planta tocando nos cantos"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setCursor(pontoSvg(e));
        }}
        onPointerMove={(e) => cursor && setCursor(pontoSvg(e))}
        onPointerUp={soltar}
        onPointerCancel={() => setCursor(null)}
      >
        {linhas.map((v) => (
          <g key={v} className={v % 1000 === 0 ? 'grade forte' : 'grade'}>
            <line x1={v} x2={v} y1={area.y} y2={area.y + area.h} />
            <line x1={area.x} x2={area.x + area.w} y1={v} y2={v} />
          </g>
        ))}
        {pontos.length > 1 && <polyline points={pts(pontos)} className="traco-desenho" />}
        {pontos.slice(1).map((b, i) => {
          const a = pontos[i];
          return (
            <text key={i} x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - fonte * 0.6} fontSize={fonte} textAnchor="middle">
              {fmtMedida(Math.hypot(b.x - a.x, b.y - a.y), u)}
            </text>
          );
        })}
        {previa && ultimo && (
          <>
            <line x1={ultimo.x} y1={ultimo.y} x2={previa.ponto.x} y2={previa.ponto.y} className="traco-previa" />
            <text
              x={(ultimo.x + previa.ponto.x) / 2}
              y={(ultimo.y + previa.ponto.y) / 2 - fonte * 0.6}
              fontSize={fonte * 1.2}
              textAnchor="middle"
              className="medida-previa"
            >
              {previa.fecha ? 'Fechar' : `${fmtMedida(Math.hypot(previa.ponto.x - ultimo.x, previa.ponto.y - ultimo.y), u)} ${u}`}
            </text>
          </>
        )}
        {pontos.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === 0 && pontos.length >= 3 ? tolerancia / 2 : escala / 120} className={i === 0 ? 'ponto primeiro' : 'ponto'} />
        ))}
        {previa && <circle cx={previa.ponto.x} cy={previa.ponto.y} r={escala / 90} className="ponto cursor" />}
      </svg>
      <p className="dica">
        {pontos.length === 0
          ? 'Toque no primeiro canto. Cada quadrado da grade tem 50 cm.'
          : pontos.length < 3
            ? 'Toque no próximo canto. Segure e arraste para ver a medida antes de soltar.'
            : 'Continue, ou toque no primeiro ponto para fechar o ambiente. As medidas exatas você digita depois.'}
      </p>
      <div className="acoes-planta">
        <button type="button" className="btn" onClick={aoCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn" disabled={pontos.length === 0} onClick={() => setPontos(pontos.slice(0, -1))}>
          Desfazer
        </button>
        <button type="button" className="btn" disabled={pontos.length < 3} onClick={() => aoConcluir(pontos, true)}>
          Fechar ambiente
        </button>
        <button type="button" className="btn btn-principal" disabled={pontos.length < 2} onClick={() => aoConcluir(pontos, false)}>
          Pronto
        </button>
      </div>
    </div>
  );
}

/** Canto entre duas paredes como o marceneiro mede: 90° é o canto comum, 270° é a quina para fora. */
export const anguloDoCanto = (giro: number) => Math.round((180 - giro) * 10) / 10;
export const giroDoAngulo = (angulo: number) => normalizarGiro(180 - angulo);
