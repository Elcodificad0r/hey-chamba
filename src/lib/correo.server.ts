/* ─────────────────────────────────────────────────────────────
   ENVÍO DE CORREOS
   Un solo lugar para mandar correo. Hoy usamos Resend.
   Mientras no esté configurado el dominio (RESEND_API_KEY + CORREO_REMITENTE),
   no truena nada: devolvemos { enviado: false } y quien llame decide qué hacer.
   Este archivo es .server.ts, o sea que nunca viaja al navegador.
   ───────────────────────────────────────────────────────────── */

export type ResultadoCorreo = { enviado: boolean; motivo?: string };

/* La URL pública del sitio, para armar los enlaces de los correos.
   Se puede fijar con APP_URL; si no, usamos el dominio de producción. */
export function urlDelSitio(): string {
  const configurada = process.env["APP_URL"] ?? process.env["VITE_APP_URL"];
  return (configurada ?? "https://www.heychamba.com").replace(/\/+$/, "");
}

export function correoConfigurado(): boolean {
  return Boolean(process.env["RESEND_API_KEY"] && process.env["CORREO_REMITENTE"]);
}

type Adjunto = { nombre: string; contenido: Buffer };

export async function enviarCorreo(mensaje: {
  para: string; asunto: string; html: string; texto: string; adjuntos?: Adjunto[];
}): Promise<ResultadoCorreo> {
  const apiKey = process.env["RESEND_API_KEY"];
  const remitente = process.env["CORREO_REMITENTE"];
  /* El remitente es un buzón de solo envío: no recibe nada. Si alguien le
     contesta al correo, la respuesta se va al buzón real de contacto. */
  const responderA = process.env["CORREO_RESPUESTA"] ?? "contacto@heychamba.com";
  if (!apiKey || !remitente) {
    console.warn("[Correo] Falta RESEND_API_KEY o CORREO_REMITENTE: no se envió nada.");
    return { enviado: false, motivo: "sin_configurar" };
  }

  try {
    const respuesta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remitente,
        to: [mensaje.para],
        subject: mensaje.asunto,
        html: mensaje.html,
        text: mensaje.texto,
        reply_to: responderA,
        ...(mensaje.adjuntos?.length
          ? { attachments: mensaje.adjuntos.map(a => ({ filename: a.nombre, content: a.contenido.toString("base64") })) }
          : {}),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!respuesta.ok) {
      console.error("[Correo] Resend respondió", respuesta.status, await respuesta.text());
      return { enviado: false, motivo: "rechazado" };
    }
    return { enviado: true };
  } catch (error) {
    console.error("[Correo] No se pudo enviar:", error);
    return { enviado: false, motivo: "error" };
  }
}

/* ── Plantillas ──────────────────────────────────────────────── */

const marco = (titulo: string, cuerpo: string) => `<!doctype html>
<html lang="es"><body style="margin:0;background:#f4f4f0;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111">
  <div style="max-width:520px;margin:0 auto;padding:32px 24px">
    <p style="font-size:22px;font-weight:800;letter-spacing:-.4px;margin:0 0 24px">HeyChamba</p>
    <div style="background:#fff;border:2px solid #111;border-radius:18px;padding:28px">
      <h1 style="font-size:24px;line-height:1.2;margin:0 0 12px">${titulo}</h1>
      ${cuerpo}
    </div>
    <p style="font-size:12px;color:#666;margin:24px 0 0">Si no fuiste tú, ignora este correo.</p>
  </div>
</body></html>`;

const boton = (enlace: string, texto: string) =>
  `<a href="${enlace}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:999px">${texto}</a>`;

/* Correo de confirmación: al abrir el enlace se libera el QR. */
export function plantillaConfirmacion(nombre: string, enlace: string) {
  const saludo = nombre ? `${nombre.split(" ")[0]}, ` : "";
  return {
    asunto: "Confirma tu correo y recibe tu QR — HeyChamba",
    html: marco("Confirma tu correo", `
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${saludo}ya guardamos tu perfil. Solo falta confirmar tu correo para liberar tu QR: es tu pase para el festival y con él tomamos tu asistencia.</p>
      <p style="margin:0 0 20px">${boton(enlace, "Confirmar mi correo")}</p>
      <p style="font-size:13px;color:#555;line-height:1.5;margin:0">Si el botón no abre, copia esta liga:<br><span style="word-break:break-all">${enlace}</span></p>`),
    texto: `${saludo}ya guardamos tu perfil. Confirma tu correo para liberar tu QR: ${enlace}`,
  };
}

/* Recordatorio para quien dejó el registro a medias. */
export function plantillaRecordatorio(nombre: string, enlace: string) {
  const saludo = nombre ? `${nombre.split(" ")[0]}, ` : "";
  return {
    asunto: "No te quedes sin chamba: termina tu perfil — HeyChamba",
    html: marco("¡No te quedes sin chamba!", `
      <p style="font-size:16px;line-height:1.5;margin:0 0 20px">${saludo}dejaste tu perfil a medias y te faltan poquitas preguntas. Le seguimos justo donde te quedaste.</p>
      <p style="margin:0 0 20px">${boton(enlace, "Terminar mi perfil")}</p>
      <p style="font-size:13px;color:#555;line-height:1.5;margin:0">Si el botón no abre, copia esta liga:<br><span style="word-break:break-all">${enlace}</span></p>`),
    texto: `${saludo}te faltan poquitas preguntas para terminar tu perfil: ${enlace}`,
  };
}

/* El pase, con el QR adjunto. Se manda al confirmar el correo, para que
   quien no pudo guardarlo desde el celular lo tenga en su bandeja. */
export function plantillaPase(nombre: string, enlace: string) {
  const saludo = nombre ? `${nombre.split(" ")[0]}, ` : "";
  return {
    asunto: "Tu pase para el festival — HeyChamba",
    html: marco("Aquí está tu pase", `
      <p style="font-size:16px;line-height:1.5;margin:0 0 18px">${saludo}tu lugar está apartado. Te adjuntamos tu QR en este correo para que lo tengas a la mano el día del festival, por si no alcanzaste a guardarlo en tu celular.</p>
      <div style="margin:0 0 20px;padding:16px 18px;background:#FAF7F0;border-left:5px solid #C4E539;border-radius:0 12px 12px 0">
        <p style="font-size:15px;line-height:1.5;margin:0 0 10px"><strong>Tu QR es único y es solo tuyo.</strong></p>
        <p style="font-size:15px;line-height:1.5;margin:0">Con él tomamos tu asistencia en la entrada, así que <strong>no es transferible</strong>: funciona una sola vez y está ligado a tu nombre. En la puerta podemos pedirte una identificación para cotejarlo. Si se lo compartes a alguien más, esa persona no va a poder entrar y tú te quedas sin tu lugar.</p>
      </div>
      <p style="margin:0 0 20px">${boton(enlace, "Ver mi pase en línea")}</p>
      <p style="font-size:13px;color:#555;line-height:1.5;margin:0">Si el botón no abre, copia esta liga:<br><span style="word-break:break-all">${enlace}</span></p>`),
    texto: `${saludo}aquí está tu pase para el festival. Tu QR es único, no es transferible y sirve una sola vez: con él tomamos tu asistencia. Míralo en línea: ${enlace}`,
  };
}
