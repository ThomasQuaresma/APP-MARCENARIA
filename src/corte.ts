/**
 * Plano de corte em guilhotina: cada corte vai de ponta a ponta do pedaço,
 * como na serra esquadrejadeira. Testa várias ordens e formas de dividir
 * as sobras e fica com o resultado que usa menos chapas e deixa a maior sobra.
 */

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ItemCorte {
  nome: string;
  origem: string;
  c: number;
  l: number;
  podeGirar: boolean;
}

export interface Colocada extends Retangulo {
  item: ItemCorte;
  girada: boolean;
}

export interface ChapaPlano {
  pecas: Colocada[];
  sobras: Retangulo[];
  aproveitamento: number;
}

export interface ResultadoCorte {
  chapas: ChapaPlano[];
  naoCabem: ItemCorte[];
}

type Divisao = 'maiorSobra' | 'eixoCurto' | 'eixoLongo';

interface ChapaTrabalho {
  pecas: Colocada[];
  livres: Retangulo[];
}

interface Posicao {
  livre: number;
  girada: boolean;
  sobraArea: number;
  sobraLado: number;
}

const ordens: ((a: ItemCorte, b: ItemCorte) => number)[] = [
  (a, b) => b.c * b.l - a.c * a.l,
  (a, b) => Math.max(b.c, b.l) - Math.max(a.c, a.l) || Math.min(b.c, b.l) - Math.min(a.c, a.l),
  (a, b) => b.c + b.l - (a.c + a.l),
  (a, b) => b.c - a.c || b.l - a.l,
  (a, b) => b.l - a.l || b.c - a.c,
];
const divisoes: Divisao[] = ['maiorSobra', 'eixoCurto', 'eixoLongo'];

export function empacotar(itens: ItemCorte[], compChapa: number, largChapa: number, serra: number, refilo: number): ResultadoCorte {
  // A área útil ganha uma espessura de serra a mais: assim a peça que encosta
  // na borda não precisa de um corte depois dela.
  const W = compChapa - 2 * refilo + serra;
  const H = largChapa - 2 * refilo + serra;
  const cabe = (i: ItemCorte) =>
    (i.c + serra <= W && i.l + serra <= H) || (i.podeGirar && i.l + serra <= W && i.c + serra <= H);

  const validos = itens.filter(cabe);
  let melhor: ChapaTrabalho[] | null = null;
  for (const ordem of ordens) {
    for (const divisao of divisoes) {
      const chapas = tentar([...validos].sort(ordem), W, H, serra, divisao);
      if (
        !melhor ||
        chapas.length < melhor.length ||
        (chapas.length === melhor.length && maiorLivre(chapas, W, H, serra) > maiorLivre(melhor, W, H, serra))
      ) {
        melhor = chapas;
      }
    }
  }

  const areaChapa = compChapa * largChapa;
  const deslocar = <T extends Retangulo>(r: T): T => ({ ...r, x: r.x + refilo, y: r.y + refilo });
  return {
    chapas: (melhor ?? []).map((ch) => ({
      pecas: ch.pecas.map(deslocar),
      sobras: ch.livres
        .map((r) => recortar(r, W - serra, H - serra))
        .filter((r) => r.w > 0 && r.h > 0)
        .map(deslocar),
      aproveitamento: ch.pecas.reduce((s, p) => s + p.w * p.h, 0) / areaChapa,
    })),
    naoCabem: itens.filter((i) => !cabe(i)),
  };
}

function tentar(itens: ItemCorte[], W: number, H: number, serra: number, divisao: Divisao) {
  const chapas: ChapaTrabalho[] = [];
  for (const item of itens) {
    let destino: ChapaTrabalho | null = null;
    let pos: Posicao | null = null;
    for (const ch of chapas) {
      const p = melhorPosicao(ch, item, serra);
      if (p && (!pos || p.sobraArea < pos.sobraArea)) {
        destino = ch;
        pos = p;
      }
    }
    if (!destino || !pos) {
      destino = { pecas: [], livres: [{ x: 0, y: 0, w: W, h: H }] };
      chapas.push(destino);
      pos = melhorPosicao(destino, item, serra);
      if (!pos) continue;
    }
    colocar(destino, item, pos, serra, divisao);
  }
  return chapas;
}

function melhorPosicao(ch: ChapaTrabalho, item: ItemCorte, serra: number): Posicao | null {
  let melhor: Posicao | null = null;
  const giros = item.podeGirar && item.c !== item.l ? [false, true] : [false];
  for (let i = 0; i < ch.livres.length; i++) {
    const r = ch.livres[i];
    for (const girada of giros) {
      const fw = (girada ? item.l : item.c) + serra;
      const fh = (girada ? item.c : item.l) + serra;
      if (fw > r.w || fh > r.h) continue;
      const p: Posicao = { livre: i, girada, sobraArea: r.w * r.h - fw * fh, sobraLado: Math.min(r.w - fw, r.h - fh) };
      if (!melhor || p.sobraArea < melhor.sobraArea || (p.sobraArea === melhor.sobraArea && p.sobraLado < melhor.sobraLado)) {
        melhor = p;
      }
    }
  }
  return melhor;
}

function colocar(ch: ChapaTrabalho, item: ItemCorte, pos: Posicao, serra: number, divisao: Divisao) {
  const r = ch.livres[pos.livre];
  const w = pos.girada ? item.l : item.c;
  const h = pos.girada ? item.c : item.l;
  ch.pecas.push({ item, x: r.x, y: r.y, w, h, girada: pos.girada });

  const fw = w + serra;
  const fh = h + serra;
  const dw = r.w - fw;
  const dh = r.h - fh;
  // a: primeiro corte na horizontal (a sobra de cima fica com a largura toda)
  // b: primeiro corte na vertical (a sobra da direita fica com a altura toda)
  const a = [
    { x: r.x + fw, y: r.y, w: dw, h: fh },
    { x: r.x, y: r.y + fh, w: r.w, h: dh },
  ];
  const b = [
    { x: r.x + fw, y: r.y, w: dw, h: r.h },
    { x: r.x, y: r.y + fh, w: fw, h: dh },
  ];
  const usarA =
    divisao === 'maiorSobra' ? maiorArea(a) >= maiorArea(b) : divisao === 'eixoCurto' ? dw < dh : dw >= dh;
  ch.livres.splice(pos.livre, 1, ...(usarA ? a : b).filter((x) => x.w > 0 && x.h > 0));
}

const maiorArea = (rs: Retangulo[]) => Math.max(0, ...rs.map((r) => r.w * r.h));

const recortar = (r: Retangulo, maxW: number, maxH: number): Retangulo => ({
  x: r.x,
  y: r.y,
  w: Math.min(r.x + r.w, maxW) - r.x,
  h: Math.min(r.y + r.h, maxH) - r.y,
});

const maiorLivre = (chapas: ChapaTrabalho[], W: number, H: number, serra: number) =>
  Math.max(0, ...chapas.flatMap((ch) => ch.livres.map((r) => recortar(r, W - serra, H - serra))).map((r) => r.w * r.h));
