-- Creamos la función RPC para verificar si existe una columna en una tabla
CREATE OR REPLACE FUNCTION public.check_column_exists(_table_name text, _column_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = _table_name
    AND column_name = _column_name
    AND table_schema = 'public'
  );
END;
$$;

-- Aseguramos que todos los usuarios puedan ejecutar esta función
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_column_exists(text, text) TO service_role; 