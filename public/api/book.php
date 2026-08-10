<?php
// ============================================================================
// Public booking endpoint — shows real availability from the connected Outlook
// calendar and creates the meeting on it. Visitors never sign in; the server
// acts with the stored delegated token. No calendar details are ever exposed —
// only free/busy derived slot times.
// ============================================================================

require __DIR__ . '/ms_lib.php';
require_fetch_header();

const BK_TZ            = 'Asia/Kolkata';
const BK_GRAPH_TZ      = 'India Standard Time';
const BK_START_HOUR    = 10;   // 10:00 IST
const BK_END_HOUR      = 18;   // last slot ends by 18:00 IST
const BK_SLOT_MIN      = 30;   // slot length
const BK_DAYS_AHEAD    = 21;   // how far ahead people may book
const BK_MIN_LEAD_HRS  = 2;    // no bookings inside the next 2 hours

function bk_tz(): DateTimeZone { return new DateTimeZone(BK_TZ); }

function bk_validate_date(string $date): DateTime
{
    $d = DateTime::createFromFormat('Y-m-d', $date, bk_tz());
    if (!$d || $d->format('Y-m-d') !== $date) json_error('Invalid date.', 400);
    $d->setTime(0, 0, 0);
    $today = new DateTime('today', bk_tz());
    $max   = (clone $today)->modify('+' . BK_DAYS_AHEAD . ' days');
    if ($d < $today || $d > $max) json_error('That date is outside the booking window.', 400);
    return $d;
}

// Busy intervals (UTC timestamps) from the connected calendar for one day
function bk_busy(DateTime $day): array
{
    $startUtc = (clone $day)->setTimezone(new DateTimeZone('UTC'));
    $endUtc   = (clone $day)->modify('+1 day')->setTimezone(new DateTimeZone('UTC'));
    $r = ms_graph('GET', '/me/calendarView'
        . '?startDateTime=' . rawurlencode($startUtc->format('Y-m-d\TH:i:s\Z'))
        . '&endDateTime='   . rawurlencode($endUtc->format('Y-m-d\TH:i:s\Z'))
        . '&$top=100&$select=start,end,showAs,isCancelled');
    if ($r['code'] >= 300) return ['error' => $r['data']['error']['message'] ?? 'calendar unavailable'];

    $busy = [];
    foreach (($r['data']['value'] ?? []) as $ev) {
        if (!empty($ev['isCancelled'])) continue;
        if (($ev['showAs'] ?? '') === 'free') continue;
        $s = strtotime(($ev['start']['dateTime'] ?? '') . ' UTC');
        $e = strtotime(($ev['end']['dateTime'] ?? '') . ' UTC');
        if ($s && $e) $busy[] = [$s, $e];
    }
    return ['busy' => $busy];
}

// Candidate slots for a day, minus anything that clashes with a busy block
function bk_free_slots(DateTime $day, array $busy): array
{
    $now   = new DateTime('now', bk_tz());
    $cutoff = (clone $now)->modify('+' . BK_MIN_LEAD_HRS . ' hours');
    $out = [];
    for ($m = BK_START_HOUR * 60; $m + BK_SLOT_MIN <= BK_END_HOUR * 60; $m += BK_SLOT_MIN) {
        $s = (clone $day)->setTime(intdiv($m, 60), $m % 60, 0);
        if ($s <= $cutoff) continue;
        $e  = (clone $s)->modify('+' . BK_SLOT_MIN . ' minutes');
        $st = $s->getTimestamp();
        $et = $e->getTimestamp();
        $clash = false;
        foreach ($busy as [$bs, $be]) {
            if ($st < $be && $et > $bs) { $clash = true; break; }
        }
        if (!$clash) {
            $out[] = ['start' => $s->format('Y-m-d\TH:i:s'), 'label' => $s->format('g:i A')];
        }
    }
    return $out;
}

$action = $_GET['action'] ?? 'slots';

// ── Availability for one date ───────────────────────────────────────────────
if ($action === 'slots') {
    if (!ms_connected()) json_out(['connected' => false, 'slots' => []]);
    $day = bk_validate_date($_GET['date'] ?? '');
    // Weekends closed
    if (in_array((int) $day->format('N'), [6, 7], true)) {
        json_out(['connected' => true, 'slots' => [], 'closed' => true]);
    }
    $b = bk_busy($day);
    if (isset($b['error'])) json_out(['connected' => true, 'slots' => [], 'error' => $b['error']]);
    json_out(['connected' => true, 'slots' => bk_free_slots($day, $b['busy'])]);
}

// ── Create the booking ──────────────────────────────────────────────────────
if ($action === 'create') {
    if (method() !== 'POST') json_error('Method not allowed', 405);
    if (!ms_connected()) json_error('Booking is temporarily unavailable. Please email us instead.', 503);

    $b        = read_json_body();
    $name     = trim((string) ($b['name'] ?? ''));
    $email    = trim((string) ($b['email'] ?? ''));
    $company  = trim((string) ($b['company'] ?? ''));
    $notes    = trim((string) ($b['notes'] ?? ''));
    $startStr = trim((string) ($b['start'] ?? ''));

    if ($name === '' || $email === '' || $startStr === '') json_error('Name, email and a time slot are required.', 400);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) json_error('Please enter a valid email address.', 400);

    $start = DateTime::createFromFormat('Y-m-d\TH:i:s', $startStr, bk_tz());
    if (!$start) json_error('Invalid time slot.', 400);

    // Re-validate the slot server-side (never trust the browser)
    $day = bk_validate_date($start->format('Y-m-d'));
    if (in_array((int) $day->format('N'), [6, 7], true)) json_error('That day is not bookable.', 400);
    $bz = bk_busy($day);
    if (isset($bz['error'])) json_error('Could not verify availability. Please try again.', 503);
    $free = array_column(bk_free_slots($day, $bz['busy']), 'start');
    if (!in_array($start->format('Y-m-d\TH:i:s'), $free, true)) {
        json_error('Sorry, that slot was just taken. Please pick another time.', 409);
    }

    // Light abuse guard: max 3 bookings per email per day
    try {
        $q = db()->prepare('SELECT COUNT(*) c FROM leads WHERE email = ? AND created_at > (NOW() - INTERVAL 1 DAY)');
        $q->execute([$email]);
        if ((int) ($q->fetch()['c'] ?? 0) >= 3) json_error('You already have several requests in progress. Please email us instead.', 429);
    } catch (Throwable $e) { /* non-fatal */ }

    $end  = (clone $start)->modify('+' . BK_SLOT_MIN . ' minutes');
    $esc  = fn($v) => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
    $body = '<p><strong>Strategy call booked from datatrop.in</strong></p>'
        . '<p><strong>Name:</strong> ' . $esc($name) . '</p>'
        . ($company !== '' ? '<p><strong>Company:</strong> ' . $esc($company) . '</p>' : '')
        . '<p><strong>Email:</strong> ' . $esc($email) . '</p>'
        . ($notes !== '' ? '<p><strong>Notes:</strong><br>' . nl2br($esc($notes)) . '</p>' : '');

    $event = [
        'subject'    => 'Strategy Call — ' . $name . ($company !== '' ? ' (' . $company . ')' : ''),
        'body'       => ['contentType' => 'HTML', 'content' => $body],
        'start'      => ['dateTime' => $start->format('Y-m-d\TH:i:s'), 'timeZone' => BK_GRAPH_TZ],
        'end'        => ['dateTime' => $end->format('Y-m-d\TH:i:s'),   'timeZone' => BK_GRAPH_TZ],
        'attendees'  => [['emailAddress' => ['address' => $email, 'name' => $name], 'type' => 'required']],
        'allowNewTimeProposals' => false,
        'isOnlineMeeting'       => true,
        'onlineMeetingProvider' => 'teamsForBusiness',
    ];

    $r = ms_graph('POST', '/me/events', $event);
    if ($r['code'] >= 300) {
        // Retry without Teams (account may not have online meetings enabled)
        unset($event['isOnlineMeeting'], $event['onlineMeetingProvider']);
        $r = ms_graph('POST', '/me/events', $event);
    }
    if ($r['code'] >= 300) {
        json_error($r['data']['error']['message'] ?? 'Could not create the meeting. Please try again.', 400);
    }

    // Mirror into leads so it also shows in the admin panel
    try {
        db()->prepare('INSERT INTO leads (name, company, email, industry, company_size, challenge) VALUES (?,?,?,?,?,?)')
            ->execute([
                substr($name, 0, 255),
                $company !== '' ? substr($company, 0, 255) : null,
                substr($email, 0, 255),
                null, null,
                'Booked a strategy call for ' . $start->format('D, j M Y g:i A') . ' IST.'
                    . ($notes !== '' ? "\n\n" . $notes : ''),
            ]);
    } catch (Throwable $e) { /* booking already succeeded */ }

    json_out([
        'ok'      => true,
        'when'    => $start->format('D, j M Y'),
        'time'    => $start->format('g:i A'),
        'join'    => $r['data']['onlineMeeting']['joinUrl'] ?? null,
    ], 201);
}

json_error('Unknown action', 404);
