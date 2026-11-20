/**
 * Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
 * Production Node.js Server & Secure REST API Backend
 * Sri Lanka Sea Turtle Conservation (Uva Wellassa University / DIUX Lab Research Specification)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const dbPostgres = require('./db_postgres');
const authSecurity = require('./auth_security');

const PORT = process.env.PORT || 80;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.sql': 'text/plain; charset=utf-8',
    '.webp': 'image/webp'
};

// Initialize PostgreSQL Connection Pool
dbPostgres.initPostgresPool();

// Helper to parse JSON request body
function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 5 * 1024 * 1024) { // 5MB limit
                reject(new Error('Payload too large'));
            }
        });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', err => reject(err));
    });
}

// Helper to get client IP
function getClientIp(req) {
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
}

// Helper to send JSON response
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block'
    });
    res.end(JSON.stringify(data));
}

// Authentication Middleware Helper
function extractBearerToken(req) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim();
    }
    return null;
}

const server = http.createServer(async (req, res) => {
    const clientIp = getClientIp(req);

    // Apply Standard Security Headers & CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // =========================================================================
    // 1. AUTHENTICATION & SECURITY ENDPOINTS
    // =========================================================================

    // POST /api/auth/login (PBKDF2 Verification & Brute-Force Rate Limiting)
    if (pathname === '/api/auth/login' && req.method === 'POST') {
        try {
            const { username, password } = await parseJsonBody(req);
            if (!username || !password) {
                return sendJson(res, 400, { success: false, message: 'Username and password are required.' });
            }

            // 1. Check account lockout status
            const lockoutStatus = authSecurity.checkAccountLockout(username);
            if (lockoutStatus.isLocked) {
                await dbPostgres.logSecurityEvent({
                    username,
                    role: 'guest',
                    action: 'LOGIN_BLOCKED_LOCKED',
                    ip_address: clientIp,
                    status: 'LOCKED',
                    details: lockoutStatus.message
                });
                return sendJson(res, 429, {
                    success: false,
                    isLocked: true,
                    minutesLeft: lockoutStatus.minutesLeft,
                    message: lockoutStatus.message
                });
            }

            // 2. Query user from PostgreSQL
            const user = await dbPostgres.findUserByUsername(username);
            if (!user) {
                const attemptResult = authSecurity.recordFailedAttempt(username);
                await dbPostgres.logSecurityEvent({
                    username,
                    role: 'guest',
                    action: 'LOGIN_FAILED_USER_NOT_FOUND',
                    ip_address: clientIp,
                    status: 'FAILED',
                    details: `Failed attempt for non-existent or wrong username`
                });
                return sendJson(res, 401, {
                    success: false,
                    isLocked: attemptResult.isLocked,
                    remainingAttempts: attemptResult.remainingAttempts,
                    message: attemptResult.isLocked ? attemptResult.message : 'Invalid username or password.'
                });
            }

            // 3. Verify PBKDF2 Password Hash in Constant Time
            const isValid = authSecurity.verifyPassword(password, user.salt, user.password_hash);
            if (!isValid) {
                const attemptResult = authSecurity.recordFailedAttempt(username);
                await dbPostgres.logSecurityEvent({
                    username,
                    role: user.role,
                    action: 'LOGIN_FAILED_INVALID_PASSWORD',
                    ip_address: clientIp,
                    status: 'FAILED',
                    details: `Failed password attempt (${attemptResult.remainingAttempts} attempts remaining)`
                });
                return sendJson(res, 401, {
                    success: false,
                    isLocked: attemptResult.isLocked,
                    remainingAttempts: attemptResult.remainingAttempts,
                    message: attemptResult.isLocked 
                        ? attemptResult.message 
                        : `Invalid username or password. ${attemptResult.remainingAttempts} attempt(s) remaining before security lockout.`
                });
            }

            // 4. Successful Authentication - Clear failed attempts & create session
            authSecurity.clearFailedAttempts(username);
            const session = authSecurity.createSession(user);

            // Log security event
            await dbPostgres.logSecurityEvent({
                username: user.username,
                role: user.role,
                action: 'LOGIN_SUCCESS',
                ip_address: clientIp,
                status: 'SUCCESS',
                details: `Authenticated role: ${user.role} | Full Name: ${user.full_name}`
            });

            return sendJson(res, 200, {
                success: true,
                message: 'Login successful.',
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    fullName: user.full_name,
                    email: user.email
                },
                token: session.token,
                expiresAt: session.expiresAt
            });
        } catch (err) {
            console.error('Login error:', err);
            return sendJson(res, 500, { success: false, message: 'Server error during login: ' + err.message });
        }
    }

    // POST /api/auth/register (Create New Account with Password Strength Validation)
    if (pathname === '/api/auth/register' && req.method === 'POST') {
        try {
            const { username, password, role, fullName, email } = await parseJsonBody(req);
            
            if (!username || !password || !role || !fullName) {
                return sendJson(res, 400, { success: false, message: 'All fields (Username, Password, Role, Full Name) are required.' });
            }

            // Validate Role
            const allowedRoles = ['admin', 'officer', 'tourist', 'fisherman'];
            if (!allowedRoles.includes(role)) {
                return sendJson(res, 400, { success: false, message: 'Invalid role specified.' });
            }

            // Validate Password Strength
            const strengthCheck = authSecurity.validatePasswordStrength(password);
            if (!strengthCheck.valid) {
                return sendJson(res, 400, { success: false, message: strengthCheck.message });
            }

            // Check if username exists
            const existingUser = await dbPostgres.findUserByUsername(username);
            if (existingUser) {
                return sendJson(res, 409, { success: false, message: 'Username is already taken. Please choose another.' });
            }

            // Hash password with PBKDF2 & unique salt
            const { salt, hash } = authSecurity.hashPassword(password);
            const newUser = await dbPostgres.createUser({
                username: username.trim(),
                email: email ? email.trim() : `${username.trim()}@turtle-conservation.lk`,
                salt,
                password_hash: hash,
                role,
                full_name: fullName.trim()
            });

            await dbPostgres.logSecurityEvent({
                username: newUser.username,
                role: newUser.role,
                action: 'USER_REGISTERED',
                ip_address: clientIp,
                status: 'SUCCESS',
                details: `New account created: ${newUser.role} by IP ${clientIp}`
            });

            return sendJson(res, 201, {
                success: true,
                message: 'Account registered successfully! You can now log in.',
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    role: newUser.role,
                    fullName: newUser.full_name
                }
            });
        } catch (err) {
            console.error('Registration error:', err);
            return sendJson(res, 500, { success: false, message: 'Registration failed: ' + err.message });
        }
    }

    // POST /api/auth/change-password
    if (pathname === '/api/auth/change-password' && req.method === 'POST') {
        try {
            const token = extractBearerToken(req);
            const session = authSecurity.validateSession(token);
            if (!session) {
                return sendJson(res, 401, { success: false, message: 'Unauthorized. Invalid or expired session.' });
            }

            const { currentPassword, newPassword } = await parseJsonBody(req);
            if (!currentPassword || !newPassword) {
                return sendJson(res, 400, { success: false, message: 'Current password and new password are required.' });
            }

            // Verify current password
            const user = await dbPostgres.findUserByUsername(session.username);
            if (!user) {
                return sendJson(res, 404, { success: false, message: 'User record not found.' });
            }

            const isCurrentValid = authSecurity.verifyPassword(currentPassword, user.salt, user.password_hash);
            if (!isCurrentValid) {
                await dbPostgres.logSecurityEvent({
                    username: session.username,
                    role: session.role,
                    action: 'PASSWORD_CHANGE_FAILED',
                    ip_address: clientIp,
                    status: 'FAILED',
                    details: 'Incorrect current password provided'
                });
                return sendJson(res, 401, { success: false, message: 'Incorrect current password.' });
            }

            // Validate new password strength
            const strengthCheck = authSecurity.validatePasswordStrength(newPassword);
            if (!strengthCheck.valid) {
                return sendJson(res, 400, { success: false, message: strengthCheck.message });
            }

            // Hash new password
            const { salt: newSalt, hash: newHash } = authSecurity.hashPassword(newPassword);
            await dbPostgres.updateUserPassword(user.id, newSalt, newHash);

            await dbPostgres.logSecurityEvent({
                username: session.username,
                role: session.role,
                action: 'PASSWORD_CHANGED',
                ip_address: clientIp,
                status: 'SUCCESS',
                details: 'Password successfully updated'
            });

            return sendJson(res, 200, { success: true, message: 'Password changed successfully.' });
        } catch (err) {
            console.error('Password change error:', err);
            return sendJson(res, 500, { success: false, message: 'Error changing password: ' + err.message });
        }
    }

    // GET /api/auth/session (Validate Active Session)
    if (pathname === '/api/auth/session' && req.method === 'GET') {
        const token = extractBearerToken(req);
        const session = authSecurity.validateSession(token);
        if (!session) {
            return sendJson(res, 401, { active: false, message: 'Session expired or invalid.' });
        }
        return sendJson(res, 200, { active: true, user: session });
    }

    // POST /api/auth/logout
    if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = extractBearerToken(req);
        const session = authSecurity.validateSession(token);
        if (session) {
            authSecurity.revokeSession(token);
            await dbPostgres.logSecurityEvent({
                username: session.username,
                role: session.role,
                action: 'LOGOUT',
                ip_address: clientIp,
                status: 'SUCCESS',
                details: 'User logged out'
            });
        }
        return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    // GET /api/auth/audit-logs (Security Audit Log Viewer)
    if (pathname === '/api/auth/audit-logs' && req.method === 'GET') {
        try {
            const resLogs = await dbPostgres.query(`
                SELECT id, username, role, action, ip_address, status, details, timestamp 
                FROM security_audit_logs 
                ORDER BY timestamp DESC 
                LIMIT 100
            `);
            return sendJson(res, 200, resLogs.rows);
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // =========================================================================
    // 2. CONSERVATION DSS REST API ENDPOINTS
    // =========================================================================

    // GET /api/db/status
    if (pathname === '/api/db/status' && req.method === 'GET') {
        return sendJson(res, 200, {
            postgres: dbPostgres.getConfigInfo(),
            timestamp: new Date().toISOString()
        });
    }

    // GET /api/species
    if (pathname === '/api/species' && req.method === 'GET') {
        try {
            const result = await dbPostgres.query('SELECT * FROM species ORDER BY id ASC');
            return sendJson(res, 200, result.rows);
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // GET & POST /api/nestings
    if (pathname === '/api/nestings') {
        if (req.method === 'GET') {
            try {
                const result = await dbPostgres.query(`
                    SELECT n.*, s.common_name, s.sinhala_name, s.color 
                    FROM nesting_records n 
                    LEFT JOIN species s ON n.species_id = s.id 
                    ORDER BY n.nest_date DESC, n.id DESC
                `);
                return sendJson(res, 200, result.rows);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
        if (req.method === 'POST') {
            try {
                const item = await parseJsonBody(req);
                const result = await dbPostgres.query(`
                    INSERT INTO nesting_records (species_id, location_name, region, lat, lng, nest_date, egg_count, protection_status, reported_by, notes)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING *
                `, [item.species_id, item.location_name, item.region, item.lat, item.lng, item.nest_date, item.egg_count, item.protection_status, item.reported_by, item.notes || '']);
                return sendJson(res, 201, result.rows[0]);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
    }

    // GET & POST & PUT /api/incidents
    if (pathname === '/api/incidents') {
        if (req.method === 'GET') {
            try {
                const result = await dbPostgres.query('SELECT * FROM incidents ORDER BY incident_date DESC, id DESC');
                return sendJson(res, 200, result.rows);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
        if (req.method === 'POST') {
            try {
                const item = await parseJsonBody(req);
                const result = await dbPostgres.query(`
                    INSERT INTO incidents (incident_type, location_name, lat, lng, severity, incident_date, status, details, photo_url)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    RETURNING *
                `, [item.incident_type, item.location_name, item.lat, item.lng, item.severity, item.incident_date, item.status || 'Investigating', item.details, item.photo_url || '']);
                return sendJson(res, 201, result.rows[0]);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
        if (req.method === 'PUT') {
            try {
                const { id, status } = await parseJsonBody(req);
                const result = await dbPostgres.query('UPDATE incidents SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
                return sendJson(res, 200, result.rows[0]);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
    }

    // GET /api/hatcheries
    if (pathname === '/api/hatcheries' && req.method === 'GET') {
        try {
            const result = await dbPostgres.query('SELECT * FROM hatcheries ORDER BY id ASC');
            return sendJson(res, 200, result.rows);
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // GET & POST /api/evaluations
    if (pathname === '/api/evaluations') {
        if (req.method === 'GET') {
            try {
                const result = await dbPostgres.query('SELECT * FROM evaluations ORDER BY submitted_at DESC');
                return sendJson(res, 200, result.rows);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
        if (req.method === 'POST') {
            try {
                const { responses, sus_score } = await parseJsonBody(req);
                const result = await dbPostgres.query(
                    'INSERT INTO evaluations (responses, sus_score) VALUES ($1, $2) RETURNING *',
                    [JSON.stringify(responses), sus_score]
                );
                return sendJson(res, 201, result.rows[0]);
            } catch (err) {
                return sendJson(res, 500, { error: err.message });
            }
        }
    }

    // GET /api/backup/export (Complete Local JSON Database Backup)
    if (pathname === '/api/backup/export' && req.method === 'GET') {
        try {
            const species = (await dbPostgres.query('SELECT * FROM species')).rows;
            const nestings = (await dbPostgres.query('SELECT * FROM nesting_records')).rows;
            const incidents = (await dbPostgres.query('SELECT * FROM incidents')).rows;
            const hatcheries = (await dbPostgres.query('SELECT * FROM hatcheries')).rows;
            const clutches = (await dbPostgres.query('SELECT * FROM hatchery_clutches')).rows;
            const audits = (await dbPostgres.query('SELECT * FROM security_audit_logs ORDER BY id DESC LIMIT 50')).rows;

            const backupData = {
                exportedAt: new Date().toISOString(),
                system: 'STCIDSS - Sri Lanka Sea Turtle Conservation',
                species,
                nestings,
                incidents,
                hatcheries,
                clutches,
                securityAudits: audits
            };

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Disposition': 'attachment; filename="sea_turtle_dss_backup.json"'
            });
            res.end(JSON.stringify(backupData, null, 2));
            return;
        } catch (err) {
            return sendJson(res, 500, { error: err.message });
        }
    }

    // =========================================================================
    // 3. STATIC FILE SERVER
    // =========================================================================
    let safePath = path.normalize(req.url === '/' ? '/index.html' : pathname).replace(/^(\.\.[\/\\])+/, '');
    let filePath = path.join(__dirname, safePath);

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end('<h1>404 Not Found - Sea Turtle DSS Sri Lanka</h1>');
            return;
        }

        const extname = String(path.extname(filePath)).toLowerCase();
        const contentType = MIME_TYPES[extname] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`====================================================================`);
    console.log(`🐢 Sea Turtle Conservation DSS Enterprise Node Server Running`);
    console.log(`   Port:           ${PORT}`);
    console.log(`   Local URL:      http://localhost:${PORT}/`);
    console.log(`   Security:       PBKDF2-HMAC-SHA256 (10,000 iter) + Rate Limiting`);
    console.log(`   PostgreSQL API: /api/auth/*, /api/nestings, /api/incidents`);
    console.log(`====================================================================`);
});
