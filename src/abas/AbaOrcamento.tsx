import { useMemo, useState } from 'react';
import { calcular, listaDeCompras, precoDe, temSugestaoDeMaoDeObra } from '../calculo';
import { CampoNumero, Linha, Opcoes } from '../componentes/campos';
import { DocumentoOrcamento, textoParaCliente } from '../componentes/Documento';
import { ListaDeCompras } from '../componentes/ListaCompras';
import { situacoes } from '../estado';
import type { Extras, Projeto, Situacao } from '../types';
import { fmtData, fmtNum, fmtReais } from '../unidades';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
  aoDuplicar: () => void;
  aoExcluir: () => void;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

export function AbaOrcamento({ projeto, atualizar, aoDuplicar, aoExcluir }: Props) {
  const o = useMemo(() => calcular(projeto), [projeto]);
  const [documento, setDocumento] = useState(false);
  const [compras, setCompras] = useState(false);
  // a lista de compras sai depois que o orçamento foi enviado; recusado não precisa comprar
  const temCompras = projeto.situacao === 'enviado' || projeto.situacao === 'aprovado';
  const { ajustes: a, extras } = projeto;
  const mudarExtras = (parcial: Partial<Extras>) => atualizar({ extras: { ...extras, ...parcial } });

  const acoes = (
    <div className="acoes-orcamento">
      <button className="btn" onClick={aoDuplicar}>
        Duplicar
      </button>
      <button
        className="btn btn-perigo"
        onClick={() => {
          if (confirm(`Excluir o orçamento nº ${projeto.codigo}? Não dá para desfazer.`)) aoExcluir();
        }}
      >
        Excluir
      </button>
    </div>
  );

  if (projeto.modulos.length === 0) {
    return (
      <>
        <p className="vazio">Monte o móvel na aba Projeto para fazer o orçamento.</p>
        {acoes}
      </>
    );
  }

  const preco = precoDe(projeto, o);
  const impostos = (preco * a.impostos) / 100;
  const lucro = preco - o.custoTotal - impostos;
  const chapas = o.porMaterial.reduce((s, r) => s + r.chapas.length, 0);

  return (
    <>
      <section className="cartao">
        <div className="situacao-opcoes">
          <Opcoes<Situacao> rotulo="Situação" valor={projeto.situacao} opcoes={situacoes} aoMudar={(situacao) => atualizar({ situacao })} />
        </div>
        {projeto.enviadoEm && (
          <p className="dica">
            Os preços deste orçamento ficaram como estavam em {fmtData(projeto.enviadoEm)}. Para usar os preços de hoje, volte para
            Rascunho.
          </p>
        )}
      </section>

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
        {o.ferragens.length === 0 && (
          <div className="linha-resumo">
            <span>Sem ferragens</span>
            <span>{fmtReais(0)}</span>
          </div>
        )}
        {o.ferragens.map((f) => (
          <div key={`${f.nome}|${f.preco}`} className="linha-resumo">
            <span>
              {fmtNum(f.qtd)}× {f.nome}
            </span>
            <span>{fmtReais(f.qtd * f.preco)}</span>
          </div>
        ))}
        <div className="linha-resumo total">
          <span>Total de materiais</span>
          <strong>{fmtReais(o.custoMateriais)}</strong>
        </div>
      </section>

      <section className="cartao">
        <h2>Mão de obra e outros custos</h2>
        <Linha>
          <CampoNumero rotulo="Mão de obra" valor={o.maoDeObra} sufixo="R$" aoMudar={(maoDeObra) => mudarExtras({ maoDeObra })} />
          <CampoNumero rotulo="Instalação" valor={o.instalacao} sufixo="R$" aoMudar={(instalacao) => mudarExtras({ instalacao })} />
        </Linha>
        {temSugestaoDeMaoDeObra(a) ? (
          <p className="dica">
            Sugestão para {fmtNum(o.area, 2)} m² de móveis: mão de obra {fmtReais(o.maoDeObraSugerida)} e instalação{' '}
            {fmtReais(o.instalacaoSugerida)}.
          </p>
        ) : (
          <p className="dica">Para o app já sugerir a mão de obra e a instalação, coloque os valores por m² na aba Ajustes.</p>
        )}
        {(o.maoDeObra !== o.maoDeObraSugerida || o.instalacao !== o.instalacaoSugerida) && temSugestaoDeMaoDeObra(a) && (
          <button className="btn" onClick={() => mudarExtras({ maoDeObra: null, instalacao: null })}>
            Voltar à sugestão
          </button>
        )}
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
        onClick={() => projeto.situacao === 'rascunho' && atualizar({ situacao: 'enviado' })}
      >
        Enviar orçamento no WhatsApp
      </a>
      {temCompras && (
        <button className="btn largo" onClick={() => setCompras(true)}>
          🛒 Lista de compras
        </button>
      )}

      {acoes}

      {compras && <ListaDeCompras projeto={projeto} lista={listaDeCompras(projeto, o)} aoFechar={() => setCompras(false)} />}
      {documento && <DocumentoOrcamento projeto={projeto} preco={preco} aoFechar={() => setDocumento(false)} />}
    </>
  );
}
