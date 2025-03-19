const db = require('./database');

/**
 * Test the database connection
 */
async function testDatabaseConnection() {
  try {
    const isConnected = await db.testConnection();
    if (isConnected) {
      console.log('✅ Database connection successful');
      
      // Try to fetch some data
      const advisors = await db.getAll('advisors');
      console.log(`Found ${advisors.length} advisors`);
    } else {
      console.error('❌ Database connection failed');
    }
  } catch (error) {
    console.error('Error testing database connection:', error);
  } finally {
    // Close the connection pool
    process.exit(0);
  }
}

// Run the test
testDatabaseConnection(); 