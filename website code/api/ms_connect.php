<?php
// Step 1 of "Connect Outlook": send the admin to Microsoft to sign in & consent.
// This is a top-level browser navigation (not fetch), so no X-Requested-With —
// the admin session cookie (SameSite=Lax) is what authorises it.
require __DIR__ . '/ms_lib.php';

start_admin_session();
if (!current_admin()) {
    header('Location: /admin/login');
    exit;
}

if (!ms_configured()) {
    header('Location: /admin/integrations?ms_error=' . urlencode('Microsoft credentials are not set in api/config.php yet.'));
    exit;
}

$state = bin2hex(random_bytes(16));
$_SESSION['ms_state'] = $state;

$c = ms_cfg();
$params = http_build_query([
    'client_id'     => $c['client_id'],
    'response_type' => 'code',
    'redirect_uri'  => $c['redirect'],
    'response_mode' => 'query',
    'scope'         => MS_SCOPES,
    'state'         => $state,
    'prompt'        => 'select_account',
]);

header('Location: https://login.microsoftonline.com/' . rawurlencode($c['tenant']) . '/oauth2/v2.0/authorize?' . $params);
exit;
