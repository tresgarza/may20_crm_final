const { Pool } = require('pg');

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: 'postgresql://postgres:4AJMF92LUp98@db.ydnygntfkrleiseuciwq.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  const client = await pool.connect();
  try {
    console.log('Conectado a la base de datos. Agregando columnas...');
    
    // Lista de columnas a agregar
    const columns = [
      'dependent_persons INTEGER',
      'spouse_paternal_surname TEXT',
      'spouse_maternal_surname TEXT',
      'birth_state TEXT',
      'nationality TEXT',
      'street_number_ext TEXT',
      'street_number_int TEXT',
      'neighborhood TEXT',
      'home_phone TEXT',
      'job_position TEXT',
      'employer_name TEXT',
      'employer_phone TEXT',
      'employer_address TEXT',
      'employer_activity TEXT',
      'mortgage_payment NUMERIC',
      'rent_payment NUMERIC',
      'income_frequency TEXT',
      'payment_method TEXT',
      'credit_purpose TEXT',
      'reference1_name TEXT',
      'reference1_relationship TEXT',
      'reference1_address TEXT',
      'reference1_phone TEXT',
      'reference2_name TEXT',
      'reference2_relationship TEXT',
      'reference2_address TEXT',
      'reference2_phone TEXT'
    ];
    
    // Agregar cada columna individualmente
    for (const column of columns) {
      const [columnName, columnType] = column.split(' ');
      try {
        await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${columnName} ${columnType}`);
        console.log(`Columna "${columnName}" agregada exitosamente.`);
      } catch (error) {
        console.error(`Error al agregar columna "${columnName}":`, error.message);
      }
    }
    
    console.log('Proceso completado.');
  } finally {
    client.release();
    await pool.end();
  }
}

addColumns().catch(err => {
  console.error('Error en la operación:', err);
}); 
 