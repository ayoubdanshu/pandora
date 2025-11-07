const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const repoRoot = path.join(__dirname, '..');
const dbPath = path.join(repoRoot, 'database.sqlite');
const carsPath = path.join(repoRoot, 'assets', 'data', 'cars.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Ensure table exists (same schema as server.js)
  db.run(`CREATE TABLE IF NOT EXISTS cars (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    price INTEGER NOT NULL,
    mileage INTEGER NOT NULL,
    fuel TEXT NOT NULL,
    transmission TEXT NOT NULL,
    color TEXT NOT NULL,
    images TEXT NOT NULL,
    specs TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const cars = readJson(carsPath);
  const stmt = db.prepare(`INSERT OR REPLACE INTO cars (id, brand, model, year, price, mileage, fuel, transmission, color, images, specs, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))`);

  let count = 0;
  cars.forEach(car => {
    stmt.run(
      car.id,
      car.brand,
      car.model,
      car.year || 0,
      car.price || 0,
      car.mileage || 0,
      car.fuel || '',
      car.transmission || '',
      car.color || '',
      JSON.stringify(car.images || []),
      JSON.stringify(car.specs || {}),
      car.status || 'active'
    );
    count++;
  });

  stmt.finalize(() => {
    console.log(`Seeded ${count} cars into ${dbPath}`);
    db.close();
  });
});
