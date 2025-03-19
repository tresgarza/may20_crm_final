const { supabase, pgConfig } = require('./supabase');
const { Pool } = require('pg');

// Create a PostgreSQL connection pool (for direct SQL queries if needed)
const pool = new Pool(pgConfig);

/**
 * Database utility functions
 */
const db = {
  /**
   * Execute a direct SQL query using pg
   * @param {string} text - SQL query text
   * @param {Array} params - Query parameters
   * @returns {Promise} Query result
   */
  query: async (text, params) => {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(text, params);
        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  /**
   * Get all records from a table
   * @param {string} table - Table name
   * @returns {Promise} Query result
   */
  getAll: async (table) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching all records from ${table}:`, error);
      throw error;
    }
  },

  /**
   * Get a record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise} Query result
   */
  getById: async (table, id) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching record by ID from ${table}:`, error);
      throw error;
    }
  },

  /**
   * Insert a record
   * @param {string} table - Table name
   * @param {Object} record - Record to insert
   * @returns {Promise} Query result
   */
  insert: async (table, record) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(record)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error inserting record into ${table}:`, error);
      throw error;
    }
  },

  /**
   * Update a record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {Object} updates - Fields to update
   * @returns {Promise} Query result
   */
  update: async (table, id, updates) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error updating record in ${table}:`, error);
      throw error;
    }
  },

  /**
   * Delete a record
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise} Query result
   */
  delete: async (table, id) => {
    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error deleting record from ${table}:`, error);
      throw error;
    }
  },

  /**
   * Test the database connection
   * @returns {Promise<boolean>} Connection status
   */
  testConnection: async () => {
    try {
      // Test Supabase connection
      const { data, error } = await supabase.from('advisors').select('id').limit(1);
      
      if (error) throw error;
      console.log('Supabase connection successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
};

module.exports = db; 