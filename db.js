/**
 * Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
 * Hybrid Client Database Layer - Dual-Sync Engine (PostgreSQL REST API + IndexedDB Offline Persistence)
 * Enterprise-Grade PBKDF2 Client/Server Cryptography & Role-Based Access Control
 * Sri Lanka Sea Turtle Conservation (Uva Wellassa University / DIUX Lab Research Specification)
 */

const DB_NAME = 'SeaTurtleConservationDB';
const DB_VERSION = 2;

// Seed Users with Cryptographic PBKDF2 Hashes (10,000 iterations, 32-byte salt)
const SEED_USERS = [
    {
        id: 1,
        username: 'admin',
        email: 'admin@dwc.gov.lk',
        salt: '1f1e1af26c50c5284578f1963393c405420334ba70b4eba419ef5e2eb1213db6',
        password_hash: '8fd0601cc61f5ba91a1108032b77ebbe05883c6b353779a0b8e951040e31a654f1acd3cbaa89fba4d350767422ff82156a6368ab0d4539672dc56070f9cb7630',
        role: 'admin',
        full_name: 'Administrator (DWC)',
        failed_attempts: 0,
        locked_until: null,
        created_at: '2026-10-13T09:00:00Z'
    },
    {
        id: 2,
        username: 'officer',
        email: 'officer@dwc.gov.lk',
        salt: '37f6b8c1038f2294260198d6eac3a694593a28ebfce6ad83e1f3ef91f77409d4',
        password_hash: '5dca443668c7c7cc333f353c5b0e1114b8231fb180cb94e1d02681c7e82590e890a8260faef578449b82e4caf44c775a3bbc98546c9436d3a2600ad00bb7513b',
        role: 'officer',
        full_name: 'Field Ranger Bandara',
        failed_attempts: 0,
        locked_until: null,
        created_at: '2026-10-13T09:00:00Z'
    },
    {
        id: 3,
        username: 'tourist',
        email: 'tourist@ecotour.lk',
        salt: '124da7ce17c9fc5b8f959b18104bd028232ad94d02ed99000df1e607ee24efb2',
        password_hash: '3cdd9131c57d6a12ba6995fd8ab2b8345a58e516d1f8bcca30e7b85b09831cef3b60780eb10156479180164875bc7ce0d3776d55789445ca048182efa09ee26c',
        role: 'tourist',
        full_name: 'Eco Visitor Sarah',
        failed_attempts: 0,
        locked_until: null,
        created_at: '2026-10-13T09:00:00Z'
    },
    {
        id: 4,
        username: 'fisherman',
        email: 'marine@fisheries.gov.lk',
        salt: 'fdcda0c507639f8b32e549347328683ee990a855c931a6e46a5c36f0645bfee2',
        password_hash: '326cfbd36e86cf185e4fa88ec97260ee5faa1b70b8c62d51bb1cf79268324406d3ca0b3e230751ed951a369ae509d70703261de75645195a18127b85fb359f50',
        role: 'fisherman',
        full_name: 'Patrol Leader Gunadasa',
        failed_attempts: 0,
        locked_until: null,
        created_at: '2026-10-13T09:00:00Z'
    }
];

class TurtleDatabase {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.apiBase = window.location.origin;
        this.isApiOnline = false;
    }

    async init() {
        if (this.isInitialized) return this;

        // Check backend API connectivity
        try {
            const check = await fetch(`${this.apiBase}/api/db/status`, { method: 'GET', cache: 'no-store' });
            if (check.ok) {
                this.isApiOnline = true;
                console.log('🌐 Connected to Sea Turtle DSS PostgreSQL Backend API');
            }
        } catch (e) {
            this.isApiOnline = false;
            console.warn('⚠️ Server API unreachable. Operating in local IndexedDB resilience mode.');
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 0. Users Store
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('username', 'username', { unique: true });
                    userStore.createIndex('role', 'role', { unique: false });
                }

                // 0.1 Security Audit Logs Store
                if (!db.objectStoreNames.contains('security_audit_logs')) {
                    const auditStore = db.createObjectStore('security_audit_logs', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('username', 'username', { unique: false });
                }

                // 1. Species Store
                if (!db.objectStoreNames.contains('species')) {
                    const speciesStore = db.createObjectStore('species', { keyPath: 'id' });
                    speciesStore.createIndex('scientific_name', 'scientific_name', { unique: true });
                }

                // 2. Nesting Records Store
                if (!db.objectStoreNames.contains('nesting_records')) {
                    const nestingStore = db.createObjectStore('nesting_records', { keyPath: 'id', autoIncrement: true });
                    nestingStore.createIndex('species_id', 'species_id', { unique: false });
                    nestingStore.createIndex('region', 'region', { unique: false });
                    nestingStore.createIndex('nest_date', 'nest_date', { unique: false });
                }

                // 3. Incidents Store
                if (!db.objectStoreNames.contains('incidents')) {
                    const incidentStore = db.createObjectStore('incidents', { keyPath: 'id', autoIncrement: true });
                    incidentStore.createIndex('incident_type', 'incident_type', { unique: false });
                    incidentStore.createIndex('severity', 'severity', { unique: false });
                    incidentStore.createIndex('status', 'status', { unique: false });
                }

                // 4. Hatcheries Store
                if (!db.objectStoreNames.contains('hatcheries')) {
                    const hatcheryStore = db.createObjectStore('hatcheries', { keyPath: 'id', autoIncrement: true });
                    hatcheryStore.createIndex('name', 'name', { unique: false });
                }

                // 5. Hatchery Clutches Store
                if (!db.objectStoreNames.contains('hatchery_clutches')) {
                    const clutchStore = db.createObjectStore('hatchery_clutches', { keyPath: 'id', autoIncrement: true });
                    clutchStore.createIndex('hatchery_id', 'hatchery_id', { unique: false });
                }

                // 6. DSS Recommendations Store
                if (!db.objectStoreNames.contains('dss_recommendations')) {
                    const dssStore = db.createObjectStore('dss_recommendations', { keyPath: 'id', autoIncrement: true });
                    dssStore.createIndex('severity', 'severity', { unique: false });
                }

                // 7. System Evaluation / SUS Store
                if (!db.objectStoreNames.contains('evaluations')) {
                    db.createObjectStore('evaluations', { keyPath: 'id', autoIncrement: true });
                }
            };

            request.onsuccess = async (event) => {
                this.db = event.target.result;
                this.isInitialized = true;
                await this.seedInitialDataIfEmpty();
                resolve(this);
            };

            request.onerror = (event) => {
                console.error('IndexedDB Initialization error:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    // Generic IndexedDB Helpers
    async getAll(storeName) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async add(storeName, item) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async update(storeName, item) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async delete(storeName, id) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // Client-side Web Crypto PBKDF2 implementation
    async clientPBKDF2(password, saltHex) {
        try {
            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                enc.encode(password),
                { name: 'PBKDF2' },
                false,
                ['deriveBits']
            );
            const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
            const derivedBits = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: saltBytes,
                    iterations: 10000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                512
            );
            return Array.from(new Uint8Array(derivedBits))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        } catch (e) {
            console.error('Web Crypto derive error:', e);
            throw e;
        }
    }

    // Password Quality Validation
    validatePasswordQuality(password) {
        if (!password || password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long.' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter (A-Z).' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter (a-z).' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number (0-9).' };
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one special character (!@#$%^&*).' };
        }
        return { valid: true, message: 'Password meets all security criteria.' };
    }

    // High-Level Authentication with REST API & Fallback
    async authenticateUser(username, password) {
        // Try PostgreSQL REST API first
        try {
            const res = await fetch(`${this.apiBase}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                // Save session token locally
                localStorage.setItem('stcidss_token', data.token);
                localStorage.setItem('stcidss_user', JSON.stringify(data.user));
                return data;
            } else {
                return data;
            }
        } catch (netErr) {
            console.warn('Network API unreachable, attempting secure local IndexedDB auth...', netErr.message);
        }

        // Offline / Local IndexedDB Fallback with PBKDF2
        await this.init();
        const users = await this.getAll('users');
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

        if (!user) {
            await this.logSecurityAudit({
                username,
                role: 'guest',
                action: 'LOGIN_FAILED',
                status: 'FAILED',
                details: 'User does not exist in local store'
            });
            return { success: false, message: 'Invalid username or password.' };
        }

        // Check local lockout
        if (user.locked_until && Date.now() < user.locked_until) {
            const minLeft = Math.ceil((user.locked_until - Date.now()) / 60000);
            return {
                success: false,
                isLocked: true,
                minutesLeft: minLeft,
                message: `Account is locked due to multiple failed attempts. Try again in ${minLeft} minute(s).`
            };
        }

        // Verify PBKDF2 hash using Web Crypto
        const calculatedHash = await this.clientPBKDF2(password, user.salt);
        if (calculatedHash !== user.password_hash) {
            user.failed_attempts = (user.failed_attempts || 0) + 1;
            if (user.failed_attempts >= 5) {
                user.locked_until = Date.now() + 15 * 60 * 1000;
                await this.update('users', user);
                await this.logSecurityAudit({
                    username: user.username,
                    role: user.role,
                    action: 'ACCOUNT_LOCKED',
                    status: 'LOCKED',
                    details: 'Exceeded 5 failed attempts in local store'
                });
                return {
                    success: false,
                    isLocked: true,
                    minutesLeft: 15,
                    message: 'Maximum login attempts exceeded. Account locked for 15 minutes.'
                };
            } else {
                await this.update('users', user);
                const remaining = 5 - user.failed_attempts;
                return {
                    success: false,
                    isLocked: false,
                    remainingAttempts: remaining,
                    message: `Invalid password. ${remaining} attempt(s) remaining.`
                };
            }
        }

        // Reset failed attempts
        user.failed_attempts = 0;
        user.locked_until = null;
        await this.update('users', user);

        const localSessionUser = {
            id: user.id,
            username: user.username,
            role: user.role,
            fullName: user.full_name,
            email: user.email
        };

        const dummyToken = 'local_token_' + Date.now();
        localStorage.setItem('stcidss_token', dummyToken);
        localStorage.setItem('stcidss_user', JSON.stringify(localSessionUser));

        await this.logSecurityAudit({
            username: user.username,
            role: user.role,
            action: 'LOGIN_SUCCESS_OFFLINE',
            status: 'SUCCESS',
            details: 'Authenticated via local cryptographic engine'
        });

        return {
            success: true,
            message: 'Login successful (Offline mode).',
            user: localSessionUser,
            token: dummyToken
        };
    }

    // Register User
    async registerUser({ username, password, role, fullName, email }) {
        const quality = this.validatePasswordQuality(password);
        if (!quality.valid) {
            return { success: false, message: quality.message };
        }

        // Try API
        try {
            const res = await fetch(`${this.apiBase}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, role, fullName, email })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                return data;
            } else if (res.status === 409 || res.status === 400) {
                return data;
            }
        } catch (e) {
            console.warn('API register error, storing locally...', e.message);
        }

        // Local IndexedDB Fallback
        await this.init();
        const users = await this.getAll('users');
        if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            return { success: false, message: 'Username is already taken.' };
        }

        const saltHex = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const hashHex = await this.clientPBKDF2(password, saltHex);

        const newUser = {
            username: username.trim(),
            email: email || `${username}@dwc.gov.lk`,
            salt: saltHex,
            password_hash: hashHex,
            role,
            full_name: fullName.trim(),
            failed_attempts: 0,
            locked_until: null,
            created_at: new Date().toISOString()
        };

        const id = await this.add('users', newUser);
        newUser.id = id;

        await this.logSecurityAudit({
            username: newUser.username,
            role: newUser.role,
            action: 'USER_REGISTERED_LOCAL',
            status: 'SUCCESS',
            details: 'New user registered locally with PBKDF2'
        });

        return { success: true, message: 'Account registered successfully!', user: newUser };
    }

    // Change Password
    async changeUserPassword(currentPassword, newPassword) {
        const quality = this.validatePasswordQuality(newPassword);
        if (!quality.valid) {
            return { success: false, message: quality.message };
        }

        const token = localStorage.getItem('stcidss_token');
        try {
            const res = await fetch(`${this.apiBase}/api/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.warn('API change-password failed, trying local store...', e);
        }

        // Local change password
        const curUserJson = localStorage.getItem('stcidss_user');
        if (!curUserJson) return { success: false, message: 'No active session.' };
        const sessionUser = JSON.parse(curUserJson);

        const users = await this.getAll('users');
        const user = users.find(u => u.id === sessionUser.id || u.username === sessionUser.username);
        if (!user) return { success: false, message: 'User not found in local store.' };

        const curHash = await this.clientPBKDF2(currentPassword, user.salt);
        if (curHash !== user.password_hash) {
            return { success: false, message: 'Current password does not match.' };
        }

        const newSalt = Array.from(window.crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const newHash = await this.clientPBKDF2(newPassword, newSalt);

        user.salt = newSalt;
        user.password_hash = newHash;
        await this.update('users', user);

        await this.logSecurityAudit({
            username: user.username,
            role: user.role,
            action: 'PASSWORD_CHANGED_LOCAL',
            status: 'SUCCESS',
            details: 'Password updated locally with new salt & PBKDF2'
        });

        return { success: true, message: 'Password updated successfully!' };
    }

    // Log Security Audit Event
    async logSecurityAudit({ username, role, action, status, details }) {
        try {
            await this.add('security_audit_logs', {
                username: username || 'system',
                role: role || 'guest',
                action,
                status,
                details: details || '',
                ip_address: '127.0.0.1 (Local Browser)',
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error('Audit log error:', e);
        }
    }

    async getAuditLogs() {
        try {
            const res = await fetch(`${this.apiBase}/api/auth/audit-logs`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {}
        return await this.getAll('security_audit_logs');
    }

    // Data Seeding if empty
    async seedInitialDataIfEmpty() {
        const species = await this.getAll('species');
        if (species.length === 0) {
            await this.seedData();
        }

        const users = await this.getAll('users');
        if (users.length === 0) {
            for (const u of SEED_USERS) {
                await this.add('users', u);
            }
            await this.logSecurityAudit({
                username: 'system',
                role: 'admin',
                action: 'SYSTEM_SEEDED',
                status: 'SUCCESS',
                details: 'Default secure accounts created with PBKDF2 hashing'
            });
        }
    }

    async seedData() {
        console.log('Seeding Sri Lanka Sea Turtle Conservation Data...');

        // 1. Species Seed (5 Sri Lankan Species)
        const speciesData = [
            {
                id: 'green_turtle',
                common_name: 'Green Turtle',
                sinhala_name: 'වැලි කැස්බෑවා (Weli Käsba)',
                scientific_name: 'Chelonia mydas',
                iucn_status: 'Endangered',
                avg_clutch_size: 120,
                description: 'The most common species nesting along Sri Lanka’s south-west and south coasts. Herbivorous as adults, feeding on seagrass beds.',
                color: '#10b981'
            },
            {
                id: 'olive_ridley',
                common_name: 'Olive Ridley Turtle',
                sinhala_name: 'බටු කැස්බෑවා (Batu Käsba)',
                scientific_name: 'Lepidochelys olivacea',
                iucn_status: 'Vulnerable',
                avg_clutch_size: 105,
                description: 'Smallest of Sri Lankan sea turtles. Known for synchronized mass nestings and frequent accidentally trapped bycatch in fishing nets.',
                color: '#0284c7'
            },
            {
                id: 'hawksbill',
                common_name: 'Hawksbill Turtle',
                sinhala_name: 'පොතු කැස්බෑවා (Pothu Käsba)',
                scientific_name: 'Eretmochelys imbricata',
                iucn_status: 'Critically Endangered',
                avg_clutch_size: 130,
                description: 'Highly threatened due to historic illegal tortoiseshell trade. Feeds primarily on sponges in coral reef ecosystems like Hikkaduwa.',
                color: '#f59e0b'
            },
            {
                id: 'loggerhead',
                common_name: 'Loggerhead Turtle',
                sinhala_name: 'ඔලුගෙඩි කැස්බෑවා (Olugedi Käsba)',
                scientific_name: 'Caretta caretta',
                iucn_status: 'Vulnerable',
                avg_clutch_size: 110,
                description: 'Recognizable by massive head and strong jaws. Relatively rare nestings in Sri Lanka, mainly found in deep southern waters.',
                color: '#8b5cf6'
            },
            {
                id: 'leatherback',
                common_name: 'Leatherback Turtle',
                sinhala_name: 'දාර කැස්බෑවා (Dara Käsba)',
                scientific_name: 'Dermochelys coriacea',
                iucn_status: 'Critically Endangered',
                avg_clutch_size: 85,
                description: 'Largest sea turtle on Earth, lacks a bony shell. Nests on deep sandy beaches like Rekawa and Panama-Komari.',
                color: '#ec4899'
            }
        ];

        for (const sp of speciesData) {
            await this.add('species', sp);
        }

        // 2. Nesting Records Seed
        const nestingsData = [
            {
                species_id: 'green_turtle',
                location_name: 'Kosgoda Beach Sector A',
                region: 'Southern Province',
                lat: 6.4061,
                lng: 80.0076,
                nest_date: '2026-09-15',
                egg_count: 124,
                protection_status: 'Relocated to Hatchery',
                reported_by: 'Kosgoda Conservation Team',
                notes: 'Female measured 102cm carapace width. Nest relocated within 2 hours.'
            },
            {
                species_id: 'leatherback',
                location_name: 'Rekawa Sanctuary Coast',
                region: 'Southern Province',
                lat: 6.0464,
                lng: 80.8406,
                nest_date: '2026-09-18',
                egg_count: 88,
                protection_status: 'In-Situ Beach Fenced',
                reported_by: 'Rekawa Turtle Watch Ranger',
                notes: 'Large female. Beach cage placed to protect from stray dogs and poachers.'
            },
            {
                species_id: 'olive_ridley',
                location_name: 'Bentota South Beach',
                region: 'Southern Province',
                lat: 6.4258,
                lng: 79.9975,
                nest_date: '2026-09-22',
                egg_count: 112,
                protection_status: 'Relocated to Hatchery',
                reported_by: 'Bentota Sea Care NGO',
                notes: 'Located near hotel boundary. Relocated to prevent disturbance from artificial lighting.'
            },
            {
                species_id: 'hawksbill',
                location_name: 'Hikkaduwa Marine Park Coast',
                region: 'Southern Province',
                lat: 6.1390,
                lng: 80.1030,
                nest_date: '2026-09-28',
                egg_count: 135,
                protection_status: 'In-Situ Beach Fenced',
                reported_by: 'WildLife Officer Bandara',
                notes: 'Rare hawksbill clutch. 24-hour volunteer surveillance active.'
            },
            {
                species_id: 'green_turtle',
                location_name: 'Panama-Komari Eastern Coast',
                region: 'Eastern Province',
                lat: 6.7554,
                lng: 81.8089,
                nest_date: '2026-10-01',
                egg_count: 118,
                protection_status: 'In-Situ Beach Fenced',
                reported_by: 'Eastern Marine Protection Unit',
                notes: 'Undisturbed natural beach. Left in-situ with GPS tracker pin.'
            }
        ];

        for (const n of nestingsData) {
            await this.add('nesting_records', n);
        }

        // 3. Incidents Seed
        const incidentsData = [
            {
                incident_type: 'Poaching Attempt / Illegal Egg Theft',
                location_name: 'Kalutara South Beach',
                lat: 6.5780,
                lng: 79.9620,
                severity: 'High',
                incident_date: '2026-09-12',
                status: 'Investigating',
                details: 'Community member spotted 2 individuals digging fresh turtle crawl track at 01:30 AM. Police and DWC alerted.',
                photo_url: ''
            },
            {
                incident_type: 'Fishing Net Entanglement / Bycatch',
                location_name: 'Mirissa Coastal Sea Sector 3',
                lat: 5.9483,
                lng: 80.4716,
                severity: 'High',
                incident_date: '2026-09-20',
                status: 'Resolved',
                details: 'Adult Green Turtle found tangled in discarded gillnet. Disentangled and released by local fishermen and diving team.',
                photo_url: ''
            },
            {
                incident_type: 'Habitat Destruction / Artificial Lighting',
                location_name: 'Unawatuna Beach Promenade',
                lat: 6.0174,
                lng: 80.2486,
                severity: 'Medium',
                incident_date: '2026-09-25',
                status: 'Action Required',
                details: 'Bright high-intensity spotlights installed by beach resort directed onto nesting sands. Hatchlings disoriented away from ocean.',
                photo_url: ''
            }
        ];

        for (const inc of incidentsData) {
            await this.add('incidents', inc);
        }

        // 4. Hatcheries Seed
        const hatcheriesData = [
            {
                name: 'Kosgoda Sea Turtle Conservation Project',
                location_name: 'Kosgoda Coastal Zone',
                lat: 6.4061,
                lng: 80.0076,
                manager_name: 'Dr. Chintaka Perera',
                active_clutches: 42,
                total_eggs_incubating: 4850,
                hatchlings_released_this_year: 14200,
                tank_count: 14,
                capacity_status: 'Optimal (68% Utilization)',
                contact_phone: '+94 91 226 4432'
            },
            {
                name: 'Rekawa Turtle Conservation Center & Nursery',
                location_name: 'Rekawa Beach Sanctuary',
                lat: 6.0464,
                lng: 80.8406,
                manager_name: 'Sunil Jayasinghe',
                active_clutches: 65,
                total_eggs_incubating: 7120,
                hatchlings_released_this_year: 21500,
                tank_count: 18,
                capacity_status: 'High Demand (85% Utilization)',
                contact_phone: '+94 47 224 0119'
            },
            {
                name: 'Bentota Sea Turtle Protective Hatchery',
                location_name: 'Bentota River Mouth Coast',
                lat: 6.4258,
                lng: 79.9975,
                manager_name: 'Mahinda Ranasinghe',
                active_clutches: 28,
                total_eggs_incubating: 3100,
                hatchlings_released_this_year: 9800,
                tank_count: 10,
                capacity_status: 'Normal (55% Utilization)',
                contact_phone: '+94 34 227 5100'
            },
            {
                name: 'Habaraduwa Turtle Hatchery & Rescue Center',
                location_name: 'Habaraduwa Beach',
                lat: 5.9989,
                lng: 80.2882,
                manager_name: 'Kavinda Abeywardhana',
                active_clutches: 31,
                total_eggs_incubating: 3450,
                hatchlings_released_this_year: 11200,
                tank_count: 12,
                capacity_status: 'Optimal (60% Utilization)',
                contact_phone: '+94 91 228 3390'
            }
        ];

        for (const h of hatcheriesData) {
            await this.add('hatcheries', h);
        }

        // 5. Clutches Seed
        const clutchesData = [
            {
                hatchery_id: 1,
                clutch_code: 'CL-2026-KS01',
                species_id: 'green_turtle',
                nest_date: '2026-08-10',
                transfer_date: '2026-08-10',
                egg_count: 120,
                expected_hatch_date: '2026-10-05',
                hatched_count: 108,
                released_count: 108,
                success_rate: 90.0
            },
            {
                hatchery_id: 1,
                clutch_code: 'CL-2026-KS02',
                species_id: 'olive_ridley',
                nest_date: '2026-08-14',
                transfer_date: '2026-08-14',
                egg_count: 105,
                expected_hatch_date: '2026-10-09',
                hatched_count: 92,
                released_count: 92,
                success_rate: 87.6
            },
            {
                hatchery_id: 2,
                clutch_code: 'CL-2026-RK01',
                species_id: 'leatherback',
                nest_date: '2026-08-18',
                transfer_date: '2026-08-18',
                egg_count: 85,
                expected_hatch_date: '2026-10-13',
                hatched_count: 76,
                released_count: 76,
                success_rate: 89.4
            }
        ];

        for (const cl of clutchesData) {
            await this.add('hatchery_clutches', cl);
        }

        console.log('IndexedDB Hybrid Seeding Completed.');
    }
}

// Global Database Instance
window.turtleDB = new TurtleDatabase();
