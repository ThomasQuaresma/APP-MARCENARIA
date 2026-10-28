import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Vector3,
  WebGLRenderer,
  type BufferGeometry,
  type Material as MaterialCena,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { arrumacaoDoVao, espessuraDe, larguraFolhaCorrer, TRILHO_CORRER, vaosNaCaixa } from '../modulos';
import type { Modulo, Piso, Projeto } from '../types';
import { fmtMedida } from '../unidades';
import { coresObjeto } from './DesenhoMovel';

const coresPiso: Record<Piso, string> = { madeira: '#b8875a', porcelanato: '#e4e0da', cimento: '#a9a6a1' };

/**
 * Monta os módulos de uma parede, peça por peça, em mm: x ao longo da parede a partir do canto
 * esquerdo, y para cima a partir do chão, z saindo da parede em direção a quem olha.
 */
function montarParede(p: Projeto, modulos: Modulo[], guardar: (m: MaterialCena) => MaterialCena) {
  const { materiais, ajustes: a } = p;
  const grupo = new Group();
  const acabamentos = new Map<string, MeshStandardMaterial>();
  const contorno = guardar(new LineBasicMaterial({ color: 0x5a4632, transparent: true, opacity: 0.35 }));
  const metal = guardar(new MeshStandardMaterial({ color: 0x3b3b3b, metalness: 0.6, roughness: 0.35 })) as MeshStandardMaterial;

  const acabamento = (cor: string, brilho = 0.75, metalico = 0) => {
    const chave = `${cor}/${brilho}/${metalico}`;
    let m = acabamentos.get(chave);
    if (!m) {
      m = guardar(new MeshStandardMaterial({ color: new Color(cor), roughness: brilho, metalness: metalico })) as MeshStandardMaterial;
      acabamentos.set(chave, m);
    }
    return m;
  };
  const daChapa = (id: string | null) => acabamento(materiais.find((x) => x.id === id)?.cor ?? '#eeeeee');

  const colocar = (geo: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number, borda: boolean) => {
    const mesh = new Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    grupo.add(mesh);
    if (borda) {
      const linhas = new LineSegments(new EdgesGeometry(geo), contorno);
      linhas.position.copy(mesh.position);
      grupo.add(linhas);
    }
  };

  for (const m of modulos) {
    // o fundo sobreposto fica entre a parede e a caixa
    const z0 = m.tipo === 'caixa' && m.materialFundoId ? espessuraDe(m.materialFundoId, materiais) : 0;
    /** Peça a partir do canto mais baixo, à esquerda e junto da parede. */
    const peca = (x: number, y: number, z: number, w: number, h: number, d: number, material: MeshStandardMaterial, borda = true) => {
      if (w > 0 && h > 0 && d > 0) colocar(new BoxGeometry(w, h, d), material, x + w / 2, y + h / 2, z0 + z + d / 2, borda);
    };
    /** Disco deitado (boca de fogão, ralo). */
    const disco = (x: number, y: number, z: number, raio: number, material: MeshStandardMaterial) =>
      colocar(new CylinderGeometry(raio, raio, 4, 32), material, x, y + 2, z, false);

    const e = espessuraDe(m.materialId, materiais);
    const corpo = daChapa(m.materialId);
    const { x, y, largura: L, altura: A, profundidade: P } = m;

    if (m.tipo === 'objeto') {
      const cor = coresObjeto[m.objeto ?? 'bancada'];
      const escuro = acabamento('#141414', 0.2);
      const vidro = acabamento('#1d2228', 0.15);
      switch (m.objeto) {
        case 'bancada':
          peca(x, y, 0, L, A, P, acabamento(cor, 0.35));
          break;
        case 'cuba': {
          // a cuba fica embutida na bancada, longe da parede; a torneira fica atrás dela
          const zc = 90;
          peca(x, y, zc, L, 3, P, acabamento(cor, 0.25, 0.8), false);
          peca(x + 25, y + 3, zc + 25, L - 50, 1, P - 50, escuro, false);
          peca(x + L / 2 - 15, y, zc - 60, 30, A, 30, acabamento(cor, 0.2, 0.9), false);
          peca(x + L / 2 - 12, y + A - 25, zc - 50, 24, 25, 110, acabamento(cor, 0.2, 0.9), false);
          break;
        }
        case 'cooktop':
          peca(x, y, 40, L, Math.max(A, 6), P, vidro, false);
          for (const [fx, fz, r] of [[0.27, 0.3, 55], [0.73, 0.3, 45], [0.27, 0.72, 45], [0.73, 0.72, 60]]) {
            disco(x + L * fx, y + Math.max(A, 6), z0 + 40 + P * fz, r, escuro);
          }
          break;
        case 'tv':
          peca(x, y, 30, L, A, 40, escuro, false);
          peca(x + 15, y + 15, 30.5, L - 30, A - 30, 40, vidro, false);
          break;
        case 'geladeira':
          peca(x, y, 0, L, A, P, acabamento(cor, 0.3, 0.5));
          peca(x, y + A * 0.68 - 2, P, L, 4, 1, escuro, false);
          peca(x + L * 0.85, y + A * 0.73, P, 18, A * 0.18, 30, metal, false);
          peca(x + L * 0.85, y + A * 0.3, P, 18, A * 0.3, 30, metal, false);
          break;
        case 'fogao':
          peca(x, y, 0, L, A, P, acabamento(cor, 0.3, 0.5));
          peca(x + L * 0.08, y + A * 0.15, P, L * 0.84, A * 0.5, 2, vidro, false);
          for (const [fx, fz] of [[0.28, 0.3], [0.72, 0.3], [0.28, 0.7], [0.72, 0.7]]) disco(x + L * fx, y + A, P * fz, 55, escuro);
          break;
        default:
          // micro-ondas e forno: caixa escura com vidro na frente
          peca(x, y, 20, L, A, P, acabamento(cor, 0.4));
          peca(x + L * 0.06, y + A * 0.15, 20 + P, L * (m.objeto === 'micro' ? 0.66 : 0.88), A * 0.6, 2, vidro, false);
      }
      continue;
    }

    if (m.tipo === 'prateleira') {
      peca(x, y, 0, L, e, P, corpo);
      continue;
    }
    if (m.tipo === 'base') {
      peca(x, y, 0, L, A, e, corpo);
      peca(x, y, P - e, L, A, e, corpo);
      peca(x, y, e, e, A, P - 2 * e, corpo);
      peca(x + L - e, y, e, e, A, P - 2 * e, corpo);
      continue;
    }
    if (m.tipo === 'envelope') {
      peca(x, y, 0, e, A, P, corpo);
      peca(x + L - e, y, 0, e, A, P, corpo);
      peca(x + e, y + A - e, 0, L - 2 * e, e, P, corpo);
      continue;
    }
    if (m.tipo === 'livre') {
      if (m.orientacao === 'deitada') peca(x, y, 0, L, e, P, corpo);
      else if (m.orientacao === 'lateral') peca(x, y, 0, e, A, P, corpo);
      else peca(x, y, 0, L, A, e, corpo); // painel de frente: direto na parede
      continue;
    }

    peca(x, y, 0, e, A, P, corpo);
    peca(x + L - e, y, 0, e, A, P, corpo);
    peca(x + e, y, 0, L - 2 * e, e, P, corpo);
    peca(x + e, y + A - e, 0, L - 2 * e, e, P, corpo);
    if (m.materialFundoId) peca(x, y, -z0, L, A, z0, daChapa(m.materialFundoId));
    if (m.frente !== 'gavetas') {
      vaosNaCaixa(m, materiais).forEach((v, i) => {
        const vx = x + v.x;
        if (i > 0) peca(vx - e, y + e, 0, e, A - 2 * e, P, corpo);
        const arrumacao = arrumacaoDoVao(v.vao, A, e);
        for (const py of arrumacao.prateleiras) peca(vx, y + py, 0, v.w, e, P - a.recuoPrateleira, corpo);
        if (arrumacao.cabideiro !== null) {
          // tubo deitado, de lado a lado do vão, no meio da profundidade
          colocar(new CylinderGeometry(12, 12, v.w, 20).rotateZ(Math.PI / 2), metal, vx + v.w / 2, y + arrumacao.cabideiro, z0 + P / 2, false);
        }
      });
    }

    const n = m.qtdFrente;
    const f = a.folgaPorta;
    const frente = daChapa(m.materialFrenteId);
    const eFrente = espessuraDe(m.materialFrenteId, materiais);

    if (m.frente === 'portas' && n > 0) {
      const dw = (L - f * (n + 1)) / n;
      const alturaPuxador = Math.min(Math.max(A * 0.12, 60), 200);
      for (let i = 0; i < n; i++) {
        const px = x + f + i * (dw + f);
        peca(px, y + f, P, dw, A - 2 * f, eFrente, frente);
        // puxador do lado que abre, perto do meio do módulo
        const hx = px + dw / 2 < x + L / 2 ? px + dw - 40 : px + 28;
        peca(hx, y + A / 2 - alturaPuxador / 2, P + eFrente, 12, alturaPuxador, 18, metal, false);
      }
    }

    if ((m.frente === 'gavetas' || m.frente === 'basculante') && n > 0) {
      const dh = (A - f * (n + 1)) / n;
      const larguraPuxador = Math.min(L * 0.3, 220);
      for (let i = 0; i < n; i++) {
        const py = y + f + i * (dh + f);
        peca(x + f, py, P, L - 2 * f, dh, eFrente, frente);
        // na basculante o puxador fica embaixo, de onde se levanta a porta
        const alturaPuxador = m.frente === 'basculante' ? py + Math.min(dh * 0.12, 50) : py + dh / 2 - 6;
        peca(x + L / 2 - larguraPuxador / 2, alturaPuxador, P + eFrente, larguraPuxador, 12, 18, metal, false);
      }
    }

    if (m.frente === 'correr' && n > 0) {
      const t = a.transpasseCorrer;
      const dw = larguraFolhaCorrer(L, n, t);
      const h = A - a.descontoAlturaCorrer;
      // trilho em cima e embaixo, na frente da caixa
      peca(x, y + A - 15, P, L, 15, TRILHO_CORRER, metal, false);
      peca(x, y, P, L, 10, TRILHO_CORRER, metal, false);
      for (let i = 0; i < n; i++) {
        // as folhas alternam entre a pista de trás e a da frente do trilho
        const z = P + 10 + (i % 2) * (eFrente + 15);
        const px = x + i * (dw - t);
        peca(px, y + a.descontoAlturaCorrer / 2, z, dw, h, eFrente, frente);
        const cx = i === 0 ? px + dw - t - 60 : px + t + 40;
        peca(cx, y + A / 2 - 60, z + eFrente, 20, 120, 2, metal, false);
      }
    }
  }

  return grupo;
}

interface Props {
  projeto: Projeto;
  /** Mostrado no lugar do 3D quando o aparelho não tem suporte (WebGL). */
  reserva: ReactNode;
}

export default function Movel3D({ projeto, reserva }: Props) {
  const tela = useRef<HTMLDivElement>(null);
  const [foto, setFoto] = useState('');
  const [semSuporte, setSemSuporte] = useState(false);

  useEffect(() => {
    const el = tela.current;
    if (!el) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setSemSuporte(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const materiaisCena: MaterialCena[] = [];
    const guardar = (m: MaterialCena) => {
      materiaisCena.push(m);
      return m;
    };

    const { paredes, ambiente } = projeto;
    const cena = new Scene();
    cena.background = new Color('#f7f4ef');
    const corParede = guardar(new MeshStandardMaterial({ color: new Color(ambiente.corParede), roughness: 0.95 }));

    // cada parede gira 90° em relação à anterior e começa onde a anterior termina
    const moveis = new Group();
    const origem = new Vector3();
    const direcao = new Vector3(1, 0, 0);
    const normais: Vector3[] = [];
    /** Pontos onde as paredes começam, mais o fim da última. */
    const cantos: Vector3[] = [];
    paredes.forEach((parede, i) => {
      cantos.push(origem.clone());
      const grupo = new Group();
      grupo.position.copy(origem);
      grupo.rotation.y = (-i * Math.PI) / 2;
      const plano = new Mesh(new PlaneGeometry(parede.largura, parede.altura), corParede);
      plano.position.set(parede.largura / 2, parede.altura / 2, 0);
      plano.receiveShadow = true;
      grupo.add(plano);
      const daParede = projeto.modulos.filter((m) => m.paredeId === parede.id);
      const conteudo = montarParede(projeto, daParede, guardar);
      grupo.add(conteudo);
      moveis.add(grupo);
      normais.push(new Vector3(Math.sin(grupo.rotation.y), 0, Math.cos(grupo.rotation.y)));
      origem.addScaledVector(direcao, parede.largura);
      direcao.set(-direcao.z, 0, direcao.x);
    });
    cantos.push(origem.clone());
    cena.add(moveis);

    // só os móveis definem o enquadramento; sem móveis, as paredes
    const caixa = new Box3();
    moveis.updateMatrixWorld(true);
    moveis.traverse((o) => {
      if (o instanceof Mesh && !(o.geometry instanceof PlaneGeometry)) caixa.expandByObject(o);
    });
    const temMovel = !caixa.isEmpty();
    if (!temMovel) caixa.setFromObject(moveis);
    caixa.expandByScalar(temMovel ? 250 : 0);
    const centro = caixa.getCenter(new Vector3());
    const raio = caixa.getSize(new Vector3()).length() / 2;

    // o piso vai até as paredes e se estende só para os lados abertos do ambiente
    const margem = Math.max(3000, raio * 3);
    let [x0, x1, z0, z1] = [Math.min(...cantos.map((c) => c.x)), Math.max(...cantos.map((c) => c.x)), Math.min(...cantos.map((c) => c.z)), Math.max(...cantos.map((c) => c.z))];
    [x0, x1, z0, z1] = [x0 - margem, x1 + margem, z0 - margem, z1 + margem];
    normais.forEach((n, i) => {
      const c = cantos[i];
      if (n.z > 0.5) z0 = c.z;
      if (n.z < -0.5) z1 = c.z;
      if (n.x > 0.5) x0 = c.x;
      if (n.x < -0.5) x1 = c.x;
    });
    const piso = new Mesh(
      new PlaneGeometry(x1 - x0, z1 - z0),
      guardar(new MeshStandardMaterial({ color: new Color(coresPiso[ambiente.piso]), roughness: 0.85 })),
    );
    piso.rotation.x = -Math.PI / 2;
    piso.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    piso.receiveShadow = true;
    cena.add(piso);

    // a câmera olha para o canto do ambiente, de frente para as paredes
    const olhar = normais.reduce((s, n) => s.add(n), new Vector3());
    if (paredes.length === 1) olhar.x += 0.45;
    // no U, olhar de frente esconde as portas das laterais: puxa a câmera para o lado da primeira parede
    if (paredes.length === 3) olhar.addScaledVector(normais[0], 0.55);
    olhar.normalize();
    olhar.y = 0.32;
    olhar.normalize();

    const maior = Math.max(raio * 2, ...paredes.map((p) => Math.max(p.largura, p.altura)));
    cena.add(new HemisphereLight(0xffffff, 0xd9cfc3, 2.3));
    const sol = new DirectionalLight(0xffffff, 1.5);
    sol.position.copy(centro).addScaledVector(olhar, maior * 1.6).add(new Vector3(0, maior, 0));
    sol.target.position.copy(centro);
    sol.castShadow = true;
    sol.shadow.mapSize.set(2048, 2048);
    sol.shadow.normalBias = 2;
    const sombra = sol.shadow.camera;
    sombra.left = sombra.bottom = -maior;
    sombra.right = sombra.top = maior;
    sombra.near = 10;
    sombra.far = maior * 6;
    cena.add(sol, sol.target);

    const camera = new PerspectiveCamera(35, 1.4, 10, 200000);
    const distancia = (raio / Math.sin((35 / 2) * (Math.PI / 180))) * 1.02;
    camera.position.copy(centro).addScaledVector(olhar, distancia);

    const controles = new OrbitControls(camera, renderer.domElement);
    controles.target.copy(centro);
    controles.maxPolarAngle = Math.PI / 2 - 0.05; // não deixa ver por baixo do piso
    controles.minDistance = raio * 0.4;
    controles.maxDistance = distancia * 3;
    controles.update();

    const desenhar = () => renderer.render(cena, camera);
    const tirarFoto = () => setFoto(renderer.domElement.toDataURL('image/jpeg', 0.9));
    const ajustarTamanho = () => {
      const w = el.clientWidth || 600;
      const h = Math.round(w * 0.72);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      desenhar();
    };

    controles.addEventListener('change', desenhar);
    controles.addEventListener('end', tirarFoto);
    const observador = new ResizeObserver(ajustarTamanho);
    observador.observe(el);
    ajustarTamanho();
    tirarFoto();

    return () => {
      observador.disconnect();
      controles.dispose();
      cena.traverse((o) => {
        if (o instanceof Mesh || o instanceof LineSegments) o.geometry.dispose();
      });
      materiaisCena.forEach((m) => m.dispose());
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [projeto]);

  if (semSuporte) return <>{reserva}</>;

  const u = projeto.ajustes.unidade;

  return (
    <figure className="movel-3d">
      <div ref={tela} className="tela-3d" />
      {foto && <img src={foto} alt="Móvel em 3D" className="foto-3d" />}
      <figcaption>
        <span className="so-tela">Arraste para girar · dois dedos para aproximar</span>
        <span>
          {projeto.paredes
            .map((p) => `${projeto.paredes.length > 1 ? p.nome : 'Parede'} ${fmtMedida(p.largura, u)} × ${fmtMedida(p.altura, u)} ${u}`)
            .join(' · ')}
        </span>
      </figcaption>
    </figure>
  );
}
