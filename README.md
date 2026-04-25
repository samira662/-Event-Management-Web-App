# ⚡ EventFlow — Event Management Web Application

A full-featured Event Management Web Application built with HTML, CSS, JavaScript (frontend) and PHP + MySQL (backend).

---

## 🗂️ Project Structure

```
event-management/
├── index.html              # Main SPA entry point
├── database.sql            # Database setup script
├── css/
│   └── styles.css          # All styles (dark theme)
├── js/
│   └── app.js              # Frontend JavaScript SPA logic
├── php/
│   ├── config.php          # DB config + helper functions
│   ├── auth.php            # Authentication API
│   └── events.php          # Events CRUD API
└── images/
    └── uploads/            # User uploaded images (auto-created)
```

---

## 🚀 Features

### 👤 User Features
- Register / Login / Logout with session management
- Browse & search events with filters (category, status, date, keyword)
- View detailed event pages
- Register / Unregister for events
- Personal dashboard with registrations & created events
- Update profile & password

### 📅 Event Features
- Create, edit, delete events
- Categories: Conference, Workshop, Concert, Sports, Networking, Exhibition, Webinar, Festival
- Capacity management with live tracking
- Free & paid events
- Event status: upcoming / ongoing / completed / cancelled
- Cover image URL support

### 🛡️ Admin Features
- Full CRUD on all events
- View all registrations
- User management stats

---

## ⚙️ Setup Instructions

### Prerequisites
- **PHP 7.4+** (with PDO/MySQLi extension)
- **MySQL 5.7+** or **MariaDB 10.3+**
- **Apache** or **Nginx** web server
- **XAMPP / WAMP / MAMP** works perfectly

### Step 1 — Database Setup
1. Open **phpMyAdmin** or MySQL CLI
2. Run the database script:
   ```sql
   source /path/to/event-management/database.sql
   ```
   Or copy-paste `database.sql` contents into phpMyAdmin SQL tab.

### Step 2 — Configure Database
Edit `php/config.php`:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');        // your MySQL username
define('DB_PASS', '');            // your MySQL password
define('DB_NAME', 'event_management');
define('APP_URL', 'http://localhost/event-management');
```

### Step 3 — Deploy Files
Place the entire `event-management/` folder in your web server root:
- **XAMPP**: `C:/xampp/htdocs/event-management/`
- **WAMP**: `C:/wamp64/www/event-management/`
- **MAMP**: `/Applications/MAMP/htdocs/event-management/`

### Step 4 — Access the App
Open your browser: `http://localhost/event-management/`

---

## 🔐 Default Admin Account
| Field    | Value                      |
|----------|----------------------------|
| Email    | admin@eventmanager.com     |
| Password | admin123                   |
| Role     | Administrator              |

---

## 🔌 API Endpoints

### Auth (`php/auth.php`)
| Action          | Method | Description        |
|----------------|--------|--------------------|
| `?action=login`         | POST   | Login user         |
| `?action=register`      | POST   | Register new user  |
| `?action=logout`        | GET    | Logout             |
| `?action=me`            | GET    | Get current user   |
| `?action=update_profile`| POST   | Update profile     |

### Events (`php/events.php`)
| Action              | Method | Description                |
|--------------------|--------|----------------------------|
| `?action=list`          | GET    | List/filter events         |
| `?action=get&id=N`      | GET    | Get single event           |
| `?action=create`        | POST   | Create event (auth)        |
| `?action=update&id=N`   | POST   | Update event (auth/owner)  |
| `?action=delete&id=N`   | GET    | Delete event (admin)       |
| `?action=register`      | POST   | Register for event (auth)  |
| `?action=unregister`    | GET    | Cancel registration (auth) |
| `?action=my_events`     | GET    | My events (auth)           |
| `?action=my_registrations` | GET | My registrations (auth) |
| `?action=stats`         | GET    | Platform stats             |
| `?action=categories`    | GET    | Event categories           |

---

## 🛠️ Tech Stack

| Layer      | Technology          |
|-----------|---------------------|
| Frontend  | HTML5, CSS3, Vanilla JS (SPA) |
| Backend   | PHP 7.4+ (REST API) |
| Database  | MySQL / MariaDB     |
| Fonts     | Google Fonts (Syne + DM Sans) |
| No frameworks | Pure HTML/CSS/JS + native PHP |

---

## 🎨 Design
- Dark theme with purple/teal accents
- Responsive (mobile, tablet, desktop)
- SPA (Single Page Application) routing
- Smooth animations & transitions
- Toast notification system
- Modal system

---

## 📞 Support
For issues, check:
1. PHP error logs (`/xampp/apache/logs/error.log`)
2. Browser console (F12)
3. Ensure `event_management` database exists and tables created
