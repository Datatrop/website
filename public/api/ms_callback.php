<?php
// Step 2 of "Connect Outlook": Microsoft redirects here with ?code&state.
// We verify state, swap the code for tokens (server-side, using the secret),
// store them, then bounce back into the admin UI.
require __DIR__ . '/ms_lib.php';

start_admin_session();

$back = '/admin/integrations';
$fail = function (string $msg) use ($back) {
    header('Location: ' . $back . '?ms_error=' . urlencode($msg));
    exit;
};

if (!empty($_GET['error'])) {
    $fail($_GET['error_description'] ?? $_GET['error']);
}
if (!current_admin()) {
    header('Location: /admin/login');
    exit;
}

$code  = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
if ($code === '' || $state === '' || !hash_equals($_SESSION['ms_state'] ?? '', $state)) {
    $fail('Security check failed (invalid state). Please try connecting again.');
}
unset($_SESSION['ms_state']);

$c = ms_cfg();
$r = ms_token_request([
    'grant_type'   => 'authorization_code',
    'code'         => $code,
    'redirect_uri' => $c['redirect'],
    'scope'        => MS_SCOPES,
]);

if ($r['code'] !== 200 || empty($r['data']['access_token'])) {
    $fail($r['data']['error_description'] ?? 'Could not exchange the code for a token.');
}

ms_store_tokens($r['data']);

// Record which mailbox got connected
$me = ms_graph('GET', '/me?$select=mail,userPrincipalName,displayName');
$email = $me['data']['mail'] ?? $me['data']['userPrincipalName'] ?? null;
if ($email) ms_set_account_email($email);

header('Location: ' . $back . '?ms_connected=1');
exit;
