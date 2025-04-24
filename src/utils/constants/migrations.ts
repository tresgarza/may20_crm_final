export const MIGRATIONS = {
  // Migraciones existentes si las hay...
  
  // Nueva migración para añadir campos de estado independientes
  ADD_INDEPENDENT_STATUS_FIELDS: {
    id: 'add_independent_status_fields',
    description: 'Añade campos advisor_status, company_status y global_status para vistas Kanban independientes',
    file: 'db_setup_status_fields.sql'
  }
};

export default MIGRATIONS; 