-- QUE EL PORTAL ENCUENTRE EL REGISTRO AUNQUE NO HAYA auth_user_id
--
-- En el portal la persona pide su propio enlace por correo, así que la
-- sesión la crea Supabase allá. Si su registro se hizo antes de que
-- existiera `auth_user_id`, la política anterior no encontraba nada y
-- la persona entraba a un portal vacío.
--
-- Ahora la política acepta las dos formas de identificarla: por el id
-- de usuario cuando lo tenemos, o por el correo de la sesión, que es
-- el mismo que confirmó al registrarse.

DROP POLICY IF EXISTS "cada quien ve su propio registro" ON public.registros;

CREATE POLICY "cada quien ve su propio registro"
  ON public.registros FOR SELECT TO authenticated
  USING (
    auth_user_id = auth.uid()
    OR lower(email_confirmacion) = lower(auth.email())
    OR lower(email) = lower(auth.email())
  );

-- El correo es lo que se compara en cada lectura; sin índice, cada
-- consulta del portal recorrería la tabla completa.
CREATE INDEX IF NOT EXISTS registros_email_confirmacion_idx
  ON public.registros (lower(email_confirmacion));
CREATE INDEX IF NOT EXISTS registros_email_idx
  ON public.registros (lower(email));
