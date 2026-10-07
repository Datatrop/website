<?php
// ============================================================================
// Microsoft Outlook / Graph integration helpers.
// OAuth 2.0 authorization-code flow with refresh tokens. The client secret
// never leaves the server; tokens live in the ms_integration table.
// ============================================================================

require_once __DIR__ . '/lib.php';

const MS_SCOPES = 'offline_access User.Read Mail.Send Mail.Read Calendars.ReadWrite';

function ms_cfg(): array
{
    global $CONFIG;
    return [
        'client_id' => $CONFIG['ms_client_id'] ?? '',
        'tenant'    => ($CONFIG['ms_tenant_id'] ?? '') ?: 'common',
        'secret'    => $CONFIG['ms_client_secret'] ?? '',
        'redirect'  => $CONFIG['ms_redirect_uri'] ?? '',
    ];
}

function ms_configured(): bool
{
    $c = ms_cfg();
    return $c['client_id'] !== '' && $c['secret'] !== '' && $c['redirect'] !== '';
}

function ms_row(): ?array
{
    try {
        $r = db()->query('SELECT * FROM ms_integration ORDER BY id ASC LIMIT 1')->fetch();
        return $r ?: null;
    } catch (Throwable $e) {
        return null; // table not created yet
    }
}

// ── Raw HTTP (cURL) ─────────────────────────────────────────────────────────
function ms_http(string $method, string $url, $body = null, array $headers = []): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => $headers,
    ]);
    if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    $res  = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($res === false) return ['code' => 0, 'data' => ['error' => ['message' => $err]]];
    return ['code' => $code, 'data' => json_decode($res, true)];
}

function ms_token_request(array $fields): array
{
    $c = ms_cfg();
    $fields += ['client_id' => $c['client_id'], 'client_secret' => $c['secret']];
    return ms_http(
        'POST',
        "https://login.microsoftonline.com/{$c['tenant']}/oauth2/v2.0/token",
        http_build_query($fields),
        ['Content-Type: application/x-www-form-urlencoded']
    );
}

function ms_store_tokens(array $tok): void
{
    $access  = $tok['access_token'] ?? '';
    $refresh = $tok['refresh_token'] ?? null;
    $expires = date('Y-m-d H:i:s', time() + (int) ($tok['expires_in'] ?? 3600) - 60);
    $scope   = $tok['scope'] ?? '';
    $pdo = db();
    $row = ms_row();
    if ($row) {
        if ($refresh) {
            $pdo->prepare('UPDATE ms_integration SET access_token=?, refresh_token=?, expires_at=?, scope=? WHERE id=?')
                ->execute([$access, $refresh, $expires, $scope, $row['id']]);
        } else {
            $pdo->prepare('UPDATE ms_integration SET access_token=?, expires_at=?, scope=? WHERE id=?')
                ->execute([$access, $expires, $scope, $row['id']]);
        }
    } else {
        $pdo->prepare('INSERT INTO ms_integration (access_token, refresh_token, expires_at, scope) VALUES (?,?,?,?)')
            ->execute([$access, $refresh, $expires, $scope]);
    }
}

function ms_set_account_email(string $email): void
{
    $row = ms_row();
    if ($row) db()->prepare('UPDATE ms_integration SET account_email=? WHERE id=?')->execute([$email, $row['id']]);
}

// Returns a valid access token, refreshing it automatically when expired.
function ms_access_token(): ?string
{
    $row = ms_row();
    if (!$row || empty($row['access_token'])) return null;
    if (!empty($row['expires_at']) && strtotime($row['expires_at']) > time()) {
        return $row['access_token'];
    }
    if (empty($row['refresh_token'])) return null;
    $r = ms_token_request([
        'grant_type'    => 'refresh_token',
        'refresh_token' => $row['refresh_token'],
        'scope'         => MS_SCOPES,
    ]);
    if ($r['code'] === 200 && !empty($r['data']['access_token'])) {
        ms_store_tokens($r['data']);
        return $r['data']['access_token'];
    }
    return null;
}

function ms_connected(): bool
{
    $row = ms_row();
    return (bool) ($row && !empty($row['refresh_token']));
}

// ── Graph call ──────────────────────────────────────────────────────────────
function ms_graph(string $method, string $path, $json = null): array
{
    $tok = ms_access_token();
    if (!$tok) return ['code' => 401, 'data' => ['error' => ['message' => 'Outlook is not connected']]];
    return ms_http(
        $method,
        'https://graph.microsoft.com/v1.0' . $path,
        $json !== null ? json_encode($json) : null,
        ['Authorization: Bearer ' . $tok, 'Content-Type: application/json']
    );
}

function ms_send_mail(string $to, string $subject, string $html, ?string $replyTo = null): bool
{
    $message = [
        'subject'      => $subject,
        'body'         => ['contentType' => 'HTML', 'content' => $html],
        'toRecipients' => [['emailAddress' => ['address' => $to]]],
    ];
    if ($replyTo) $message['replyTo'] = [['emailAddress' => ['address' => $replyTo]]];
    $r = ms_graph('POST', '/me/sendMail', [
        'message'         => $message,
        'saveToSentItems' => true,
    ]);
    return $r['code'] >= 200 && $r['code'] < 300;
}
