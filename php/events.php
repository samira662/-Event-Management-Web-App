<?php
require_once 'config.php';

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':         getEvents(); break;
    case 'get':          getEvent(); break;
    case 'create':       createEvent(); break;
    case 'update':       updateEvent(); break;
    case 'delete':       deleteEvent(); break;
    case 'register':     registerForEvent(); break;
    case 'unregister':   unregisterFromEvent(); break;
    case 'my_events':    getMyEvents(); break;
    case 'my_registrations': getMyRegistrations(); break;
    case 'stats':        getStats(); break;
    case 'categories':   getCategories(); break;
    case 'search':       searchEvents(); break;
    default:             sendResponse(false, 'Invalid action', null, 400);
}

function getEvents() {
    $db = getDBConnection();
    $where = ['1=1'];
    $params = [];
    $types  = '';

    if (!empty($_GET['category'])) {
        $where[] = 'e.category = ?';
        $params[] = sanitize($_GET['category']);
        $types .= 's';
    }
    if (!empty($_GET['status'])) {
        $where[] = 'e.status = ?';
        $params[] = sanitize($_GET['status']);
        $types .= 's';
    }
    if (!empty($_GET['search'])) {
        $where[] = '(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)';
        $s = '%' . sanitize($_GET['search']) . '%';
        $params = array_merge($params, [$s, $s, $s]);
        $types .= 'sss';
    }
    if (!empty($_GET['date_from'])) {
        $where[] = 'e.start_date >= ?';
        $params[] = sanitize($_GET['date_from']);
        $types .= 's';
    }

    $whereStr = implode(' AND ', $where);
    $limit = intval($_GET['limit'] ?? 20);
    $offset = intval($_GET['offset'] ?? 0);
    $sort = in_array($_GET['sort'] ?? '', ['start_date', 'title', 'price', 'created_at']) ? $_GET['sort'] : 'start_date';
    $order = ($_GET['order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

    $sql = "SELECT e.*, u.name AS organizer_name,
                   (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status='confirmed') AS registered_count
            FROM events e
            LEFT JOIN users u ON u.id = e.organizer_id
            WHERE $whereStr
            ORDER BY e.$sort $order
            LIMIT ? OFFSET ?";

    $params[] = $limit;
    $params[] = $offset;
    $types .= 'ii';

    $stmt = $db->prepare($sql);
    if ($types) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Total count
    $countSql = "SELECT COUNT(*) as total FROM events e WHERE $whereStr";
    $countTypes = str_replace('ii', '', $types);
    $countParams = array_slice($params, 0, -2);
    $cStmt = $db->prepare($countSql);
    if ($countTypes) $cStmt->bind_param($countTypes, ...$countParams);
    $cStmt->execute();
    $total = $cStmt->get_result()->fetch_assoc()['total'];

    sendResponse(true, 'Events retrieved', ['events' => $events, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
}

function getEvent() {
    $id = intval($_GET['id'] ?? 0);
    if (!$id) sendResponse(false, 'Event ID required', null, 400);

    $db = getDBConnection();
    $stmt = $db->prepare("
        SELECT e.*, u.name AS organizer_name,
               (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.status='confirmed') AS registered_count
        FROM events e
        LEFT JOIN users u ON u.id = e.organizer_id
        WHERE e.id = ?
    ");
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $event = $stmt->get_result()->fetch_assoc();
    if (!$event) sendResponse(false, 'Event not found', null, 404);

    // Get reviews
    $rStmt = $db->prepare("SELECT rv.*, u.name as reviewer_name FROM reviews rv LEFT JOIN users u ON u.id=rv.user_id WHERE rv.event_id=? ORDER BY rv.created_at DESC LIMIT 5");
    $rStmt->bind_param('i', $id);
    $rStmt->execute();
    $event['reviews'] = $rStmt->get_result()->fetch_all(MYSQLI_ASSOC);

    // Check if current user registered
    $event['is_registered'] = false;
    if (isLoggedIn()) {
        $regStmt = $db->prepare("SELECT id FROM registrations WHERE user_id=? AND event_id=? AND status='confirmed'");
        $regStmt->bind_param('ii', $_SESSION['user_id'], $id);
        $regStmt->execute();
        $event['is_registered'] = $regStmt->get_result()->num_rows > 0;
    }

    sendResponse(true, 'Event retrieved', $event);
}

function createEvent() {
    requireAuth();
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $title      = sanitize($input['title'] ?? '');
    $desc       = sanitize($input['description'] ?? '');
    $category   = sanitize($input['category'] ?? '');
    $location   = sanitize($input['location'] ?? '');
    $venue      = sanitize($input['venue'] ?? '');
    $startDate  = sanitize($input['start_date'] ?? '');
    $endDate    = sanitize($input['end_date'] ?? '') ?: null;
    $startTime  = sanitize($input['start_time'] ?? '') ?: null;
    $endTime    = sanitize($input['end_time'] ?? '') ?: null;
    $capacity   = intval($input['capacity'] ?? 0);
    $price      = floatval($input['price'] ?? 0);
    $status     = in_array($input['status'] ?? '', ['upcoming','ongoing','completed','cancelled']) ? $input['status'] : 'upcoming';
    $image      = sanitize($input['image'] ?? '') ?: null;
    $orgId      = $_SESSION['user_id'];

    if (!$title || !$startDate) sendResponse(false, 'Title and start date required', null, 400);

    $db = getDBConnection();
    $stmt = $db->prepare("INSERT INTO events (title,description,category,location,venue,start_date,end_date,start_time,end_time,capacity,price,status,image,organizer_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    $stmt->bind_param('sssssssssiidsi', $title,$desc,$category,$location,$venue,$startDate,$endDate,$startTime,$endTime,$capacity,$price,$status,$image,$orgId);
    if ($stmt->execute()) {
        sendResponse(true, 'Event created', ['id' => $db->insert_id]);
    } else {
        sendResponse(false, 'Failed to create event', null, 500);
    }
}

function updateEvent() {
    requireAuth();
    $id = intval($_GET['id'] ?? 0);
    if (!$id) sendResponse(false, 'Event ID required', null, 400);

    $db = getDBConnection();
    if (!isAdmin()) {
        $check = $db->prepare("SELECT id FROM events WHERE id=? AND organizer_id=?");
        $check->bind_param('ii', $id, $_SESSION['user_id']);
        $check->execute();
        if ($check->get_result()->num_rows === 0) sendResponse(false, 'Unauthorized', null, 403);
    }

    $input     = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $title     = sanitize($input['title'] ?? '');
    $desc      = sanitize($input['description'] ?? '');
    $category  = sanitize($input['category'] ?? '');
    $location  = sanitize($input['location'] ?? '');
    $venue     = sanitize($input['venue'] ?? '');
    $startDate = sanitize($input['start_date'] ?? '');
    $endDate   = sanitize($input['end_date'] ?? '') ?: null;
    $startTime = sanitize($input['start_time'] ?? '') ?: null;
    $endTime   = sanitize($input['end_time'] ?? '') ?: null;
    $capacity  = intval($input['capacity'] ?? 0);
    $price     = floatval($input['price'] ?? 0);
    $status    = in_array($input['status'] ?? '', ['upcoming','ongoing','completed','cancelled']) ? $input['status'] : 'upcoming';
    $image     = sanitize($input['image'] ?? '') ?: null;

    $stmt = $db->prepare("UPDATE events SET title=?,description=?,category=?,location=?,venue=?,start_date=?,end_date=?,start_time=?,end_time=?,capacity=?,price=?,status=?,image=? WHERE id=?");
    $stmt->bind_param('sssssssssiidsi', $title,$desc,$category,$location,$venue,$startDate,$endDate,$startTime,$endTime,$capacity,$price,$status,$image,$id);
    if ($stmt->execute()) sendResponse(true, 'Event updated');
    else sendResponse(false, 'Update failed', null, 500);
}

function deleteEvent() {
    requireAdmin();
    $id = intval($_GET['id'] ?? 0);
    if (!$id) sendResponse(false, 'Event ID required', null, 400);
    $db = getDBConnection();
    $stmt = $db->prepare("DELETE FROM events WHERE id=?");
    $stmt->bind_param('i', $id);
    if ($stmt->execute()) sendResponse(true, 'Event deleted');
    else sendResponse(false, 'Delete failed', null, 500);
}

function registerForEvent() {
    requireAuth();
    $input   = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $eventId = intval($input['event_id'] ?? $_GET['event_id'] ?? 0);
    $tickets = max(1, intval($input['ticket_count'] ?? 1));
    if (!$eventId) sendResponse(false, 'Event ID required', null, 400);

    $db = getDBConnection();
    $eStmt = $db->prepare("SELECT capacity, price, status, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed') AS reg_count FROM events e WHERE id=?");
    $eStmt->bind_param('i', $eventId);
    $eStmt->execute();
    $event = $eStmt->get_result()->fetch_assoc();
    if (!$event) sendResponse(false, 'Event not found', null, 404);
    if ($event['status'] !== 'upcoming') sendResponse(false, 'Cannot register for this event', null, 400);
    if ($event['capacity'] > 0 && ($event['reg_count'] + $tickets) > $event['capacity']) sendResponse(false, 'Not enough capacity', null, 400);

    $total = $event['price'] * $tickets;
    $stmt  = $db->prepare("INSERT INTO registrations (user_id,event_id,ticket_count,total_price) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE status='confirmed'");
    $stmt->bind_param('iiid', $_SESSION['user_id'], $eventId, $tickets, $total);
    if ($stmt->execute()) sendResponse(true, 'Registered successfully', ['total_price' => $total]);
    else sendResponse(false, 'Registration failed', null, 500);
}

function unregisterFromEvent() {
    requireAuth();
    $eventId = intval($_GET['event_id'] ?? 0);
    if (!$eventId) sendResponse(false, 'Event ID required', null, 400);
    $db = getDBConnection();
    $stmt = $db->prepare("UPDATE registrations SET status='cancelled' WHERE user_id=? AND event_id=?");
    $stmt->bind_param('ii', $_SESSION['user_id'], $eventId);
    if ($stmt->execute()) sendResponse(true, 'Unregistered successfully');
    else sendResponse(false, 'Failed to unregister', null, 500);
}

function getMyEvents() {
    requireAuth();
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id AND r.status='confirmed') AS registered_count FROM events e WHERE e.organizer_id=? ORDER BY e.created_at DESC");
    $stmt->bind_param('i', $_SESSION['user_id']);
    $stmt->execute();
    $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    sendResponse(true, 'My events', $events);
}

function getMyRegistrations() {
    requireAuth();
    $db = getDBConnection();
    $stmt = $db->prepare("SELECT r.*, e.title, e.start_date, e.start_time, e.location, e.image, e.status AS event_status, e.category FROM registrations r JOIN events e ON e.id=r.event_id WHERE r.user_id=? ORDER BY r.registered_at DESC");
    $stmt->bind_param('i', $_SESSION['user_id']);
    $stmt->execute();
    $regs = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    sendResponse(true, 'My registrations', $regs);
}

function getStats() {
    $db = getDBConnection();
    $stats = [];
    $stats['total_events'] = $db->query("SELECT COUNT(*) c FROM events")->fetch_assoc()['c'];
    $stats['upcoming_events'] = $db->query("SELECT COUNT(*) c FROM events WHERE status='upcoming'")->fetch_assoc()['c'];
    $stats['total_users'] = $db->query("SELECT COUNT(*) c FROM users")->fetch_assoc()['c'];
    $stats['total_registrations'] = $db->query("SELECT COUNT(*) c FROM registrations WHERE status='confirmed'")->fetch_assoc()['c'];
    sendResponse(true, 'Stats', $stats);
}

function getCategories() {
    $db = getDBConnection();
    $result = $db->query("SELECT c.*, (SELECT COUNT(*) FROM events e WHERE e.category=c.name) as event_count FROM categories c ORDER BY event_count DESC");
    sendResponse(true, 'Categories', $result->fetch_all(MYSQLI_ASSOC));
}

function searchEvents() {
    $_GET['action'] = 'list';
    getEvents();
}
?>
