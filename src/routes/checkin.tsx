/* LA PUERTA DEL FESTIVAL
   Pantalla para el equipo: se apunta la cámara al QR de la persona y
   queda registrada su entrada. No es para el público. */
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, TriangleAlert, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { registrarAsistencia, resumenAsistencia, revisarAccesoStaff } from "@/lib/asistencia.functions";
import { iniciarLector, sonar, tokenDesdeQR, type Lector } from "@/lib/lector-qr";

export const Route = createFileRoute("/checkin")({
  head: () => ({ meta: [
    { title: "Asistencia — HeyChamba" },
    { name: "robots", content: "noindex, nofollow" },
  ]}),
  component: CheckIn,
});

const GUARDADO = "heychamba-staff";
type Resultado =
  | { estado: "entrada"; nombre: string }
  | { estado: "ya_usado"; nombre: string; entradaPrevia: string | null; intentosPrevios: number }
  | { estado: "sin_confirmar"; nombre: string }
  | { estado: "desconocido" }
  | { estado: "error"; mensaje: string };

const hora = (iso: string | null) => iso
  ? new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  : "";

function CheckIn() {
  const [codigo, setCodigo] = useState("");
  const [quien, setQuien] = useState("");
  const [dentro, setDentro] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState("");
  const [revisando, setRevisando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [conteo, setConteo] = useState<{ personas: number; rechazados: number; pasesEmitidos: number } | null>(null);
  const [errorCamara, setErrorCamara] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const lector = useRef<Lector | null>(null);
  /* Para no registrar mil veces al mismo mientras el QR sigue enfrente. */
  const ultimo = useRef<{ token: string; cuando: number }>({ token: "", cuando: 0 });
  const ocupado = useRef(false);

  /* El código se queda guardado en el celular: el equipo lo teclea una vez. */
  useEffect(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(GUARDADO) ?? "{}") as { codigo?: string; quien?: string };
      if (guardado.codigo) setCodigo(guardado.codigo);
      if (guardado.quien) setQuien(guardado.quien);
    } catch {
      /* Si el navegador no deja guardar, se teclea y ya. */
    }
  }, []);

  const actualizarConteo = useCallback((clave: string) => {
    void resumenAsistencia({ data: { codigo: clave } })
      .then(setConteo)
      .catch(() => undefined);
  }, []);

  const entrar = (evento?: React.FormEvent) => {
    evento?.preventDefault();
    setRevisando(true);
    setErrorAcceso("");
    void revisarAccesoStaff({ data: { codigo: codigo.trim() } })
      .then(() => {
        try {
          localStorage.setItem(GUARDADO, JSON.stringify({ codigo: codigo.trim(), quien: quien.trim() }));
        } catch { /* sin guardar también funciona */ }
        setDentro(true);
        actualizarConteo(codigo.trim());
      })
      .catch(() => setErrorAcceso("Ese código no sirve. Pídelo a quien organiza."))
      .finally(() => setRevisando(false));
  };

  const alLeer = useCallback((texto: string) => {
    const token = tokenDesdeQR(texto);
    if (!token || ocupado.current) return;
    /* El mismo pase no se vuelve a mandar en 5 segundos. */
    const ahora = Date.now();
    if (token === ultimo.current.token && ahora - ultimo.current.cuando < 5000) return;
    ultimo.current = { token, cuando: ahora };
    ocupado.current = true;

    void registrarAsistencia({ data: { token, codigo: codigo.trim(), escaneadoPor: quien.trim() } })
      .then(res => {
        setResultado(res as Resultado);
        sonar(res.estado === "entrada" ? "ok" : "alerta");
        if (res.estado === "entrada") actualizarConteo(codigo.trim());
      })
      .catch(() => {
        setResultado({ estado: "error", mensaje: "No pudimos registrar. Intenta otra vez." });
        sonar("alerta");
      })
      .finally(() => { ocupado.current = false; });
  }, [codigo, quien, actualizarConteo]);

  /* La cámara vive mientras la pantalla esté abierta. */
  useEffect(() => {
    if (!dentro || !video.current) return;
    let cancelado = false;
    void iniciarLector(video.current, alLeer)
      .then(l => { if (cancelado) l.detener(); else lector.current = l; })
      .catch(() => setErrorCamara("No pudimos abrir la cámara. Revisa el permiso en tu navegador."));
    return () => {
      cancelado = true;
      lector.current?.detener();
      lector.current = null;
    };
  }, [dentro, alLeer]);

  if (!dentro) return <main className="survey-original survey-violet">
    <div className="survey-grid" aria-hidden="true" />
    <section className="survey-question-panel">
      <form onSubmit={entrar} className="survey-finish checkin-acceso">
        <LockKeyhole className="checkin-candado"/>
        <h1>Asistencia</h1>
        <p>Pantalla del equipo. Teclea el código de acceso del evento.</p>
        <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Código de acceso" className="survey-input" autoComplete="off" autoFocus/>
        <input value={quien} onChange={e => setQuien(e.target.value)} placeholder="Tu nombre (para saber quién escaneó)" className="survey-input" autoComplete="off"/>
        {errorAcceso && <span className="cp-error">{errorAcceso}</span>}
        <Button type="submit" disabled={revisando || codigo.trim().length < 3} className="survey-next">{revisando ? "Revisando…" : "Entrar"}</Button>
      </form>
    </section>
  </main>;

  return <main className="survey-original survey-violet checkin">
    <div className="survey-grid" aria-hidden="true" />
    <header className="checkin-header">
      <div><strong>Asistencia</strong>{quien && <span>{quien}</span>}</div>
      {conteo && <div className="checkin-conteo">
        <b>{conteo.personas}</b><span>de {conteo.pasesEmitidos} pases</span>
      </div>}
    </header>

    <div className="checkin-camara">
      <video ref={video} muted playsInline className="checkin-video"/>
      <div className="checkin-mira" aria-hidden="true"><i/><i/><i/><i/></div>
      {errorCamara && <p className="checkin-error-camara">{errorCamara}</p>}
    </div>

    <div className={`checkin-resultado is-${resultado?.estado ?? "espera"}`} role="status" aria-live="polite">
      {!resultado && <><UserRound/><div><strong>Apunta al QR</strong><span>La cámara lee sola.</span></div></>}
      {resultado?.estado === "entrada" && <><Check/><div><strong>{resultado.nombre || "Pase válido"}</strong><span>Entrada registrada. Coteja el nombre con su identificación.</span></div></>}
      {resultado?.estado === "ya_usado" && <><X/><div><strong>Este pase ya se usó</strong><span>{resultado.nombre ? `${resultado.nombre} ` : "Alguien "}entró{resultado.entradaPrevia ? ` a las ${hora(resultado.entradaPrevia)}` : ""}. No lo dejes pasar.{resultado.intentosPrevios > 1 ? ` Intento #${resultado.intentosPrevios + 1}.` : ""}</span></div></>}
      {resultado?.estado === "sin_confirmar" && <><TriangleAlert/><div><strong>{resultado.nombre || "Sin confirmar"}</strong><span>Esta persona no confirmó su correo.</span></div></>}
      {resultado?.estado === "desconocido" && <><X/><div><strong>Pase desconocido</strong><span>Ese QR no es de HeyChamba.</span></div></>}
      {resultado?.estado === "error" && <><X/><div><strong>Algo se atoró</strong><span>{resultado.mensaje}</span></div></>}
    </div>

    <p className="checkin-cotejar">El QR dice de quién es el pase, no quién lo trae. Pide identificación.</p>
    {conteo && conteo.rechazados > 0 && <p className="checkin-nota">{conteo.rechazados} pase{conteo.rechazados === 1 ? "" : "s"} rechazado{conteo.rechazados === 1 ? "" : "s"} por reúso.</p>}
  </main>;
}
