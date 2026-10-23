import { CampoNumero, CampoTexto, CampoTextoLongo, Linha, Opcoes } from '../componentes/campos';
import { extrasZerados, novaParede } from '../estado';
import type { Ajustes, Projeto, Unidade } from '../types';

interface Props {
  projeto: Projeto;
  atualizar: (parcial: Partial<Projeto>) => void;
}

/** Diminui a imagem para no máximo 400 px, para caber no armazenamento do aparelho. */
async function lerLogo(arquivo: File): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    await new Promise<void>((ok, erro) => {
      img.onload = () => ok();
      img.onerror = () => erro(new Error('imagem inválida'));
      img.src = url;
    });
    const escala = Math.min(1, 400 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AbaAjustes({ projeto, atualizar }: Props) {
  const a = projeto.ajustes;
  const mudar = (parcial: Partial<Ajustes>) => atualizar({ ajustes: { ...a, ...parcial } });

  return (
    <>
      <section className="cartao">
        <h2>Sua empresa</h2>
        <p className="dica">Aparece no orçamento que vai para o cliente.</p>
        <CampoTexto rotulo="Nome da empresa" valor={a.empresa} aoMudar={(empresa) => mudar({ empresa })} dica="Ex: Marcenaria Silva" />
        <CampoTexto rotulo="Telefone / WhatsApp" valor={a.telefone} aoMudar={(telefone) => mudar({ telefone })} dica="(11) 90000-0000" />
        <div className="campo">
          <span>Logo</span>
          <div className="logo-linha">
            {a.logo && <img src={a.logo} alt="Logo da empresa" />}
            <label className="btn">
              {a.logo ? 'Trocar' : 'Escolher imagem'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const arquivo = e.target.files?.[0];
                  e.target.value = '';
                  if (!arquivo) return;
                  try {
                    mudar({ logo: await lerLogo(arquivo) });
                  } catch {
                    alert('Não consegui abrir essa imagem. Tente outra (PNG ou JPG).');
                  }
                }}
              />
            </label>
            {a.logo && (
              <button className="btn btn-perigo" onClick={() => mudar({ logo: '' })}>
                Remover
              </button>
            )}
          </div>
        </div>
        <CampoTextoLongo rotulo="Condições do orçamento" valor={a.condicoes} aoMudar={(condicoes) => mudar({ condicoes })} />
      </section>

      <section className="cartao">
        <h2>Preço de venda</h2>
        <Linha>
          <CampoNumero rotulo="Multiplicador do material" valor={a.fatorVenda} sufixo="×" aoMudar={(fatorVenda) => mudar({ fatorVenda })} />
          <CampoNumero rotulo="Impostos e taxas" valor={a.impostos} sufixo="%" aoMudar={(impostos) => mudar({ impostos })} />
        </Linha>
        <p className="dica">
          Preço sugerido = materiais × multiplicador + mão de obra e outros custos. Impostos e taxas (nota, maquininha) entram por cima,
          para saírem do preço e não do seu lucro.
        </p>
      </section>

      <section className="cartao">
        <h2>Ferragens</h2>
        <Linha>
          <CampoNumero rotulo="Dobradiça" valor={a.precoDobradica} sufixo="R$" aoMudar={(precoDobradica) => mudar({ precoDobradica })} />
          <CampoNumero rotulo="Corrediça (par)" valor={a.precoCorredica} sufixo="R$" aoMudar={(precoCorredica) => mudar({ precoCorredica })} />
        </Linha>
        <CampoNumero rotulo="Puxador" valor={a.precoPuxador} sufixo="R$" aoMudar={(precoPuxador) => mudar({ precoPuxador })} />
      </section>

      <section className="cartao">
        <h2>Fita de borda</h2>
        <Linha>
          <CampoNumero rotulo="Preço do metro" valor={a.precoFita} sufixo="R$" aoMudar={(precoFita) => mudar({ precoFita })} />
          <CampoNumero rotulo="Margem de perda" valor={a.margemFita} sufixo="%" aoMudar={(margemFita) => mudar({ margemFita })} />
        </Linha>
      </section>

      <section className="cartao">
        <h2>Montagem dos módulos</h2>
        <Linha>
          <CampoNumero rotulo="Folga de porta" valor={a.folgaPorta} sufixo="mm" aoMudar={(folgaPorta) => mudar({ folgaPorta })} />
          <CampoNumero rotulo="Folga corrediça (lado)" valor={a.folgaCorredica} sufixo="mm" aoMudar={(folgaCorredica) => mudar({ folgaCorredica })} />
        </Linha>
        <CampoNumero rotulo="Recuo da prateleira" valor={a.recuoPrateleira} sufixo="mm" aoMudar={(recuoPrateleira) => mudar({ recuoPrateleira })} />
      </section>

      <section className="cartao">
        <h2>Corte</h2>
        <Linha>
          <CampoNumero rotulo="Espessura da serra" valor={a.serra} sufixo="mm" aoMudar={(serra) => mudar({ serra })} />
          <CampoNumero rotulo="Refilo da borda" valor={a.refilo} sufixo="mm" aoMudar={(refilo) => mudar({ refilo })} />
        </Linha>
        <CampoNumero rotulo="Sobra aproveitável a partir de" valor={a.sobraMinima} sufixo="mm" aoMudar={(sobraMinima) => mudar({ sobraMinima })} />
      </section>

      <section className="cartao">
        <h2>Medidas</h2>
        <Opcoes<Unidade>
          rotulo="Unidade das medidas"
          valor={a.unidade}
          opcoes={[
            { valor: 'cm', texto: 'Centímetros' },
            { valor: 'mm', texto: 'Milímetros' },
          ]}
          aoMudar={(unidade) => mudar({ unidade })}
        />
      </section>

      <button
        className="btn btn-perigo largo"
        onClick={() => {
          if (confirm('Começar um projeto novo? Cliente, módulos e custos serão apagados. Chapas, modelos e ajustes continuam.')) {
            atualizar({ cliente: '', paredes: [novaParede(1)], modulos: [], extras: extrasZerados, precoFinal: null });
          }
        }}
      >
        Novo projeto
      </button>
    </>
  );
}
