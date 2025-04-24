/**
 * Este script verifica el estado de conexión con Supabase a través de MCP
 * y confirma que todas las columnas necesarias para el formulario están disponibles.
 * 
 * Este script debe ejecutarse después de haber configurado correctamente el MCP
 * en el archivo .cursor/mcp.json con la siguiente configuración:
 * 
 * {
 *   "mcpServers": {
 *     "supabase": {
 *       "command": "npx",
 *       "args": [
 *         "-y",
 *         "@supabase/mcp-server-supabase@latest",
 *         "--access-token",
 *         "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs"
 *       ]
 *     }
 *   }
 * }
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTk5MjQwNiwiZXhwIjoyMDU1NTY4NDA2fQ.TwhEGW9DK4DTQQRquT6Z9UW8T8UjLX-hp9uKdRjWAhs';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Campos requeridos según el formulario proporcionado
const requiredFields = [
  // Campos originales
  'id', 'first_name', 'paternal_surname', 'maternal_surname', 'birth_date', 'phone', 
  'email', 'company_id', 'created_at', 'rfc', 'curp', 'advisor_id', 'monthly_income',
  'additional_income', 'monthly_expenses', 'other_loan_balances', 'bank_name',
  'bank_clabe', 'bank_account_number', 'bank_account_type', 'bank_account_origin',
  'employment_type', 'employment_years', 'gender', 'marital_status', 'address',
  'city', 'state', 'postal_code',
  
  // Campos añadidos (nuevos)
  'dependent_persons', 'spouse_paternal_surname', 'spouse_maternal_surname',
  'birth_state', 'nationality', 'street_number_ext', 'street_number_int',
  'neighborhood', 'home_phone', 'job_position', 'employer_name', 'employer_phone',
  'employer_address', 'employer_activity', 'mortgage_payment', 'rent_payment',
  'income_frequency', 'payment_method', 'credit_purpose', 'reference1_name',
  'reference1_relationship', 'reference1_address', 'reference1_phone', 'reference2_name',
  'reference2_relationship', 'reference2_address', 'reference2_phone'
];

async function checkColumns() {
  try {
    console.log('Conectando a Supabase para verificar las columnas de la tabla users...');
    
    // Obtener un registro para revisar las columnas
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      console.log('No se encontraron registros en la tabla users.');
      return;
    }
    
    // Obtener las columnas disponibles
    const availableColumns = Object.keys(data[0]);
    console.log(`Se encontraron ${availableColumns.length} columnas en la tabla users.`);
    
    // Verificar si todas las columnas requeridas están presentes
    const missingColumns = requiredFields.filter(field => !availableColumns.includes(field));
    
    if (missingColumns.length === 0) {
      console.log('✅ Todas las columnas requeridas están presentes en la tabla users.');
    } else {
      console.error(`❌ Faltan ${missingColumns.length} columnas en la tabla users:`);
      console.error(missingColumns.join(', '));
      console.error('\nPara agregar estas columnas, ejecute la siguiente consulta SQL en el editor SQL de Supabase:');
      
      const sqlCommands = missingColumns.map(column => {
        // Determinar el tipo de datos basado en el nombre de la columna
        let dataType = 'TEXT';
        if (column.includes('_id')) dataType = 'UUID';
        if (column.includes('date')) dataType = 'DATE';
        if (column.includes('amount') || column.includes('income') || column.includes('expenses') || 
            column.includes('balance') || column.includes('payment')) dataType = 'NUMERIC';
        if (column.includes('persons') || column.includes('years')) dataType = 'INTEGER';
        
        return `ADD COLUMN IF NOT EXISTS ${column} ${dataType}`;
      });
      
      console.log(`
ALTER TABLE users 
${sqlCommands.join(',\n')};
      `);
    }
    
  } catch (error) {
    console.error('Error al verificar las columnas:', error);
  }
}

checkColumns(); 
 