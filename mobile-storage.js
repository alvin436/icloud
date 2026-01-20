// 📁 mobile-storage.js - نظام تخزين متقدم للجوال

class MobileStorage {
    constructor() {
        this.version = '2.0.0';
        this.supported = this.checkSupport();
        this.storages = {
            localStorage: null,
            sessionStorage: null,
            indexedDB: null,
            cookies: null,
            fileSystem: null
        };
        
        this.settings = {
            encryption: false,
            compression: false,
            backup: true,
            syncInterval: 60000, // دقيقة
            maxSize: 50 * 1024 * 1024 // 50MB
        };
        
        this.initialize();
    }
    
    // التحقق من دعم المتصفح
    checkSupport() {
        const supports = {
            localStorage: !!window.localStorage,
            sessionStorage: !!window.sessionStorage,
            indexedDB: !!window.indexedDB,
            cookies: navigator.cookieEnabled,
            fileSystem: !!window.showOpenFilePicker,
            serviceWorker: 'serviceWorker' in navigator,
            webSQL: !!window.openDatabase,
            cacheAPI: 'caches' in window
        };
        
        console.log('📱 Storage support:', supports);
        return supports;
    }
    
    // تهيئة النظام
    async initialize() {
        console.log(`📱 Mobile Storage v${this.version} initializing...`);
        
        // تحميل الإعدادات
        this.loadSettings();
        
        // تهيئة جميع أنظمة التخزين
        await this.initAllStorages();
        
        // بدء المزامنة التلقائية
        this.startAutoSync();
        
        // مراقبة حالة التخزين
        this.monitorStorage();
        
        // إنشاء نسخة احتياطية أولية
        if (this.settings.backup) {
            this.createBackup();
        }
        
        console.log('✅ Mobile Storage ready');
    }
    
    // تحميل الإعدادات
    loadSettings() {
        try {
            const saved = localStorage.getItem('mobile_storage_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('⚠️ Settings load error:', error);
        }
    }
    
    // تهيئة جميع أنظمة التخزين
    async initAllStorages() {
        // localStorage
        if (this.supported.localStorage) {
            this.storages.localStorage = {
                type: 'localStorage',
                available: true,
                quota: this.getLocalStorageQuota(),
                used: this.getLocalStorageUsage()
            };
        }
        
        // sessionStorage
        if (this.supported.sessionStorage) {
            this.storages.sessionStorage = {
                type: 'sessionStorage',
                available: true,
                used: this.getSessionStorageUsage()
            };
        }
        
        // indexedDB
        if (this.supported.indexedDB) {
            await this.initIndexedDB();
        }
        
        // ملفات الكوكيز
        if (this.supported.cookies) {
            this.storages.cookies = {
                type: 'cookies',
                available: true,
                count: document.cookie.split(';').filter(c => c.trim()).length
            };
        }
        
        // نظام الملفات
        if (this.supported.fileSystem) {
            this.storages.fileSystem = {
                type: 'fileSystem',
                available: true
            };
        }
        
        console.log('💾 Storages initialized:', this.storages);
    }
    
    // الحصول على مساحة localStorage المتاحة
    getLocalStorageQuota() {
        try {
            // هذه مجرد تقدير تقريبي
            return 5 * 1024 * 1024; // 5MB افتراضياً
        } catch (error) {
            return 0;
        }
    }
    
    // الحصول على استخدام localStorage
    getLocalStorageUsage() {
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                total += key.length + value.length;
            }
            return total;
        } catch (error) {
            return 0;
        }
    }
    
    // الحصول على استخدام sessionStorage
    getSessionStorageUsage() {
        try {
            let total = 0;
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                const value = sessionStorage.getItem(key);
                total += key.length + value.length;
            }
            return total;
        } catch (error) {
            return 0;
        }
    }
    
    // تهيئة IndexedDB
    async initIndexedDB() {
        return new Promise((resolve) => {
            try {
                const request = indexedDB.open('MobileStorageDB', 1);
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // إنشاء مخزن للبيانات
                    if (!db.objectStoreNames.contains('data')) {
                        const store = db.createObjectStore('data', { keyPath: 'id' });
                        store.createIndex('type', 'type', { unique: false });
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                    
                    // مخزن للنسخ الاحتياطية
                    if (!db.objectStoreNames.contains('backups')) {
                        db.createObjectStore('backups', { keyPath: 'id' });
                    }
                    
                    // مخزن للسجلات
                    if (!db.objectStoreNames.contains('logs')) {
                        db.createObjectStore('logs', { keyPath: 'id' });
                    }
                };
                
                request.onsuccess = (event) => {
                    const db = event.target.result;
                    this.storages.indexedDB = {
                        type: 'indexedDB',
                        available: true,
                        database: db,
                        version: db.version
                    };
                    
                    console.log('🗃️ IndexedDB initialized');
                    resolve(db);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ IndexedDB init error:', event.target.error);
                    this.storages.indexedDB = {
                        type: 'indexedDB',
                        available: false,
                        error: event.target.error
                    };
                    resolve(null);
                };
                
            } catch (error) {
                console.warn('⚠️ IndexedDB error:', error);
                this.storages.indexedDB = {
                    type: 'indexedDB',
                    available: false,
                    error: error
                };
                resolve(null);
            }
        });
    }
    
    // حفظ البيانات
    async save(key, data, options = {}) {
        const {
            storageType = 'auto', // auto, localStorage, sessionStorage, indexedDB, all
            ttl = null, // وقت الانتهاء بالمللي ثانية
            encrypt = this.settings.encryption,
            compress = this.settings.compression,
            priority = 'medium' // low, medium, high
        } = options;
        
        const saveData = {
            id: key,
            data: data,
            timestamp: Date.now(),
            ttl: ttl,
            priority: priority,
            metadata: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                device: this.getDeviceInfo()
            }
        };
        
        // التشفير إذا كان مفعلاً
        if (encrypt) {
            saveData.data = this.encryptData(data);
            saveData.encrypted = true;
        }
        
        // الضغط إذا كان مفعلاً
        if (compress) {
            saveData.data = this.compressData(saveData.data);
            saveData.compressed = true;
        }
        
        // حفظ في أنظمة التخزين المحددة
        const results = {};
        
        if (storageType === 'auto' || storageType === 'all' || storageType === 'localStorage') {
            results.localStorage = await this.saveToLocalStorage(key, saveData);
        }
        
        if (storageType === 'auto' || storageType === 'all' || storageType === 'sessionStorage') {
            results.sessionStorage = await this.saveToSessionStorage(key, saveData);
        }
        
        if (storageType === 'auto' || storageType === 'all' || storageType === 'indexedDB') {
            results.indexedDB = await this.saveToIndexedDB(key, saveData);
        }
        
        // تسجيل عملية الحفظ
        await this.logStorageOperation('save', {
            key: key,
            storageType: storageType,
            size: JSON.stringify(saveData).length,
            results: results
        });
        
        return {
            success: Object.values(results).some(r => r),
            results: results,
            data: saveData
        };
    }
    
    // حفظ في localStorage
    async saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            
            // تحديث استخدام التخزين
            this.storages.localStorage.used = this.getLocalStorageUsage();
            
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage save error:', error);
            
            // محاولة تنظيف إذا كان ممتلئاً
            if (error.name === 'QuotaExceededError') {
                await this.cleanupLocalStorage();
                return this.saveToLocalStorage(key, data);
            }
            
            return false;
        }
    }
    
    // حفظ في sessionStorage
    async saveToSessionStorage(key, data) {
        try {
            sessionStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('⚠️ sessionStorage save error:', error);
            return false;
        }
    }
    
    // حفظ في IndexedDB
    async saveToIndexedDB(key, data) {
        if (!this.storages.indexedDB?.available) {
            return false;
        }
        
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['data'], 'readwrite');
                const store = transaction.objectStore('data');
                
                const request = store.put({
                    id: key,
                    ...data
                });
                
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ IndexedDB save error:', event.target.error);
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ IndexedDB error:', error);
                resolve(false);
            }
        });
    }
    
    // استرجاع البيانات
    async get(key, options = {}) {
        const {
            storageType = 'auto', // auto, localStorage, sessionStorage, indexedDB
            decrypt = this.settings.encryption,
            decompress = this.settings.compression
        } = options;
        
        let data = null;
        let source = null;
        
        // المحاولة حسب الأولوية
        const sources = storageType === 'auto' ? 
            ['localStorage', 'sessionStorage', 'indexedDB'] : [storageType];
        
        for (const sourceType of sources) {
            if (sourceType === 'localStorage' && this.storages.localStorage?.available) {
                data = await this.getFromLocalStorage(key);
                if (data) {
                    source = 'localStorage';
                    break;
                }
            }
            
            if (sourceType === 'sessionStorage' && this.storages.sessionStorage?.available) {
                data = await this.getFromSessionStorage(key);
                if (data) {
                    source = 'sessionStorage';
                    break;
                }
            }
            
            if (sourceType === 'indexedDB' && this.storages.indexedDB?.available) {
                data = await this.getFromIndexedDB(key);
                if (data) {
                    source = 'indexedDB';
                    break;
                }
            }
        }
        
        // التحقق من انتهاء الصلاحية
        if (data && data.ttl) {
            const now = Date.now();
            if (now - data.timestamp > data.ttl) {
                // حذف البيانات المنتهية
                await this.delete(key);
                data = null;
                source = null;
            }
        }
        
        // فك التشفير إذا كان مشفراً
        if (data && data.encrypted && decrypt) {
            data.data = this.decryptData(data.data);
        }
        
        // فك الضغط إذا كان مضغوطاً
        if (data && data.compressed && decompress) {
            data.data = this.decompressData(data.data);
        }
        
        return {
            data: data?.data || null,
            source: source,
            metadata: data ? {
                timestamp: data.timestamp,
                ttl: data.ttl,
                priority: data.priority
            } : null
        };
    }
    
    // استرجاع من localStorage
    async getFromLocalStorage(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn('⚠️ localStorage get error:', error);
            return null;
        }
    }
    
    // استرجاع من sessionStorage
    async getFromSessionStorage(key) {
        try {
            const item = sessionStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.warn('⚠️ sessionStorage get error:', error);
            return null;
        }
    }
    
    // استرجاع من IndexedDB
    async getFromIndexedDB(key) {
        if (!this.storages.indexedDB?.available) {
            return null;
        }
        
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');
                
                const request = store.get(key);
                
                request.onsuccess = (event) => {
                    resolve(event.target.result || null);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ IndexedDB get error:', event.target.error);
                    resolve(null);
                };
                
            } catch (error) {
                console.warn('⚠️ IndexedDB error:', error);
                resolve(null);
            }
        });
    }
    
    // حذف البيانات
    async delete(key, storageType = 'all') {
        const results = {};
        
        if (storageType === 'all' || storageType === 'localStorage') {
            results.localStorage = await this.deleteFromLocalStorage(key);
        }
        
        if (storageType === 'all' || storageType === 'sessionStorage') {
            results.sessionStorage = await this.deleteFromSessionStorage(key);
        }
        
        if (storageType === 'all' || storageType === 'indexedDB') {
            results.indexedDB = await this.deleteFromIndexedDB(key);
        }
        
        // تسجيل عملية الحذف
        await this.logStorageOperation('delete', {
            key: key,
            storageType: storageType,
            results: results
        });
        
        return {
            success: Object.values(results).some(r => r),
            results: results
        };
    }
    
    // حذف من localStorage
    async deleteFromLocalStorage(key) {
        try {
            localStorage.removeItem(key);
            this.storages.localStorage.used = this.getLocalStorageUsage();
            return true;
        } catch (error) {
            console.warn('⚠️ localStorage delete error:', error);
            return false;
        }
    }
    
    // حذف من sessionStorage
    async deleteFromSessionStorage(key) {
        try {
            sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('⚠️ sessionStorage delete error:', error);
            return false;
        }
    }
    
    // حذف من IndexedDB
    async deleteFromIndexedDB(key) {
        if (!this.storages.indexedDB?.available) {
            return false;
        }
        
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['data'], 'readwrite');
                const store = transaction.objectStore('data');
                
                const request = store.delete(key);
                
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ IndexedDB delete error:', event.target.error);
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ IndexedDB error:', error);
                resolve(false);
            }
        });
    }
    
    // تنظيف localStorage
    async cleanupLocalStorage() {
        try {
            const keysToDelete = [];
            const now = Date.now();
            
            // جمع البيانات المنتهية أو ذات الأولوية المنخفضة
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('mobile_storage_')) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        try {
                            const data = JSON.parse(item);
                            
                            // التحقق من انتهاء الصلاحية
                            if (data.ttl && (now - data.timestamp > data.ttl)) {
                                keysToDelete.push(key);
                            }
                            // الأولوية المنخفضة
                            else if (data.priority === 'low') {
                                keysToDelete.push(key);
                            }
                        } catch (e) {
                            keysToDelete.push(key);
                        }
                    }
                }
            }
            
            // حذف المفاتيح المحددة
            keysToDelete.forEach(key => {
                localStorage.removeItem(key);
            });
            
            console.log(`🧹 Cleaned ${keysToDelete.length} items from localStorage`);
            
            // تحديث الاستخدام
            this.storages.localStorage.used = this.getLocalStorageUsage();
            
            return keysToDelete.length;
            
        } catch (error) {
            console.warn('⚠️ Cleanup error:', error);
            return 0;
        }
    }
    
    // تشفير البيانات
    encryptData(data) {
        try {
            // هذا مثال بسيط للتشفير، يمكن استخدام مكتبة أفضل
            const str = JSON.stringify(data);
            return btoa(encodeURIComponent(str).split('').map(char => 
                String.fromCharCode(char.charCodeAt(0) ^ 0x5A)
            ).join(''));
        } catch (error) {
            console.warn('⚠️ Encryption error:', error);
            return data;
        }
    }
    
    // فك تشفير البيانات
    decryptData(encrypted) {
        try {
            const decrypted = decodeURIComponent(atob(encrypted).split('').map(char =>
                String.fromCharCode(char.charCodeAt(0) ^ 0x5A)
            ).join(''));
            return JSON.parse(decrypted);
        } catch (error) {
            console.warn('⚠️ Decryption error:', error);
            return encrypted;
        }
    }
    
    // ضغط البيانات
    compressData(data) {
        try {
            // هذا مثال بسيط للضغط
            const str = JSON.stringify(data);
            return btoa(str); // Base64 encoding as simple compression
        } catch (error) {
            console.warn('⚠️ Compression error:', error);
            return data;
        }
    }
    
    // فك ضغط البيانات
    decompressData(compressed) {
        try {
            const str = atob(compressed);
            return JSON.parse(str);
        } catch (error) {
            console.warn('⚠️ Decompression error:', error);
            return compressed;
        }
    }
    
    // بدء المزامنة التلقائية
    startAutoSync() {
        setInterval(async () => {
            await this.syncStorages();
        }, this.settings.syncInterval);
    }
    
    // مزامنة أنظمة التخزين
    async syncStorages() {
        console.log('🔄 Syncing storages...');
        
        try {
            // مزامنة البيانات بين localStorage و indexedDB
            await this.syncLocalStorageToIndexedDB();
            
            // إنشاء نسخة احتياطية
            if (this.settings.backup) {
                await this.createBackup();
            }
            
            // تنظيف البيانات القديمة
            await this.cleanupOldData();
            
            console.log('✅ Sync completed');
            
        } catch (error) {
            console.warn('⚠️ Sync error:', error);
        }
    }
    
    // مزامنة localStorage إلى IndexedDB
    async syncLocalStorageToIndexedDB() {
        if (!this.storages.indexedDB?.available) return;
        
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                keys.push(localStorage.key(i));
            }
            
            let syncedCount = 0;
            
            for (const key of keys) {
                try {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const data = JSON.parse(item);
                        
                        // حفظ في IndexedDB
                        await this.saveToIndexedDB(key, data);
                        syncedCount++;
                    }
                } catch (e) {
                    console.warn(`⚠️ Sync error for key ${key}:`, e);
                }
            }
            
            if (syncedCount > 0) {
                console.log(`🔄 Synced ${syncedCount} items to IndexedDB`);
            }
            
        } catch (error) {
            console.warn('⚠️ Storage sync error:', error);
        }
    }
    
    // إنشاء نسخة احتياطية
    async createBackup() {
        try {
            const backupData = {
                id: `backup_${Date.now()}`,
                timestamp: new Date().toISOString(),
                data: {},
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    storages: this.storages
                }
            };
            
            // نسخ بيانات localStorage
            if (this.storages.localStorage?.available) {
                backupData.data.localStorage = {};
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    backupData.data.localStorage[key] = localStorage.getItem(key);
                }
            }
            
            // حفظ النسخة الاحتياطية
            if (this.storages.indexedDB?.available) {
                await this.saveBackupToIndexedDB(backupData);
            }
            
            // الاحتفاظ بـ 10 نسخ فقط
            await this.cleanupOldBackups();
            
            console.log('💾 Backup created:', backupData.id);
            
            return backupData.id;
            
        } catch (error) {
            console.warn('⚠️ Backup error:', error);
            return null;
        }
    }
    
    // حفظ النسخة الاحتياطية في IndexedDB
    async saveBackupToIndexedDB(backupData) {
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                const request = store.put(backupData);
                
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ Backup save error:', event.target.error);
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ Backup error:', error);
                resolve(false);
            }
        });
    }
    
    // تنظيف النسخ الاحتياطية القديمة
    async cleanupOldBackups() {
        if (!this.storages.indexedDB?.available) return;
        
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                const index = store.index('id');
                
                const request = index.getAll();
                
                request.onsuccess = async (event) => {
                    const backups = event.target.result || [];
                    
                    // ترتيب حسب الوقت
                    backups.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    
                    // الاحتفاظ بـ 10 نسخ فقط
                    if (backups.length > 10) {
                        const toDelete = backups.slice(0, backups.length - 10);
                        
                        for (const backup of toDelete) {
                            store.delete(backup.id);
                        }
                        
                        console.log(`🗑️ Cleaned ${toDelete.length} old backups`);
                    }
                    
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ Backup cleanup error:', event.target.error);
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ Backup cleanup error:', error);
                resolve(false);
            }
        });
    }
    
    // تنظيف البيانات القديمة
    async cleanupOldData() {
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 يوم
        
        try {
            // تنظيف localStorage
            let cleanedLocal = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const item = localStorage.getItem(key);
                
                if (item) {
                    try {
                        const data = JSON.parse(item);
                        if (now - data.timestamp > maxAge) {
                            localStorage.removeItem(key);
                            cleanedLocal++;
                        }
                    } catch (e) {
                        // تجاهل العناصر غير الصالحة
                    }
                }
            }
            
            if (cleanedLocal > 0) {
                console.log(`🧹 Cleaned ${cleanedLocal} old items from localStorage`);
            }
            
            // تحديث الاستخدام
            this.storages.localStorage.used = this.getLocalStorageUsage();
            
        } catch (error) {
            console.warn('⚠️ Data cleanup error:', error);
        }
    }
    
    // مراقبة حالة التخزين
    monitorStorage() {
        // مراقبة تغييرات localStorage
        window.addEventListener('storage', (event) => {
            this.logStorageEvent('storage', {
                key: event.key,
                oldValue: event.oldValue,
                newValue: event.newValue,
                url: event.url,
                storageArea: event.storageArea
            });
        });
        
        // مراقبة إشارات تخزين منخفض
        window.addEventListener('storage', (event) => {
            if (event.key === 'storage_low' && event.newValue === 'true') {
                console.warn('⚠️ Storage running low');
                this.cleanupLocalStorage();
            }
        });
    }
    
    // تسجيل عملية التخزين
    async logStorageOperation(operation, data) {
        try {
            const log = {
                id: `log_${Date.now()}`,
                operation: operation,
                timestamp: new Date().toISOString(),
                ...data,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    storageStatus: this.getStorageStatus()
                }
            };
            
            // حفظ في IndexedDB
            if (this.storages.indexedDB?.available) {
                await this.saveLogToIndexedDB(log);
            }
            
        } catch (error) {
            console.warn('⚠️ Log error:', error);
        }
    }
    
    // تسجيل حدث التخزين
    async logStorageEvent(type, data) {
        await this.logStorageOperation(type, data);
    }
    
    // حفظ السجل في IndexedDB
    async saveLogToIndexedDB(log) {
        return new Promise((resolve) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['logs'], 'readwrite');
                const store = transaction.objectStore('logs');
                
                const request = store.put(log);
                
                request.onsuccess = () => {
                    resolve(true);
                };
                
                request.onerror = (event) => {
                    console.warn('⚠️ Log save error:', event.target.error);
                    resolve(false);
                };
                
            } catch (error) {
                console.warn('⚠️ Log error:', error);
                resolve(false);
            }
        });
    }
    
    // الحصول على معلومات الجهاز
    getDeviceInfo() {
        const ua = navigator.userAgent;
        const isMobile = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        
        return {
            isMobile: isMobile,
            userAgent: ua,
            platform: navigator.platform,
            language: navigator.language,
            screen: `${screen.width}x${screen.height}`,
            cookies: navigator.cookieEnabled,
            online: navigator.onLine
        };
    }
    
    // الحصول على حالة التخزين
    getStorageStatus() {
        const status = {
            localStorage: {
                available: this.storages.localStorage?.available || false,
                used: this.storages.localStorage?.used || 0,
                quota: this.storages.localStorage?.quota || 0,
                percentage: this.storages.localStorage?.quota ? 
                    (this.storages.localStorage.used / this.storages.localStorage.quota) * 100 : 0
            },
            sessionStorage: {
                available: this.storages.sessionStorage?.available || false,
                used: this.storages.sessionStorage?.used || 0
            },
            indexedDB: {
                available: this.storages.indexedDB?.available || false
            },
            totalUsed: this.storages.localStorage?.used || 0
        };
        
        return status;
    }
    
    // الحصول على تقرير النظام
    getSystemReport() {
        return {
            version: this.version,
            supported: this.supported,
            settings: this.settings,
            storages: this.getStorageStatus(),
            device: this.getDeviceInfo(),
            timestamp: new Date().toISOString()
        };
    }
    
    // استعادة النسخة الاحتياطية
    async restoreBackup(backupId) {
        if (!this.storages.indexedDB?.available) {
            throw new Error('IndexedDB not available');
        }
        
        return new Promise((resolve, reject) => {
            try {
                const transaction = this.storages.indexedDB.database.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                
                const request = store.get(backupId);
                
                request.onsuccess = async (event) => {
                    const backup = event.target.result;
                    
                    if (!backup) {
                        reject(new Error('Backup not found'));
                        return;
                    }
                    
                    // استعادة بيانات localStorage
                    if (backup.data.localStorage) {
                        for (const [key, value] of Object.entries(backup.data.localStorage)) {
                            localStorage.setItem(key, value);
                        }
                    }
                    
                    console.log('🔄 Backup restored:', backupId);
                    resolve(backup);
                };
                
                request.onerror = (event) => {
                    reject(event.target.error);
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
}

// تصدير النظام للاستخدام العالمي
window.MobileStorage = MobileStorage;

// تهيئة النظام تلقائياً
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        if (!window.mobileStorage) {
            window.mobileStorage = new MobileStorage();
            console.log('📱 Mobile Storage loaded globally as window.mobileStorage');
        }
    });
}

export default MobileStorage;
