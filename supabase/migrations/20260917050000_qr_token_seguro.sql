-- El QR tiene que ser un secreto, no algo que se pueda adivinar.
--
-- Antes el QR apuntaba a /pase?folio=… y el folio es una fecha con segundos:
-- cualquiera podía probar combinaciones y sacarse un pase ajeno, o leerlo de
-- la pantalla. Esconder el QR en la interfaz no servía de nada.
--
-- Ahora:
--   qr_token     nace SOLO cuando la persona confirma su correo. Antes de eso
--                no existe ni en la base, así que no hay nada que robar.
--   clave_sesion la recibe el navegador que llenó el registro. Sin ella no se
--                puede pedir el reenvío del correo ni consultar el pase, aunque
--                alguien adivine el folio.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS qr_token text,
  ADD COLUMN IF NOT EXISTS clave_sesion text;

CREATE UNIQUE INDEX IF NOT EXISTS registros_qr_token_key
  ON public.registros (qr_token)
  WHERE qr_token IS NOT NULL;

COMMENT ON COLUMN public.registros.qr_token IS 'Secreto del pase. Se emite al confirmar el correo; es lo que lleva dentro el QR.';
COMMENT ON COLUMN public.registros.clave_sesion IS 'Clave del navegador que llenó el registro. Autoriza reenviar el correo y consultar el pase.';
