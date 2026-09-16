import { useEffect, useState } from "react";
import { obterAssinaturaImagemBlob } from "../api/utilizadores";

// Mostra a assinatura digitalizada de um utilizador, se existir. O
// endpoint exige autenticação (Bearer token), por isso não dá para usar
// <img src="/utilizadores/.../assinatura-imagem"> diretamente — vai-se
// buscar o Blob autenticado e cria-se um object URL local (mesmo padrão
// de obterAnexoBlob em api/anexos.ts).
export function AssinaturaImagem({
  utilizadorId,
  altura = 48,
  alt = "Assinatura",
}: {
  utilizadorId: string;
  altura?: number;
  alt?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelado = false;

    obterAssinaturaImagemBlob(utilizadorId)
      .then((blob) => {
        if (cancelado) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        // Sem imagem ou sem acesso — o selo de texto já existente continua a
        // ser suficiente, por isso falha-se em silêncio.
      });

    return () => {
      cancelado = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [utilizadorId]);

  if (!url) return null;

  return <img src={url} alt={alt} style={{ height: altura, width: "auto", display: "block", objectFit: "contain" }} />;
}
