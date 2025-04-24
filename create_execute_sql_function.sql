-- Create a function to execute SQL queries
CREATE OR REPLACE FUNCTION execute_sql(query text) 
RETURNS json AS $$
DECLARE 
  result json;
BEGIN
  -- Try to execute the query
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- If there's an error, return it as a JSON object
  RAISE NOTICE '%', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION execute_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql TO anon;
GRANT EXECUTE ON FUNCTION execute_sql TO service_role;

-- For selective queries only
CREATE OR REPLACE FUNCTION execute_select_sql(query text) 
RETURNS json AS $$
DECLARE 
  result json;
BEGIN
  -- Check that this is a SELECT query
  IF NOT query ~* '^[\\s]*SELECT' THEN
    RETURN json_build_object('error', 'Only SELECT queries are allowed');
  END IF;
  
  -- Try to execute the query
  EXECUTE query INTO result;
  RETURN result;
EXCEPTION WHEN OTHERS THEN
  -- If there's an error, return it as a JSON object
  RAISE NOTICE '%', SQLERRM;
  RETURN json_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to authenticated users
GRANT EXECUTE ON FUNCTION execute_select_sql TO authenticated;
GRANT EXECUTE ON FUNCTION execute_select_sql TO anon;
GRANT EXECUTE ON FUNCTION execute_select_sql TO service_role; 