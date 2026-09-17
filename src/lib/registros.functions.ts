/* ─────────────────────────────────────────────────────────────
   GUARDADO DE REGISTROS
   Aquí viven las tres cosas que se guardan en la base:
   1) los datos de la fase 1 (nombre, teléfono, correo) desde la landing,
   2) el perfil completo cuando alguien termina las 21 preguntas,
   3) la ciudad de quien todavía no tiene cobertura.
   Cada persona recibe un folio interno (tipo HC-A1B2C3) que es
   lo que el cliente usa para identificarla.
   ───────────────────────────────────────────────────────────── */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const fase1Schema = z.object({
  nombre: z.string().trim().min(1).max(120),
  telefono: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().email().max(160),
});

const perfilSchema = z.object({
  folio: z.string().trim().max(20).optional().default(""),
  /* Puede ir vacío: el perfil se guarda aunque el correo se confirme después. */
  emailConfirmacion: z.union([z.string().trim().email().max(160), z.literal("")]).optional().default(""),
  codigoPostal: z.string().trim().max(10).optional().default(""),
  colonia: z.string().trim().max(160).optional().default(""),
  ciudad: z.string().trim().max(160).optional().default(""),
  estado: z.string().trim().max(160).optional().default(""),
  respuestas: z.record(z.string(), z.any()).default({}),
});

/* Quien se sale a medias: guardamos sus datos de contacto y su avance. */
const noTerminadoSchema = z.object({
  folio: z.string().trim().max(40).optional().default(""),
  nombre: z.string().trim().max(120).optional().default(""),
  telefono: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(160).optional().default(""),
  preguntasRespondidas: z.number().int().min(0).max(100).optional().default(0),
  respuestas: z.record(z.string(), z.any()).default({}),
});

const esperaSchema = z.object({
  folio: z.string().trim().max(20).optional().default(""),
  ciudad: z.string().trim().min(2).max(160),
  codigoPostal: z.string().trim().max(10).optional().default(""),
});

/* Fase 1: la persona deja sus datos en la landing y le nace su folio. */
export const guardarFase1 = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => fase1Schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .insert({
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        estatus: "fase1",
      })
      .select("folio")
      .single();
    if (error) throw new Error(error.message);
    return { folio: fila.folio as string };
  });

/* Perfil completo: se pega todo al folio de la fase 1 (o se crea uno nuevo). */
export const guardarPerfil = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => perfilSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    /* La clave se queda en el navegador de quien llenó el registro.
       Es lo que después lo autoriza a pedir su pase. */
    const claveSesion = crypto.randomUUID().replace(/-/g, "");
    const campos = {
      clave_sesion: claveSesion,
      email_confirmacion: data.emailConfirmacion || null,
      codigo_postal: data.codigoPostal,
      colonia: data.colonia,
      ciudad: data.ciudad,
      estado: data.estado,
      estatus: "completo",
      no_terminado: false,
      respuestas: data.respuestas as never,
    };
    if (data.folio) {
      const { data: fila, error } = await supabaseAdmin
        .from("registros")
        .update(campos)
        .eq("folio", data.folio)
        .select("folio")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (fila?.folio) return { folio: fila.folio as string, claveSesion };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert({ ...campos, email: data.emailConfirmacion || null })
      .select("folio")
      .single();
    if (errorInsert) throw new Error(errorInsert.message);
    return { folio: nueva.folio as string, claveSesion };
  });

/* Lista de espera: aún no llegamos a su ciudad, pero queda guardada. */
export const guardarEspera = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => esperaSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const campos = {
      ciudad: data.ciudad,
      codigo_postal: data.codigoPostal,
      fuera_de_cobertura: true,
      estatus: "espera",
    };
    if (data.folio) {
      const { data: fila, error } = await supabaseAdmin
        .from("registros")
        .update(campos)
        .eq("folio", data.folio)
        .select("folio")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (fila?.folio) return { folio: fila.folio as string };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert(campos)
      .select("folio")
      .single();
    if (errorInsert) throw new Error(errorInsert.message);
    return { folio: nueva.folio as string };
  });

/* Registro a medias: la persona se salió antes de terminar.
   Guardamos nombre, teléfono y correo para poder recordarle que vuelva. */
export const guardarNoTerminado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => noTerminadoSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const campos = {
      estatus: "no_terminado",
      no_terminado: true,
      preguntas_respondidas: data.preguntasRespondidas,
      respuestas: data.respuestas as never,
    };
    if (data.folio) {
      const { data: fila, error } = await supabaseAdmin
        .from("registros")
        .update(campos)
        .eq("folio", data.folio)
        .select("folio")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (fila?.folio) return { folio: fila.folio as string };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert({ ...campos, nombre: data.nombre, telefono: data.telefono, email: data.email })
      .select("folio")
      .single();
    if (errorInsert) throw new Error(errorInsert.message);
    return { folio: nueva.folio as string };
  });

/* Retomar: con el folio del enlace del correo traemos el avance guardado
   para que la persona siga justo donde se quedó. */
export const retomarRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ folio: z.string().trim().min(3).max(40) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, telefono, email, estatus, preguntas_respondidas, respuestas")
      .eq("folio", data.folio)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila) return null;
    return {
      folio: fila.folio as string,
      nombre: (fila.nombre ?? "") as string,
      telefono: (fila.telefono ?? "") as string,
      email: (fila.email ?? "") as string,
      completo: fila.estatus === "completo",
      preguntasRespondidas: (fila.preguntas_respondidas ?? 0) as number,
      respuestas: (fila.respuestas ?? {}) as Record<string, string | string[] | number>,
    };
  });

/* ─────────────────────────────────────────────────────────────
   CONFIRMACIÓN DE CORREO (aparte de guardar)
   Guardar el perfil y confirmar el correo son dos cosas distintas:
   el perfil ya quedó en la base al terminar las preguntas, y esto de
   aquí solo sirve para saber si la persona abrió el enlace que le
   mandamos. Cuando lo abre, se le libera el QR: ese QR es el que
   después vale para entrar al festival virtual o para tomar asistencia.
   ───────────────────────────────────────────────────────────── */

/* Manda (o vuelve a mandar) el correo con el enlace de confirmación. */
export const enviarConfirmacion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    folio: z.string().trim().min(3).max(40),
    email: z.string().trim().email().max(160),
    /* Sin la clave del navegador que llenó el registro, aquí no se pasa:
       si no, bastaría adivinar un folio para pedir el correo a otra dirección
       y quedarse con el pase de alguien más. */
    clave: z.string().trim().min(16).max(64),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { correoConfigurado, enviarCorreo, plantillaConfirmacion, urlDelSitio } = await import("@/lib/correo.server");

    const { data: fila, error: errorLectura } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, correo_confirmado, confirmacion_intentos, clave_sesion")
      .eq("folio", data.folio)
      .maybeSingle();
    if (errorLectura) throw new Error(errorLectura.message);
    if (!fila) throw new Error("No encontramos ese registro.");
    if (fila.clave_sesion !== data.clave) throw new Error("No encontramos ese registro.");
    /* Ya confirmó antes: no hace falta otro correo. */
    if (fila.correo_confirmado) return { enviado: true, yaConfirmado: true, enlace: null as string | null };

    const token = crypto.randomUUID();
    const { error: errorToken } = await supabaseAdmin
      .from("registros")
      .update({
        email_confirmacion: data.email,
        token_confirmacion: token,
        confirmacion_enviada_en: new Date().toISOString(),
        confirmacion_intentos: (fila.confirmacion_intentos ?? 0) + 1,
      })
      .eq("folio", data.folio);
    if (errorToken) throw new Error(errorToken.message);

    const enlace = `${urlDelSitio()}/confirmar?token=${encodeURIComponent(token)}`;
    const mensaje = plantillaConfirmacion((fila.nombre ?? "") as string, enlace);
    const resultado = await enviarCorreo({ para: data.email, asunto: mensaje.asunto, html: mensaje.html, texto: mensaje.texto });

    /* Mientras no haya dominio de correo configurado, devolvemos el enlace
       para poder probar el flujo completo desde la misma pantalla. */
    return {
      enviado: resultado.enviado,
      yaConfirmado: false,
      enlace: correoConfigurado() ? null : enlace,
    };
  });

/* La persona abrió el enlace: queda confirmada y se le emite el QR. */
export const confirmarCorreo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().trim().min(10).max(80) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, email_confirmacion, correo_confirmado, qr_token")
      .eq("token_confirmacion", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila) return null;

    /* El secreto del pase nace justo aquí, ni un segundo antes. */
    let qrToken = (fila.qr_token ?? "") as string;
    if (!fila.correo_confirmado || !qrToken) {
      qrToken = qrToken || crypto.randomUUID().replace(/-/g, "");
      const ahora = new Date().toISOString();
      const { error: errorUpdate } = await supabaseAdmin
        .from("registros")
        .update({
          correo_confirmado: true,
          correo_confirmado_en: ahora,
          qr_emitido: true,
          qr_emitido_en: ahora,
          qr_token: qrToken,
        })
        .eq("folio", fila.folio);
      if (errorUpdate) throw new Error(errorUpdate.message);
    }

    /* Nunca devolvemos el folio: es interno. */
    return {
      nombre: (fila.nombre ?? "") as string,
      email: (fila.email_confirmacion ?? "") as string,
      qrToken,
    };
  });

/* ¿Ya confirmó? La pantalla del registro pregunta esto cada rato para
   desbloquear el QR en cuanto la persona abra el enlace del correo.
   Pide la clave: adivinar el folio no alcanza para llevarse el pase. */
export const estadoConfirmacion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    folio: z.string().trim().min(3).max(40),
    clave: z.string().trim().min(16).max(64),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("correo_confirmado, qr_emitido, qr_token, clave_sesion")
      .eq("folio", data.folio)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila || fila.clave_sesion !== data.clave) return null;
    return {
      correoConfirmado: Boolean(fila.correo_confirmado),
      qrEmitido: Boolean(fila.qr_emitido),
      /* El secreto solo sale si ya confirmó. */
      qrToken: (fila.correo_confirmado ? fila.qr_token ?? "" : "") as string,
    };
  });

/* El pase, para la pantalla a la que apunta el QR.
   La única llave es el token del QR: no hay forma de llegar por folio. */
export const consultarPase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().trim().min(16).max(64) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("nombre, correo_confirmado, qr_emitido")
      .eq("qr_token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila || !fila.correo_confirmado) return null;
    return {
      nombre: (fila.nombre ?? "") as string,
      qrEmitido: Boolean(fila.qr_emitido),
    };
  });
