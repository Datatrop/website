<?php
// ============================================================================
// Datatrop API — shared library: DB connection, helpers, auth, resource map.
// Included by public.php / auth.php / admin.php. Not meant to be called direct.
// ============================================================================

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Last line of defence: turn any fatal error into JSON instead of an HTML 500.
register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(['error' => 'Server error']);
    }
});

$CONFIG = require __DIR__ . '/config.php';

// ── JSON output ─────────────────────────────────────────────────────────────
function json_out($data, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $code = 400): void
{
    json_out(['error' => $message], $code);
}

// Turn any uncaught error into JSON instead of an HTML 500.
set_exception_handler(function ($e) {
    json_error('Server error: ' . $e->getMessage(), 500);
});

// ── DB connection (PDO) ─────────────────────────────────────────────────────
function db(): PDO
{
    global $CONFIG;
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host={$CONFIG['db_host']};dbname={$CONFIG['db_name']};charset=utf8mb4";
        $pdo = new PDO($dsn, $CONFIG['db_user'], $CONFIG['db_pass'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    }
    return $pdo;
}

// ── Request helpers ─────────────────────────────────────────────────────────
function method(): string
{
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// Lightweight CSRF defense: same-origin fetch() calls send this header; a
// cross-site form POST cannot set a custom header. Combined with a SameSite
// cookie this is enough for an admin panel.
function require_fetch_header(): void
{
    if (!isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
        json_error('Forbidden', 403);
    }
}

// ── Sessions / auth ─────────────────────────────────────────────────────────
function start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('datatrop_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => true,
        'httponly' => true,
        // Lax (not Strict) so the session survives the OAuth redirect back from
        // Microsoft. CSRF is still covered by the X-Requested-With requirement.
        'samesite' => 'Lax',
    ]);
    session_start();
}

function current_admin(): ?string
{
    start_admin_session();
    return $_SESSION['admin_email'] ?? null;
}

function require_admin(): string
{
    $email = current_admin();
    if (!$email) json_error('Unauthorized', 401);
    return $email;
}

// ── Resource map ────────────────────────────────────────────────────────────
// Describes each table the API exposes: writable columns, which are JSON
// arrays, which are booleans, default ordering, and how the public site filters.
function resources(): array
{
    return [
        'site_content' => [
            'table'   => 'site_content',
            'columns' => [
                'company_name', 'tagline', 'hero_headline', 'hero_subtext', 'about_bio',
                'contact_email', 'contact_phone', 'linkedin_url', 'location',
                'brand_color', 'accent_color', 'google_reviews_url', 'privacy_policy', 'terms',
            ],
            'json'    => [],
            'bool'    => [],
            'order'   => 'id ASC',
            'single'  => true,           // one-row settings table
            'public'  => true,
        ],
        'customers' => [
            'table'         => 'customers',
            'columns'       => ['name', 'company', 'services', 'status'],
            'json'          => ['services'],
            'bool'          => [],
            'order'         => 'created_at DESC',
            'public'        => true,
            'public_where'  => "status = 'Active'",
            'public_order'  => 'created_at DESC',
        ],
        'ai_showcase' => [
            'table'         => 'ai_showcase',
            'columns'       => ['title', 'description', 'demo_url', 'tags', 'active'],
            'json'          => ['tags'],
            'bool'          => ['active'],
            'order'         => 'created_at DESC',
            'public'        => true,
            'public_where'  => 'active = 1',
            'public_order'  => 'created_at DESC',
        ],
        'problems' => [
            'table'         => 'problems',
            'columns'       => ['title', 'symptoms', 'solution', 'reference_case', 'sort_order', 'active'],
            'json'          => [],
            'bool'          => ['active'],
            'order'         => 'sort_order ASC',
            'public'        => true,
            'public_where'  => 'active = 1',
            'public_order'  => 'sort_order ASC',
        ],
        'service_lines' => [
            'table'         => 'service_lines',
            'columns'       => ['name', 'examples', 'deal_size', 'sort_order', 'active'],
            'json'          => [],
            'bool'          => ['active'],
            'order'         => 'sort_order ASC',
            'public'        => true,
            'public_where'  => 'active = 1',
            'public_order'  => 'sort_order ASC',
        ],
        'testimonials' => [
            'table'         => 'testimonials',
            'columns'       => ['quote', 'name', 'role', 'company', 'rating', 'source', 'sort_order', 'active'],
            'json'          => [],
            'bool'          => ['active'],
            'order'         => 'sort_order ASC',
            'public'        => true,
            'public_where'  => 'active = 1',
            'public_order'  => 'sort_order ASC',
        ],
        // Admin-only. NOT public — created via leads.php, read/managed in /admin.
        'leads' => [
            'table'   => 'leads',
            'columns' => ['handled'],    // admins may only toggle the handled flag
            'json'    => [],
            'bool'    => ['handled'],
            'order'   => 'created_at DESC',
        ],
        // Admin-only internal deal tracker (pipeline + running, one table). NOT public.
        'deals' => [
            'table'   => 'deals',
            'columns' => [
                'deal_id', 'phase', 'deal_name', 'company', 'contact_person', 'email', 'phone', 'source', 'sales_owner',
                'stage', 'probability', 'estimated_value', 'proposed_value', 'expected_closing_date', 'last_discussion',
                'next_followup', 'proposal_version', 'proposal_document_url', 'meeting_notes', 'client_requirements',
                'risks_notes', 'internal_notes',
                'project_manager', 'lead_developer', 'supporting_developers', 'account_manager',
                'backend_developer', 'frontend_developer', 'ai_engineer', 'qa_engineer', 'ui_designer',
                'priority', 'start_date', 'expected_delivery', 'actual_completion', 'current_status',
                'project_value', 'cost_estimate', 'development_cost', 'third_party_costs', 'amount_invoiced', 'amount_received',
                'next_task', 'next_task_assigned', 'next_task_due',
                'deliverables', 'milestones', 'daily_updates', 'attachments', 'risks_issues', 'communications',
            ],
            'json'    => ['deliverables', 'milestones', 'daily_updates', 'attachments', 'risks_issues', 'communications'],
            'bool'    => [],
            'order'   => 'updated_at DESC',
        ],
    ];
}

function get_resource(string $name): array
{
    $all = resources();
    if (!isset($all[$name])) json_error('Unknown resource', 404);
    return $all[$name];
}

// Convert a DB row into clean JSON types (decode JSON cols, cast bools).
function shape_row(array $row, array $res): array
{
    foreach ($res['json'] as $col) {
        if (array_key_exists($col, $row)) {
            $decoded = json_decode((string) ($row[$col] ?? '[]'), true);
            $row[$col] = is_array($decoded) ? $decoded : [];
        }
    }
    foreach ($res['bool'] as $col) {
        if (array_key_exists($col, $row)) {
            $row[$col] = (bool) $row[$col];
        }
    }
    return $row;
}

// Build a column=>value payload for insert/update from the request body,
// encoding JSON arrays and normalising booleans/nulls.
function build_payload(array $body, array $res): array
{
    $out = [];
    foreach ($res['columns'] as $col) {
        if (!array_key_exists($col, $body)) continue;
        $val = $body[$col];
        if (in_array($col, $res['json'], true)) {
            $val = json_encode(is_array($val) ? array_values($val) : [], JSON_UNESCAPED_UNICODE);
        } elseif (in_array($col, $res['bool'], true)) {
            $val = $val ? 1 : 0;
        } elseif ($val === '') {
            $val = null;
        }
        $out[$col] = $val;
    }
    return $out;
}

// Column names in $payload come from the fixed resource map, never user input,
// so interpolating them into SQL is safe. Values are always bound.
function insert_row(PDO $pdo, array $res, array $payload): int
{
    if (!$payload) {
        $pdo->query("INSERT INTO {$res['table']} () VALUES ()");
        return (int) $pdo->lastInsertId();
    }
    $cols  = array_keys($payload);
    $place = implode(', ', array_fill(0, count($cols), '?'));
    $sql   = "INSERT INTO {$res['table']} (" . implode(', ', $cols) . ") VALUES ($place)";
    $pdo->prepare($sql)->execute(array_values($payload));
    return (int) $pdo->lastInsertId();
}

function update_row(PDO $pdo, array $res, int $id, array $payload): void
{
    if (!$payload) return;
    $set  = implode(', ', array_map(fn($c) => "$c = ?", array_keys($payload)));
    $vals = array_values($payload);
    $vals[] = $id;
    $pdo->prepare("UPDATE {$res['table']} SET $set WHERE id = ?")->execute($vals);
}

function fetch_by_id(PDO $pdo, array $res, int $id): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM {$res['table']} WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ? shape_row($row, $res) : null;
}

// Generates the next "DT-2026-001" style deal_id for the current year.
function next_deal_id(PDO $pdo): string
{
    $year = date('Y');
    $stmt = $pdo->prepare("SELECT deal_id FROM deals WHERE deal_id LIKE ? ORDER BY deal_id DESC LIMIT 1");
    $stmt->execute(["DT-{$year}-%"]);
    $last = $stmt->fetchColumn();
    $seq = $last ? ((int) substr($last, -3)) + 1 : 1;
    return sprintf('DT-%s-%03d', $year, $seq);
}
