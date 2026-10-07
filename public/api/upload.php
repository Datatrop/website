<?php
// Admin-only image upload (photos for News & Events). Saves to /uploads/YYYY/
// under a random name and returns its public URL. Only real JPEG, PNG and WebP
// images up to 8 MB are accepted; the type is checked from the file contents,
// never from the name the browser sends.
require __DIR__ . '/lib.php';

require_fetch_header();
require_admin();
if (method() !== 'POST') json_error('Method not allowed', 405);

$file = $_FILES['file'] ?? null;
if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) json_error('No file received');
if ($file['size'] > 8 * 1024 * 1024) json_error('Image is larger than 8 MB');

$types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
if (!isset($types[$mime]) || @getimagesize($file['tmp_name']) === false) json_error('Please upload a JPG, PNG or WebP image');

// public_html/uploads/2026/… (this script lives in public_html/api/)
$year = date('Y');
$dir  = dirname(__DIR__) . "/uploads/$year";
if (!is_dir($dir) && !mkdir($dir, 0755, true)) json_error('Could not create the upload folder', 500);

$name = bin2hex(random_bytes(12)) . '.' . $types[$mime];
if (!move_uploaded_file($file['tmp_name'], "$dir/$name")) json_error('Could not save the image', 500);

json_out(['url' => "/uploads/$year/$name"]);
