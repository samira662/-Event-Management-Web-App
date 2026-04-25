<?php
// ===================================================
//  EventFlow - Database Configuration
// ===================================================
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'event_management');
define('APP_URL', 'http://localhost/event-management');

// Start session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_lifetime', 86400);
    session_start();
}

// Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

function getDBConnection() {
    static $conn = null;
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        if ($conn->connect_error) {
            sendResponse(false, 'DB Error: ' . $conn->connect_error, null, 500);
        }
        $conn->set_charset('utf8mb4');
    }
    return $conn;
}

function sendResponse($success, $message, $data = null, $code = 200) {
    http_response_code($code);
    $r = ['success' => $success, 'message' => $message];
    if ($data !== null) $r['data'] = $data;
    echo json_encode($r, JSON_UNESCAPED_UNICODE);
    exit();
}

function getInput() {
    $raw = file_get_contents('php://input');
    if (!empty($raw)) {
        $decoded = json_decode($raw, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) return $decoded;
    }
    return !empty($_POST) ? $_POST : [];
}

function isLoggedIn() { return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']); }
function isAdmin()    { return isLoggedIn() && isset($_SESSION['role']) && $_SESSION['role'] === 'admin'; }
function requireAuth() { if (!isLoggedIn()) sendResponse(false, 'Login required', null, 401); }
function requireAdmin() { requireAuth(); if (!isAdmin()) sendResponse(false, 'Admin only', null, 403); }
function clean($s) { return htmlspecialchars(strip_tags(trim((string)$s))); }
?>
