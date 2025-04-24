// Script para agregar las columnas faltantes a la tabla 'users' en Supabase
const { createClient } = require('@supabase/supabase-js');

// Configuración Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Crear cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// SQL para agregar las columnas
const sql = `
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
`;

async function alterTable() {
  try {
    console.log('Conectando a Supabase...');
    
    // Ejecutar el query SQL con la API de Supabase
    const { data, error } = await supabase.rpc('pgbouncer_exec', { 
      query: sql 
    });
    
    if (error) {
      throw error;
    }
    
    console.log('¡Columnas agregadas exitosamente!');
    
    // Verificar la estructura de la tabla actualizada
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Error al verificar la tabla:', tableError);
    } else {
      console.log('Estructura de la tabla users:');
      console.log('Columnas:', tableInfo && tableInfo[0] ? Object.keys(tableInfo[0]).join(', ') : 'No data');
    }
    
  } catch (error) {
    console.error('Error al alterar la tabla:', error);
    
    // Alternativa: ejecutar usando postgrest directamente
    try {
      console.log('Intentando método alternativo...');
      const { data, error } = await supabase.from('users').select('count(*)');
      console.log('Conexión correcta. Para ejecutar la consulta SQL, use el editor SQL de Supabase con el siguiente código:');
      console.log(sql);
    } catch (fallbackError) {
      console.error('Error en método alternativo:', fallbackError);
    }
  }
}

alterTable(); 
 