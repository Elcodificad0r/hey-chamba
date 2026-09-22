-- ACCESO AL PORTAL SIN VOLVER A PEDIR EL CORREO
-- El correo ya se verificó al registrarse. En lugar de mandar un segundo
-- correo para entrar al portal, creamos su usuario de Supabase Auth en ese
-- mismo momento y guardamos aquí su id. Con eso el portal puede:
--   1) abrirle sesión con un token de un solo uso que le pasamos en la URL,
--   2) encontrar su registro cruzando por este id.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS auth_user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS registros_auth_user_id_key
  ON public.registros (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

COMMENT ON COLUMN public.registros.auth_user_id IS 'Usuario de Supabase Auth de esta persona. Se crea al confirmar el correo.';

-- El portal lee con la sesión de la persona, no con service_role. Sin estas
-- dos líneas recibe 403; con el GRANT pero sin la política vería TODOS los
-- registros. Van juntas, nunca una sin la otra.
GRANT SELECT ON public.registros TO authenticated;

DROP POLICY IF EXISTS "cada quien ve su propio registro" ON public.registros;
CREATE POLICY "cada quien ve su propio registro"
  ON public.registros FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
