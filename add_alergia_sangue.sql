-- Adicionar novos campos de Alergia e Tipo Sanguíneo na tabela students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS allergy text,
ADD COLUMN IF NOT EXISTS blood_type text;

-- Adicionar configurações visuais para Alergia e Tipo Sanguíneo na tabela badge_settings
ALTER TABLE badge_settings
ADD COLUMN IF NOT EXISTS label_alergia text,
ADD COLUMN IF NOT EXISTS color_alergia text,
ADD COLUMN IF NOT EXISTS size_alergia text,
ADD COLUMN IF NOT EXISTS color_val_alergia text,
ADD COLUMN IF NOT EXISTS size_val_alergia text,

ADD COLUMN IF NOT EXISTS label_sangue text,
ADD COLUMN IF NOT EXISTS color_sangue text,
ADD COLUMN IF NOT EXISTS size_sangue text,
ADD COLUMN IF NOT EXISTS color_val_sangue text,
ADD COLUMN IF NOT EXISTS size_val_sangue text;

