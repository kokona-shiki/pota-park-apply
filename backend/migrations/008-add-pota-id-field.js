// Migration: Add pota_id field to park_applications table
// Generated: 2026-01-17

const addPotaIdField = async (db) => {
  try {
    console.log('Starting migration: Add pota_id field to park_applications table');
    
    // Step 1: Add pota_id field
    await db.query(`
      ALTER TABLE park_applications 
      ADD COLUMN IF NOT EXISTS pota_id VARCHAR(20) UNIQUE;
    `);
    
    console.log('✓ Added pota_id field to park_applications table');
    
    // Step 2: Add index to pota_id field
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_park_pota_id 
      ON park_applications(pota_id);
    `);
    
    console.log('✓ Added index to pota_id field');
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

module.exports = addPotaIdField;
