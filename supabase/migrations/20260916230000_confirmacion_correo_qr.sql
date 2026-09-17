-- Confirmación de correo y emisión del QR.
-- Guardar el registro y confirmar el correo son dos cosas distintas:
-- el perfil se guarda al terminar las preguntas (estatus = 'completo'),
-- y la confirmación del correo vive aparte en estas columnas.
-- El QR se considera entregado cuando la persona abrió el enlace del correo;
-- eso es lo que después sirve para el acceso al festival o para tomar asistencia.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS correo_confirmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS correo_confirmado_en timestamptz,
  ADD COLUMN IF NOT EXISTS token_confirmacion text,
  ADD COLUMN IF NOT EXISTS confirmacion_enviada_en timestamptz,
  ADD COLUMN IF NOT EXISTS confirmacion_intentos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_emitido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_emitido_en timestamptz;

-- El token del enlace es de un solo dueño y se busca por él al confirmar.
CREATE UNIQUE INDEX IF NOT EXISTS registros_token_confirmacion_key
  ON public.registros (token_confirmacion)
  WHERE token_confirmacion IS NOT NULL;

COMMENT ON COLUMN public.registros.correo_confirmado IS 'La persona abrió el enlace que le mandamos por correo.';
COMMENT ON COLUMN public.registros.qr_emitido IS 'Ya se le liberó el QR (acceso al festival / asistencia).';
