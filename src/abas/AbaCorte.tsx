import { useMemo } from 'react';
import { calcular, type Orcamento } from '../calculo';
import { DesenhoChapa } from '../componentes/DesenhoChapa';
import type { Projeto } from '../types';
import { fmtDim, fmtNum, fmtReais } from '../unidades';

function textoResumo(cliente: string, o: Orcamento) {
  const linhas = [`*Materiais${cliente ? ` – ${cliente}` : ''}*`, ''];
  for (const r of o.porMaterial) {
    const n = r.chapas.length;
    linhas.push(`${r.material.nome}: ${n} chapa${n === 1 ? '' : 's'} = ${fmtReais(r.custo)}`);
  }
  if (o.fitaMetros > 0) linhas.push(`Fita de borda: ${fmtNum(o.fitaMetros)} m = ${fmtReais(o.custoFita)}`);
  linhas.push('', `*Total de materiais: ${fmtReais(o.custoChapas + o.custoFita)}*`);
  return linhas.join('\n');
}

export function AbaCorte({ projeto }: { projeto: Projeto }) {
  const orcamento = useMemo(() => calcular(projeto), [projeto]);
  const { ajustes } = projeto;
  const u = ajustes.unidade;

  if (orcamento.totalPecas === 0) {
    return <p className="vazio">Adicione módulos ou peças na aba Projeto para ver o plano de corte.</p>;
  }

  return (
    <>
      <section className="cartao resumo">
        <h2>Resumo de materiais</h2>
        {orcamento.porMaterial.map((r) => (
          <div className="linha-resumo" key={r.material.id}>
            <span>{r.material.nome}</span>
            <span>
              {r.chapas.length} × {fmtReais(r.material.preco)} = <strong>{fmtReais(r.custo)}</strong>
            </span>
          </div>
        ))}
        {orcamento.fitaMetros > 0 && (
          <div className="linha-resumo">
            <span>Fita de borda (+{ajustes.margemFita}%)</span>
            <span>
              {fmtNum(orcamento.fitaMetros)} m = <strong>{fmtReais(orcamento.custoFita)}</strong>
            </span>
          </div>
        )}
        <div className="linha-resumo total">
          <span>Total</span>
          <strong>{fmtReais(orcamento.custoChapas + orcamento.custoFita)}</strong>
        </div>
        <a
          className="btn btn-whats"
          href={`https://wa.me/?text=${encodeURIComponent(textoResumo(projeto.cliente, orcamento))}`}
          target="_blank"
          rel="noreferrer"
        >
          Enviar resumo no WhatsApp
        </a>
      </section>

      {orcamento.semMaterial.length > 0 && (
        <p className="alerta">{orcamento.semMaterial.length} peça(s) usam uma chapa que foi excluída e ficaram fora do cálculo.</p>
      )}

      {orcamento.porMaterial.map((r) => (
        <section key={r.material.id}>
          <div className="secao-topo">
            <h2>{r.material.nome}</h2>
            <span className="selo">
              {r.chapas.length} chapa{r.chapas.length === 1 ? '' : 's'}
            </span>
          </div>
          {r.naoCabem.length > 0 && (
            <p className="alerta">
              Não cabem na chapa: {r.naoCabem.map((i) => `${i.origem} · ${i.nome} (${fmtDim(i.c, i.l, u)})`).join(', ')}
            </p>
          )}
          {r.chapas.map((ch, i) => (
            <DesenhoChapa key={i} numero={i + 1} material={r.material} chapa={ch} sobraMinima={ajustes.sobraMinima} unidade={u} />
          ))}
        </section>
      ))}
    </>
  );
}
