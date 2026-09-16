CREATE OR REPLACE FUNCTION public.generar_folio_registro()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT to_char(now() AT TIME ZONE 'America/Mexico_City', 'FMDD/FMMM/YYYY FMHH24:MI:SS');
$$;

CREATE TABLE public.registros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folio TEXT NOT NULL UNIQUE DEFAULT public.generar_folio_registro(),
  nombre TEXT,
  telefono TEXT,
  email TEXT,
  email_confirmacion TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  colonia TEXT,
  fuera_de_cobertura BOOLEAN NOT NULL DEFAULT false,
  estatus TEXT NOT NULL DEFAULT 'fase1',
  respuestas JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.registros TO service_role;

ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_registros_updated_at
BEFORE UPDATE ON public.registros
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();