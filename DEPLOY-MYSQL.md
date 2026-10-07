# Datatrop — MySQL + PHP deployment guide

The site no longer uses Supabase. It now runs on **your Hostinger MySQL** via a
small **PHP API** (`/api/*.php`), with a PHP session login for `/admin`.

Do these 4 things once, in order.

---

## 1. Create the MySQL database (hPanel → Databases → Management)

On the screen you showed:
- **MySQL database name:** e.g. `datatrop`  → becomes `u183482362_datatrop`
- **MySQL username:** e.g. `admin`          → becomes `u183482362_admin`
- **Password:** pick a strong one → **write all three down**
- Click **Create**.

## 2. Import the schema (hPanel → Databases → phpMyAdmin)

1. Open **phpMyAdmin**, select the database you just created (left sidebar).
2. Go to the **Import** tab → **Choose file** → select **`mysql_schema.sql`**
   (in your project root) → **Import**.
3. This creates 6 tables and seeds the 5 problems, 5 service lines, the website
   text, and the admin login. You should see `site_content`, `customers`,
   `ai_showcase`, `problems`, `service_lines`, `admin_users`.

## 3. Deploy the site files (File Manager → public_html)

The build is packaged in **`datatrop-dist.zip`** (project root). It contains the
React site **and** the `api/` PHP folder.

1. In **File Manager**, open **`public_html`**.
2. Delete the old `index.html` and old `assets/` folder (asset names changed).
3. **Upload** `datatrop-dist.zip` → right-click → **Extract** into `public_html`.
   You should now have `public_html/index.html`, `public_html/assets/`, and
   **`public_html/api/`**.
4. Delete the zip.

## 4. Point the API at your database (File Manager → edit one file)

1. In File Manager, open **`public_html/api/config.php`** (right-click → Edit).
2. Replace the 3 placeholders with the values from step 1:
   ```php
   'db_name' => 'u183482362_datatrop',
   'db_user' => 'u183482362_admin',
   'db_pass' => 'YOUR_DB_PASSWORD',
   ```
   Leave `db_host` as `localhost`. **Save.**

---

## Done — test it

- **Website:** open `https://datatrop.in` in an incognito window. The Problems,
  Service Lines, hero text, etc. now come from MySQL. The 3D robot still waves.
- **Admin:** go to `https://datatrop.in/admin` → log in with:
  - Email: `support@datatrop.in`
  - Password: *(rotate this — see Security follow-ups below; do not store the plaintext password in this file)*
- Add a customer or showcase in the admin, refresh the site — it should appear.

## Quick API sanity checks (optional, in your browser)

- `https://datatrop.in/api/public.php?resource=service_lines` → JSON list of 5.
- `https://datatrop.in/api/auth.php?action=me` → `{"error":"Unauthorized"}` until you log in.

---

## 🔐 Security follow-ups

1. **Change the admin password** — the plaintext was shared in chat. Easiest way:
   in phpMyAdmin, run PHP `password_hash('NEW_PASS', PASSWORD_BCRYPT)` (or use
   https://bcrypt-generator.com), then update the `admin_users` row:
   ```sql
   UPDATE admin_users SET password_hash = '$2y$...' WHERE email = 'support@datatrop.in';
   ```
2. **Rotate the SSH password** too, if you haven't (also shared earlier).
3. `config.php` holds DB creds but is PHP (never served as text) and its folder
   `.htaccess` blocks direct access to `config.php`/`lib.php`.

## Notes

- **Login only allows `support@datatrop.in`** (enforced both in the app and by
  which rows exist in `admin_users`). To add another admin, insert another row
  into `admin_users` with a bcrypt hash **and** add the email to the allow-list
  in `src/admin/AdminLogin.jsx` (then rebuild).
- Supabase is fully removed. The old `.env` `VITE_SUPABASE_*` values and the
  `@supabase/supabase-js` dependency are now unused (harmless; can be deleted).
- To redeploy after any future code change: `npm run build`, then re-zip/upload
  `dist/` (the `api/` folder is included automatically because it lives in
  `public/api/`). Your `config.php` edit on the server will be overwritten on
  re-extract — re-apply step 4, or keep a copy.
```
