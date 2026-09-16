ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS no_terminado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS preguntas_respondidas integer NOT NULL DEFAULT 0;