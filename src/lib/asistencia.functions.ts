/* ─────────────────────────────────────────────────────────────
   ASISTENCIA EN LA PUERTA
   Lo que usa el equipo el día del festival: escanea el QR de la
   persona y queda registrada su entrada.

   La puerta la cuida un código que vive en CODIGO_STAFF. No es una
   cuenta por persona: es una contraseña compartida para el equipo.
   Alcanza para un evento de un día, pero cámbiala después del festival.
   ───────────────────────────────────────────────────────────── */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* Compara sin filtrar por dónde falla (mismo tiempo pase lo que pase). */
function mismoCodigo(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diferencia === 0;
}

function revisarCodigo(codigo: string): void {
  const esperado = process.env["CODIGO_STAFF"];
  if (!esperado) throw new Error("Falta configurar CODIGO_STAFF en el servidor.");
  if (!mismoCodigo(codigo, esperado)) throw new Error("Código de acceso incorrecto.");
}

/* Le decimos a la pantalla si el código sirve, antes de encender la cámara. */
export const revisarAccesoStaff = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ codigo: z.string().trim().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    revisarCodigo(data.codigo);
    return { ok: true };
  });

/* El escaneo: del token del QR sacamos a la persona y anotamos su entrada. */
export const registrarAsistencia = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    token: z.string().trim().min(16).max(64),
    codigo: z.string().trim().min(1).max(80),
    escaneadoPor: z.string().trim().max(80).optional().default(""),
  }).parse(data))
  .handler(async ({ data }) => {
    revisarCodigo(data.codigo);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    /* El pase tiene que existir y tener el correo confirmado. */
    const { data: registro, error } = await supabaseAdmin
      .from("registros")
      .select("id, nombre, correo_confirmado")
      .eq("qr_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!registro) return { estado: "desconocido" as const };
    if (!registro.correo_confirmado) return { estado: "sin_confirmar" as const, nombre: (registro.nombre ?? "") as string };

    /* Cada pase sirve UNA vez. Si ese QR ya entró, el segundo se rechaza:
       lo más probable es que alguien haya compartido su captura. Aun así
       guardamos el intento, para que quede el rastro de lo que pasó. */
    const { data: previas, error: errorPrevias } = await supabaseAdmin
      .from("asistencias")
      .select("escaneado_en")
      .eq("registro_id", registro.id)
      .order("escaneado_en", { ascending: true });
    if (errorPrevias) throw new Error(errorPrevias.message);

    const yaHabiaEntrado = (previas?.length ?? 0) > 0;
    const { error: errorInsert } = await supabaseAdmin
      .from("asistencias")
      .insert({
        registro_id: registro.id,
        escaneado_por: data.escaneadoPor || null,
        primera: !yaHabiaEntrado,
      });
    if (errorInsert) throw new Error(errorInsert.message);

    return {
      estado: yaHabiaEntrado ? ("ya_usado" as const) : ("entrada" as const),
      nombre: (registro.nombre ?? "") as string,
      entradaPrevia: (previas?.[0]?.escaneado_en ?? null) as string | null,
      intentosPrevios: previas?.length ?? 0,
    };
  });

/* El contador de la pantalla: cuánta gente lleva entrada. */
export const resumenAsistencia = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ codigo: z.string().trim().min(1).max(80) }).parse(data))
  .handler(async ({ data }) => {
    revisarCodigo(data.codigo);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count: personas, error: e1 } = await supabaseAdmin
      .from("asistencias")
      .select("*", { count: "exact", head: true })
      .eq("primera", true);
    if (e1) throw new Error(e1.message);

    /* Los intentos rechazados: pases que alguien quiso usar dos veces. */
    const { count: rechazados, error: e2 } = await supabaseAdmin
      .from("asistencias")
      .select("*", { count: "exact", head: true })
      .eq("primera", false);
    if (e2) throw new Error(e2.message);

    const { count: pasesEmitidos, error: e3 } = await supabaseAdmin
      .from("registros")
      .select("*", { count: "exact", head: true })
      .eq("qr_emitido", true);
    if (e3) throw new Error(e3.message);

    return { personas: personas ?? 0, rechazados: rechazados ?? 0, pasesEmitidos: pasesEmitidos ?? 0 };
  });
