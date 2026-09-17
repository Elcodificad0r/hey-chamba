/* El QR confirmado, con sus botones para llevárselo.
   Solo se dibuja cuando ya hay token: si no hay, no hay pase. */
import { useRef, useState } from "react";
import { Check, Download, Share } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { compartirQR, descargarQR, puedeCompartir, valorQR } from "@/lib/pase";

export function PaseQR({ qrToken, nombre, leyenda = "Tu pase está listo" }: { qrToken: string; nombre: string; leyenda?: string }) {
  const caja = useRef<HTMLDivElement>(null);
  const [compartible] = useState(puedeCompartir);
  const lienzo = () => caja.current?.querySelector("canvas") ?? null;

  return <div className="qr-pase">
    <div ref={caja} className="qr-live">
      <QRCodeCanvas value={valorQR(qrToken)} size={176} level="M" marginSize={2} bgColor="#ffffff" fgColor="#111111"/>
      <span><Check/> {leyenda}</span>
    </div>
    <div className="qr-acciones">
      {compartible && <Button type="button" onClick={() => void compartirQR(lienzo(), nombre)} className="qr-accion">
        <Share/> Guardar en Fotos
      </Button>}
      <Button type="button" onClick={() => descargarQR(lienzo(), nombre)} className="qr-accion qr-accion-suave">
        <Download/> Descargar PNG
      </Button>
    </div>
  </div>;
}
