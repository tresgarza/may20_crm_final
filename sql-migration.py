import os
import json
import urllib.request
import urllib.parse

# Script para agregar columnas a la tabla users en Supabase

execute_sql = """
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS dependent_persons INTEGER,
ADD COLUMN IF NOT EXISTS spouse_paternal_surname TEXT,
ADD COLUMN IF NOT EXISTS spouse_maternal_surname TEXT,
ADD COLUMN IF NOT EXISTS birth_state TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS street_number_ext TEXT,
ADD COLUMN IF NOT EXISTS street_number_int TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS home_phone TEXT,
ADD COLUMN IF NOT EXISTS job_position TEXT,
ADD COLUMN IF NOT EXISTS employer_name TEXT,
ADD COLUMN IF NOT EXISTS employer_phone TEXT,
ADD COLUMN IF NOT EXISTS employer_address TEXT,
ADD COLUMN IF NOT EXISTS employer_activity TEXT,
ADD COLUMN IF NOT EXISTS mortgage_payment NUMERIC,
ADD COLUMN IF NOT EXISTS rent_payment NUMERIC,
ADD COLUMN IF NOT EXISTS income_frequency TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS credit_purpose TEXT,
ADD COLUMN IF NOT EXISTS reference1_name TEXT,
ADD COLUMN IF NOT EXISTS reference1_relationship TEXT,
ADD COLUMN IF NOT EXISTS reference1_address TEXT,
ADD COLUMN IF NOT EXISTS reference1_phone TEXT,
ADD COLUMN IF NOT EXISTS reference2_name TEXT,
ADD COLUMN IF NOT EXISTS reference2_relationship TEXT,
ADD COLUMN IF NOT EXISTS reference2_address TEXT,
ADD COLUMN IF NOT EXISTS reference2_phone TEXT;
"""

print("SQL a ejecutar:")
print(execute_sql)
print("\nEste script debe ejecutarse desde el panel de administración de Supabase > SQL Editor")
print("Copia y pega el SQL anterior en el editor y ejecuta la consulta.")
print("Todas las columnas del formulario de crédito serán agregadas a la tabla 'users'.") 
 