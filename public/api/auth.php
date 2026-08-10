<?php
// Admin authentication: login / logout / me. Session-cookie based.
require __DIR__ . '/lib.php';

$action = $_GET['action'] ?? '';

if ($action === 'me') {
    $email = current_admin();
    if (!$email) json_error('Unauthorized', 401);
    json_out(['email' => $email]);
}

if ($action === 'login') {
    if (method() !== 'POST') json_error('Method not allowed', 405);
    require_fetch_header();

    $body  = read_json_body();
    $email = strtolower(trim((string) ($body['email'] ?? '')));
    $pass  = (string) ($body['password'] ?? '');
    if ($email === '' || $pass === '') json_error('Email and password are required', 400);

    $stmt = db()->prepare('SELECT email, password_hash FROM admin_users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password_hash'])) {
        json_error('Invalid email or password', 401);
    }

    start_admin_session();
    session_regenerate_id(true);
    $_SESSION['admin_email'] = $user['email'];
    json_out(['email' => $user['email']]);
}

if ($action === 'logout') {
    require_fetch_header();
    start_admin_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    json_out(['ok' => true]);
}

json_error('Unknown action', 404);
