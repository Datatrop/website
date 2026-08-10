<?php
// Public endpoint: accept a strategy-call / contact submission and store it.
// POST only. No auth (it's the public form), but requires the fetch header.
require __DIR__ . '/lib.php';

if (method() !== 'POST') json_error('Method not allowed', 405);
require_fetch_header();

$b         = read_json_body();
$name      = trim((string) ($b['name'] ?? ''));
$company   = trim((string) ($b['company'] ?? ''));
$email     = trim((string) ($b['email'] ?? ''));
$industry  = trim((string) ($b['industry'] ?? ''));
$size      = trim((string) ($b['company_size'] ?? ''));
$challenge = trim((string) ($b['challenge'] ?? ''));

if ($name === '' || $email === '' || $challenge === '') {
    json_error('Name, work email and challenge are required.', 400);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_error('Please enter a valid email address.', 400);
}

$stmt = db()->prepare(
    'INSERT INTO leads (name, company, email, industry, company_size, challenge)
     VALUES (?, ?, ?, ?, ?, ?)'
);
$stmt->execute([
    substr($name, 0, 255),
    $company !== '' ? substr($company, 0, 255) : null,
    substr($email, 0, 255),
    $industry !== '' ? substr($industry, 0, 128) : null,
    $size !== '' ? substr($size, 0, 64) : null,
    $challenge,
]);

// Notify via Outlook if connected. Best-effort only — a mail failure must never
// lose the lead, which is already safely stored above.
try {
    require_once __DIR__ . '/ms_lib.php';
    if (ms_connected()) {
        $row = ms_row();
        $to  = $row['account_email'] ?? null;
        if ($to) {
            $esc  = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
            $html = '<h2>New lead from datatrop.in</h2>'
                . '<p><strong>Name:</strong> ' . $esc($name) . '</p>'
                . '<p><strong>Company:</strong> ' . $esc($company !== '' ? $company : '—') . '</p>'
                . '<p><strong>Email:</strong> <a href="mailto:' . $esc($email) . '">' . $esc($email) . '</a></p>'
                . '<p><strong>Industry:</strong> ' . $esc($industry !== '' ? $industry : '—') . '</p>'
                . '<p><strong>Company size:</strong> ' . $esc($size !== '' ? $size : '—') . '</p>'
                . '<p><strong>Challenge:</strong><br>' . nl2br($esc($challenge)) . '</p>'
                . '<p style="color:#666">View it in the admin panel → Leads.</p>';
            ms_send_mail($to, 'New lead: ' . $name . ($company !== '' ? ' (' . $company . ')' : ''), $html);
        }
    }
} catch (Throwable $e) {
    // ignore — lead is saved regardless
}

json_out(['ok' => true], 201);
