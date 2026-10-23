import { useEffect, useState } from 'react';

const DEZ_MINUTOS = 10 * 60 * 1000;

/**
 * Confere se saiu versão nova: ao abrir, ao voltar para o app e a cada 10 minutos.
 * Atualizar é só recarregar: o app busca os arquivos novos e os projetos continuam no aparelho.
 */
export function AvisoAtualizacao() {
  const [novaVersao, setNovaVersao] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const verificar = async () => {
      try {
        const resposta = await fetch(`./versao.json?t=${Date.now()}`, { cache: 'no-store' });
        const { versao } = (await resposta.json()) as { versao?: string };
        if (versao && versao !== __VERSAO__) setNovaVersao(true);
      } catch {
        // sem internet: confere na próxima vez
      }
      navigator.serviceWorker
        ?.getRegistration()
        .then((r) => r?.update())
        .catch(() => {});
    };
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') verificar();
    };
    verificar();
    const timer = setInterval(verificar, DEZ_MINUTOS);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, []);

  if (!novaVersao) return null;
  return (
    <div className="aviso-atualizacao" role="status">
      <span>Nova versão disponível</span>
      <button className="btn" onClick={() => location.reload()}>
        Atualizar
      </button>
    </div>
  );
}
