// 📁 kelog-system.js - نظام تسجيل متقدم يعمل على جميع الأجهزة

class KelogSystem {
    constructor() {
        this.version = '2.0.0';
        this.logs = [];
        this.maxLogs = 2000;
        this.realTimeEnabled = true;
        this.autoSaveInterval = 30000; // 30 ثانية
        this.autoCleanInterval = 3600000; // ساعة
        this.syncInterval = 60000; // دقيقة
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.dbName = 'KelogDatabase';
        this.dbVersion = 1;
        this.db = null;
        this.init();
    }
    
    async init() {
        console.log(`🚀 بدء نظام Kelog v${this.version}...`);
        
        // تهيئة قاعدة البيانات
        await this.initDatabase();
        
        // تحميل السجلات القديمة
        await this.loadLogs();
        
        // بدء الخدمات
        this.startServices();
        
        // تسجيل بدء النظام
        await this.log('بدء نظام Kelog', {
            version: this.version,
            device: this.isMobile ? 'mobile' : 'desktop',
            userAgent: navigator.userAgent.substring(0, 100),
            screen: `${screen.width}x${screen.height}`,
            storage: await this.getStorageInfo()
        });
        
        console.log(`✅ نظام Kelog جاهز - ${this.logs.length} سجل محمل`);
    }
    
    // تهيئة قاعدة البيانات
    async initDatabase() {
        return new Promise((resolve, reject) => {
            try {
                if (!window.indexedDB) {
                    console.warn('⚠️ IndexedDB غير مدعوم، استخدام localStorage بدلاً منه');
                    resolve(false);
                    return;
                }
                
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = (event) => {
                    console.error('❌ خطأ في فتح قاعدة البيانات:', event.target.error);
                    resolve(false);
                };
                
                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    console.log('✅ قاعدة بيانات Kelog جاهزة');
                    resolve(true);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // إنشاء مخزن للسجلات
                    if (!db.objectStoreNames.contains('logs')) {
                        const logsStore = db.createObjectStore('logs', { 
                            keyPath: 'id',
                            autoIncrement: true 
                        });
                        
                        // إنشاء فهارس للبحث السريع
                        logsStore.createIndex('timestamp', 'timestamp', { unique: false });
                        logsStore.createIndex('type', 'type', { unique: false });
                        logsStore.createIndex('action', 'action', { unique: false });
                        logsStore.createIndex('sessionId', 'sessionId', { unique: false });
                    }
                    
                    // إنشاء مخزن للإحصائيات
                    if (!db.objectStoreNames.contains('stats')) {
                        db.createObjectStore('stats', { keyPath: 'id' });
                    }
                    
                    // إنشاء مخزن للجلسات
                    if (!db.objectStoreNames.contains('sessions')) {
                        db.createObjectStore('sessions', { keyPath: 'sessionId' });
                    }
                };
                
            } catch (error) {
                console.error('❌ خطأ في تهيئة قاعدة البيانات:', error);
                resolve(false);
            }
        });
    }
    
    // تحميل السجلات
    async loadLogs() {
        try {
            // محاولة تحميل من IndexedDB أولاً
            if (this.db) {
                const logs = await this.getAllFromDB('logs');
                this.logs = logs || [];
                console.log(`📂 تم تحميل ${this.logs.length} سجل من قاعدة البيانات`);
            } 
            // إذا فشل، جرب localStorage
            else if (typeof localStorage !== 'undefined') {
                const saved = localStorage.getItem('kelog_system');
                this.logs = saved ? JSON.parse(saved) : [];
                console.log(`📂 تم تحميل ${this.logs.length} سجل من localStorage`);
            }
            
            // تنظيف السجلات القديمة
            this.cleanupOldLogs();
            
        } catch (error) {
            console.error('❌ خطأ في تحميل السجلات:', error);
            this.logs = [];
        }
    }
    
    // حفظ السجلات
    async saveLogs() {
        try {
            // حفظ في IndexedDB
            if (this.db) {
                await this.saveToDB('logs', this.logs);
            }
            
            // حفظ نسخة احتياطية في localStorage
            if (typeof localStorage !== 'undefined') {
                // الاحتفاظ فقط بـ 500 سجل في localStorage
                const recentLogs = this.logs.slice(-500);
                localStorage.setItem('kelog_system', JSON.stringify(recentLogs));
            }
            
            // إنشاء ملف نسخ احتياطي كل 50 سجل
            if (this.logs.length % 50 === 0) {
                this.createBackup();
            }
            
            // إرسال تحديث إلى لوحة التحكم
            this.notifyDashboard();
            
        } catch (error) {
            console.error('❌ خطأ في حفظ السجلات:', error);
        }
    }
    
    // تسجيل حدث
    async log(action, data = {}, type = 'info', priority = 'normal') {
        try {
            const sessionId = this.getSessionId();
            const logEntry = {
                id: this.generateId(),
                sessionId: sessionId,
                action: action,
                data: this.sanitizeData(data),
                type: type,
                priority: priority,
                timestamp: new Date().toISOString(),
                page: window.location.href,
                userAgent: navigator.userAgent,
                screen: `${screen.width}x${screen.height}`,
                language: navigator.language,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                isMobile: this.isMobile,
                deviceMemory: navigator.deviceMemory || 'unknown',
                hardwareConcurrency: navigator.hardwareConcurrency || 'unknown'
            };
            
            // إضافة إلى الذاكرة
            this.logs.push(logEntry);
            
            // حفظ فوري للأحداث المهمة
            if (priority === 'high' || type === 'security' || type === 'error') {
                await this.saveLogs();
            }
            
            // إظهار في الكونسول للتصحيح
            if (type === 'error' || priority === 'high') {
                console.log(`🔴 [Kelog] ${action}`, logEntry);
            } else {
                console.log(`📝 [Kelog] ${action}`);
            }
            
            // إرسال إلى الخادم إذا كان متصلاً
            this.sendToServer(logEntry);
            
            // تحديث الإحصائيات
            this.updateStats(logEntry);
            
            return logEntry.id;
            
        } catch (error) {
            console.error('❌ خطأ في تسجيل السجل:', error);
            return null;
        }
    }
    
    // تنقية البيانات (إزالة البيانات الحساسة)
    sanitizeData(data) {
        const sanitized = { ...data };
        
        // إزالة كلمات المرور من السجلات
        if (sanitized.password) {
            sanitized.password = '***REMOVED***';
        }
        
        // إزالة البيانات الحساسة الأخرى
        const sensitiveKeys = ['token', 'creditCard', 'ssn', 'secret', 'privateKey'];
        sensitiveKeys.forEach(key => {
            if (sanitized[key]) {
                sanitized[key] = '***REMOVED***';
            }
        });
        
        return sanitized;
    }
    
    // توليد معرف فريد
    generateId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 9);
        return `log_${timestamp}_${random}`;
    }
    
    // الحصول على معرف الجلسة
    getSessionId() {
        let sessionId = sessionStorage.getItem('kelog_session_id');
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            sessionStorage.setItem('kelog_session_id', sessionId);
        }
        return sessionId;
    }
    
    // بدء الخدمات
    startServices() {
        // خدمة الحفظ التلقائي
        setInterval(() => {
            this.saveLogs();
        }, this.autoSaveInterval);
        
        // خدمة التنظيف التلقائي
        setInterval(() => {
            this.cleanupOldLogs();
        }, this.autoCleanInterval);
        
        // خدمة المزامنة
        setInterval(() => {
            this.syncWithDashboard();
        }, this.syncInterval);
        
        // مراقبة أحداث الصفحة
        this.monitorPageEvents();
        
        // مراقبة الأخطاء
        this.monitorErrors();
        
        // مراقبة الأداء
        this.monitorPerformance();
        
        // مراقبة الشبكة
        this.monitorNetwork();
        
        console.log('🛠️ خدمات Kelog قيد التشغيل');
    }
    
    // مراقبة أحداث الصفحة
    monitorPageEvents() {
        // النقرات
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT') {
                this.log('نقر', {
                    element: e.target.tagName,
                    id: e.target.id,
                    className: e.target.className,
                    text: e.target.textContent?.substring(0, 50) || e.target.value?.substring(0, 50)
                }, 'interaction');
            }
        }, true);
        
        // إدخال النصوص
        document.addEventListener('input', (e) => {
            if (e.target.type === 'email' || e.target.type === 'password' || e.target.type === 'text') {
                this.log('إدخال نص', {
                    field: e.target.id || e.target.name || e.target.placeholder,
                    type: e.target.type,
                    valueLength: e.target.value.length,
                    isPassword: e.target.type === 'password'
                }, 'user_input');
            }
        }, true);
        
        // إرسال النماذج
        document.addEventListener('submit', (e) => {
            this.log('إرسال نموذج', {
                formId: e.target.id,
                action: e.target.action,
                method: e.target.method,
                elements: e.target.elements.length
            }, 'form_submit', 'high');
        }, true);
        
        // التمرير
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.log('تمرير الصفحة', {
                    scrollY: window.scrollY,
                    scrollX: window.scrollX,
                    windowHeight: window.innerHeight,
                    documentHeight: document.documentElement.scrollHeight
                }, 'interaction');
            }, 500);
        });
        
        // تغيير الحجم
        window.addEventListener('resize', () => {
            this.log('تغيير حجم النافذة', {
                width: window.innerWidth,
                height: window.innerHeight,
                screen: `${screen.width}x${screen.height}`
            }, 'system');
        });
        
        // التركيز
        document.addEventListener('focusin', (e) => {
            this.log('تركيز', {
                element: e.target.tagName,
                id: e.target.id,
                type: e.target.type
            }, 'interaction');
        }, true);
        
        // النسخ
        document.addEventListener('copy', (e) => {
            const selectedText = window.getSelection().toString();
            if (selectedText.length > 0) {
                this.log('نسخ نص', {
                    textLength: selectedText.length,
                    textPreview: selectedText.substring(0, 100)
                }, 'user_action');
            }
        });
        
        // اللصق
        document.addEventListener('paste', (e) => {
            const pastedText = e.clipboardData?.getData('text') || '';
            if (pastedText.length > 0) {
                this.log('لصق نص', {
                    textLength: pastedText.length,
                    textPreview: pastedText.substring(0, 100)
                }, 'user_action');
            }
        });
    }
    
    // مراقبة الأخطاء
    monitorErrors() {
        // أخطاء الجافاسكريبت
        window.addEventListener('error', (e) => {
            this.log('خطأ في الجافاسكريبت', {
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
                colno: e.colno,
                error: e.error?.toString().substring(0, 200)
            }, 'error', 'high');
        });
        
        // وعود مرفوضة
        window.addEventListener('unhandledrejection', (e) => {
            this.log('وعد مرفوض', {
                reason: e.reason?.toString().substring(0, 200)
            }, 'error', 'high');
        });
        
        // أخطاء الموارد
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
                this.log('خطأ في تحميل المورد', {
                    tag: e.target.tagName,
                    src: e.target.src || e.target.href,
                    id: e.target.id
                }, 'resource_error');
            }
        }, true);
        
        // أخطاء XHR
        const originalXHRSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(...args) {
            this.addEventListener('error', function() {
                kelogSystem.log('خطأ في طلب XHR', {
                    url: this.responseURL,
                    status: this.status,
                    statusText: this.statusText
                }, 'network_error');
            });
            return originalXHRSend.apply(this, args);
        };
        
        // أخطاء Fetch
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const startTime = Date.now();
                const response = await originalFetch.apply(this, args);
                const duration = Date.now() - startTime;
                
                if (!response.ok) {
                    kelogSystem.log('خطأ في طلب Fetch', {
                        url: args[0],
                        status: response.status,
                        statusText: response.statusText,
                        duration: duration
                    }, 'network_error');
                }
                
                return response;
            } catch (error) {
                kelogSystem.log('خطأ في Fetch', {
                    url: args[0],
                    error: error.message
                }, 'network_error', 'high');
                throw error;
            }
        };
    }
    
    // مراقبة الأداء
    monitorPerformance() {
        if (window.performance) {
            window.addEventListener('load', () => {
                const timing = performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                
                this.log('تحميل الصفحة', {
                    loadTime: loadTime,
                    dnsTime: timing.domainLookupEnd - timing.domainLookupStart,
                    tcpTime: timing.connectEnd - timing.connectStart,
                    requestTime: timing.responseStart - timing.requestStart,
                    responseTime: timing.responseEnd - timing.responseStart,
                    domLoadTime: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
                    totalTime: timing.loadEventEnd - timing.navigationStart
                }, 'performance');
            });
        }
        
        // مراقبة الذاكرة
        if (performance.memory) {
            setInterval(() => {
                this.log('استخدام الذاكرة', {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
                    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                }, 'performance');
            }, 60000);
        }
        
        // مراقبة FPS
        let lastTime = Date.now();
        let frameCount = 0;
        
        function checkFPS() {
            frameCount++;
            const currentTime = Date.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                kelogSystem.log('معدل الإطارات', { fps: fps }, 'performance');
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkFPS);
        }
        
        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(checkFPS);
        }
    }
    
    // مراقبة الشبكة
    monitorNetwork() {
        if (navigator.connection) {
            // مراقبة تغيير الاتصال
            navigator.connection.addEventListener('change', () => {
                this.log('تغيير حالة الاتصال', {
                    effectiveType: navigator.connection.effectiveType,
                    downlink: navigator.connection.downlink,
                    rtt: navigator.connection.rtt,
                    saveData: navigator.connection.saveData
                }, 'network');
            });
            
            // تسجيل حالة الاتصال الأولية
            this.log('حالة الاتصال الأولية', {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt,
                saveData: navigator.connection.saveData
            }, 'network');
        }
        
        // مراقبة الاتصال
        window.addEventListener('online', () => {
            this.log('الاتصال متاح', {}, 'network');
        });
        
        window.addEventListener('offline', () => {
            this.log('الاتصال غير متاح', {}, 'network', 'high');
        });
    }
    
    // إرسال إلى الخادم
    async sendToServer(logEntry) {
        try {
            // يمكن إضافة إرسال إلى خادم حقيقي هنا
            // await fetch('https://yourserver.com/kelog', {
            //     method: 'POST',
            //     body: JSON.stringify(logEntry)
            // });
            
            // بدلاً من ذلك، حفظ محلياً
            if (this.realTimeEnabled) {
                this.sendToDashboard(logEntry);
            }
            
        } catch (error) {
            console.warn('⚠️ لا يمكن إرسال السجل إلى الخادم:', error);
        }
    }
    
    // إرسال إلى لوحة التحكم
    sendToDashboard(logEntry) {
        try {
            // إرسال عبر localStorage للاتصال المباشر
            const dashboardUpdate = {
                type: 'kelog_update',
                log: logEntry,
                timestamp: Date.now(),
                totalLogs: this.logs.length
            };
            
            localStorage.setItem('kelog_dashboard_update', JSON.stringify(dashboardUpdate));
            
            // إرسال رسالة بين النوافذ
            window.postMessage(dashboardUpdate, '*');
            
            // إرسال إلى iframe
            const iframe = document.getElementById('dataFrame');
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage(dashboardUpdate, '*');
            }
            
        } catch (error) {
            console.warn('⚠️ لا يمكن إرسال إلى لوحة التحكم:', error);
        }
    }
    
    // إشعار لوحة التحكم
    notifyDashboard() {
        try {
            const notification = {
                type: 'kelog_notification',
                message: `تم تحديث السجلات: ${this.logs.length} سجل`,
                count: this.logs.length,
                timestamp: Date.now()
            };
            
            localStorage.setItem('kelog_notification', JSON.stringify(notification));
            window.postMessage(notification, '*');
            
        } catch (error) {
            console.warn('⚠️ لا يمكن إرسال الإشعار:', error);
        }
    }
    
    // مزامنة مع لوحة التحكم
    syncWithDashboard() {
        try {
            const syncData = {
                type: 'kelog_sync',
                logsCount: this.logs.length,
                lastLog: this.logs[this.logs.length - 1],
                stats: this.getStats(),
                timestamp: Date.now()
            };
            
            localStorage.setItem('kelog_sync', JSON.stringify(syncData));
            window.postMessage(syncData, '*');
            
        } catch (error) {
            console.warn('⚠️ لا يمكن المزامنة مع لوحة التحكم:', error);
        }
    }
    
    // تحديث الإحصائيات
    async updateStats(logEntry) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const statsKey = `stats_${today}`;
            
            let stats = {};
            if (this.db) {
                stats = await this.getFromDB('stats', statsKey) || {};
            } else {
                stats = JSON.parse(localStorage.getItem(statsKey) || '{}');
            }
            
            // تحديث الإحصائيات
            stats.totalLogs = (stats.totalLogs || 0) + 1;
            stats[logEntry.type] = (stats[logEntry.type] || 0) + 1;
            stats[logEntry.action] = (stats[logEntry.action] || 0) + 1;
            stats.lastUpdate = new Date().toISOString();
            
            // حفظ الإحصائيات
            if (this.db) {
                await this.saveToDB('stats', { id: statsKey, ...stats });
            } else {
                localStorage.setItem(statsKey, JSON.stringify(stats));
            }
            
        } catch (error) {
            console.warn('⚠️ لا يمكن تحديث الإحصائيات:', error);
        }
    }
    
    // الحصول على الإحصائيات
    getStats() {
        const stats = {
            totalLogs: this.logs.length,
            byType: {},
            byAction: {},
            today: this.getTodayStats(),
            recentActivity: this.getRecentActivity(10)
        };
        
        // تحليل حسب النوع والإجراء
        this.logs.forEach(log => {
            stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        });
        
        return stats;
    }
    
    // الحصول على إحصائيات اليوم
    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayLogs = this.logs.filter(log => 
            log.timestamp.startsWith(today)
        );
        
        return {
            count: todayLogs.length,
            types: todayLogs.reduce((acc, log) => {
                acc[log.type] = (acc[log.type] || 0) + 1;
                return acc;
            }, {}),
            devices: todayLogs.reduce((acc, log) => {
                const device = log.isMobile ? 'mobile' : 'desktop';
                acc[device] = (acc[device] || 0) + 1;
                return acc;
            }, {})
        };
    }
    
    // الحصول على الأنشطة الأخيرة
    getRecentActivity(count = 10) {
        return this.logs.slice(-count).reverse().map(log => ({
            action: log.action,
            type: log.type,
            timestamp: log.timestamp,
            page: log.page
        }));
    }
    
    // تنظيف السجلات القديمة
    cleanupOldLogs(daysToKeep = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const initialCount = this.logs.length;
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        const removedCount = initialCount - this.logs.length;
        
        if (removedCount > 0) {
            this.log('تنظيف السجلات القديمة', {
                removed: removedCount,
                remaining: this.logs.length,
                cutoffDate: cutoffDate.toISOString()
            }, 'system');
            
            this.saveLogs();
        }
        
        return removedCount;
    }
    
    // الحصول على معلومات التخزين
    async getStorageInfo() {
        try {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                return {
                    quota: Math.round(estimate.quota / 1048576),
                    usage: Math.round(estimate.usage / 1048576),
                    usageDetails: estimate.usageDetails
                };
            }
            
            // fallback للتخزين المحلي
            if (typeof localStorage !== 'undefined') {
                let totalSize = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    totalSize += key.length + (value ? value.length : 0);
                }
                
                return {
                    quota: 5120, // 5MB افتراضياً
                    usage: Math.round(totalSize / 1024),
                    usageDetails: { localStorage: Math.round(totalSize / 1024) }
                };
            }
            
        } catch (error) {
            console.warn('⚠️ لا يمكن الحصول على معلومات التخزين:', error);
        }
        
        return { quota: 0, usage: 0, usageDetails: {} };
    }
    
    // الحصول على جميع السجلات
    getAllLogs() {
        return [...this.logs].reverse(); // أحدث أولاً
    }
    
    // البحث في السجلات
    searchLogs(query, options = {}) {
        const searchTerm = query.toLowerCase();
        const { type, startDate, endDate, limit } = options;
        
        let results = this.logs.filter(log => {
            // البحث في النص
            const matchesText = 
                log.action.toLowerCase().includes(searchTerm) ||
                JSON.stringify(log.data).toLowerCase().includes(searchTerm) ||
                log.page.toLowerCase().includes(searchTerm);
            
            // التصفية حسب النوع
            const matchesType = !type || log.type === type;
            
            // التصفية حسب التاريخ
            const logDate = new Date(log.timestamp);
            const matchesDate = (!startDate || logDate >= new Date(startDate)) &&
                              (!endDate || logDate <= new Date(endDate));
            
            return matchesText && matchesType && matchesDate;
        });
        
        // تطبيق الحد
        if (limit) {
            results = results.slice(0, limit);
        }
        
        return results.reverse();
    }
    
    // تصدير السجلات
    exportLogs(format = 'json', options = {}) {
        const logs = options.logs || this.logs;
        const exportData = {
            system: 'Kelog System',
            version: this.version,
            exportedAt: new Date().toISOString(),
            total: logs.length,
            logs: logs,
            stats: this.getStats()
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
                
            case 'csv':
                let csv = 'ID,Time,Action,Type,Priority,Page,Data\n';
                logs.forEach(log => {
                    csv += `"${log.id}","${log.timestamp}","${log.action}","${log.type}","${log.priority}","${log.page}","${JSON.stringify(log.data)}"\n`;
                });
                return csv;
                
            case 'txt':
                let txt = '='.repeat(80) + '\n';
                txt += 'تقرير سجلات Kelog\n';
                txt += '='.repeat(80) + '\n\n';
                
                txt += `النظام: ${exportData.system}\n`;
                txt += `الإصدار: ${exportData.version}\n`;
                txt += `وقت التصدير: ${new Date(exportData.exportedAt).toLocaleString('ar-SA')}\n`;
                txt += `إجمالي السجلات: ${exportData.total}\n\n`;
                
                logs.forEach((log, index) => {
                    txt += `السجل ${index + 1}\n`;
                    txt += '─'.repeat(40) + '\n';
                    txt += `الإجراء: ${log.action}\n`;
                    txt += `النوع: ${log.type}\n`;
                    txt += `الأولوية: ${log.priority}\n`;
                    txt += `الوقت: ${new Date(log.timestamp).toLocaleString('ar-SA')}\n`;
                    txt += `الصفحة: ${log.page}\n`;
                    txt += `البيانات: ${JSON.stringify(log.data, null, 2)}\n\n`;
                });
                
                return txt;
                
            default:
                throw new Error('تنسيق غير معتمد');
        }
    }
    
    // إنشاء نسخة احتياطية
    async createBackup() {
        try {
            const backupData = this.exportLogs('json');
            const blob = new Blob([backupData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // إنشاء رابط تحميل
            const a = document.createElement('a');
            a.href = url;
            a.download = `kelog_backup_${timestamp}.json`;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            
            await this.log('إنشاء نسخة احتياطية', {
                filename: `kelog_backup_${timestamp}.json`,
                size: blob.size,
                logCount: this.logs.length
            }, 'backup');
            
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
            return false;
        }
    }
    
    // وظائف قاعدة البيانات
    async saveToDB(storeName, data) {
        if (!this.db) return false;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getFromDB(storeName, key) {
        if (!this.db) return null;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async getAllFromDB(storeName) {
        if (!this.db) return null;
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // تسجيل أحداث مخصصة
    async logLogin(appleId, success, metadata = {}) {
        return await this.log('تسجيل دخول', {
            appleId: appleId,
            success: success,
            ...metadata
        }, 'security', 'high');
    }
    
    async logCredential(appleId, metadata = {}) {
        return await this.log('حفظ بيانات اعتماد', {
            appleId: appleId,
            ...metadata
        }, 'security', 'high');
    }
    
    async logError(error, context = {}) {
        return await this.log('خطأ في النظام', {
            error: error.message,
            stack: error.stack,
            ...context
        }, 'error', 'high');
    }
    
    async logVisit(metadata = {}) {
        return await this.log('زيارة الصفحة', {
            ...metadata
        }, 'visit');
    }
}

// إنشاء وتصدير نظام Kelog
window.KelogSystem = KelogSystem;

// إنشاء نسخة عالمية للاستخدام السهل
if (!window.kelogSystem) {
    window.kelogSystem = new KelogSystem();
}

console.log('🚀 نظام Kelog System جاهز للاستخدام!');
