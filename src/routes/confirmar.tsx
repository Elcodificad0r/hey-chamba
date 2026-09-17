/* Pantalla a la que llega la persona desde el enlace del correo.
   Aquí se da por confirmado el correo y, con eso, nace su QR real. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Globe, Mail } from "lucide-react";
import { confirmarCorreo } from "@/lib/registros.functions";
import { PaseQR } from "@/components/PaseQR";
import { formArt } from "@/lib/heychamba-assets";

export const Route = createFileRoute("/confirmar")({
  head: () => ({ meta: [
    { title: "Confirma tu correo — HeyChamba" },
    { name: "description", content: "Confirma tu correo y recibe tu QR de HeyChamba." },
    { name: "robots", content: "noindex" },
  ]}),
  component: Confirmar,
  validateSearch: (search: { token?: string }) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
});

type Estado = "verificando" | "listo" | "invalido" | "error";

function Confirmar() {
  const { token } = Route.useSearch();
  const [estado, setEstado] = useState<Estado>(token ? "verificando" : "invalido");
  const [registro, setRegistro] = useState<{ nombre: string; email: string; qrToken: string } | null>(null);
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current || !token) return;
    yaCorrio.current = true;
    void confirmarCorreo({ data: { token } })
      .then(res => {
        if (!res) { setEstado("invalido"); return; }
        setRegistro(res);
        setEstado("listo");
      })
      .catch(() => setEstado("error"));
  }, [token]);

  return <main className="survey-original survey-violet">
    <div className="survey-grid" aria-hidden="true" />
    <section className="survey-question-panel">
      <div className="survey-finish">
        <div className="finish-icons"><img src={formArt.finishA} alt=""/><img src={formArt.finishB} alt=""/><img src={formArt.finishC} alt=""/></div>

        {estado === "verificando" && <>
          <h1>Confirmando…</h1>
          <p>Danos un segundo, estamos verificando tu correo.</p>
        </>}

        {estado === "listo" && registro && <>
          <h1>{registro.nombre ? `${registro.nombre.split(" ")[0]}, ¡correo confirmado!` : "¡Correo confirmado!"}</h1>
          <p>Este es tu QR. Es tu pase: con él entras al festival y con él tomamos tu asistencia. Guárdalo en tu celular.</p>
          <PaseQR qrToken={registro.qrToken} nombre={registro.nombre}/>
          {registro.email && <div className="verify-mail"><Mail/><div><strong>Correo confirmado</strong><span>{registro.email}</span></div></div>}
        </>}

        {estado === "invalido" && <>
          <h1>Ese enlace ya no sirve</h1>
          <p>Puede que sea de otro registro o que ya haya caducado. Vuelve a tu registro y pide que te mandemos el correo otra vez.</p>
        </>}

        {estado === "error" && <>
          <h1>Algo se atoró</h1>
          <p>No pudimos confirmar tu correo en este momento. Intenta abrir el enlace de nuevo en un ratito.</p>
        </>}

        <Link to="/" className="survey-next"><Globe/> Volver al inicio</Link>
      </div>
    </section>
  </main>;
}
