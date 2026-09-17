-- ASISTENCIA DEL FESTIVAL
-- Un solo día, una persona por pase. Aun así guardamos cada escaneo y no
-- solo el primero: si un pase se escanea dos veces es porque alguien
-- compartió su captura, y eso hay que poder verlo. La primera fila de cada
-- persona es su asistencia; las demás son avisos.

CREATE TABLE IF NOT EXISTS public.asistencias (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_id   uuid NOT NULL REFERENCES public.registros(id) ON DELETE CASCADE,
  escaneado_en  timestamptz NOT NULL DEFAULT now(),
  escaneado_por text,
  -- false cuando esa persona ya había entrado antes
  primera       boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS asistencias_registro_id_idx ON public.asistencias (registro_id);
CREATE INDEX IF NOT EXISTS asistencias_escaneado_en_idx ON public.asistencias (escaneado_en DESC);

-- Solo el servidor toca esta tabla; desde el navegador nadie entra.
GRANT ALL ON public.asistencias TO service_role;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.asistencias IS 'Cada escaneo de un pase en la puerta del festival.';
COMMENT ON COLUMN public.asistencias.primera IS 'false = ese pase ya había entrado antes (posible captura compartida).';
