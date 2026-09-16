/* Carga única y compartida del globo voxel: la landing la dispara en tiempo
   muerto, así el formulario ya lo tiene listo cuando el usuario llega. */
type Install = () => void;

let pending: Promise<Install | null> | null = null;

export function loadVoxelGlobe(): Promise<Install | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  pending ??= import("@/lib/globe-voxel.js")
    .then((mod) => mod.installVoxelGlobe as Install)
    .catch(() => null);
  return pending;
}

export function preloadVoxelGlobe() {
  if (typeof window === "undefined") return;
  const start = () => void loadVoxelGlobe();
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(start, { timeout: 1200 });
  else window.setTimeout(start, 300);
}
