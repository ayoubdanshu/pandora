const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const multer = require('multer');
const fs = require('fs');

// ensure upload directory exists
const uploadDir = path.join(__dirname, 'assets', 'images', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${unique}${ext}`);
    }
});
const upload = multer({ storage });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./database.sqlite');

// Initialize database tables
db.serialize(() => {
    // Admin users table
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        car_id TEXT,
        car_name TEXT,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Contacts table
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        message TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Cars table (for management)
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

    // Create default admin user (username: admin, password: admin123)
    db.get("SELECT * FROM admins WHERE username = ?", ['admin'], (err, row) => {
        if (!row) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            db.run("INSERT INTO admins (username, password) VALUES (?, ?)", ['admin', hashedPassword]);
            console.log('Default admin created: username=admin, password=admin123');
        }
    });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token.' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Admin login
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM admins WHERE username = ?", [username], (err, admin) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!admin) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!bcrypt.compareSync(password, admin.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, username: admin.username });
    });
});

// Submit booking
app.post('/api/booking', (req, res) => {
    const { name, email, phone, carId, carName, date, time } = req.body;

    db.run(
        "INSERT INTO bookings (name, email, phone, car_id, car_name, date, time) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, email, phone, carId, carName, date, time],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save booking' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Submit contact form
app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;

    db.run(
        "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
        [name, email, message],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save contact' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Get all bookings (protected)
app.get('/api/bookings', authenticateToken, (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    let query = "SELECT * FROM bookings ORDER BY created_at DESC";
    if (limit) {
        query += ` LIMIT ${limit}`;
    }
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Update booking status
app.put('/api/bookings/:id', authenticateToken, (req, res) => {
    const { status, notes } = req.body;
    db.run(
        "UPDATE bookings SET status = ?, notes = ? WHERE id = ?",
        [status, notes, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update booking' });
            }
            res.json({ success: true });
        }
    );
});

// Get all contacts (protected)
app.get('/api/contacts', authenticateToken, (req, res) => {
    db.all("SELECT * FROM contacts ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Update contact status
app.put('/api/contacts/:id', authenticateToken, (req, res) => {
    const { status, notes } = req.body;
    db.run(
        "UPDATE contacts SET status = ?, notes = ? WHERE id = ?",
        [status, notes, req.params.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update contact' });
            }
            res.json({ success: true });
        }
    );
});

// Get all cars (protected)
app.get('/api/cars', authenticateToken, (req, res) => {
    db.all("SELECT * FROM cars ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Get all active cars (public - for frontend)
app.get('/api/cars/public', (req, res) => {
    db.all("SELECT * FROM cars WHERE status = 'active' ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

// Add/Update car
app.post('/api/cars', authenticateToken, (req, res) => {
    const { id, brand, model, year, price, mileage, fuel, transmission, color, images, specs } = req.body;

    db.run(
        `INSERT INTO cars (id, brand, model, year, price, mileage, fuel, transmission, color, images, specs)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
         brand = ?, model = ?, year = ?, price = ?, mileage = ?, fuel = ?, transmission = ?, 
         color = ?, images = ?, specs = ?, updated_at = CURRENT_TIMESTAMP`,
        [id, brand, model, year, price, mileage, fuel, transmission, color, JSON.stringify(images), JSON.stringify(specs),
         brand, model, year, price, mileage, fuel, transmission, color, JSON.stringify(images), JSON.stringify(specs)],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to save car' });
            }
            res.json({ success: true, id: id });
        }
    );
});

// Delete car
app.delete('/api/cars/:id', authenticateToken, (req, res) => {
    db.run("DELETE FROM cars WHERE id = ?", [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete car' });
        }
        res.json({ success: true });
    });
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
    const stats = {};

    db.get("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'", (err, row) => {
        stats.pendingBookings = row.count;

        db.get("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'", (err, row) => {
            stats.newContacts = row.count;

            db.get("SELECT COUNT(*) as count FROM bookings", (err, row) => {
                stats.totalBookings = row.count;

                db.get("SELECT COUNT(*) as count FROM cars WHERE status = 'active'", (err, row) => {
                    stats.activeCars = row.count;
                    res.json(stats);
                });
            });
        });
    });
});

// Sync cars from JSON to database
app.post('/api/cars/sync', authenticateToken, (req, res) => {
    const fs = require('fs');
    const carsPath = path.join(__dirname, 'assets/data/cars.json');
    
    try {
        const cars = JSON.parse(fs.readFileSync(carsPath, 'utf8'));
        let synced = 0;

        cars.forEach(car => {
            db.run(
                `INSERT INTO cars (id, brand, model, year, price, mileage, fuel, transmission, color, images, specs)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                 brand = ?, model = ?, year = ?, price = ?, mileage = ?, fuel = ?, transmission = ?, 
                 color = ?, images = ?, specs = ?, updated_at = CURRENT_TIMESTAMP`,
                [car.id, car.brand, car.model, car.year, car.price, car.mileage, car.fuel, car.transmission, 
                 car.color, JSON.stringify(car.images), JSON.stringify(car.specs),
                 car.brand, car.model, car.year, car.price, car.mileage, car.fuel, car.transmission, 
                 car.color, JSON.stringify(car.images), JSON.stringify(car.specs)],
                () => { synced++; }
            );
        });

        setTimeout(() => {
            res.json({ success: true, synced });
        }, 500);
    } catch (err) {
        res.status(500).json({ error: 'Failed to sync cars' });
    }
});

// Image upload endpoint (protected)
// Expects multipart/form-data with field name 'images' (one or more files)
app.post('/api/upload', authenticateToken, upload.array('images', 10), (req, res) => {
    try {
        const files = (req.files || []).map(f => {
            // return web-friendly path
            const rel = path.join('assets', 'images', 'products', f.filename).replace(/\\/g, '/');
            return '/' + rel.replace(/\\/g, '/');
        });
        res.json({ success: true, files });
    } catch (err) {
        console.error('Upload error', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Admin dashboard: http://localhost:${PORT}/admin/login.html`);
});

