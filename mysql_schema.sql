-- ============================================================================
-- Datatrop — MySQL schema for the Hostinger + PHP backend
-- Import this in phpMyAdmin (select your database → Import → choose this file).
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and INSERT IGNORE for seeds.
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ── Website settings (single row) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_content (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  company_name   VARCHAR(255),
  tagline        VARCHAR(255),
  hero_headline  TEXT,
  hero_subtext   TEXT,
  about_bio      TEXT,
  contact_email  VARCHAR(255),
  contact_phone  VARCHAR(64),
  linkedin_url   VARCHAR(512),
  location       VARCHAR(255),
  brand_color    VARCHAR(16),
  accent_color   VARCHAR(16),
  google_reviews_url VARCHAR(512),
  booking_url    VARCHAR(512),
  privacy_policy LONGTEXT,
  terms          LONGTEXT,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upgrade path for databases created before these columns existed (MariaDB / MySQL 8+)
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS company_name   VARCHAR(255);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS tagline        VARCHAR(255);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS contact_phone  VARCHAR(64);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS linkedin_url   VARCHAR(512);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS location       VARCHAR(255);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS brand_color    VARCHAR(16);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS accent_color   VARCHAR(16);
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS privacy_policy LONGTEXT;
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS terms          LONGTEXT;

-- ── Testimonials / client feedback ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS testimonials (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  quote      TEXT NOT NULL,
  name       VARCHAR(255) NOT NULL,
  role       VARCHAR(255) NULL,
  company    VARCHAR(255) NULL,
  rating     TINYINT NULL,
  source     VARCHAR(32) NULL DEFAULT 'Google',
  sort_order INT NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upgrade path for tables created before these columns existed
ALTER TABLE testimonials ADD COLUMN IF NOT EXISTS source VARCHAR(32) NULL DEFAULT 'Google';
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS google_reviews_url VARCHAR(512) NULL;
-- Microsoft Bookings (or similar) page shown on /contact instead of the built-in scheduler
ALTER TABLE site_content ADD COLUMN IF NOT EXISTS booking_url VARCHAR(512) NULL;

-- ── News & events (the /news page) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(255) NOT NULL,
  kind       VARCHAR(32)  NOT NULL DEFAULT 'News',   -- Event, News, Award, Partnership, Talk, Launch
  event_date DATE NOT NULL,
  location   VARCHAR(255) NULL,
  summary    TEXT NULL,
  body       LONGTEXT NULL,
  image_url  VARCHAR(512) NULL,                      -- /uploads/… from the admin upload
  link_url   VARCHAR(512) NULL,                      -- e.g. LinkedIn post or registration page
  link_label VARCHAR(64)  NULL,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Customers ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  company    VARCHAR(255) NULL,
  services   JSON NULL,
  status     VARCHAR(32) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── AI Showcase ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_showcase (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NULL,
  demo_url    VARCHAR(512) NULL,
  tags        JSON NULL,
  active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Problems (The Five Problems We Solve) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS problems (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  symptoms       TEXT NULL,
  solution       TEXT NULL,
  reference_case TEXT NULL,
  sort_order     INT NOT NULL DEFAULT 0,
  active         TINYINT(1) NOT NULL DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Service Lines ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_lines (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  examples   TEXT NULL,
  deal_size  VARCHAR(128) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Admin users (login) ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Microsoft Outlook / Graph connection (single row, tokens) ───────────────
CREATE TABLE IF NOT EXISTS ms_integration (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  account_email VARCHAR(255) NULL,
  access_token  TEXT NULL,
  refresh_token TEXT NULL,
  expires_at    DATETIME NULL,
  scope         TEXT NULL,
  connected_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Leads (strategy-call / contact submissions) ─────────────────────────────
CREATE TABLE IF NOT EXISTS leads (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  company      VARCHAR(255) NULL,
  email        VARCHAR(255) NOT NULL,
  industry     VARCHAR(128) NULL,
  company_size VARCHAR(64) NULL,
  challenge    TEXT NOT NULL,
  handled      TINYINT(1) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Deals (internal tracker — one table, two views) ──────────────────────────
-- Admin-only, never exposed via public.php. A deal moves from the "Deals Under
-- Discussion" pipeline view into the "Running Deals" execution view purely by
-- flipping `phase` — same row, same deal_id, no data duplication.
CREATE TABLE IF NOT EXISTS deals (
  id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
  deal_id                VARCHAR(32)  NOT NULL UNIQUE,   -- e.g. DT-2026-001
  phase                  VARCHAR(16)  NOT NULL DEFAULT 'discussion', -- discussion | running

  -- Shared identity fields
  deal_name              VARCHAR(255) NOT NULL,
  company                VARCHAR(255) NULL,
  contact_person         VARCHAR(255) NULL,
  email                  VARCHAR(255) NULL,
  phone                  VARCHAR(64)  NULL,
  source                 VARCHAR(64)  NULL,
  sales_owner            VARCHAR(255) NULL,

  -- Pre-sales pipeline fields
  stage                  VARCHAR(32)  NOT NULL DEFAULT 'Discovery',
  probability            INT NULL,
  estimated_value        DECIMAL(14,2) NULL,
  proposed_value         DECIMAL(14,2) NULL,
  expected_closing_date  DATE NULL,
  last_discussion        DATE NULL,
  next_followup          DATE NULL,
  proposal_version       VARCHAR(32) NULL,
  proposal_document_url  VARCHAR(512) NULL,
  meeting_notes          TEXT NULL,
  client_requirements    TEXT NULL,
  risks_notes            TEXT NULL,
  internal_notes         TEXT NULL,

  -- Execution dashboard fields
  project_manager        VARCHAR(255) NULL,
  lead_developer         VARCHAR(255) NULL,
  supporting_developers  VARCHAR(255) NULL,
  account_manager        VARCHAR(255) NULL,
  backend_developer      VARCHAR(255) NULL,
  frontend_developer     VARCHAR(255) NULL,
  ai_engineer            VARCHAR(255) NULL,
  qa_engineer            VARCHAR(255) NULL,
  ui_designer            VARCHAR(255) NULL,
  priority               VARCHAR(16)  NOT NULL DEFAULT 'Medium',
  start_date             DATE NULL,
  expected_delivery      DATE NULL,
  actual_completion      DATE NULL,
  current_status         VARCHAR(32)  NOT NULL DEFAULT 'Planning',

  -- Financials (Running Deals)
  project_value          DECIMAL(14,2) NULL,
  cost_estimate          DECIMAL(14,2) NULL,
  development_cost       DECIMAL(14,2) NULL,
  third_party_costs      DECIMAL(14,2) NULL,
  amount_invoiced        DECIMAL(14,2) NULL,
  amount_received        DECIMAL(14,2) NULL,

  -- Next action
  next_task               VARCHAR(255) NULL,
  next_task_assigned      VARCHAR(255) NULL,
  next_task_due           DATE NULL,

  -- Repeating structures, stored as JSON arrays of objects
  deliverables    JSON NULL,   -- [{name, status, due_date, completed_date}]
  milestones      JSON NULL,   -- [{name, planned_date, actual_date, status}]
  daily_updates   JSON NULL,   -- [{date, developer, update, hours, blockers}]
  attachments     JSON NULL,   -- [{label, url, category}]
  risks_issues    JSON NULL,   -- [{issue, priority, owner, status}]
  communications  JSON NULL,   -- [{date, type, summary}]

  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Website settings (only inserts if the table is empty)
INSERT INTO site_content
  (company_name, tagline, hero_headline, hero_subtext, about_bio,
   contact_email, contact_phone, linkedin_url, location, brand_color, accent_color)
SELECT
  'Datatrop AI Systems',
  'Engineering certainty in a complex world.',
  'Engineering certainty in a complex world.',
  'Datatrop is an intelligent systems engineering company. We design, build, and operate the systems that restore order wherever complexity prevents progress, whether the solution is known, unknown, or yet to be invented.',
  'Datatrop AI Systems is an intelligent systems engineering company that designs, builds, and operates solutions for complex business and societal challenges. AI, automation, and software are not our identity; they are the delivery mechanisms we choose once we understand the problem.',
  'sales@datatrop.in',
  '+91 79029 17795',
  'https://www.linkedin.com/company/datatrop-ai',
  'Kerala, India',
  '#6B1E72',
  '#E0457B'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM site_content);

-- Problems (only seeds if the table is empty — safe to re-run the whole file)
INSERT INTO problems (title, symptoms, solution, reference_case, sort_order)
SELECT title, symptoms, solution, reference_case, sort_order FROM (
  SELECT 'Fragmented Operations' AS title,
         'Excel everywhere, data duplication, manual handoffs, no visibility.' AS symptoms,
         'Disconnected systems become one intelligent operating platform.' AS solution,
         'Unified Operating Systems, covering sales, procurement, inventory, dispatch, finance, accounting and HR in one platform.' AS reference_case,
         0 AS sort_order
  UNION ALL SELECT 'Revenue Leakage',
         'Missed leads, poor follow-up, lost opportunities, low conversion.',
         'Capture every opportunity with AI-driven sales intelligence.', NULL, 1
  UNION ALL SELECT 'Communication Chaos',
         'Calls on personal phones, no visibility, lost customers, no accountability.',
         'Unify calls, messages, and customer interactions into one intelligent communication layer.',
         'Logistics and supply chain, with centralized IVR, CRM tracking, dashboards and AI call intelligence.', 2
  UNION ALL SELECT 'Organizational Intelligence',
         'Knowledge trapped in employees, decisions depend on individuals, no institutional memory.',
         'Turn scattered knowledge into permanent institutional memory.', NULL, 3
  UNION ALL SELECT 'Human Dependency',
         'Repetitive work, hiring challenges, process bottlenecks.',
         'Deploy AI workforces that execute repetitive work while humans focus on strategy.',
         'AI Voice Ecosystems capable of autonomous customer interactions with memory and specialized capabilities.', 4
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM problems);

-- Service Lines (only seeds if the table is empty)
INSERT INTO service_lines (name, examples, deal_size, sort_order)
SELECT name, examples, deal_size, sort_order FROM (
  SELECT 'Enterprise AI Systems' AS name,
         'Unified operating platforms that connect every department into one intelligent system.' AS examples,
         NULL AS deal_size, 0 AS sort_order
  UNION ALL SELECT 'AI Workforce Platforms', 'Multi-agent teams that execute operational work autonomously.', NULL, 1
  UNION ALL SELECT 'Revenue Intelligence Systems', 'Lead intelligence, sales automation, and conversion optimization.', NULL, 2
  UNION ALL SELECT 'Communication Intelligence Platforms', 'Omnichannel communication with call and conversation intelligence.', NULL, 3
  UNION ALL SELECT 'AI Product Development', 'AI-native products and industry platforms, engineered end-to-end.', NULL, 4
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM service_lines);

-- Admin login — email: support@datatrop.in
-- Password hash below is bcrypt for the password you provided. CHANGE IT LATER:
--   update the row with a new hash from  https://bcrypt-generator.com  (or PHP
--   password_hash) since the plaintext was shared in chat.
INSERT IGNORE INTO admin_users (email, password_hash) VALUES
('support@datatrop.in', '$2b$10$m/RR7wVZ/AP4dUmLez/Mqu2ZWPn9DfLusbSvna94fgJ8MKpyslSjC');

-- Brand refresh (grape / maroon palette). Moves the stored theme colours off
-- either earlier default pair (blue/green or navy/gold); leaves any custom
-- colours chosen in admin alone.
UPDATE site_content
SET brand_color = '#6B1E72', accent_color = '#E0457B'
WHERE (brand_color IS NULL OR brand_color = '' OR UPPER(brand_color) IN ('#003057', '#3B82F6'))
  AND (accent_color IS NULL OR accent_color = '' OR UPPER(accent_color) IN ('#B08D4A', '#10B981'));
