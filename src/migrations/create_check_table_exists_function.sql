-- Creamos la función RPC para verificar si existe una tabla
CREATE OR REPLACE FUNCTION public.check_table_exists(_table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = _table_name
    AND table_schema = 'public'
  );
END;
$$;

-- Aseguramos que todos los usuarios puedan ejecutar esta función
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_exists(text) TO service_role;

-- Creamos también una función para verificar permisos en la tabla
CREATE OR REPLACE FUNCTION public.check_table_permissions(_table_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Intentar verificar permisos ejecutando consultas inofensivas
  BEGIN
    EXECUTE format('SELECT count(*) FROM %I LIMIT 0', _table_name);
    result = jsonb_build_object('read', true);
  EXCEPTION WHEN OTHERS THEN
    result = jsonb_build_object('read', false, 'read_error', SQLERRM);
  END;
  
  BEGIN
    EXECUTE format('INSERT INTO %I SELECT * FROM %I LIMIT 0 RETURNING NULL', _table_name, _table_name);
    result = result || jsonb_build_object('write', true);
  EXCEPTION WHEN OTHERS THEN
    result = result || jsonb_build_object('write', false, 'write_error', SQLERRM);
  END;
  
  RETURN result;
END;
$$;

-- Dar permisos para ejecutar la función de verificación de permisos
GRANT EXECUTE ON FUNCTION public.check_table_permissions(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_table_permissions(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_table_permissions(text) TO service_role; 