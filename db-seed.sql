-- SQL to create test data for login testing

-- Create the advisors table if it doesn't exist
CREATE TABLE IF NOT EXISTS advisors (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the company_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_admins (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_id VARCHAR(36) NOT NULL,
    access_code VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create the companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert test companies
INSERT INTO companies (id, name)
VALUES 
  ('comp1', 'Test Company 1'),
  ('comp2', 'Test Company 2')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert test advisors with known access codes
INSERT INTO advisors (id, email, name, access_code)
VALUES 
  ('adv1', 'advisor1@example.com', 'Advisor 1', 'code123'),
  ('adv2', 'advisor2@example.com', 'Advisor 2', 'code456')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  access_code = EXCLUDED.access_code;

-- Insert test company admins with known access codes
INSERT INTO company_admins (id, email, name, company_id, access_code)
VALUES 
  ('admin1', 'admin1@example.com', 'Admin 1', 'comp1', 'admin123'),
  ('admin2', 'admin2@example.com', 'Admin 2', 'comp2', 'admin456')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  company_id = EXCLUDED.company_id,
  access_code = EXCLUDED.access_code;
