CREATE OR REPLACE FUNCTION public.generar_folio_registro()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT to_char(now() AT TIME ZONE 'America/Mexico_City', 'FMDD/FMMM/YYYY FMHH24:MI:SS');
$$;

ALTER TABLE public.registros ALTER COLUMN folio TYPE TEXT;
ALTER TABLE public.registros ALTER COLUMN folio SET DEFAULT public.generar_folio_registro();