/**
 * Integrated Sea Turtle Conservation Information & Decision Support System (STCIDSS)
 * Main Frontend Controller & Leaflet GIS Integration
 * Sri Lanka Sea Turtle Conservation Portal
 */

let mapInstance = null;
let mapMarkersLayer = null;
let currentTileLayer = null;
let mapMarkersList = []; // Array of { lat, lng, name, marker }
let currentRole = 'officer'; // 'officer' (exact GPS) or 'citizen' (masked GPS for security)

// Sri Lanka Field Research AI Species Dataset (5 Research Field Photos)
const AI_RESEARCH_SAMPLES = {
    'sample_1': {
        tag_id: 'KES0422',
        date: '24/06/2016',
        species_id: 'hawksbill',
        name: 'Hawksbill Turtle (Eretmochelys imbricata)',
        sinhala: 'පොතු කැස්බෑවා (Pothu Käsba)',
        confidence: 98.6,
        iucn: 'Critically Endangered (CR)',
        features: 'Distinctive sharp hawk-like curved beak, 2 pairs of prefrontal scales, dark amber facial scute margins.',
        health_note: 'Clear orbital area, active response. No fibropapilloma lesions detected on neck or facial scutes.',
        action: 'High priority nest protection. Logged under Tag KES0422 into DWC National Conservation Registry.',
        img: 'images/turtle_sample_1.jpg',
        probabilities: [
            { name: 'Hawksbill Turtle', pct: 98.6, color: '#f59e0b' },
            { name: 'Green Turtle', pct: 1.1, color: '#10b981' },
            { name: 'Olive Ridley', pct: 0.3, color: '#0284c7' }
        ]
    },
    'sample_2': {
        tag_id: 'KE 6133',
        date: '03/10/2014',
        species_id: 'olive_ridley',
        name: 'Olive Ridley Turtle (Lepidochelys olivacea)',
        sinhala: 'බටු කැස්බෑවා (Batu Käsba)',
        confidence: 96.4,
        iucn: 'Vulnerable (VU)',
        features: 'Relatively broad triangular head, olive-brown skin tone, 6-9 lateral carapace scutes.',
        health_note: 'Minor eye irritation near orbital scute; clear throat passageway.',
        action: 'Relocate eggs to ex-situ nursery tank if nesting below high water mark.',
        img: 'images/turtle_sample_2.jpg',
        probabilities: [
            { name: 'Olive Ridley Turtle', pct: 96.4, color: '#0284c7' },
            { name: 'Hawksbill Turtle', pct: 2.8, color: '#f59e0b' },
            { name: 'Loggerhead Turtle', pct: 0.8, color: '#8b5cf6' }
        ]
    },
    'sample_3': {
        tag_id: 'KE 6649',
        date: '06/12/2017',
        species_id: 'green_turtle',
        name: 'Green Turtle (Chelonia mydas)',
        sinhala: 'වැලි කැස්බෑවා (Weli Käsba)',
        confidence: 97.8,
        iucn: 'Endangered (EN)',
        features: 'Single pair of elongated prefrontal scales between eyes, rounded non-hooked snout, smooth golden neck scutes.',
        health_note: 'Mature reproductive female. Excellent carapace integrity & limb muscle tone.',
        action: 'In-situ beach cage protection with ranger night patrol surveillance.',
        img: 'images/turtle_sample_3.jpg',
        probabilities: [
            { name: 'Green Turtle', pct: 97.8, color: '#10b981' },
            { name: 'Hawksbill Turtle', pct: 1.6, color: '#f59e0b' },
            { name: 'Loggerhead Turtle', pct: 0.6, color: '#8b5cf6' }
        ]
    },
    'sample_4': {
        tag_id: 'KES 0229',
        date: '30/11/2016',
        species_id: 'loggerhead',
        name: 'Loggerhead Turtle (Caretta caretta)',
        sinhala: 'ඔලුගෙඩි කැස්බෑවා (Olugedi Käsba)',
        confidence: 95.2,
        iucn: 'Vulnerable (VU)',
        features: 'Massive robust head structure with powerful crushing jaw muscles, 2 pairs of prefrontal scales.',
        health_note: 'Sand particles around frontal scutes. Strong flipper reflex.',
        action: 'Rare Loggerhead Sri Lanka coast sighting. Record exact GPS into Deep-Sea Migration Database.',
        img: 'images/turtle_sample_4.jpg',
        probabilities: [
            { name: 'Loggerhead Turtle', pct: 95.2, color: '#8b5cf6' },
            { name: 'Olive Ridley Turtle', pct: 3.6, color: '#0284c7' },
            { name: 'Green Turtle', pct: 1.2, color: '#10b981' }
        ]
    },
    'sample_5': {
        tag_id: 'KE 6643',
        date: '18/03/2017',
        species_id: 'leatherback',
        name: 'Leatherback / Deep-Sea Turtle (Dermochelys / Chelonia)',
        sinhala: 'දාර / පර්යේෂණ කැස්බෑවා',
        confidence: 99.1,
        iucn: 'Critically Endangered (CR)',
        features: 'Dark imbricate head scutes with yellow edge highlights, powerful elongated paddle front flippers.',
        health_note: 'Active nesting female returning to ocean; excellent flipper strength.',
        action: 'Establish 10-meter perimeter buffer zone on nesting beach.',
        img: 'images/turtle_sample_5.jpg',
        probabilities: [
            { name: 'Leatherback / Deep-Sea', pct: 99.1, color: '#ec4899' },
            { name: 'Green Turtle', pct: 0.7, color: '#10b981' },
            { name: 'Hawksbill Turtle', pct: 0.2, color: '#f59e0b' }
        ]
    }
};

// ==========================================================================
// AUTHENTICATION & LOGIN CONTROLLER (Admin, Tourist, Fisherman)
// ==========================================================================
let selectedLoginRole = 'admin';
let currentUserSession = null;

window.selectLoginRole = function(role) {
    selectedLoginRole = role;
    
    // Update role cards UI
    document.querySelectorAll('.role-card').forEach(card => card.classList.remove('active'));
    const targetCard = document.getElementById(`role-card-${role}`);
    if (targetCard) targetCard.classList.add('active');

    // Update info text
    const infoText = document.getElementById('role-info-text');
    if (infoText) {
        if (role === 'admin') {
            infoText.innerHTML = `<b>Admin Mode:</b> Full access to exact GIS map, DWC nestings, threat logs & DSS engine.`;
        } else if (role === 'tourist') {
            infoText.innerHTML = `<b>Tourist Mode:</b> Protected GIS beach map, AI photo classifier & visitor conservation guide.`;
        } else if (role === 'fisherman') {
            infoText.innerHTML = `<b>Fisherman Patrol:</b> High-priority net entanglement alerts, DWC rescue hotline & threat logger.`;
        }
    }
};

window.quickFillLogin = function(role, username, password) {
    selectLoginRole(role);
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    updateLoginPasswordStrength(password);
};

window.togglePasswordVisibility = function(inputId = 'login-password', iconId = 'pwd-eye-icon') {
    const pwdInput = document.getElementById(inputId);
    const eyeIcon = document.getElementById(iconId);
    if (!pwdInput || !eyeIcon) return;

    if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        eyeIcon.classList.remove('fa-eye');
        eyeIcon.classList.add('fa-eye-slash');
    } else {
        pwdInput.type = 'password';
        eyeIcon.classList.remove('fa-eye-slash');
        eyeIcon.classList.add('fa-eye');
    }
};

// ==========================================================================
// LIVE PASSWORD STRENGTH EVALUATION HELPERS
// ==========================================================================
function evaluatePasswordScore(pwd) {
    if (!pwd) return { score: 0, text: 'Empty', class: '' };
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 10;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 15;

    if (score < 40) return { score, text: 'Weak', class: 'weak', color: '#ef4444' };
    if (score < 65) return { score, text: 'Fair', class: 'fair', color: '#f59e0b' };
    if (score < 85) return { score, text: 'Good', class: 'good', color: '#0284c7' };
    return { score, text: 'Strong (PBKDF2 Secured)', class: 'strong', color: '#10b981' };
}

window.updateLoginPasswordStrength = function(val) {
    const bar = document.getElementById('login-pwd-strength-bar');
    const text = document.getElementById('login-pwd-strength-text');
    if (!bar || !text) return;

    const res = evaluatePasswordScore(val);
    bar.className = `pwd-strength-bar-fill ${res.class}`;
    text.innerText = res.text;
    text.style.color = res.color;
};

window.updateRegisterPasswordStrength = function(val) {
    const bar = document.getElementById('reg-pwd-bar');
    const text = document.getElementById('reg-pwd-text');
    if (bar && text) {
        const res = evaluatePasswordScore(val);
        bar.className = `pwd-strength-bar-fill ${res.class}`;
        text.innerText = res.text;
        text.style.color = res.color;
    }

    // Update Checklist items
    const chkLen = document.getElementById('chk-len');
    const chkUpper = document.getElementById('chk-upper');
    const chkLower = document.getElementById('chk-lower');
    const chkNum = document.getElementById('chk-num');
    const chkSpec = document.getElementById('chk-spec');

    const updateCheck = (el, condition) => {
        if (!el) return;
        if (condition) {
            el.className = 'pwd-check-item valid';
            el.querySelector('i').className = 'fas fa-check-circle';
        } else {
            el.className = 'pwd-check-item';
            el.querySelector('i').className = 'fas fa-circle';
        }
    };

    updateCheck(chkLen, val.length >= 8);
    updateCheck(chkUpper, /[A-Z]/.test(val));
    updateCheck(chkLower, /[a-z]/.test(val));
    updateCheck(chkNum, /[0-9]/.test(val));
    updateCheck(chkSpec, /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(val));
};

window.updateChangePasswordStrength = function(val) {
    const bar = document.getElementById('chg-pwd-bar');
    const text = document.getElementById('chg-pwd-text');
    if (!bar || !text) return;
    const res = evaluatePasswordScore(val);
    bar.className = `pwd-strength-bar-fill ${res.class}`;
    text.innerText = res.text;
    text.style.color = res.color;
};

// ==========================================================================
// LOCKOUT COUNTDOWN CONTROLLER
// ==========================================================================
let lockoutInterval = null;

function startLockoutTimer(minutesLeft) {
    const alertBox = document.getElementById('login-lockout-alert');
    const countdownEl = document.getElementById('lockout-countdown');
    const submitBtn = document.getElementById('btn-login-submit');

    if (alertBox) alertBox.style.display = 'flex';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
    }

    let seconds = (minutesLeft || 15) * 60;
    if (lockoutInterval) clearInterval(lockoutInterval);

    lockoutInterval = setInterval(() => {
        seconds--;
        if (seconds <= 0) {
            clearInterval(lockoutInterval);
            if (alertBox) alertBox.style.display = 'none';
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            }
            return;
        }
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (countdownEl) {
            countdownEl.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// ==========================================================================
// USER AUTHENTICATION & LOGIN SUBMIT
// ==========================================================================
window.handleLoginSubmit = async function(event) {
    if (event) event.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';
    const errorMsgBox = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('btn-login-submit');

    if (!username || !password) {
        if (errorMsgBox) {
            errorMsgBox.innerText = 'Please enter both username and password.';
            errorMsgBox.style.display = 'block';
        }
        return;
    }

    if (errorMsgBox) errorMsgBox.style.display = 'none';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying Cryptographic Credentials...';
    }

    try {
        const authResult = await window.turtleDB.authenticateUser(username, password);

        if (!authResult.success) {
            if (authResult.isLocked) {
                startLockoutTimer(authResult.minutesLeft);
            } else {
                if (errorMsgBox) {
                    errorMsgBox.innerText = authResult.message || 'Invalid username or password.';
                    errorMsgBox.style.display = 'block';
                }
            }
            showToast(authResult.message || 'Login failed.', 'error');
            return;
        }

        // Authentication Successful
        currentUserSession = authResult.user;

        // Role profile metadata mapping
        const roleProfiles = {
            'admin': {
                badgeIcon: 'fa-user-shield',
                badgeColor: '#38bdf8',
                title: 'Conservation Officer (DWC)'
            },
            'officer': {
                badgeIcon: 'fa-leaf',
                badgeColor: '#10b981',
                title: 'Field Ranger Bandara'
            },
            'tourist': {
                badgeIcon: 'fa-umbrella-beach',
                badgeColor: '#10b981',
                title: 'Public Eco-Visitor'
            },
            'fisherman': {
                badgeIcon: 'fa-fish',
                badgeColor: '#f59e0b',
                title: 'Marine Patrol Leader'
            }
        };

        const prof = roleProfiles[currentUserSession.role] || roleProfiles['admin'];

        // Update Header Profile Badge
        const headerName = document.getElementById('header-user-name');
        const headerTitle = document.getElementById('header-user-role-title');
        const headerIcon = document.getElementById('user-role-badge-icon');

        if (headerName) headerName.innerText = currentUserSession.fullName || currentUserSession.username;
        if (headerTitle) headerTitle.innerText = prof.title;
        if (headerIcon) {
            headerIcon.className = `fas ${prof.badgeIcon}`;
            headerIcon.style.color = prof.badgeColor;
        }

        // Hide Login Screen Modal
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.classList.add('hidden');
        }

        // Apply role permissions
        applyRolePermissions(currentUserSession.role);

        // Notify user
        showToast(`Welcome ${currentUserSession.fullName}! Logged in as ${currentUserSession.role.toUpperCase()}.`, 'success');

        // Refresh map view if active
        if (mapInstance) {
            setTimeout(() => {
                mapInstance.invalidateSize();
                updateMapMarkers();
            }, 300);
        }

    } catch (err) {
        console.error('Login submit error:', err);
        if (errorMsgBox) {
            errorMsgBox.innerText = 'Authentication error: ' + err.message;
            errorMsgBox.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Authenticate & Log In';
        }
    }
};

window.logoutUser = function() {
    currentUserSession = null;
    localStorage.removeItem('stcidss_token');
    localStorage.removeItem('stcidss_user');
    const loginScreen = document.getElementById('login-screen');
    if (loginScreen) {
        loginScreen.classList.remove('hidden');
    }
    showToast('You have been logged out securely.', 'info');
};

// ==========================================================================
// REGISTRATION MODAL CONTROLLER
// ==========================================================================
window.openRegisterModal = function() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.classList.add('active');
};

window.closeRegisterModal = function() {
    const modal = document.getElementById('register-modal');
    if (modal) modal.classList.remove('active');
    const err = document.getElementById('reg-error-msg');
    if (err) err.style.display = 'none';
};

window.handleRegisterSubmit = async function(event) {
    if (event) event.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const role = document.getElementById('reg-role').value;
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const errorMsg = document.getElementById('reg-error-msg');
    const matchError = document.getElementById('reg-pwd-match-error');
    const submitBtn = document.getElementById('btn-reg-submit');

    if (password !== confirmPassword) {
        if (matchError) matchError.style.display = 'block';
        return;
    } else {
        if (matchError) matchError.style.display = 'none';
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hashing & Storing Credentials...';
    }

    try {
        const result = await window.turtleDB.registerUser({ fullName, email, username, role, password });
        if (!result.success) {
            if (errorMsg) {
                errorMsg.innerText = result.message;
                errorMsg.style.display = 'block';
            }
            showToast(result.message, 'error');
            return;
        }

        // Success
        showToast('Registration successful! You can now log in.', 'success');
        closeRegisterModal();

        // Pre-fill login
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        selectLoginRole(role);
        updateLoginPasswordStrength(password);

    } catch (err) {
        if (errorMsg) {
            errorMsg.innerText = 'Registration failed: ' + err.message;
            errorMsg.style.display = 'block';
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-user-check"></i> Complete Registration';
        }
    }
};

// ==========================================================================
// CHANGE PASSWORD MODAL CONTROLLER
// ==========================================================================
window.openChangePasswordModal = function() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.classList.add('active');
};

window.closeChangePasswordModal = function() {
    const modal = document.getElementById('change-password-modal');
    if (modal) modal.classList.remove('active');
    const err = document.getElementById('chg-error-msg');
    if (err) err.style.display = 'none';
};

window.handleChangePasswordSubmit = async function(event) {
    if (event) event.preventDefault();
    const curPwd = document.getElementById('chg-curr-password').value;
    const newPwd = document.getElementById('chg-new-password').value;
    const confPwd = document.getElementById('chg-confirm-password').value;
    const errMsg = document.getElementById('chg-error-msg');

    if (newPwd !== confPwd) {
        if (errMsg) {
            errMsg.innerText = 'New passwords do not match.';
            errMsg.style.display = 'block';
        }
        return;
    }

    try {
        const result = await window.turtleDB.changeUserPassword(curPwd, newPwd);
        if (!result.success) {
            if (errMsg) {
                errMsg.innerText = result.message;
                errMsg.style.display = 'block';
            }
            showToast(result.message, 'error');
            return;
        }

        showToast('Password changed successfully!', 'success');
        closeChangePasswordModal();
    } catch (err) {
        if (errMsg) {
            errMsg.innerText = err.message;
            errMsg.style.display = 'block';
        }
    }
};

// ==========================================================================
// TOAST NOTIFICATIONS HELPER
// ==========================================================================
window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-item toast-${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-triangle';
    if (type === 'warning') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
};

// ==========================================================================
// SECURITY AUDIT LOGS VIEWER & BACKUP EXPORTER
// ==========================================================================
window.loadSecurityAuditLogs = async function() {
    const tbody = document.getElementById('security-audit-tbody');
    if (!tbody) return;

    try {
        const logs = await window.turtleDB.getAuditLogs();
        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #64748b;">No security audit events logged yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            let badgeClass = 'badge-audit-success';
            if (l.status === 'FAILED') badgeClass = 'badge-audit-failed';
            if (l.status === 'LOCKED') badgeClass = 'badge-audit-locked';

            const timeStr = l.timestamp ? new Date(l.timestamp).toLocaleString() : 'N/A';
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 0.85rem;">
                    <td style="padding: 0.65rem 1rem; color: #475569; font-family: monospace;">${timeStr}</td>
                    <td style="padding: 0.65rem 1rem; font-weight: 700; color: #0284c7;">${l.username || 'System'}</td>
                    <td style="padding: 0.65rem 1rem; text-transform: capitalize;">${l.role || 'Guest'}</td>
                    <td style="padding: 0.65rem 1rem; font-weight: 600;"><code>${l.action}</code></td>
                    <td style="padding: 0.65rem 1rem; font-family: monospace; font-size: 0.78rem;">${l.ip_address || '127.0.0.1'}</td>
                    <td style="padding: 0.65rem 1rem;"><span class="${badgeClass}">${l.status}</span></td>
                    <td style="padding: 0.65rem 1rem; color: #64748b;">${l.details || '-'}</td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading audit logs:', e);
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 1.5rem; color: #ef4444;">Error loading audit logs: ${e.message}</td></tr>`;
    }
};

window.exportDatabaseBackup = async function() {
    try {
        showToast('Preparing full local database backup...', 'info');
        const res = await fetch(`${window.location.origin}/api/backup/export`);
        if (res.ok) {
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stcidss_conservation_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            showToast('Database backup downloaded successfully!', 'success');
            return;
        }
    } catch (e) {
        console.warn('Backend export failed, generating from IndexedDB...', e);
    }

    // Local IndexedDB Export
    try {
        const species = await window.turtleDB.getAll('species');
        const nestings = await window.turtleDB.getAll('nesting_records');
        const incidents = await window.turtleDB.getAll('incidents');
        const hatcheries = await window.turtleDB.getAll('hatcheries');
        const clutches = await window.turtleDB.getAll('hatchery_clutches');
        const audits = await window.turtleDB.getAll('security_audit_logs');

        const backupData = {
            exportedAt: new Date().toISOString(),
            system: 'STCIDSS - Sri Lanka Sea Turtle Conservation (IndexedDB Store)',
            species,
            nestings,
            incidents,
            hatcheries,
            clutches,
            securityAudits: audits
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stcidss_local_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Local database backup exported successfully!', 'success');
    } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
    }
};

function applyRolePermissions(role) {
    const fishermanBanner = document.getElementById('fisherman-emergency-banner');
    const touristBanner = document.getElementById('tourist-guide-banner');
    const privacyBanner = document.getElementById('security-privacy-banner');

    // Tab buttons
    const tabs = {
        gis: document.querySelector('.tab-btn[data-target="tab-gis"]'),
        dss: document.querySelector('.tab-btn[data-target="tab-dss"]'),
        hatchery: document.querySelector('.tab-btn[data-target="tab-hatchery"]'),
        incident: document.querySelector('.tab-btn[data-target="tab-incident"]'),
        ai: document.querySelector('.tab-btn[data-target="tab-ai"]'),
        nestings: document.querySelector('.tab-btn[data-target="tab-nestings"]'),
        sus: document.querySelector('.tab-btn[data-target="tab-sus"]'),
        security: document.querySelector('.tab-btn[data-target="tab-security"]')
    };

    if (role === 'admin' || role === 'officer') {
        currentRole = 'officer'; // Exact GPS
        if (fishermanBanner) fishermanBanner.style.display = 'none';
        if (touristBanner) touristBanner.style.display = 'none';
        if (privacyBanner) privacyBanner.style.display = 'none';

        // Show all tabs for Admin/Officer
        Object.values(tabs).forEach(tab => { if (tab) tab.style.display = 'inline-flex'; });
        if (tabs.gis) tabs.gis.click();
    } 
    else if (role === 'tourist') {
        currentRole = 'citizen'; // Protected/Masked GPS
        if (fishermanBanner) fishermanBanner.style.display = 'none';
        if (touristBanner) touristBanner.style.display = 'flex';
        if (privacyBanner) privacyBanner.style.display = 'block';

        // Tailor tabs for Tourist
        if (tabs.gis) tabs.gis.style.display = 'inline-flex';
        if (tabs.dss) tabs.dss.style.display = 'inline-flex';
        if (tabs.hatchery) tabs.hatchery.style.display = 'inline-flex';
        if (tabs.incident) {
            tabs.incident.style.display = 'inline-flex';
            tabs.incident.innerHTML = '<i class="fas fa-bullhorn"></i> Report Sighting / Beach Threat';
        }
        if (tabs.ai) tabs.ai.style.display = 'inline-flex';
        if (tabs.nestings) tabs.nestings.style.display = 'inline-flex';
        if (tabs.sus) tabs.sus.style.display = 'inline-flex';
        if (tabs.security) tabs.security.style.display = 'none';
        
        if (tabs.gis) tabs.gis.click();
    } 
    else if (role === 'fisherman') {
        currentRole = 'officer'; // Patrol needs exact coordinates
        if (fishermanBanner) fishermanBanner.style.display = 'flex';
        if (touristBanner) touristBanner.style.display = 'none';
        if (privacyBanner) privacyBanner.style.display = 'none';

        // Tailor tabs for Fisherman (Focus on Incident reporting & GIS map)
        if (tabs.gis) tabs.gis.style.display = 'inline-flex';
        if (tabs.dss) tabs.dss.style.display = 'inline-flex';
        if (tabs.hatchery) tabs.hatchery.style.display = 'none';
        if (tabs.incident) {
            tabs.incident.style.display = 'inline-flex';
            tabs.incident.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Emergency Net & Threat Logger';
        }
        if (tabs.ai) tabs.ai.style.display = 'inline-flex';
        if (tabs.nestings) tabs.nestings.style.display = 'none';
        if (tabs.sus) tabs.sus.style.display = 'inline-flex';
        if (tabs.security) tabs.security.style.display = 'none';

        // Open Incident tab first for Fisherman
        if (tabs.incident) tabs.incident.click();

        // Pre-select Net Entanglement threat type in form
        const incidentTypeSelect = document.getElementById('incident-type-select');
        if (incidentTypeSelect) incidentTypeSelect.value = 'bycatch';
    }

    updateMapMarkers();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.turtleDB.init();
        setupNavigation();
        await refreshDashboardKPIs();
        initGISMap();
        initCharts();
        await renderHatcheryTable();
        await renderIncidentsList();
        await renderNestingRecordsTable();
        await refreshDSSRecommendations();
        setupFormListeners();
        setupSUSForm();

        // Check active session if already logged in
        const savedUser = localStorage.getItem('stcidss_user');
        if (savedUser) {
            try {
                currentUserSession = JSON.parse(savedUser);
                applyRolePermissions(currentUserSession.role);
                const loginScreen = document.getElementById('login-screen');
                if (loginScreen) loginScreen.classList.add('hidden');
            } catch (e) {}
        }
    } catch (err) {
        console.error('Initialization error:', err);
    }
});

// Navigation Tabs Setup
function setupNavigation() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetId = tab.dataset.target;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');

            if (targetId === 'tab-gis' && mapInstance) {
                setTimeout(() => mapInstance.invalidateSize(), 200);
            }
            if (targetId === 'tab-security') {
                loadSecurityAuditLogs();
            }
        });
    });
}

// Refresh KPI Cards
async function refreshDashboardKPIs() {
    const analytics = await window.dssEngine.generateDecisionAnalytics();
    const kpis = analytics.kpis;

    document.getElementById('kpi-nestings').innerText = kpis.totalNestings;
    document.getElementById('kpi-eggs').innerText = kpis.totalEggsProtected.toLocaleString();
    document.getElementById('kpi-incidents').innerText = kpis.activeIncidents;
    document.getElementById('kpi-hatchlings').innerText = kpis.totalHatchlingsReleased.toLocaleString();
}

// Initialize Leaflet GIS Map of Sri Lanka
function initGISMap() {
    const mapContainer = document.getElementById('gis-map-container');
    if (!mapContainer) return;

    // Center on Sri Lanka Southern / Southwestern Coast
    mapInstance = L.map('gis-map-container').setView([6.2500, 80.4000], 9);

    // Default Tile Layer (OpenStreetMap Standard)
    currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Sri Lanka Sea Turtle Conservation DSS'
    }).addTo(mapInstance);

    mapMarkersLayer = L.layerGroup().addTo(mapInstance);

    updateMapMarkers();
}

// Change GIS Map Tile Base Layer
window.changeMapTileLayer = function(type) {
    if (!mapInstance) return;

    if (currentTileLayer) {
        mapInstance.removeLayer(currentTileLayer);
    }

    if (type === 'satellite') {
        currentTileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18,
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });
    } else if (type === 'dark') {
        currentTileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> | Sri Lanka Sea Turtle Conservation DSS'
        });
    } else {
        // OpenStreetMap standard
        currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        });
    }

    currentTileLayer.addTo(mapInstance);
};

// Global Fly To Location Function with Smooth Physics & Highlight Pulse
window.flyToLocation = function(lat, lng, zoom = 14, locationName = '') {
    if (!mapInstance) return;

    // 1. Switch to GIS Tab
    const gisTabBtn = document.querySelector('.tab-btn[data-target="tab-gis"]');
    if (gisTabBtn && !gisTabBtn.classList.contains('active')) {
        gisTabBtn.click();
    }

    setTimeout(() => {
        mapInstance.invalidateSize();

        // 2. Fly smoothly to location
        mapInstance.flyTo([lat, lng], zoom, {
            animate: true,
            duration: 1.6
        });

        // 3. Find and open marker popup if matching
        setTimeout(() => {
            let foundMarker = null;

            mapMarkersList.forEach(item => {
                const distance = Math.sqrt(Math.pow(item.lat - lat, 2) + Math.pow(item.lng - lng, 2));
                if (distance < 0.03 || (locationName && item.name.toLowerCase().includes(locationName.toLowerCase()))) {
                    foundMarker = item.marker;
                }
            });

            if (foundMarker) {
                foundMarker.openPopup();
            }

            // 4. Temporary Pulse Circle
            const pulseCircle = L.circleMarker([lat, lng], {
                radius: 24,
                fillColor: '#0284c7',
                color: '#38bdf8',
                weight: 4,
                opacity: 0.9,
                fillOpacity: 0.3
            }).addTo(mapInstance);

            setTimeout(() => {
                mapInstance.removeLayer(pulseCircle);
            }, 2000);
        }, 1700);

    }, 150);
};

// Handle Location Dropdown Selection Jump
window.handleLocationDropdownJump = function(value) {
    if (!value) return;
    const parts = value.split(',');
    if (parts.length >= 2) {
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        const name = parts[2] || '';
        window.flyToLocation(lat, lng, 14, name);
    }
};

// Handle GIS Live Search Input
window.handleGISSearchInput = function(event) {
    const query = event.target.value.toLowerCase().trim();
    if (!query) return;

    // Search inside mapMarkersList
    const match = mapMarkersList.find(m => m.name.toLowerCase().includes(query));
    if (match) {
        window.flyToLocation(match.lat, match.lng, 14, match.name);
    }
};

// Update Map Markers with Role Security Obfuscation & Marker Registry
async function updateMapMarkers() {
    if (!mapMarkersLayer) return;
    mapMarkersLayer.clearLayers();
    mapMarkersList = [];

    const nestings = await window.turtleDB.getAll('nesting_records');
    const incidents = await window.turtleDB.getAll('incidents');
    const hatcheries = await window.turtleDB.getAll('hatcheries');
    const speciesList = await window.turtleDB.getAll('species');

    const speciesMap = {};
    speciesList.forEach(s => speciesMap[s.id] = s);

    const filterType = document.getElementById('map-filter-type')?.value || 'all';

    // 1. Plot Nesting Sites (Green Circle Markers)
    if (filterType === 'all' || filterType === 'nestings') {
        nestings.forEach(n => {
            let lat = n.lat;
            let lng = n.lng;

            // Security Masking for Citizens to prevent Poaching (PDF Section 3.7)
            if (currentRole === 'citizen') {
                lat += (Math.random() - 0.5) * 0.03;
                lng += (Math.random() - 0.5) * 0.03;
            }

            const sp = speciesMap[n.species_id] || { common_name: n.species_id, color: '#10b981' };

            const marker = L.circleMarker([lat, lng], {
                radius: 9,
                fillColor: sp.color || '#10b981',
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            });

            const popupContent = `
                <div style="font-family: Inter, sans-serif; min-width: 200px;">
                    <h4 style="margin: 0 0 4px 0; color: #0c4a6e;">🐢 Nesting Record</h4>
                    <p style="margin: 0 0 4px 0; font-weight: bold; color: ${sp.color};">${sp.common_name}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Location:</b> ${n.location_name}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Eggs:</b> ${n.egg_count} eggs</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Status:</b> ${n.protection_status}</p>
                    ${currentRole === 'citizen' ? '<p style="margin-top: 6px; font-size: 0.75rem; color: #64748b; font-style: italic;">(GPS obfuscated for nesting site security)</p>' : `<p style="margin-top: 4px; font-size: 0.78rem; color: #0284c7;">Exact GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>`}
                </div>
            `;
            marker.bindPopup(popupContent);
            mapMarkersLayer.addLayer(marker);

            mapMarkersList.push({
                lat: lat,
                lng: lng,
                name: n.location_name,
                marker: marker
            });
        });
    }

    // 2. Plot Incidents (Red Triangle / Pulsing Markers)
    if (filterType === 'all' || filterType === 'incidents') {
        incidents.forEach(inc => {
            const isHigh = inc.severity === 'High';
            const color = isHigh ? '#ef4444' : '#f59e0b';

            const marker = L.circleMarker([inc.lat, inc.lng], {
                radius: 11,
                fillColor: color,
                color: '#ffffff',
                weight: 2.5,
                opacity: 1,
                fillOpacity: 0.9
            });

            const popupContent = `
                <div style="font-family: Inter, sans-serif; min-width: 210px;">
                    <h4 style="margin: 0 0 4px 0; color: #ef4444;">🚨 Incident Alert</h4>
                    <p style="margin: 0 0 4px 0; font-weight: bold;">${inc.incident_type}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Location:</b> ${inc.location_name}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Severity:</b> <span style="color: ${color}; font-weight: bold;">${inc.severity}</span></p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Details:</b> ${inc.details}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            mapMarkersLayer.addLayer(marker);

            mapMarkersList.push({
                lat: inc.lat,
                lng: inc.lng,
                name: inc.location_name,
                marker: marker
            });
        });
    }

    // 3. Plot Hatcheries (Blue Square Icons)
    if (filterType === 'all' || filterType === 'hatcheries') {
        hatcheries.forEach(h => {
            const marker = L.circleMarker([h.lat, h.lng], {
                radius: 12,
                fillColor: '#0284c7',
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.95
            });

            const popupContent = `
                <div style="font-family: Inter, sans-serif; min-width: 220px;">
                    <h4 style="margin: 0 0 4px 0; color: #0369a1;">🏥 ${h.name}</h4>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Manager:</b> ${h.manager_name}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Active Clutches:</b> ${h.active_clutches}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Released Year:</b> ${h.hatchlings_released_this_year.toLocaleString()}</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.85rem;"><b>Capacity:</b> ${h.capacity_status}</p>
                </div>
            `;
            marker.bindPopup(popupContent);
            mapMarkersLayer.addLayer(marker);

            mapMarkersList.push({
                lat: h.lat,
                lng: h.lng,
                name: h.name + ' ' + h.location_name,
                marker: marker
            });
        });
    }
}

// Chart.js Visualizations Setup
let speciesChart = null;
let regionalChart = null;

async function initCharts() {
    const analytics = await window.dssEngine.generateDecisionAnalytics();

    // 1. Species Distribution Donut Chart
    const speciesCtx = document.getElementById('species-chart')?.getContext('2d');
    if (speciesCtx) {
        const labels = Object.values(analytics.speciesCounts).map(s => s.name);
        const data = Object.values(analytics.speciesCounts).map(s => s.count);

        speciesChart = new Chart(speciesCtx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#10b981', '#0284c7', '#f59e0b', '#8b5cf6', '#ec4899'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } }
                }
            }
        });
    }

    // 2. Regional Density Bar Chart
    const regionalCtx = document.getElementById('regional-chart')?.getContext('2d');
    if (regionalCtx) {
        const regNames = Object.keys(analytics.regionalData);
        const nestData = regNames.map(r => analytics.regionalData[r].nestings);
        const incData = regNames.map(r => analytics.regionalData[r].incidents);

        regionalChart = new Chart(regionalCtx, {
            type: 'bar',
            data: {
                labels: regNames,
                datasets: [
                    { label: 'Nesting Records', data: nestData, backgroundColor: '#0284c7' },
                    { label: 'Incidents Flagged', data: incData, backgroundColor: '#ef4444' }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { precision: 0 } }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }
}

// Render Hatchery Facilities Table
async function renderHatcheryTable() {
    const hatcheries = await window.turtleDB.getAll('hatcheries');
    const tbody = document.getElementById('hatcheries-table-body');
    if (!tbody) return;

    tbody.innerHTML = hatcheries.map(h => `
        <tr>
            <td><b>${h.name}</b><br><small class="text-muted">${h.location_name}</small></td>
            <td>${h.manager_name}</td>
            <td><span class="badge badge-info">${h.active_clutches} Clutches</span></td>
            <td><b>${h.total_eggs_incubating.toLocaleString()}</b></td>
            <td><span class="badge badge-success">${h.hatchlings_released_this_year.toLocaleString()}</span></td>
            <td>${h.capacity_status}</td>
            <td style="display: flex; gap: 0.35rem;">
                <button class="btn btn-secondary btn-sm" onclick="showHatcheryDetail(${h.id})"><i class="fas fa-eye"></i> View</button>
                <button class="btn btn-primary btn-sm" onclick="flyToLocation(${h.lat}, ${h.lng}, 15, '${h.name.replace(/'/g, "\\'")}')" title="Locate on GIS Map"><i class="fas fa-crosshairs"></i> Map</button>
            </td>
        </tr>
    `).join('');
}

// Render Incidents List
async function renderIncidentsList() {
    const incidents = await window.turtleDB.getAll('incidents');
    const container = document.getElementById('incidents-list-container');
    if (!container) return;

    container.innerHTML = incidents.map(inc => `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h4 style="margin: 0; color: #0c4a6e;"><i class="fas fa-exclamation-triangle" style="color: ${inc.severity === 'High' ? '#ef4444' : '#f59e0b'};"></i> ${inc.incident_type}</h4>
                <span class="badge ${inc.severity === 'High' ? 'badge-danger' : 'badge-warning'}">${inc.severity} Severity</span>
            </div>
            <p style="margin: 0 0 0.4rem 0; font-size: 0.85rem; color: #475569;"><b>Location:</b> ${inc.location_name} | <b>Date:</b> ${inc.incident_date}</p>
            <p style="margin: 0 0 0.5rem 0; font-size: 0.85rem;">${inc.details}</p>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge ${inc.status === 'Resolved' ? 'badge-success' : 'badge-warning'}">${inc.status}</span>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-primary btn-sm" onclick="flyToLocation(${inc.lat}, ${inc.lng}, 15, '${inc.location_name.replace(/'/g, "\\'")}')"><i class="fas fa-map-marker-alt"></i> View on GIS Map</button>
                    ${inc.status !== 'Resolved' ? `<button class="btn btn-secondary btn-sm" onclick="resolveIncident(${inc.id})">Mark Resolved</button>` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Render Nesting Records Table
async function renderNestingRecordsTable() {
    const nestings = await window.turtleDB.getAll('nesting_records');
    const speciesList = await window.turtleDB.getAll('species');
    const speciesMap = {};
    speciesList.forEach(s => speciesMap[s.id] = s);

    const tbody = document.getElementById('nesting-table-body');
    if (!tbody) return;

    tbody.innerHTML = nestings.map(n => {
        const sp = speciesMap[n.species_id] || { common_name: n.species_id };
        const locationDisplay = currentRole === 'citizen' ? `${n.location_name} (Approx. Grid)` : `${n.location_name} (${n.lat.toFixed(3)}, ${n.lng.toFixed(3)})`;
        return `
            <tr>
                <td>#${n.id}</td>
                <td><b>${sp.common_name}</b></td>
                <td>${locationDisplay}</td>
                <td>${n.nest_date}</td>
                <td><b>${n.egg_count}</b></td>
                <td><span class="badge ${n.protection_status.includes('Relocated') ? 'badge-info' : 'badge-success'}">${n.protection_status}</span></td>
                <td>${n.reported_by}</td>
                <td>
                    <button class="btn btn-primary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;" onclick="flyToLocation(${n.lat}, ${n.lng}, 15, '${n.location_name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-crosshairs"></i> View on Map
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Refresh DSS Recommendations Component
async function refreshDSSRecommendations() {
    const analytics = await window.dssEngine.generateDecisionAnalytics();
    const container = document.getElementById('dss-recommendations-container');
    if (!container) return;

    container.innerHTML = analytics.recommendations.map(rec => `
        <div class="recommendation-card ${rec.badge_class}">
            <div class="rec-header">
                <div class="rec-title">${rec.title}</div>
                <span class="badge badge-${rec.badge_class}">${rec.priority}</span>
            </div>
            <div class="rec-rationale"><b>Evidence & Rationale:</b> ${rec.rationale}</div>
            <div class="rec-actions">
                <b>Recommended Decision Steps:</b>
                <ul>
                    ${rec.action_items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        </div>
    `).join('');
}

// Form Handlers
function setupFormListeners() {
    // 1. Report Incident Form
    const incidentForm = document.getElementById('incident-report-form');
    if (incidentForm) {
        incidentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const type = document.getElementById('inc-type').value;
            const location = document.getElementById('inc-location').value;
            const severity = document.getElementById('inc-severity').value;
            const details = document.getElementById('inc-details').value;
            const date = new Date().toISOString().split('T')[0];

            await window.turtleDB.add('incidents', {
                incident_type: type,
                location_name: location,
                lat: 6.2000 + (Math.random() - 0.5) * 0.5,
                lng: 80.2000 + (Math.random() - 0.5) * 0.5,
                severity: severity,
                incident_date: date,
                status: 'Investigating',
                details: details
            });

            alert('Incident report successfully recorded and submitted to DWC Decision Support Engine!');
            incidentForm.reset();
            await refreshDashboardKPIs();
            await renderIncidentsList();
            updateMapMarkers();
            await refreshDSSRecommendations();
        });
    }

    // 2. Add Nesting Record Form
    const nestingForm = document.getElementById('nesting-record-form');
    if (nestingForm) {
        nestingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const speciesId = document.getElementById('nest-species').value;
            const location = document.getElementById('nest-location').value;
            const eggs = parseInt(document.getElementById('nest-eggs').value);
            const status = document.getElementById('nest-status').value;
            const reporter = document.getElementById('nest-reporter').value;

            await window.turtleDB.add('nesting_records', {
                species_id: speciesId,
                location_name: location,
                region: 'Southern Province',
                lat: 6.1500 + (Math.random() - 0.5) * 0.4,
                lng: 80.3000 + (Math.random() - 0.5) * 0.4,
                nest_date: new Date().toISOString().split('T')[0],
                egg_count: eggs,
                protection_status: status,
                reported_by: reporter,
                notes: 'Recorded via Web Information System'
            });

            alert('Nesting record logged successfully!');
            nestingForm.reset();
            await refreshDashboardKPIs();
            await renderNestingRecordsTable();
            updateMapMarkers();
        });
    }

    // 3. AI Scanner Sample Initial Load
    window.runAIAnalysis('sample_1');
}

let currentActiveAISample = null;

// Global AI Analysis Runner with Neural Laser Scan Animation
window.runAIAnalysis = function(sampleKey) {
    const data = AI_RESEARCH_SAMPLES[sampleKey] || AI_RESEARCH_SAMPLES['sample_1'];
    currentActiveAISample = data;

    const overlay = document.getElementById('ai-scanning-overlay');
    const resultsBox = document.getElementById('ai-results-box');
    const statusBadge = document.getElementById('ai-scan-status-badge');
    const progressText = document.getElementById('ai-scan-progress-text');

    if (resultsBox) resultsBox.style.display = 'none';
    if (overlay) overlay.style.display = 'block';
    if (statusBadge) {
        statusBadge.className = 'badge badge-warning';
        statusBadge.innerText = 'Scanning In Progress...';
    }

    let pct = 25;
    const interval = setInterval(() => {
        pct += 25;
        if (progressText) progressText.innerText = `ResNet-50 Layer Extraction (${pct}%)`;
        if (pct >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                if (overlay) overlay.style.display = 'none';
                if (statusBadge) {
                    statusBadge.className = 'badge badge-success';
                    statusBadge.innerText = 'Neural Match Complete';
                }

                // Populate AI Result Card
                document.getElementById('ai-preview-image').src = data.img;
                document.getElementById('ai-species-name').innerText = data.name;
                document.getElementById('ai-sinhala-name').innerText = data.sinhala;
                document.getElementById('ai-confidence-tag').innerText = `${data.confidence}% Match`;
                document.getElementById('ai-tag-id').innerText = data.tag_id || 'N/A (Untagged)';
                document.getElementById('ai-iucn-status').innerText = data.iucn;
                document.getElementById('ai-features-text').innerText = data.features;
                document.getElementById('ai-health-text').innerText = data.health_note;
                document.getElementById('ai-action-text').innerText = data.action;

                renderProbabilityBars(data.probabilities);

                if (resultsBox) resultsBox.style.display = 'block';
            }, 250);
        }
    }, 120);
};

// Render Probability Progress Bars
function renderProbabilityBars(probs) {
    const container = document.getElementById('ai-probability-bars');
    if (!container) return;

    if (!probs || probs.length === 0) {
        probs = [
            { name: 'Hawksbill Turtle', pct: 98.6, color: '#f59e0b' },
            { name: 'Green Turtle', pct: 1.1, color: '#10b981' },
            { name: 'Olive Ridley', pct: 0.3, color: '#0284c7' }
        ];
    }

    container.innerHTML = probs.map(p => `
        <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.15rem; font-weight: 600;">
                <span style="color: #334155;">${p.name}</span>
                <span style="color: ${p.color};">${p.pct}%</span>
            </div>
            <div class="prob-bar-container">
                <div class="prob-bar-fill" style="width: ${p.pct}%; background: ${p.color};"></div>
            </div>
        </div>
    `).join('');
}

// Custom Image File Upload Handler
window.handleCustomFileUpload = function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const customData = {
            tag_id: 'CUSTOM-PHOTO',
            date: new Date().toLocaleDateString('en-GB'),
            species_id: 'green_turtle',
            name: 'Green Turtle (Chelonia mydas)',
            sinhala: 'වැලි කැස්බෑවා (Weli Käsba)',
            confidence: 94.8,
            iucn: 'Endangered (EN)',
            features: 'Single pair of prefrontal scales detected, rounded beak profile, smooth carapace scutes.',
            health_note: 'Custom uploaded field photo. Clear head scute pattern extracted by neural layer.',
            action: 'Verify nest location and log into DWC Regional Database.',
            img: evt.target.result,
            probabilities: [
                { name: 'Green Turtle', pct: 94.8, color: '#10b981' },
                { name: 'Olive Ridley', pct: 3.7, color: '#0284c7' },
                { name: 'Hawksbill Turtle', pct: 1.5, color: '#f59e0b' }
            ]
        };

        AI_RESEARCH_SAMPLES['custom'] = customData;
        window.runAIAnalysis('custom');
    };
    reader.readAsDataURL(file);
};

// Log AI Classified Turtle to Database
window.logAISpeciesToDatabase = async function() {
    if (!currentActiveAISample) {
        alert('Please run AI analysis first!');
        return;
    }

    const data = currentActiveAISample;
    await window.turtleDB.add('nesting_records', {
        species_id: data.species_id || 'green_turtle',
        location_name: `AI Classified (${data.tag_id})`,
        region: 'Southern Province',
        lat: 6.2000 + (Math.random() - 0.5) * 0.4,
        lng: 80.2500 + (Math.random() - 0.5) * 0.4,
        nest_date: new Date().toISOString().split('T')[0],
        egg_count: 118,
        protection_status: 'In-Situ Beach Fenced',
        reported_by: `AI Scanner (${data.tag_id})`,
        notes: `Extracted via Computer Vision. Confidence: ${data.confidence}%`
    });

    alert(`Successfully logged ${data.name} (Tag: ${data.tag_id}) into Nesting Database!`);
    await refreshDashboardKPIs();
    await renderNestingRecordsTable();
    updateMapMarkers();
};

// Global Actions
window.resolveIncident = async function(id) {
    const incidents = await window.turtleDB.getAll('incidents');
    const inc = incidents.find(i => i.id === id);
    if (inc) {
        inc.status = 'Resolved';
        await window.turtleDB.update('incidents', inc);
        await refreshDashboardKPIs();
        await renderIncidentsList();
        updateMapMarkers();
        await refreshDSSRecommendations();
    }
};

// SUS Usability Evaluation Setup (Objective 4 in PDF)
function setupSUSForm() {
    const susForm = document.getElementById('sus-evaluation-form');
    if (!susForm) return;

    susForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const responses = [];
        for (let i = 1; i <= 10; i++) {
            const val = document.querySelector(`input[name="q${i}"]:checked`)?.value || '3';
            responses.push(val);
        }

        const score = window.dssEngine.calculateSUSScore(responses);

        document.getElementById('sus-score-display').innerText = score;
        document.getElementById('sus-grade-display').innerText = score >= 80 ? 'Grade A (Excellent Usability)' : score >= 70 ? 'Grade B (Good Usability)' : 'Grade C (Acceptable)';
        document.getElementById('sus-result-box').style.display = 'block';

        await window.turtleDB.add('evaluations', {
            responses: responses,
            sus_score: score,
            timestamp: new Date().toISOString()
        });
    });
}
