<?php
// Admin-only Microsoft Graph actions, called via fetch from the admin panel.
require __DIR__ . '/ms_lib.php';

require_fetch_header();
require_admin();

$action = $_GET['action'] ?? 'status';

// ── Connection status ───────────────────────────────────────────────────────
if ($action === 'status') {
    $row = ms_row();
    json_out([
        'configured'    => ms_configured(),
        'connected'     => (bool) ($row && !empty($row['refresh_token'])),
        'account_email' => $row['account_email'] ?? null,
        'connected_at'  => $row['connected_at'] ?? null,
        'expires_at'    => $row['expires_at'] ?? null,
    ]);
}

// ── Disconnect (forget tokens) ──────────────────────────────────────────────
if ($action === 'disconnect') {
    db()->exec('DELETE FROM ms_integration');
    json_out(['ok' => true]);
}

// ── Recent inbox ────────────────────────────────────────────────────────────
if ($action === 'inbox') {
    $r = ms_graph('GET', '/me/messages?$top=10&$select=subject,from,receivedDateTime,isRead,bodyPreview,webLink&$orderby=receivedDateTime%20desc');
    if ($r['code'] >= 300) json_error($r['data']['error']['message'] ?? 'Could not load inbox', $r['code'] === 401 ? 401 : 400);
    json_out($r['data']['value'] ?? []);
}

// ── Upcoming calendar events (next 30 days) ─────────────────────────────────
if ($action === 'events') {
    $start = rawurlencode(gmdate('Y-m-d\TH:i:s\Z'));
    $end   = rawurlencode(gmdate('Y-m-d\TH:i:s\Z', time() + 30 * 86400));
    $r = ms_graph('GET', '/me/calendarView?startDateTime=' . $start . '&endDateTime=' . $end .
        '&$top=10&$select=subject,start,end,location,webLink&$orderby=start/dateTime');
    if ($r['code'] >= 300) json_error($r['data']['error']['message'] ?? 'Could not load calendar', $r['code'] === 401 ? 401 : 400);
    json_out($r['data']['value'] ?? []);
}

// ── Create a calendar event ─────────────────────────────────────────────────
if ($action === 'create_event') {
    $b       = read_json_body();
    $subject = trim((string) ($b['subject'] ?? ''));
    $start   = trim((string) ($b['start'] ?? ''));
    $end     = trim((string) ($b['end'] ?? ''));
    if ($subject === '' || $start === '' || $end === '') json_error('Subject, start and end are required.', 400);
    $r = ms_graph('POST', '/me/events', [
        'subject' => $subject,
        'start'   => ['dateTime' => $start, 'timeZone' => 'India Standard Time'],
        'end'     => ['dateTime' => $end,   'timeZone' => 'India Standard Time'],
    ]);
    if ($r['code'] >= 300) json_error($r['data']['error']['message'] ?? 'Could not create event', 400);
    json_out(['ok' => true, 'id' => $r['data']['id'] ?? null], 201);
}

// ── Send a test email to the connected mailbox ──────────────────────────────
if ($action === 'test_email') {
    $row = ms_row();
    $to  = $row['account_email'] ?? null;
    if (!$to) json_error('No connected mailbox found.', 400);
    $ok = ms_send_mail($to, 'Datatrop — Outlook connection test', '<p>Your Datatrop website is successfully connected to Outlook.</p><p>New website leads will now be emailed to you automatically.</p>');
    if (!$ok) json_error('Microsoft rejected the send. Check that Mail.Send is granted and consented.', 400);
    json_out(['ok' => true, 'sent_to' => $to]);
}

json_error('Unknown action', 404);
