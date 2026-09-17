/* ─────────────────────────────────────────────────────────────
   EL PASE (QR)
   Lo que lleva dentro el QR es un secreto: el token que nace cuando
   la persona confirma su correo. Antes de eso no existe ni en la base,
   así que no hay nada que adivinar ni que bajarse antes de tiempo.
   Al escanearlo se abre /pase?p=<token>, que es lo que después va a
   servir para entrar al festival virtual o para tomar asistencia.
   ───────────────────────────────────────────────────────────── */
const SITIO = "https://www.heychamba.com";

export function valorQR(qrToken: string): string {
  const origen = typeof window !== "undefined" ? window.location.origin : SITIO;
  return `${origen}/pase?p=${encodeURIComponent(qrToken)}`;
}

/* Baja el QR como PNG. En iPhone el archivo cae en Archivos y de ahí
   se puede guardar en Fotos; en Android y escritorio baja directo. */
export function descargarQR(canvas: HTMLCanvasElement | null, nombre: string): void {
  if (!canvas) return;
  const limpio = (nombre.split(" ")[0] || "pase").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = `pase-heychamba-${limpio || "qr"}.png`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    /* Le damos chance al navegador de empezar la descarga antes de soltar la URL. */
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, "image/png");
}

/* En iPhone, "compartir" abre la hoja del sistema y de ahí sale
   "Guardar en Fotos", que es lo que la gente realmente quiere. */
export function puedeCompartir(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function";
}

export async function compartirQR(canvas: HTMLCanvasElement | null, nombre: string): Promise<boolean> {
  if (!canvas || !puedeCompartir()) return false;
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) return false;
  const limpio = (nombre.split(" ")[0] || "pase").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "");
  const archivo = new File([blob], `pase-heychamba-${limpio || "qr"}.png`, { type: "image/png" });
  if (!navigator.canShare({ files: [archivo] })) return false;
  try {
    await navigator.share({ files: [archivo], title: "Mi pase HeyChamba" });
    return true;
  } catch {
    /* Si la persona cancela la hoja de compartir, no pasa nada. */
    return false;
  }
}
