const mysql = require("mysql2/promise");

async function tryConnect(password) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: password
    });
    const [rows] = await connection.query('SHOW DATABASES');
    console.log(`✅ Connection Succeeded with password: "${password}"`);
    console.log('Databases:', rows.map(r => r.Database));
    await connection.end();
    return true;
  } catch (err) {
    console.log(`❌ Connection Failed with password: "${password}": ${err.message}`);
    return false;
  }
}

async function main() {
  const passwords = ['', 'root', 'yourpassword', 'Bhagonatest@1998'];
  for (const pwd of passwords) {
    const success = await tryConnect(pwd);
    if (success) break;
  }
}

main();
