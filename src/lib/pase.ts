/* ─────────────────────────────────────────────────────────────
   EL PASE (QR)
   Lo que lleva dentro el QR es la liga del pase de la persona.
   Al escanearlo se abre /pase?folio=…, que es lo que después va a
   servir para entrar al festival virtual o para tomar asistencia.
   ───────────────────────────────────────────────────────────── */
const SITIO = "https://www.heychamba.com";

export function valorQR(folio: string): string {
  const origen = typeof window !== "undefined" ? window.location.origin : SITIO;
  return `${origen}/pase?folio=${encodeURIComponent(folio)}`;
}
