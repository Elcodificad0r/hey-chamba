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
  emailConfirmacion: z.string().trim().email().max(160),
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
    const campos = {
      email_confirmacion: data.emailConfirmacion,
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
      if (fila?.folio) return { folio: fila.folio as string };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert({ ...campos, email: data.emailConfirmacion })
      .select("folio")
      .single();
    if (errorInsert) throw new Error(errorInsert.message);
    return { folio: nueva.folio as string };
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
