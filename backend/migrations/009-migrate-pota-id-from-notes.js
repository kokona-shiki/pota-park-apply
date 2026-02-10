// Migration: Migrate POTA ID from pota_notes to pota_id field
// Generated: 2026-01-17

const migratePotaIdFromNotes = async (db) => {
  try {
    console.warn('Starting migration: Migrate POTA ID from pota_notes to pota_id field');
    
    // Step 1: Get all parks with pota_notes containing POTA ID
    const parks = await db.query(`
      SELECT id, pota_notes FROM park_applications 
      WHERE pota_notes IS NOT NULL AND pota_notes != ''
    `);
    
    console.warn(`Found ${parks.rows.length} parks with pota_notes`);
    
    // Step 2: Process each park
    let processedCount = 0;
    let updatedCount = 0;
    let cleanedCount = 0;
    
    for (const park of parks.rows) {
      processedCount++;
      
      // Extract POTA ID from pota_notes
      const potaIdMatch = park.pota_notes.match(/POTA ID: (\w+)/);
      if (potaIdMatch) {
        const potaId = potaIdMatch[1];
        
        // Update pota_id field
        await db.query(
          'UPDATE park_applications SET pota_id = $1 WHERE id = $2',
          [potaId, park.id]
        );
        
        updatedCount++;
        
        // Clean pota_notes: only keep failure or skip reasons
        let newNotes = null;
        
        if (park.pota_notes.includes('失败') || park.pota_notes.includes('跳过')) {
          // Extract failure or skip reasons
          const failureMatch = park.pota_notes.match(/(失败原因|跳过原因): (.+)/);
          if (failureMatch) {
            newNotes = failureMatch[0];
          } else {
            // If no specific reason format, keep the entire note
            newNotes = park.pota_notes;
          }
        } else {
          // No failure or skip reasons, set to null
          newNotes = null;
        }
        
        // Update pota_notes field
        await db.query(
          'UPDATE park_applications SET pota_notes = $1 WHERE id = $2',
          [newNotes, park.id]
        );
        
        if (newNotes === null) {
          cleanedCount++;
        }
      }
    }
    
    console.warn(`✓ Processed ${processedCount} parks`);
    console.warn(`✓ Updated pota_id for ${updatedCount} parks`);
    console.warn(`✓ Cleaned pota_notes for ${cleanedCount} parks`);
    
    console.warn('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

module.exports = migratePotaIdFromNotes;
