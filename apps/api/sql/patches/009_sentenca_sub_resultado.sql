-- Sprint D — sub-resultado do acórdão (cenário E: parcial com ambas as partes)
ALTER TABLE sentenca ADD COLUMN IF NOT EXISTS
  sub_resultado VARCHAR(30)
    CHECK (sub_resultado IS NULL OR sub_resultado IN (
      'E1_AMBOS_PARCIAIS',
      'E2_SO_NOSSO',
      'E3_SO_REU',
      'E4_AMBOS_NEGADOS'
    ));
