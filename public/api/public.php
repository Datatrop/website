<?php
// Public, read-only content for the website. No auth. GET only.
require __DIR__ . '/lib.php';

if (method() !== 'GET') json_error('Method not allowed', 405);

$res = get_resource($_GET['resource'] ?? '');
if (empty($res['public'])) json_error('Unknown resource', 404); // never expose admin-only tables
$pdo = db();

if (!empty($res['single'])) {
    $row = $pdo->query("SELECT * FROM {$res['table']} ORDER BY {$res['order']} LIMIT 1")->fetch();
    // Admin-only fields that must never reach visitors' browsers
    if ($row) foreach ($res['private'] ?? [] as $col) unset($row[$col]);
    json_out($row ? shape_row($row, $res) : null);
}

$where = isset($res['public_where']) ? "WHERE {$res['public_where']}" : '';
$order = $res['public_order'] ?? $res['order'];
$rows  = $pdo->query("SELECT * FROM {$res['table']} $where ORDER BY $order")->fetchAll();

json_out(array_map(fn($r) => shape_row($r, $res), $rows));
