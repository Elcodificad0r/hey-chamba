/* El pase: a esto apunta el QR. Se abre con /pase?p=<token>.
   El token es la única llave; sin él no hay pase que mostrar. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { consultarPase } from "@/lib/registros.functions";
import { PaseQR } from "@/components/PaseQR";
import { formArt } from "@/lib/heychamba-assets";
import { meta } from "@/lib/seo";

export const Route = createFileRoute("/pase")({
  head: () => meta({
    titulo: "Tu pase — HeyChamba",
    descripcion: "Tu pase HeyChamba con tu QR de acceso al festival.",
    ruta: "/pase",
    privada: true,
  }),
  component: Pase,
  validateSearch: (search: { p?: string }) => ({
    p: typeof search.p === "string" ? search.p : "",
  }),
});

function Pase() {
  const { p: token } = Route.useSearch();
  const [pase, setPase] = useState<{ nombre: string; qrEmitido: boolean } | null>(null);
  const [cargando, setCargando] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    void consultarPase({ data: { token } })
      .then(res => setPase(res))
      .catch(() => setPase(null))
      .finally(() => setCargando(false));
  }, [token]);

  return <main className="survey-original survey-violet">
    <div className="survey-grid" aria-hidden="true" />
    <section className="survey-question-panel">
      <div className="survey-finish">
        <div className="finish-icons"><img src={formArt.finishA} alt=""/><img src={formArt.finishB} alt=""/><img src={formArt.finishC} alt=""/></div>

        {cargando ? <><h1>Buscando tu pase…</h1><p>Danos un segundo.</p></>
          : !pase ? <>
            <h1>No encontramos ese pase</h1>
            <p>La liga no es válida o el correo de ese registro todavía no está confirmado.</p>
          </> : <>
            <h1>{pase.nombre ? `Pase de ${pase.nombre.split(" ")[0]}` : "Tu pase"}</h1>
            <p>Muestra este QR para entrar al festival y para que te registremos la asistencia.</p>
            <PaseQR qrToken={token} nombre={pase.nombre} leyenda="Correo confirmado"/>
          </>}

        <Link to="/" className="survey-next"><Globe/> Volver al inicio</Link>
      </div>
    </section>
  </main>;
}
