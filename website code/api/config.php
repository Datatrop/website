<?php
// ============================================================================
// Datatrop API — database & app configuration
// ----------------------------------------------------------------------------
// EDIT THE 3 VALUES BELOW after you create your MySQL database in Hostinger
// (hPanel → Databases → Management). Host stays 'localhost' on shared hosting.
// This file is PHP, so its contents are never served as text to browsers.
// ============================================================================

return [
    'db_host' => 'localhost',
    'db_name' => 'u183482362_datatrop',
    'db_user' => 'u183482362_datatrop',
    'db_pass' => 'REPLACE_WITH_DB_PASSWORD',   // the password you set when creating the DB

    // Only requests from this origin may use the admin/auth endpoints.
    'allowed_origin' => 'https://datatrop.in',

    // ── Microsoft Outlook / Graph integration ───────────────────────────────
    // From Azure portal → App registrations → "Datatrop Outlook Integration".
    // Overview page gives the first two; create the secret under
    // "Add a certificate or secret" → New client secret → copy the VALUE.
    'ms_client_id'     => '',   // Application (client) ID
    'ms_tenant_id'     => '',   // Directory (tenant) ID
    'ms_client_secret' => '',   // Client secret VALUE (not the Secret ID)
    // Must match the Redirect URI registered in Azure EXACTLY.
    // /auth/microsoft/callback is rewritten to api/ms_callback.php by .htaccess
    'ms_redirect_uri'  => 'https://datatrop.in/auth/microsoft/callback',
];
