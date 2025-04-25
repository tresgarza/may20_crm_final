const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// Setup Express server
const app = express();
const port = 3001;

// Supabase client setup
const supabaseUrl = 'https://ydnygntfkrleiseuciwq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWlzZXVjaXdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQzMzA5MDksImV4cCI6MjAxOTkwNjkwOX0.8TlNGr8Dp7yF6seFdqoQe96L8Ov3Zk1cEcGQjFJC6yo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Login endpoint
app.post('/login', async (req, res) => {
  const { accessCode } = req.body;

  if (!accessCode) {
    return res.status(400).json({
      success: false,
      message: 'Código de acceso requerido'
    });
  }

  try {
    // Check if accessCode matches an advisor
    let { data: advisor } = await supabase
      .from('advisors')
      .select('*')
      .eq('access_code', accessCode)
      .single();

    if (advisor) {
      return res.json({
        success: true,
        accessCode,
        role: 'advisor',
        name: advisor.name,
        id: advisor.id
      });
    }

    // Check if accessCode matches a company
    let { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('access_code', accessCode)
      .single();

    if (company) {
      return res.json({
        success: true,
        accessCode,
        role: 'company',
        name: company.name,
        id: company.id
      });
    }

    // Check if accessCode matches an admin
    let { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('access_code', accessCode)
      .single();

    if (admin) {
      return res.json({
        success: true,
        accessCode,
        role: 'admin',
        name: admin.name,
        id: admin.id
      });
    }

    // No valid access code found
    return res.status(401).json({
      success: false,
      message: 'Código de acceso inválido'
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// Get applications endpoint
app.get('/applications', async (req, res) => {
  try {
    let { data: applications, error } = await supabase
      .from('applications')
      .select('*');

    if (error) throw error;

    return res.json({
      success: true,
      applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching applications'
    });
  }
});

// Update application status endpoint
app.put('/applications/:id', async (req, res) => {
  const { id } = req.params;
  const { status, advisorApproved, companyApproved } = req.body;

  try {
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (advisorApproved !== undefined) updateData.advisor_approved = advisorApproved;
    if (companyApproved !== undefined) updateData.company_approved = companyApproved;

    const { data, error } = await supabase
      .from('applications')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    return res.json({
      success: true,
      application: data[0]
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating application'
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`- Login endpoint: http://localhost:${port}/login`);
  console.log(`- Applications endpoint: http://localhost:${port}/applications`);
}); 