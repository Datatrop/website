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

// Email the message to the sales inbox (config 'lead_notify_to', default
// sales@datatrop.in), with Reply-To set to the visitor so sales can answer
// straight from their inbox. Sent through the connected Outlook account when
// there is one, otherwise through the server's own mail(). Best-effort only:
// a mail failure must never lose the lead, which is already saved above.
try {
    global $CONFIG;
    $to   = (string) (($CONFIG['lead_notify_to'] ?? '') ?: 'sales@datatrop.in');
    $esc  = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $subj = 'New message from datatrop.in: ' . $name . ($company !== '' ? ' (' . $company . ')' : '');
    $html = '<h2>New message from datatrop.in</h2>'
        . '<p><strong>Name:</strong> ' . $esc($name) . '</p>'
        . '<p><strong>Company:</strong> ' . $esc($company !== '' ? $company : '—') . '</p>'
        . '<p><strong>Email:</strong> <a href="mailto:' . $esc($email) . '">' . $esc($email) . '</a></p>'
        . '<p><strong>Industry:</strong> ' . $esc($industry !== '' ? $industry : '—') . '</p>'
        . '<p><strong>Company size:</strong> ' . $esc($size !== '' ? $size : '—') . '</p>'
        . '<p><strong>Message:</strong><br>' . nl2br($esc($challenge)) . '</p>'
        . '<p style="color:#666">Reply to this email to answer them directly. It is also saved in the admin panel → Leads.</p>';

    $sent = false;
    require_once __DIR__ . '/ms_lib.php';
    if (ms_connected()) $sent = ms_send_mail($to, $subj, $html, $email);

    if (!$sent) {
        // Header injection is impossible here: $email passed FILTER_VALIDATE_EMAIL,
        // and the subject is stripped of line breaks.
        $from    = (string) (($CONFIG['mail_from'] ?? '') ?: 'no-reply@datatrop.in');
        $headers = "MIME-Version: 1.0\r\n"
            . "Content-Type: text/html; charset=UTF-8\r\n"
            . "From: Datatrop Website <$from>\r\n"
            . "Reply-To: $email\r\n";
        $safeSubj = '=?UTF-8?B?' . base64_encode(str_replace(["\r", "\n"], ' ', $subj)) . '?=';
        @mail($to, $safeSubj, $html, $headers, '-f' . $from);
    }
} catch (Throwable $e) {
    // ignore — lead is saved regardless
}

json_out(['ok' => true], 201);
