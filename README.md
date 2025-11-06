# Pandora Motors - Car Dealership Website with CRM

A modern, professional car dealership website with a complete backend CRM system for managing bookings, contacts, and car listings.

## Features

### Frontend
- Modern, responsive design
- Car inventory with filters
- Booking/test drive form
- Contact form
- Vehicle detail pages
- Interactive Google Maps
- Smooth animations and transitions

### Backend & CRM
- Express.js backend server
- SQLite database
- JWT authentication
- Admin dashboard
- Bookings management
- Contacts management
- Car listings management
- API endpoints for all operations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 3. Access the Website

- **Frontend**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin/login.html

### 4. Default Admin Credentials

- **Username**: `admin`
- **Password**: `admin123`

**⚠️ IMPORTANT**: Change the default password in production!

## Project Structure

```
pandora/
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   └── app.js
│   └── data/
│       └── cars.json
├── pages/
│   ├── inventory.html
│   ├── about.html
│   ├── contact.html
│   ├── testimonials.html
│   ├── booking.html
│   └── vehicle.html
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── bookings.html
│   ├── contacts.html
│   ├── listings.html
│   ├── admin.css
│   └── admin.js
├── server.js
├── package.json
└── database.sqlite (created automatically)
```

## API Endpoints

### Public Endpoints
- `POST /api/booking` - Submit test drive booking
- `POST /api/contact` - Submit contact form

### Protected Endpoints (require authentication)
- `POST /api/admin/login` - Admin login
- `GET /api/bookings` - Get all bookings
- `PUT /api/bookings/:id` - Update booking status
- `GET /api/contacts` - Get all contacts
- `PUT /api/contacts/:id` - Update contact status
- `GET /api/cars` - Get all cars
- `POST /api/cars` - Add/Update car
- `DELETE /api/cars/:id` - Delete car
- `POST /api/cars/sync` - Sync cars from JSON
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

The database is automatically created with the following tables:
- `admins` - Admin users
- `bookings` - Test drive bookings
- `contacts` - Contact form submissions
- `cars` - Car listings

## Environment Variables

Create a `.env` file (see `.env.example`):
```
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

## Production Deployment

1. Change the default admin password
2. Set a strong JWT_SECRET in `.env`
3. Use a production database (PostgreSQL recommended)
4. Set up HTTPS
5. Configure CORS properly
6. Add rate limiting
7. Set up proper logging

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Database**: SQLite
- **Authentication**: JWT
- **Maps**: Google Maps Embed API

## License

ISC

