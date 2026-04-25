-- Event Management Web Application Database
-- Created for MySQL/MariaDB

CREATE DATABASE IF NOT EXISTS event_management;
USE event_management;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    avatar VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    location VARCHAR(255),
    venue VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    start_time TIME,
    end_time TIME,
    capacity INT DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    image VARCHAR(255) DEFAULT NULL,
    organizer_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Registrations Table
CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    ticket_count INT DEFAULT 1,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'confirmed',
    payment_method VARCHAR(50) DEFAULT 'free',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE KEY unique_registration (user_id, event_id)
);

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(50) DEFAULT '📅',
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments/Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_id INT NOT NULL,
    rating INT DEFAULT 5,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Insert Default Categories
INSERT INTO categories (name, icon, color) VALUES
('Conference', '🎤', '#6366f1'),
('Workshop', '🛠️', '#f59e0b'),
('Concert', '🎵', '#ec4899'),
('Sports', '⚽', '#10b981'),
('Networking', '🤝', '#3b82f6'),
('Exhibition', '🖼️', '#8b5cf6'),
('Webinar', '💻', '#06b6d4'),
('Festival', '🎉', '#f97316');

-- Insert Default Admin User (password: admin123)
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@eventmanager.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Sample Events
INSERT INTO events (title, description, category, location, venue, start_date, end_date, start_time, end_time, capacity, price, status, organizer_id) VALUES
('Tech Summit 2025', 'Annual technology conference featuring industry leaders and innovative startups showcasing the future of technology.', 'Conference', 'New York, USA', 'Javits Center', '2025-08-15', '2025-08-17', '09:00:00', '18:00:00', 500, 99.99, 'upcoming', 1),
('Web Dev Workshop', 'Hands-on workshop covering modern web development techniques including React, Node.js, and cloud deployment.', 'Workshop', 'San Francisco, USA', 'Tech Hub SF', '2025-07-20', '2025-07-20', '10:00:00', '16:00:00', 50, 49.99, 'upcoming', 1),
('Music Festival 2025', 'Three-day outdoor music festival featuring top artists from around the world across multiple stages.', 'Festival', 'Austin, Texas', 'Zilker Park', '2025-09-05', '2025-09-07', '12:00:00', '23:00:00', 10000, 150.00, 'upcoming', 1),
('AI & Future Summit', 'Explore the frontiers of artificial intelligence with top researchers and business leaders.', 'Conference', 'Boston, USA', 'Hynes Convention', '2025-08-01', '2025-08-02', '08:30:00', '17:30:00', 300, 75.00, 'upcoming', 1),
('Photography Exhibition', 'Annual photography exhibition showcasing works from emerging and established photographers worldwide.', 'Exhibition', 'Chicago, USA', 'Art Institute', '2025-07-10', '2025-07-25', '10:00:00', '20:00:00', 200, 25.00, 'upcoming', 1),
('Startup Networking Night', 'Connect with fellow entrepreneurs, investors, and innovators in an evening of networking and idea sharing.', 'Networking', 'Los Angeles, USA', 'WeWork DTLA', '2025-07-30', '2025-07-30', '18:00:00', '21:00:00', 100, 0.00, 'upcoming', 1);
