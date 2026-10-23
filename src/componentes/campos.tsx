import { useEffect, useState, type ReactNode } from 'react';
import type { Material, Unidade } from '../types';
import { deExibir, lerNumero, paraExibir } from '../unidades';

const paraTexto = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

interface CampoNumeroProps {
  rotulo: string;
  valor: number;
  aoMudar: (v: number) => void;
  /** Quando informada, o valor (em mm) é exibido e digitado nessa unidade. */
  unidade?: Unidade;
  sufixo?: string;
  inteiro?: boolean;
}

export function CampoNumero({ rotulo, valor, aoMudar, unidade, sufixo, inteiro }: CampoNumeroProps) {
  const exibido = unidade ? paraExibir(valor, unidade) : valor;
  const [texto, setTexto] = useState(paraTexto(exibido));
  const [focado, setFocado] = useState(false);

  useEffect(() => {
    if (!focado) setTexto(paraTexto(exibido));
  }, [exibido, focado]);

  return (
    <label className="campo">
      <span>{rotulo}</span>
      <div className="campo-caixa">
        <input
          inputMode={inteiro ? 'numeric' : 'decimal'}
          value={texto}
          onFocus={(e) => {
            setFocado(true);
            e.target.select();
          }}
          onBlur={() => setFocado(false)}
          onChange={(e) => {
            setTexto(e.target.value);
            const n = lerNumero(e.target.value);
            if (n === null) return;
            const v = inteiro ? Math.max(0, Math.round(n)) : n;
            aoMudar(unidade ? deExibir(v, unidade) : v);
          }}
        />
        {(sufixo ?? unidade) && <em>{sufixo ?? unidade}</em>}
      </div>
    </label>
  );
}

interface CampoTextoProps {
  rotulo: string;
  valor: string;
  aoMudar: (v: string) => void;
  dica?: string;
}

export function CampoTexto({ rotulo, valor, aoMudar, dica }: CampoTextoProps) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <div className="campo-caixa">
        <input value={valor} placeholder={dica} onChange={(e) => aoMudar(e.target.value)} />
      </div>
    </label>
  );
}

export function CampoTextoLongo({ rotulo, valor, aoMudar, dica }: CampoTextoProps) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <div className="campo-caixa">
        <textarea rows={4} value={valor} placeholder={dica} onChange={(e) => aoMudar(e.target.value)} />
      </div>
    </label>
  );
}

interface CampoMaterialProps {
  rotulo: string;
  valor: string | null;
  aoMudar: (id: string | null) => void;
  materiais: Material[];
  /** Texto da opção "nenhum"; sem ele, a escolha é obrigatória. */
  opcaoVazia?: string;
}

export function CampoMaterial({ rotulo, valor, aoMudar, materiais, opcaoVazia }: CampoMaterialProps) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      <div className="campo-caixa">
        <select value={valor ?? ''} onChange={(e) => aoMudar(e.target.value || null)}>
          {opcaoVazia && <option value="">{opcaoVazia}</option>}
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

interface OpcoesProps<T extends string | number> {
  rotulo: string;
  valor: T;
  opcoes: { valor: T; texto: string }[];
  aoMudar: (v: T) => void;
}

export function Opcoes<T extends string | number>({ rotulo, valor, opcoes, aoMudar }: OpcoesProps<T>) {
  return (
    <div className="campo">
      <span>{rotulo}</span>
      <div className="opcoes">
        {opcoes.map((o) => (
          <button key={o.valor} type="button" className={o.valor === valor ? 'ativo' : ''} onClick={() => aoMudar(o.valor)}>
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Linha({ children }: { children: ReactNode }) {
  return <div className="linha-campos">{children}</div>;
}
