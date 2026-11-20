-- ============================================================================
-- PostgreSQL Database Schema & Initial Seed Script
-- Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
-- Sri Lanka Coastal Conservation Project (UWU / DWC Specification)
-- Enterprise-Grade Security & Role-Based Access Control
-- ============================================================================

-- 0. USERS TABLE (Enterprise-Grade Security & Authentication)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(150),
    salt VARCHAR(64) NOT NULL,
    password_hash VARCHAR(128) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'officer', 'tourist', 'fisherman')),
    full_name VARCHAR(150) NOT NULL,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 0.1 SECURITY AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80),
    role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(80),
    status VARCHAR(50) NOT NULL,
    details TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON security_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON security_audit_logs(username);

-- 0.2 ACTIVE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(128) PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);

-- 1. SPECIES TABLE
CREATE TABLE IF NOT EXISTS species (
    id VARCHAR(50) PRIMARY KEY,
    common_name VARCHAR(100) NOT NULL,
    sinhala_name VARCHAR(150) NOT NULL,
    scientific_name VARCHAR(150) UNIQUE NOT NULL,
    iucn_status VARCHAR(80) NOT NULL,
    avg_clutch_size INT DEFAULT 110,
    description TEXT,
    color VARCHAR(20) DEFAULT '#10b981',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. NESTING RECORDS TABLE
CREATE TABLE IF NOT EXISTS nesting_records (
    id SERIAL PRIMARY KEY,
    species_id VARCHAR(50) REFERENCES species(id) ON DELETE CASCADE,
    location_name VARCHAR(200) NOT NULL,
    region VARCHAR(100) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    nest_date DATE NOT NULL DEFAULT CURRENT_DATE,
    egg_count INT NOT NULL CHECK (egg_count > 0),
    protection_status VARCHAR(100) NOT NULL,
    reported_by VARCHAR(150) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nesting_species ON nesting_records(species_id);
CREATE INDEX IF NOT EXISTS idx_nesting_region ON nesting_records(region);
CREATE INDEX IF NOT EXISTS idx_nesting_date ON nesting_records(nest_date);

-- 3. INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_type VARCHAR(150) NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('High', 'Medium', 'Low')),
    incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'Investigating',
    details TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incident_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incident_status ON incidents(status);

-- 4. HATCHERIES TABLE
CREATE TABLE IF NOT EXISTS hatcheries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    location_name VARCHAR(200) NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    manager_name VARCHAR(150) NOT NULL,
    active_clutches INT DEFAULT 0,
    total_eggs_incubating INT DEFAULT 0,
    hatchlings_released_this_year INT DEFAULT 0,
    tank_count INT DEFAULT 10,
    capacity_status VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. HATCHERY CLUTCHES TABLE
CREATE TABLE IF NOT EXISTS hatchery_clutches (
    id SERIAL PRIMARY KEY,
    hatchery_id INT REFERENCES hatcheries(id) ON DELETE CASCADE,
    clutch_code VARCHAR(50) NOT NULL,
    species_id VARCHAR(50) REFERENCES species(id),
    nest_date DATE NOT NULL,
    transfer_date DATE NOT NULL,
    egg_count INT NOT NULL,
    expected_hatch_date DATE,
    hatched_count INT DEFAULT 0,
    released_count INT DEFAULT 0,
    success_rate NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. SYSTEM EVALUATIONS / SUS RESPONSES TABLE
CREATE TABLE IF NOT EXISTS evaluations (
    id SERIAL PRIMARY KEY,
    responses JSONB NOT NULL,
    sus_score NUMERIC(5,2) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEED DATA INGESTION
-- ============================================================================

-- Seed Users with PBKDF2-HMAC-SHA256 (10,000 iterations, 32-byte salt)
INSERT INTO users (username, email, salt, password_hash, role, full_name)
VALUES
    ('admin', 'admin@dwc.gov.lk', '1f1e1af26c50c5284578f1963393c405420334ba70b4eba419ef5e2eb1213db6', '8fd0601cc61f5ba91a1108032b77ebbe05883c6b353779a0b8e951040e31a654f1acd3cbaa89fba4d350767422ff82156a6368ab0d4539672dc56070f9cb7630', 'admin', 'Administrator (DWC)'),
    ('officer', 'officer@dwc.gov.lk', '37f6b8c1038f2294260198d6eac3a694593a28ebfce6ad83e1f3ef91f77409d4', '5dca443668c7c7cc333f353c5b0e1114b8231fb180cb94e1d02681c7e82590e890a8260faef578449b82e4caf44c775a3bbc98546c9436d3a2600ad00bb7513b', 'officer', 'Field Ranger Bandara'),
    ('tourist', 'tourist@ecotour.lk', '124da7ce17c9fc5b8f959b18104bd028232ad94d02ed99000df1e607ee24efb2', '3cdd9131c57d6a12ba6995fd8ab2b8345a58e516d1f8bcca30e7b85b09831cef3b60780eb10156479180164875bc7ce0d3776d55789445ca048182efa09ee26c', 'tourist', 'Eco Visitor Sarah'),
    ('fisherman', 'marine@fisheries.gov.lk', 'fdcda0c507639f8b32e549347328683ee990a855c931a6e46a5c36f0645bfee2', '326cfbd36e86cf185e4fa88ec97260ee5faa1b70b8c62d51bb1cf79268324406d3ca0b3e230751ed951a369ae509d70703261de75645195a18127b85fb359f50', 'fisherman', 'Patrol Leader Gunadasa')
ON CONFLICT (username) DO UPDATE 
SET salt = EXCLUDED.salt, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, full_name = EXCLUDED.full_name, email = EXCLUDED.email;

-- Seed Initial Security Audit Log
INSERT INTO security_audit_logs (username, role, action, ip_address, status, details)
VALUES 
    ('system', 'admin', 'SYSTEM_INIT', '127.0.0.1', 'SUCCESS', 'PostgreSQL Database & Security Layer Initialized with PBKDF2');

-- Seed Species
INSERT INTO species (id, common_name, sinhala_name, scientific_name, iucn_status, avg_clutch_size, description, color)
VALUES 
    ('green_turtle', 'Green Turtle', 'වැලි කැස්බෑවා (Weli Käsba)', 'Chelonia mydas', 'Endangered', 120, 'Most common species along Sri Lanka south-west coast.', '#10b981'),
    ('olive_ridley', 'Olive Ridley Turtle', 'බටු කැස්බෑවා (Batu Käsba)', 'Lepidochelys olivacea', 'Vulnerable', 105, 'Smallest sea turtle, synchronized mass nesting.', '#0284c7'),
    ('hawksbill', 'Hawksbill Turtle', 'පොතු කැස්බෑවා (Pothu Käsba)', 'Eretmochelys imbricata', 'Critically Endangered', 130, 'Feeds on coral reef sponges in Hikkaduwa.', '#f59e0b'),
    ('loggerhead', 'Loggerhead Turtle', 'ඔලුගෙඩි කැස්බෑවා (Olugedi Käsba)', 'Caretta caretta', 'Vulnerable', 110, 'Massive head structure, rare nesting in southern Sri Lanka.', '#8b5cf6'),
    ('leatherback', 'Leatherback Turtle', 'දාර කැස්බෑවා (Dara Käsba)', 'Dermochelys coriacea', 'Critically Endangered', 85, 'World largest turtle, lacks bony shell. Nests in Rekawa.', '#ec4899')
ON CONFLICT (id) DO NOTHING;

-- Seed Hatcheries
INSERT INTO hatcheries (name, location_name, lat, lng, manager_name, active_clutches, total_eggs_incubating, hatchlings_released_this_year, tank_count, capacity_status, contact_phone)
VALUES
    ('Kosgoda Sea Turtle Conservation Project', 'Kosgoda Coastal Zone', 6.4061, 80.0076, 'Dr. Chintaka Perera', 42, 4850, 14200, 14, 'Optimal (68% Utilization)', '+94 91 226 4432'),
    ('Rekawa Turtle Conservation Center & Nursery', 'Rekawa Beach Sanctuary', 6.0464, 80.8406, 'Sunil Jayasinghe', 65, 7120, 21500, 18, 'High Demand (85% Utilization)', '+94 47 224 0119'),
    ('Bentota Sea Turtle Protective Hatchery', 'Bentota River Mouth Coast', 6.4258, 79.9975, 'Mahinda Ranasinghe', 28, 3100, 9800, 10, 'Normal (55% Utilization)', '+94 34 227 5100'),
    ('Habaraduwa Turtle Hatchery & Rescue Center', 'Habaraduwa Beach', 5.9989, 80.2882, 'Kavinda Abeywardhana', 31, 3450, 11200, 12, 'Optimal (60% Utilization)', '+94 91 228 3390')
ON CONFLICT DO NOTHING;

-- Seed Nesting Records
INSERT INTO nesting_records (species_id, location_name, region, lat, lng, nest_date, egg_count, protection_status, reported_by, notes)
VALUES
    ('green_turtle', 'Kosgoda Beach Sector A', 'Southern Province', 6.4061, 80.0076, '2026-09-15', 124, 'Relocated to Hatchery', 'Kosgoda Conservation Team', 'Female 102cm carapace width.'),
    ('leatherback', 'Rekawa Sanctuary Coast', 'Southern Province', 6.0464, 80.8406, '2026-09-18', 88, 'In-Situ Beach Fenced', 'Rekawa Turtle Watch Ranger', 'Beach cage placed.'),
    ('olive_ridley', 'Bentota South Beach', 'Southern Province', 6.4258, 79.9975, '2026-09-22', 112, 'Relocated to Hatchery', 'Bentota Sea Care NGO', 'High tourist area.'),
    ('hawksbill', 'Hikkaduwa Marine Park Coast', 'Southern Province', 6.1390, 80.1030, '2026-09-28', 135, 'In-Situ Beach Fenced', 'WildLife Officer Bandara', 'Near reef margin.'),
    ('green_turtle', 'Panama-Komari Eastern Coast', 'Eastern Province', 6.7554, 81.8089, '2026-10-01', 118, 'In-Situ Beach Fenced', 'Eastern Marine Protection', 'Pristine nesting zone.');

-- Seed Threat Incidents
INSERT INTO incidents (incident_type, location_name, lat, lng, severity, incident_date, status, details)
VALUES
    ('Poaching Attempt / Illegal Egg Theft', 'Kalutara South Beach', 6.5780, 79.9620, 'High', '2026-09-12', 'Investigating', 'Reported egg collection activity near sand dunes. DWC notified.'),
    ('Fishing Net Entanglement / Bycatch', 'Mirissa Coastal Sea Sector 3', 5.9483, 80.4716, 'High', '2026-09-20', 'Resolved', 'Adult Green Turtle disentangled by local diving crew.'),
    ('Habitat Destruction / Artificial Lighting', 'Unawatuna Beach Promenade', 6.0174, 80.2486, 'Medium', '2026-09-25', 'Action Required', 'Bright artificial beachfront lighting disorienting hatchlings.');

-- Seed Hatchery Clutches
INSERT INTO hatchery_clutches (hatchery_id, clutch_code, species_id, nest_date, transfer_date, egg_count, expected_hatch_date, hatched_count, released_count, success_rate)
VALUES
    (1, 'CL-2026-KS01', 'green_turtle', '2026-08-10', '2026-08-10', 120, '2026-10-05', 108, 108, 90.00),
    (1, 'CL-2026-KS02', 'olive_ridley', '2026-08-14', '2026-08-14', 105, '2026-10-09', 92, 92, 87.62),
    (2, 'CL-2026-RK01', 'leatherback', '2026-08-18', '2026-08-18', 85, '2026-10-13', 76, 76, 89.41);
