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

/* Nombre y apellido: dos palabras de al menos dos letras. En la puerta del
   festival el equipo coteja este nombre contra la identificación, y con un
   nombre de pila suelto no se puede. La misma regla vive en la landing;
   aquí se repite porque el navegador se puede saltar. */
const nombreCompleto = z.string().trim().min(1).max(120)
  .refine(valor => valor.split(/\s+/).filter(parte => parte.length >= 2).length >= 2,
    "Escribe tu nombre y tu apellido.");

const fase1Schema = z.object({
  nombre: nombreCompleto,
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

/* La clave de sesión acompaña a la persona desde que deja sus datos hasta que
   recoge su pase. Viaja en la URL (`?k=`) y es lo que permite retomar el
   registro desde el enlace del correo sin que baste con adivinar un folio.
   Nace una sola vez: si el registro ya tiene una, se respeta. */
const nuevaClave = () => crypto.randomUUID().replace(/-/g, "");

/* La CURP tal como la escribió la persona, o null si todavía no está completa.
   Guardarla a medias rompería el índice único de la columna. */
/* Postgres rechaza la CURP repetida con el código 23505 del índice único.
   Lo traducimos a algo que la pantalla pueda mostrar. */
const CURP_REPETIDA = "CURP_REPETIDA";
function esCurpRepetida(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" && (error.message ?? "").includes("registros_curp_key");
}

function curpDeRespuestas(respuestas: Record<string, unknown>): string | null {
  const valor = String(respuestas["curp"] ?? "").trim().toUpperCase();
  return /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d$/.test(valor) ? valor : null;
}

/* Fase 1: la persona deja sus datos en la landing y le nacen su folio y su clave. */
export const guardarFase1 = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => fase1Schema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    /* Si ya dejó sus datos antes con ese correo, reusamos su fila en vez de
       crear otra: pasaba que alguien picaba el botón dos o tres veces y
       quedaban filas vacías con el mismo nombre. No tocamos su estatus,
       para no degradar un perfil que ya estaba completo. */
    const { data: previo } = await supabaseAdmin
      .from("registros")
      .select("folio, clave_sesion")
      .eq("email", data.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (previo?.folio) {
      const claveSesion = previo.clave_sesion ?? nuevaClave();
      const { error } = await supabaseAdmin
        .from("registros")
        .update({ nombre: data.nombre, telefono: data.telefono, clave_sesion: claveSesion })
        .eq("folio", previo.folio);
      if (error) throw new Error(error.message);
      return { folio: previo.folio as string, claveSesion };
    }

    const claveSesion = nuevaClave();
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .insert({
        nombre: data.nombre,
        telefono: data.telefono,
        email: data.email,
        estatus: "fase1",
        clave_sesion: claveSesion,
      })
      .select("folio")
      .single();
    if (error) throw new Error(error.message);
    return { folio: fila.folio as string, claveSesion };
  });

/* Perfil completo: se pega todo al folio de la fase 1 (o se crea uno nuevo). */
export const guardarPerfil = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => perfilSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    /* La clave se queda en el navegador de quien llenó el registro; es lo que
       después lo autoriza a pedir su pase. Si ya venía de la fase 1, se respeta:
       pisarla invalidaría el enlace de "retomar" que ya se mandó por correo. */
    const previa = data.folio
      ? (await supabaseAdmin.from("registros").select("clave_sesion").eq("folio", data.folio).maybeSingle()).data?.clave_sesion
      : null;
    const claveSesion = previa ?? nuevaClave();
    /* La CURP vive también en su propia columna: es lo que impide que
       una misma persona saque dos pases. */
    const curp = curpDeRespuestas(data.respuestas);
    const campos = {
      clave_sesion: claveSesion,
      curp,
      email_confirmacion: data.emailConfirmacion || null,
      codigo_postal: data.codigoPostal,
      colonia: data.colonia,
      ciudad: data.ciudad,
      estado: data.estado,
      estatus: "completo",
      no_terminado: false,
      respuestas: data.respuestas as never,
    };
    /* ¿Esa CURP ya tiene fila? Si es de la misma persona —mismo correo, que
       además ya verificó— volvió a llenar el formulario: fusionamos en su
       fila de siempre y nos quedamos con las respuestas nuevas. Así conserva
       su folio, su pase y su confirmación, y no nace un duplicado.
       Si el correo es otro, no fusionamos: ahí sí es alguien más usando una
       CURP ajena, y eso lo sigue atajando el aviso de "ya tienes registro". */
    if (curp) {
      const { data: dueno } = await supabaseAdmin
        .from("registros")
        .select("folio, email, email_confirmacion, clave_sesion")
        .eq("curp", curp)
        .maybeSingle();

      const correoNuevo = (data.emailConfirmacion || "").toLowerCase();
      const mismaPersona = dueno && dueno.folio !== data.folio && correoNuevo && (
        (dueno.email ?? "").toLowerCase() === correoNuevo ||
        (dueno.email_confirmacion ?? "").toLowerCase() === correoNuevo
      );

      if (mismaPersona) {
        const clave = dueno.clave_sesion ?? claveSesion;
        const { error } = await supabaseAdmin
          .from("registros")
          .update({ ...campos, clave_sesion: clave })
          .eq("folio", dueno.folio);
        if (error) throw new Error(error.message);

        /* La fila con la que venía trabajando esta sesión sobra. */
        if (data.folio && data.folio !== dueno.folio) {
          await supabaseAdmin.from("registros").delete().eq("folio", data.folio);
        }
        return { folio: dueno.folio as string, claveSesion: clave };
      }
    }

    if (data.folio) {
      const { data: fila, error } = await supabaseAdmin
        .from("registros")
        .update(campos)
        .eq("folio", data.folio)
        .select("folio")
        .maybeSingle();
      if (error) throw new Error(esCurpRepetida(error) ? CURP_REPETIDA : error.message);
      if (fila?.folio) return { folio: fila.folio as string, claveSesion };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert({ ...campos, email: data.emailConfirmacion || null })
      .select("folio")
      .single();
    if (errorInsert) throw new Error(esCurpRepetida(errorInsert) ? CURP_REPETIDA : errorInsert.message);
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
    /* Con esta clave se arma el enlace del recordatorio. */
    const previa = data.folio
      ? (await supabaseAdmin.from("registros").select("clave_sesion").eq("folio", data.folio).maybeSingle()).data?.clave_sesion
      : null;
    const claveSesion = previa ?? nuevaClave();
    const curp = curpDeRespuestas(data.respuestas);
    const campos = {
      clave_sesion: claveSesion,
      curp,
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
      if (fila?.folio) return { folio: fila.folio as string, claveSesion };
    }
    const { data: nueva, error: errorInsert } = await supabaseAdmin
      .from("registros")
      .insert({ ...campos, nombre: data.nombre, telefono: data.telefono, email: data.email })
      .select("folio")
      .single();
    if (errorInsert) throw new Error(errorInsert.message);
    return { folio: nueva.folio as string, claveSesion };
  });

/* Retomar: con el folio y la clave del enlace del correo traemos el avance
   guardado para que la persona siga justo donde se quedó.
   La clave es obligatoria: aquí salen nombre, teléfono y correo, y los folios
   son fechas que se pueden enumerar. Sin ella bastaría adivinar un folio para
   sacarle los datos de contacto a cualquiera. */
export const retomarRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    folio: z.string().trim().min(3).max(40),
    clave: z.string().trim().min(16).max(64),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, telefono, email, estatus, preguntas_respondidas, respuestas, clave_sesion")
      .eq("folio", data.folio)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila || fila.clave_sesion !== data.clave) return null;
    return {
      folio: fila.folio as string,
      nombre: (fila.nombre ?? "") as string,
      telefono: (fila.telefono ?? "") as string,
      email: (fila.email ?? "") as string,
      completo: fila.estatus === "completo",
      claveSesion: (fila.clave_sesion ?? "") as string,
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
      .select("folio, nombre, email_confirmacion, correo_confirmado, qr_token, auth_user_id")
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

    /* Con el correo ya verificado le creamos su usuario, para que después
       pueda entrar a corregir sus respuestas sin volver a identificarse. */
    const email = (fila.email_confirmacion ?? "") as string;
    if (email && !fila.auth_user_id) {
      const { usuarioDeAuth } = await import("@/lib/acceso.server");
      const usuario = await usuarioDeAuth(email);
      if (usuario) {
        await supabaseAdmin.from("registros").update({ auth_user_id: usuario }).eq("folio", fila.folio);
      }
    }

    /* Y le mandamos su QR por correo. En el celular mucha gente no alcanza a
       guardarlo, y así lo tiene en su bandeja el día del festival.
       Solo la primera vez: si vuelve a abrir el enlace, no se repite. */
    if (email && !fila.correo_confirmado) {
      void enviarPasePorCorreo(email, (fila.nombre ?? "") as string, qrToken)
        .catch(error => console.error("[Pase] No se pudo enviar el QR:", error));
    }

    /* Nunca devolvemos el folio: es interno. */
    return {
      nombre: (fila.nombre ?? "") as string,
      email,
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

/* Recordatorio para quien dejó el registro a medias: el enlace lo regresa
   justo donde se quedó. Lleva folio y clave, porque del otro lado
   `retomarRegistro` no entrega nada sin las dos. */
export const enviarRecordatorio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    folio: z.string().trim().min(3).max(40),
    clave: z.string().trim().min(16).max(64),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { correoConfigurado, enviarCorreo, plantillaRecordatorio, urlDelSitio } = await import("@/lib/correo.server");

    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, email, estatus, clave_sesion")
      .eq("folio", data.folio)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila || fila.clave_sesion !== data.clave) return { enviado: false, motivo: "no_encontrado" as const };
    if (fila.estatus === "completo") return { enviado: false, motivo: "ya_termino" as const };
    if (!fila.email) return { enviado: false, motivo: "sin_correo" as const };

    const enlace = `${urlDelSitio()}/registro?folio=${encodeURIComponent(fila.folio)}&k=${encodeURIComponent(data.clave)}`;
    const mensaje = plantillaRecordatorio((fila.nombre ?? "") as string, enlace);
    const resultado = await enviarCorreo({ para: fila.email, asunto: mensaje.asunto, html: mensaje.html, texto: mensaje.texto });
    return {
      enviado: resultado.enviado,
      motivo: null,
      enlace: correoConfigurado() ? null : enlace,
    };
  });

/* ─────────────────────────────────────────────────────────────
   UNA PERSONA, UN PASE
   La CURP es única. En cuanto alguien la teclea completa le avisamos
   si ya tiene registro, para que no conteste 15 preguntas de más y
   luego se estrelle al final.
   ───────────────────────────────────────────────────────────── */

const curpSchema = z.string().trim().toUpperCase().length(18)
  .regex(/^[A-Z]{4}\d{6}[HMX][A-Z]{5}[0-9A-Z]\d$/, "CURP mal formada.");

/* ¿Esa CURP ya tiene dueño? Se llama en cuanto se completan los 18.
   `folio` es el del registro en curso: uno no choca consigo mismo. */
export const revisarCurp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    curp: curpSchema,
    folio: z.string().trim().max(40).optional().default(""),
  }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, qr_emitido, estatus")
      .eq("curp", data.curp)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila || fila.folio === data.folio) return { libre: true as const };

    /* Tres estados, los mismos que decide `reenviarPorCurp`, para que el
       aviso en pantalla y el correo que sale digan lo mismo:
         con_pase      → ya confirmó, tiene su QR
         sin_confirmar → llenó todo, le falta abrir el enlace del correo
         a_medias      → se salió antes de terminar las preguntas */
    return {
      libre: false as const,
      nombre: (fila.nombre ?? "") as string,
      estado: fila.qr_emitido ? ("con_pase" as const)
        : fila.estatus === "completo" ? ("sin_confirmar" as const)
        : ("a_medias" as const),
    };
  });

/* "Perdí el correo": le reenviamos al correo que ya tenemos guardado lo que
   le toque según su avance. Nunca decimos cuál es ese correo, solo que salió. */
export const reenviarPorCurp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ curp: curpSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enviarCorreo, plantillaConfirmacion, plantillaPase, plantillaRecordatorio, urlDelSitio } = await import("@/lib/correo.server");

    const { data: fila, error } = await supabaseAdmin
      .from("registros")
      .select("folio, nombre, email, email_confirmacion, estatus, correo_confirmado, qr_token, clave_sesion, confirmacion_intentos")
      .eq("curp", data.curp)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!fila) return { enviado: false, tipo: null };

    const destino = (fila.email_confirmacion ?? fila.email ?? "") as string;
    if (!destino) return { enviado: false, tipo: "sin_correo" as const };
    const nombre = (fila.nombre ?? "") as string;

    /* Ya confirmó: le mandamos su pase. */
    if (fila.correo_confirmado && fila.qr_token) {
      const mensaje = plantillaPase(nombre, `${urlDelSitio()}/pase?p=${encodeURIComponent(fila.qr_token)}`);
      const res = await enviarCorreo({ para: destino, asunto: mensaje.asunto, html: mensaje.html, texto: mensaje.texto });
      return { enviado: res.enviado, tipo: "pase" as const };
    }

    /* Terminó pero no confirmó: token nuevo y otra vez el enlace de confirmación. */
    if (fila.estatus === "completo") {
      const token = crypto.randomUUID();
      const { error: errorToken } = await supabaseAdmin
        .from("registros")
        .update({
          token_confirmacion: token,
          confirmacion_enviada_en: new Date().toISOString(),
          confirmacion_intentos: (fila.confirmacion_intentos ?? 0) + 1,
        })
        .eq("folio", fila.folio);
      if (errorToken) throw new Error(errorToken.message);
      const mensaje = plantillaConfirmacion(nombre, `${urlDelSitio()}/confirmar?token=${encodeURIComponent(token)}`);
      const res = await enviarCorreo({ para: destino, asunto: mensaje.asunto, html: mensaje.html, texto: mensaje.texto });
      return { enviado: res.enviado, tipo: "confirmacion" as const };
    }

    /* Se quedó a medias: el enlace que lo regresa donde iba. */
    const enlace = `${urlDelSitio()}/registro?folio=${encodeURIComponent(fila.folio)}&k=${encodeURIComponent(fila.clave_sesion ?? "")}`;
    const mensaje = plantillaRecordatorio(nombre, enlace);
    const res = await enviarCorreo({ para: destino, asunto: mensaje.asunto, html: mensaje.html, texto: mensaje.texto });
    return { enviado: res.enviado, tipo: "retomar" as const };
  });

/* Arma el QR como PNG en el servidor y lo manda adjunto. Va aparte de la
   respuesta para que la pantalla no espere al correo. */
async function enviarPasePorCorreo(email: string, nombre: string, qrToken: string): Promise<void> {
  const { enviarCorreo, plantillaPase, urlDelSitio } = await import("@/lib/correo.server");
  const QRCode = (await import("qrcode")).default;

  const enlace = `${urlDelSitio()}/pase?p=${encodeURIComponent(qrToken)}`;
  const png = await QRCode.toBuffer(enlace, { width: 600, margin: 2, color: { dark: "#111111", light: "#FFFFFF" } });
  const mensaje = plantillaPase(nombre, enlace);

  await enviarCorreo({
    para: email,
    asunto: mensaje.asunto,
    html: mensaje.html,
    texto: mensaje.texto,
    adjuntos: [{ nombre: "pase-heychamba.png", contenido: png }],
  });
}
