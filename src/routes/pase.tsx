/* El pase: a esto apunta el QR. Se abre con /pase?folio=…
   Hoy solo muestra quién es y si su correo ya está confirmado;
   más adelante de aquí cuelga el acceso al festival y la asistencia. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Globe, LockKeyhole } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { estadoConfirmacion } from "@/lib/registros.functions";
import { valorQR } from "@/lib/pase";
import { formArt } from "@/lib/heychamba-assets";

export const Route = createFileRoute("/pase")({
  head: () => ({ meta: [
    { title: "Tu pase — HeyChamba" },
    { name: "description", content: "Tu pase HeyChamba con tu QR de acceso." },
    { name: "robots", content: "noindex" },
  ]}),
  component: Pase,
  validateSearch: (search: { folio?: string }) => ({
    folio: typeof search.folio === "string" ? search.folio : "",
  }),
});

type Pase = { folio: string; nombre: string; correoConfirmado: boolean; qrEmitido: boolean };

function Pase() {
  const { folio } = Route.useSearch();
  const [pase, setPase] = useState<Pase | null>(null);
  const [cargando, setCargando] = useState(Boolean(folio));

  useEffect(() => {
    if (!folio) return;
    void estadoConfirmacion({ data: { folio } })
      .then(res => setPase(res))
      .catch(() => setPase(null))
      .finally(() => setCargando(false));
  }, [folio]);

  return <main className="survey-original survey-violet">
    <div className="survey-grid" aria-hidden="true" />
    <section className="survey-question-panel">
      <div className="survey-finish">
        <div className="finish-icons"><img src={formArt.finishA} alt=""/><img src={formArt.finishB} alt=""/><img src={formArt.finishC} alt=""/></div>

        {cargando ? <><h1>Buscando tu pase…</h1><p>Danos un segundo.</p></>
          : !pase ? <><h1>No encontramos ese pase</h1><p>Revisa la liga o vuelve a escanear tu QR.</p></>
          : <>
            <h1>{pase.nombre ? `Pase de ${pase.nombre.split(" ")[0]}` : "Tu pase"}</h1>
            {pase.qrEmitido ? <>
              <p>Muestra este QR para entrar al festival y para que te registremos la asistencia.</p>
              <div className="qr-live">
                <QRCodeCanvas value={valorQR(pase.folio)} size={176} level="M" marginSize={2} bgColor="#ffffff" fgColor="#111111"/>
                <span><Check/> Correo confirmado</span>
              </div>
            </> : <>
              <p>Tu perfil está guardado, pero todavía falta confirmar tu correo. Abre el enlace que te mandamos y tu pase se desbloquea.</p>
              <div className="qr-placeholder"><div/><span><LockKeyhole/> Bloqueado</span></div>
            </>}
            <div className="folio-card">
              <span>Tu ID de registro</span>
              <strong>{pase.folio}</strong>
              <small>Con este ID te identificamos en HeyChamba.</small>
            </div>
          </>}

        <Link to="/" className="survey-next"><Globe/> Volver al inicio</Link>
      </div>
    </section>
  </main>;
}
