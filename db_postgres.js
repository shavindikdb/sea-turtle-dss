/**
 * Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
 * PostgreSQL Database Layer & Connection Manager
 * Enterprise Security & Data Persistence Engine
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection Configuration (Environment Variables or Default Local/Docker Credentials)
const pgConfig = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'sea_turtle_db',
    user: process.env.POSTGRES_USER || 'turtle_admin',
    password: process.env.POSTGRES_PASSWORD || 'turtle_pass_2026',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
};

let pool = null;
let isPgConnected = false;

function initPostgresPool() {
    if (pool) return pool;

    try {
        pool = new Pool(pgConfig);

        pool.on('error', (err) => {
            console.error('Unexpected PostgreSQL Pool Error:', err);
            isPgConnected = false;
        });

        // Test Connection
        pool.query('SELECT NOW(), current_database(), version()', (err, res) => {
            if (err) {
                console.warn('PostgreSQL Connection Warning (Falling back to IndexedDB / Memory mode):', err.message);
                isPgConnected = false;
            } else {
                isPgConnected = true;
                console.log(`✅ PostgreSQL Connected Successfully! Server Time: ${res.rows[0].now} | DB: ${res.rows[0].current_database}`);
            }
        });
    } catch (err) {
        console.warn('PostgreSQL Pool Initialization skipped:', err.message);
        isPgConnected = false;
    }

    return pool;
}

// Execute Query Helper
async function query(text, params) {
    if (!pool) initPostgresPool();
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log(`[PG Query] Executed in ${duration}ms | Rows: ${res.rowCount || 0}`);
        return res;
    } catch (err) {
        console.error('[PG Query Error]:', err.message);
        throw err;
    }
}

// Automatic Database Initialization (Runs DDL schema.sql)
async function initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        await query(sql);
        return { status: 'success', message: 'PostgreSQL Schema & Seed Data Ingested Successfully' };
    } else {
        throw new Error('schema.sql file not found');
    }
}

// Security Audit Logger Helper
async function logSecurityEvent({ username, role, action, ip_address, status, details }) {
    try {
        await query(
            `INSERT INTO security_audit_logs (username, role, action, ip_address, status, details) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [username || 'anonymous', role || 'guest', action, ip_address || '127.0.0.1', status, details || '']
        );
    } catch (err) {
        console.error('Failed to write security audit log to PG:', err.message);
    }
}

// Find User by Username
async function findUserByUsername(username) {
    try {
        const res = await query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        return res.rows[0] || null;
    } catch (err) {
        console.error('Error finding user:', err.message);
        return null;
    }
}

// Create New User
async function createUser({ username, email, salt, password_hash, role, full_name }) {
    const res = await query(
        `INSERT INTO users (username, email, salt, password_hash, role, full_name)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, role, full_name, created_at`,
        [username, email, salt, password_hash, role, full_name]
    );
    return res.rows[0];
}

// Update User Password
async function updateUserPassword(userId, salt, password_hash) {
    await query(
        `UPDATE users SET salt = $1, password_hash = $2, failed_attempts = 0, locked_until = NULL WHERE id = $3`,
        [salt, password_hash, userId]
    );
}

// Update Failed Attempts
async function updateFailedAttempts(userId, count, lockedUntil) {
    await query(
        `UPDATE users SET failed_attempts = $1, locked_until = $2 WHERE id = $3`,
        [count, lockedUntil, userId]
    );
}

module.exports = {
    initPostgresPool,
    query,
    initSchema,
    logSecurityEvent,
    findUserByUsername,
    createUser,
    updateUserPassword,
    updateFailedAttempts,
    isPgConnected: () => isPgConnected,
    getConfigInfo: () => ({
        host: pgConfig.host,
        port: pgConfig.port,
        database: pgConfig.database,
        user: pgConfig.user,
        status: isPgConnected ? 'Connected' : 'Offline / Standalone Mode'
    })
};
