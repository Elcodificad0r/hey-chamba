-- UNA PERSONA, UN PASE
-- La CURP identifica a una persona sin ambigüedad, así que es lo que usamos
-- para que nadie saque dos pases. Hasta ahora vivía dentro de `respuestas`,
-- donde no se puede indexar ni hacer única; le damos columna propia.

ALTER TABLE public.registros
  ADD COLUMN IF NOT EXISTS curp text;

-- Rellenamos con lo que ya estuviera guardado en el JSON.
UPDATE public.registros
SET curp = upper(respuestas->>'curp')
WHERE curp IS NULL
  AND respuestas->>'curp' IS NOT NULL
  AND length(respuestas->>'curp') = 18;

-- Única, pero solo entre quienes de verdad la llenaron: los registros que se
-- quedaron en la fase 1 no tienen CURP y no deben estorbarse entre ellos.
CREATE UNIQUE INDEX IF NOT EXISTS registros_curp_key
  ON public.registros (curp)
  WHERE curp IS NOT NULL;

COMMENT ON COLUMN public.registros.curp IS 'CURP en mayúsculas. Única: una persona, un solo pase.';
