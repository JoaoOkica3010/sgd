import { useEffect, useState } from "react";
import QRCode from "qrcode";

// QR gerado no browser (biblioteca "qrcode", sem chamadas a serviços
// externos) — usado para o link de verificação de assinaturas na Ficha.
export function CodigoQR({ valor, tamanho = 84 }: { valor: string; tamanho?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(valor, { margin: 1, width: tamanho * 2 })
      .then((dataUrl) => {
        if (!cancelado) setUrl(dataUrl);
      })
      .catch(() => {
        // Sem QR não é crítico — o código de verificação em texto já chega.
      });
    return () => {
      cancelado = true;
    };
  }, [valor, tamanho]);

  if (!url) return null;

  return <img src={url} alt="QR de verificação" width={tamanho} height={tamanho} style={{ display: "block" }} />;
}
