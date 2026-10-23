import { useMemo, useState } from 'react';
import { calcular, precoDe } from '../calculo';
import { CampoNumero, Linha } from '../componentes/campos';
import { DocumentoOrcamento, textoParaCliente } from '../componentes/Documento';
import type { Extras, Projeto } from '../types';
import { fmtNum, fmtReais } from '../unidades';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function AbaOrcamento({ projeto, atualizar }: Props) {
  const o = useMemo(() => calcular(projeto), [projeto]);
  const [documento, setDocumento] = useState(false);
  const { ajustes: a, extras } = projeto;
  const mudarExtras = (parcial: Partial<Extras>) => atualizar({ extras: { ...extras, ...parcial } });

  if (projeto.modulos.length === 0) {
    return <p className="vazio">Monte o móvel na aba Projeto para fazer o orçamento.</p>;
  }

  const preco = precoDe(projeto, o);
  const impostos = (preco * a.impostos) / 100;
  const lucro = preco - o.custoTotal - impostos;
  const chapas = o.porMaterial.reduce((s, r) => s + r.chapas.length, 0);
  const f = o.ferragens;
  const ferragens = [
    f.dobradicas > 0 && plural(f.dobradicas, 'dobradiça', 'dobradiças'),
    f.corredicas > 0 && plural(f.corredicas, 'par de corrediças', 'pares de corrediças'),
    f.puxadores > 0 && plural(f.puxadores, 'puxador', 'puxadores'),
  ].filter(Boolean);

  return (
    <>
      <section className="cartao resumo">
        <h2>Materiais</h2>
        <div className="linha-resumo">
          <span>{plural(chapas, 'chapa', 'chapas')}</span>
          <span>{fmtReais(o.custoChapas)}</span>
        </div>
        <div className="linha-resumo">
          <span>Fita de borda ({fmtNum(o.fitaMetros)} m)</span>
          <span>{fmtReais(o.custoFita)}</span>
        </div>
        <div className="linha-resumo">
          <span>{ferragens.length > 0 ? ferragens.join(', ') : 'Sem ferragens'}</span>
          <span>{fmtReais(o.custoFerragens)}</span>
        </div>
        <div className="linha-resumo total">
          <span>Total de materiais</span>
          <strong>{fmtReais(o.custoMateriais)}</strong>
        </div>
      </section>

      <section className="cartao">
        <h2>Mão de obra e outros custos</h2>
        <Linha>
          <CampoNumero rotulo="Mão de obra" valor={extras.maoDeObra} sufixo="R$" aoMudar={(maoDeObra) => mudarExtras({ maoDeObra })} />
          <CampoNumero rotulo="Instalação" valor={extras.instalacao} sufixo="R$" aoMudar={(instalacao) => mudarExtras({ instalacao })} />
        </Linha>
        <Linha>
          <CampoNumero rotulo="Frete" valor={extras.frete} sufixo="R$" aoMudar={(frete) => mudarExtras({ frete })} />
          <CampoNumero rotulo="Outros (cola, parafusos…)" valor={extras.outros} sufixo="R$" aoMudar={(outros) => mudarExtras({ outros })} />
        </Linha>
        <div className="linha-resumo total">
          <span>Custo total</span>
          <strong>{fmtReais(o.custoTotal)}</strong>
        </div>
      </section>

      <section className="cartao resumo">
        <h2>Preço</h2>
        <p className="dica">
          Sugerido: materiais × {fmtNum(a.fatorVenda, 2)} + mão de obra e outros custos
          {a.impostos > 0 ? ` + ${fmtNum(a.impostos)}% de impostos` : ''} = <strong>{fmtReais(o.precoSugerido)}</strong>
        </p>
        <CampoNumero rotulo="Preço para o cliente" valor={preco} sufixo="R$" aoMudar={(precoFinal) => atualizar({ precoFinal })} />
        {projeto.precoFinal !== null && projeto.precoFinal !== o.precoSugerido && (
          <button className="btn" onClick={() => atualizar({ precoFinal: null })}>
            Voltar ao preço sugerido
          </button>
        )}
        {a.impostos > 0 && (
          <div className="linha-resumo">
            <span>Impostos e taxas ({fmtNum(a.impostos)}%)</span>
            <span>− {fmtReais(impostos)}</span>
          </div>
        )}
        <div className="linha-resumo">
          <span>Custo total</span>
          <span>− {fmtReais(o.custoTotal)}</span>
        </div>
        <div className={`linha-resumo total${lucro < 0 ? ' negativo' : ''}`}>
          <span>Lucro estimado</span>
          <strong>
            {fmtReais(lucro)}
            {preco > 0 && <small> ({fmtNum((lucro / preco) * 100, 0)}%)</small>}
          </strong>
        </div>
        {lucro < 0 && <p className="alerta">Com esse preço, o serviço dá prejuízo.</p>}
      </section>

      <button className="btn btn-principal largo" onClick={() => setDocumento(true)}>
        Ver orçamento do cliente / PDF
      </button>
      <a
        className="btn btn-whats largo"
        href={`https://wa.me/?text=${encodeURIComponent(textoParaCliente(projeto, preco))}`}
        target="_blank"
        rel="noreferrer"
      >
        Enviar orçamento no WhatsApp
      </a>

      {documento && <DocumentoOrcamento projeto={projeto} preco={preco} aoFechar={() => setDocumento(false)} />}
    </>
  );
}
