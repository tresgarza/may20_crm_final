-- Query that reflects the current implementation (without filtering by advisor)
SELECT COUNT(*) as total_without_advisor_filter 
FROM applications 
WHERE status NOT IN ('rejected', 'completed') 
AND updated_at < NOW() - INTERVAL '120 SECONDS';

-- Query that includes the proper advisor filter (what it should be doing)
SELECT COUNT(*) as total_with_advisor_filter 
FROM applications 
WHERE status NOT IN ('rejected', 'completed') 
AND updated_at < NOW() - INTERVAL '120 SECONDS'
AND assigned_to = 'REPLACE_WITH_ADVISOR_ID';

-- Query to show the specific applications found
SELECT id, client_name, status, assigned_to, updated_at 
FROM applications 
WHERE status NOT IN ('rejected', 'completed') 
AND updated_at < NOW() - INTERVAL '120 SECONDS'
ORDER BY updated_at ASC; 