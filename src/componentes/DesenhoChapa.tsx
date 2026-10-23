import type { ChapaPlano } from '../corte';
import type { Material, Unidade } from '../types';
import { fmtDim, fmtMedida } from '../unidades';

const cores = ['#f3d9b1', '#e6c49c', '#d6e6c3', '#c8def0', '#f0cfd8', '#e0d5f2', '#f8e5a0', '#cfe9e3'];

function corDe(texto: string) {
  let h = 0;
  for (const ch of texto) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}

interface RotuloProps {
  x: number;
  y: number;
  w: number;
  h: number;
  linhas: string[];
}

/** Escreve o texto no centro do retângulo, em pé se a peça for alta e estreita. */
function Rotulo({ x, y, w, h, linhas }: RotuloProps) {
  const emPe = h > w * 1.2;
  const comprimento = emPe ? h : w;
  const espessura = emPe ? w : h;
  const fonte = Math.min(70, espessura / 3.2);
  if (fonte < 24) return null;
  const visiveis = linhas.filter((t) => t.length * fonte * 0.58 < comprimento * 0.92).slice(0, espessura > fonte * 2.6 ? 2 : 1);
  if (visiveis.length === 0) return null;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return (
    <text
      x={cx}
      y={cy - ((visiveis.length - 1) * fonte * 1.1) / 2}
      fontSize={fonte}
      textAnchor="middle"
      dominantBaseline="central"
      transform={emPe ? `rotate(-90 ${cx} ${cy})` : undefined}
      className="rotulo"
    >
      {visiveis.map((t, i) => (
        <tspan key={i} x={cx} dy={i === 0 ? 0 : fonte * 1.1}>
          {t}
        </tspan>
      ))}
    </text>
  );
}

interface Props {
  numero: number;
  material: Material;
  chapa: ChapaPlano;
  sobraMinima: number;
  unidade: Unidade;
}

export function DesenhoChapa({ numero, material, chapa, sobraMinima, unidade: u }: Props) {
  const sobras = chapa.sobras.filter((s) => Math.min(s.w, s.h) >= sobraMinima);
  const curta = (a: number, b: number) => `${fmtMedida(a, u)}×${fmtMedida(b, u)}`;

  return (
    <figure className="chapa">
      <figcaption>
        <strong>Chapa {numero}</strong>
        <span>{Math.round(chapa.aproveitamento * 100)}% aproveitado</span>
      </figcaption>
      <svg viewBox={`0 0 ${material.comprimento} ${material.largura}`} role="img" aria-label={`Plano de corte da chapa ${numero}`}>
        <rect width={material.comprimento} height={material.largura} className="chapa-fundo" />
        {sobras.map((s, i) => (
          <g key={`s${i}`}>
            <rect x={s.x} y={s.y} width={s.w} height={s.h} className="sobra" />
            <Rotulo {...s} linhas={['sobra', curta(s.w, s.h)]} />
          </g>
        ))}
        {chapa.pecas.map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={corDe(p.item.origem + p.item.nome)} className="peca" />
            <Rotulo {...p} linhas={[p.item.nome, curta(p.item.c, p.item.l), String(i + 1)]} />
          </g>
        ))}
      </svg>
      <ol className="lista-corte">
        {chapa.pecas.map((p, i) => (
          <li key={i}>
            <span>
              {p.item.origem} · {p.item.nome}
              {p.girada && <em> (girada)</em>}
            </span>
            <span>{fmtDim(p.item.c, p.item.l, u)}</span>
          </li>
        ))}
      </ol>
      {sobras.length > 0 && (
        <p className="sobras-texto">
          <strong>Sobras aproveitáveis:</strong> {sobras.map((s) => fmtDim(s.w, s.h, u)).join(' · ')}
        </p>
      )}
    </figure>
  );
}
