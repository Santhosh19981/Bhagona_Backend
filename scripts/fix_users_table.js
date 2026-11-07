const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Determine env file from argument or default to .env.production / .env
const envFile = process.argv[2] || (fs.existsSync(path.resolve(__dirname, '../.env.production')) ? '.env.production' : '.env');
const envPath = path.resolve(__dirname, '..', envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`Loaded environment from ${envFile}`);
} else {
  dotenv.config();
}

async function fixUsersTimestamps() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bhagona_prod',
    waitForConnections: true,
    connectionLimit: 5
  });

  try {
    console.log(`Applying timestamp defaults to table 'Users' on ${process.env.DB_NAME}...`);
    await pool.query(`
      ALTER TABLE Users 
        MODIFY COLUMN createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MODIFY COLUMN updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    `);
    console.log('✅ Successfully updated Users table: createdAt and updatedAt now have default CURRENT_TIMESTAMP!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await pool.end();
  }
}

fixUsersTimestamps();

