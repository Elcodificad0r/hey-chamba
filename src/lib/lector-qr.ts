/* ─────────────────────────────────────────────────────────────
   LECTOR DE QR CON LA CÁMARA
   Chrome en Android trae un lector nativo (BarcodeDetector) que es
   rapidísimo. Safari no lo tiene, así que ahí caemos a jsQR, que lee
   los cuadros del video a mano. Para el equipo en la puerta da igual:
   apuntan y suena.
   ───────────────────────────────────────────────────────────── */

type DetectorCodigo = { detect: (fuente: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type ConstructorDetector = new (opciones: { formats: string[] }) => DetectorCodigo;

function detectorNativo(): DetectorCodigo | null {
  const Detector = (globalThis as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

/* De la liga del QR sacamos el token. Aceptamos la liga completa o el
   token pelón, por si algún lector recorta la dirección. */
export function tokenDesdeQR(texto: string): string {
  const limpio = texto.trim();
  try {
    const url = new URL(limpio);
    const p = url.searchParams.get("p");
    if (p) return p;
  } catch {
    /* No era una URL: puede ser el token solo. */
  }
  return /^[a-f0-9]{16,64}$/i.test(limpio) ? limpio : "";
}

export type Lector = { detener: () => void };

/* Enciende la cámara trasera y avisa cada vez que lee un QR.
   Devuelve cómo apagarla; hay que llamarlo al salir de la pantalla. */
export async function iniciarLector(
  video: HTMLVideoElement,
  alLeer: (token: string) => void,
): Promise<Lector> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false,
  });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true");   // iOS: que no se abra a pantalla completa
  await video.play();

  const nativo = detectorNativo();
  const lienzo = document.createElement("canvas");
  const pincel = lienzo.getContext("2d", { willReadFrequently: true });
  let jsQR: typeof import("jsqr").default | null = null;
  let vivo = true;
  let cuadro = 0;

  const revisar = async () => {
    if (!vivo) return;
    cuadro = requestAnimationFrame(() => void revisar());
    if (video.readyState !== video.HAVE_ENOUGH_DATA) return;

    if (nativo) {
      try {
        const [codigo] = await nativo.detect(video);
        if (codigo?.rawValue) alLeer(codigo.rawValue);
      } catch {
        /* Un cuadro borroso no es problema: el siguiente lo agarra. */
      }
      return;
    }

    if (!pincel) return;
    if (!jsQR) jsQR = (await import("jsqr")).default;
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    if (!lienzo.width || !lienzo.height) return;
    pincel.drawImage(video, 0, 0, lienzo.width, lienzo.height);
    const pixeles = pincel.getImageData(0, 0, lienzo.width, lienzo.height);
    const codigo = jsQR(pixeles.data, pixeles.width, pixeles.height, { inversionAttempts: "dontInvert" });
    if (codigo?.data) alLeer(codigo.data);
  };

  void revisar();

  return {
    detener: () => {
      vivo = false;
      cancelAnimationFrame(cuadro);
      stream.getTracks().forEach(pista => pista.stop());
      video.srcObject = null;
    },
  };
}

/* Un bip corto para que el equipo no tenga que ver la pantalla en cada persona. */
export function sonar(tono: "ok" | "alerta"): void {
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Audio) return;
    const ctx = new Audio();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.frequency.value = tono === "ok" ? 880 : 300;
    vol.gain.setValueAtTime(0.0001, ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(vol).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    /* Sin sonido tampoco pasa nada. */
  }
}
