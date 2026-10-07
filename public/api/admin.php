<?php
// Protected CRUD for the admin panel. Requires a valid admin session.
require __DIR__ . '/lib.php';

require_fetch_header();
require_admin();

$res = get_resource($_GET['resource'] ?? '');
$pdo = db();
$m   = method();
$id  = isset($_GET['id']) ? (int) $_GET['id'] : 0;

// ── Single-row settings table (site_content): GET + upsert ──────────────────
if (!empty($res['single'])) {
    if ($m === 'GET') {
        $row = $pdo->query("SELECT * FROM {$res['table']} ORDER BY {$res['order']} LIMIT 1")->fetch();
        json_out($row ? shape_row($row, $res) : null);
    }
    if ($m === 'PUT' || $m === 'POST') {
        $payload = build_payload(read_json_body(), $res);
        $existing = $pdo->query("SELECT id FROM {$res['table']} ORDER BY {$res['order']} LIMIT 1")->fetch();
        if ($existing) {
            update_row($pdo, $res, (int) $existing['id'], $payload);
            $rid = (int) $existing['id'];
        } else {
            $rid = insert_row($pdo, $res, $payload);
        }
        json_out(fetch_by_id($pdo, $res, $rid));
    }
    json_error('Method not allowed', 405);
}

// ── Collection tables: list / create / update / delete ──────────────────────
if ($m === 'GET') {
    $rows = $pdo->query("SELECT * FROM {$res['table']} ORDER BY {$res['order']}")->fetchAll();
    json_out(array_map(fn($r) => shape_row($r, $res), $rows));
}

if ($m === 'POST') {
    $payload = build_payload(read_json_body(), $res);
    if (!$payload) json_error('No data provided', 400);
    if ($_GET['resource'] === 'deals' && empty($payload['deal_id'])) {
        $payload['deal_id'] = next_deal_id($pdo);
    }
    $rid = insert_row($pdo, $res, $payload);
    json_out(fetch_by_id($pdo, $res, $rid), 201);
}

if ($m === 'PUT') {
    if (!$id) json_error('id is required', 400);
    $payload = build_payload(read_json_body(), $res);
    if (!$payload) json_error('No data provided', 400);
    update_row($pdo, $res, $id, $payload);
    json_out(fetch_by_id($pdo, $res, $id));
}

if ($m === 'DELETE') {
    if (!$id) json_error('id is required', 400);
    $pdo->prepare("DELETE FROM {$res['table']} WHERE id = ?")->execute([$id]);
    json_out(['ok' => true]);
}

json_error('Method not allowed', 405);
