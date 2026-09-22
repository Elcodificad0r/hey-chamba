/* ─────────────────────────────────────────────────────────────
   ACCESO AL PORTAL
   Al confirmar su correo le creamos su usuario de Supabase Auth, ya
   verificado, y guardamos su id en `registros.auth_user_id`.

   El portal es otra app: ahí la persona pide su propio enlace por correo.
   Como el usuario ya existe con ese mismo correo, Supabase reconoce al
   mismo, y la política de RLS encuentra su registro. Sin esto, el portal
   crearía un usuario nuevo que no estaría ligado a ninguna fila.
   ───────────────────────────────────────────────────────────── */

type RespuestaAuth = Record<string, unknown>;

function credenciales(): { url: string; llave: string } {
  const url = process.env["SUPABASE_URL"];
  const llave = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !llave) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  return { url, llave };
}

async function auth(ruta: string, init: RequestInit): Promise<RespuestaAuth> {
  const { url, llave } = credenciales();
  const res = await fetch(`${url}/auth/v1/${ruta}`, {
    ...init,
    headers: { apikey: llave, Authorization: `Bearer ${llave}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(10000),
  });
  return (await res.json()) as RespuestaAuth;
}

/* Crea el usuario ya confirmado, o devuelve el que exista con ese correo.
   Se llama al confirmar el registro, una sola vez por persona. */
export async function usuarioDeAuth(email: string): Promise<string | null> {
  const creado = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({ email, email_confirm: true }),
  });
  if (typeof creado["id"] === "string") return creado["id"];

  /* Ya existía: lo buscamos por correo. */
  const { url, llave } = credenciales();
  const res = await fetch(`${url}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`, {
    headers: { apikey: llave, Authorization: `Bearer ${llave}` },
    signal: AbortSignal.timeout(10000),
  });
  const lista = (await res.json()) as { users?: { id: string; email: string }[] };
  const encontrado = lista.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (encontrado) return encontrado.id;

  console.error("[Acceso] No se pudo crear ni encontrar el usuario de", email, creado);
  return null;
}
