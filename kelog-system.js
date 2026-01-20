// 📁 kelog-system.js - نظام التسجيل المتقدم للـ Brain System

class KelogSystem {
    constructor() {
        this.version = '2.0.0';
        this.logs = [];
        this.maxLogs = 5000; // أقصى عدد للسجلات
        this.isEnabled = true;
        this.settings = {
            logLevel: 'debug', // debug, info, warn, error
            autoSave: true,
            saveInterval: 30000, // كل 30 ثانية
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 أيام
        };
        
        this.initialize();
    }
    
    initialize() {
        console.log(`🧠 Kelog System v${this.version} initializing...`);
        
        // تحميل السجلات المحفوظة
        this.loadLogs();
        
        // إعداد الحفظ التلقائي
        this.setupAutoSave();
        
        // بدء المراقبة
        this.startMonitoring();
        
        // تنظيف السجلات القديمة
        this.cleanupOldLogs();
        
        console.log('✅ Kelog System ready');
    }
    
    // تحميل السجلات من localStorage
    loadLogs() {
        try {
            const savedLogs = localStorage.getItem('kelog_system');
            if (savedLogs) {
                this.logs = JSON.parse(savedLogs);
                console.log(`📊 Loaded ${this.logs.length} logs from storage`);
            }
        } catch (error) {
            console.error('❌ Error loading kelog:', error);
            this.logs = [];
        }
    }
    
    // حفظ السجلات إلى localStorage
    saveLogs() {
        try {
            // الاحتفاظ فقط بأحدث السجلات
            if (this.logs.length > this.maxLogs) {
                this.logs = this.logs.slice(-this.maxLogs);
            }
            
            localStorage.setItem('kelog_system', JSON.stringify(this.logs));
            return true;
        } catch (error) {
            console.error('❌ Error saving kelog:', error);
            return false;
        }
    }
    
    // إعداد الحفظ التلقائي
    setupAutoSave() {
        if (this.settings.autoSave) {
            setInterval(() => {
                this.saveLogs();
            }, this.settings.saveInterval);
        }
    }
    
    // بدء مراقبة النظام
    startMonitoring() {
        // مراقبة أخطاء JavaScript
        this.monitorErrors();
        
        // مراقبة أداء الصفحة
        this.monitorPerformance();
        
        // مراقبة أحداث الصفحة
        this.monitorPageEvents();
        
        // مراقبة الشبكة
        this.monitorNetwork();
        
        // مراقبة نظام التسجيل الحالي
        this.monitorExistingLogs();
    }
    
    // مراقبة أخطاء JavaScript
    monitorErrors() {
        // أخطاء JavaScript
        window.addEventListener('error', (event) => {
            this.log('error', {
                type: 'javascript_error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error?.toString()
            });
        });
        
        // وعود مرفوضة
        window.addEventListener('unhandledrejection', (event) => {
            this.log('error', {
                type: 'promise_rejection',
                reason: event.reason?.toString()
            });
        });
        
        // أخطاء في تحميل الموارد
        window.addEventListener('error', (event) => {
            if (event.target && event.target.tagName) {
                this.log('warn', {
                    type: 'resource_error',
                    tag: event.target.tagName,
                    src: event.target.src || event.target.href,
                    error: event.message
                });
            }
        }, true);
    }
    
    // مراقبة أداء الصفحة
    monitorPerformance() {
        if (window.performance && performance.timing) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const timing = performance.timing;
                    const perfData = {
                        type: 'performance',
                        loadTime: timing.loadEventEnd - timing.navigationStart,
                        domReadyTime: timing.domComplete - timing.domLoading,
                        readyStart: timing.fetchStart - timing.navigationStart,
                        redirectTime: timing.redirectEnd - timing.redirectStart,
                        appcacheTime: timing.domainLookupStart - timing.fetchStart,
                        lookupDomainTime: timing.domainLookupEnd - timing.domainLookupStart,
                        connectTime: timing.connectEnd - timing.connectStart,
                        requestTime: timing.responseEnd - timing.requestStart,
                        initDomTreeTime: timing.domInteractive - timing.responseEnd,
                        loadEventTime: timing.loadEventEnd - timing.loadEventStart
                    };
                    
                    this.log('info', perfData);
                }, 0);
            });
        }
        
        // مراقبة استخدام الذاكرة
        if (performance.memory) {
            setInterval(() => {
                const memoryData = {
                    type: 'memory_usage',
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
                
                this.log('debug', memoryData);
            }, 60000); // كل دقيقة
        }
    }
    
    // مراقبة أحداث الصفحة
    monitorPageEvents() {
        // تغيير الحالة
        window.addEventListener('popstate', () => {
            this.log('info', {
                type: 'popstate',
                url: window.location.href,
                state: window.history.state
            });
        });
        
        // تغيير الرؤية
        document.addEventListener('visibilitychange', () => {
            this.log('info', {
                type: 'visibility_change',
                visibilityState: document.visibilityState,
                hidden: document.hidden
            });
        });
        
        // تركيز الصفحة
        window.addEventListener('focus', () => {
            this.log('info', {
                type: 'window_focus',
                timestamp: Date.now()
            });
        });
        
        window.addEventListener('blur', () => {
            this.log('info', {
                type: 'window_blur',
                timestamp: Date.now()
            });
        });
        
        // تغيير الحجم
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.log('info', {
                    type: 'window_resize',
                    width: window.innerWidth,
                    height: window.innerHeight,
                    outerWidth: window.outerWidth,
                    outerHeight: window.outerHeight
                });
            }, 250);
        });
        
        // حركة الماوس
        let mouseMoveTimeout;
        document.addEventListener('mousemove', (event) => {
            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                this.log('debug', {
                    type: 'mouse_position',
                    x: event.clientX,
                    y: event.clientY,
                    pageX: event.pageX,
                    pageY: event.pageY
                });
            }, 1000);
        });
    }
    
    // مراقبة الشبكة
    monitorNetwork() {
        // حالة الاتصال
        window.addEventListener('online', () => {
            this.log('info', {
                type: 'network_online',
                timestamp: Date.now()
            });
        });
        
        window.addEventListener('offline', () => {
            this.log('warn', {
                type: 'network_offline',
                timestamp: Date.now()
            });
        });
        
        // مراقبة طلبات Fetch
        const originalFetch = window.fetch;
        if (originalFetch) {
            window.fetch = (...args) => {
                const startTime = Date.now();
                const url = args[0] instanceof Request ? args[0].url : args[0];
                
                return originalFetch.apply(this, args)
                    .then(response => {
                        const duration = Date.now() - startTime;
                        
                        this.log('debug', {
                            type: 'fetch_request',
                            url: url,
                            method: args[1]?.method || 'GET',
                            status: response.status,
                            statusText: response.statusText,
                            duration: duration,
                            timestamp: startTime
                        });
                        
                        return response;
                    })
                    .catch(error => {
                        this.log('error', {
                            type: 'fetch_error',
                            url: url,
                            error: error.toString(),
                            timestamp: startTime
                        });
                        
                        throw error;
                    });
            };
        }
    }
    
    // مراقبة نظام التسجيل الحالي
    monitorExistingLogs() {
        // استبدال console.log الأصلي
        const originalConsole = {
            log: console.log,
            warn: console.warn,
            error: console.error,
            info: console.info,
            debug: console.debug
        };
        
        // console.log
        console.log = (...args) => {
            this.log('info', {
                type: 'console_log',
                args: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ),
                timestamp: Date.now()
            });
            
            originalConsole.log.apply(console, args);
        };
        
        // console.warn
        console.warn = (...args) => {
            this.log('warn', {
                type: 'console_warn',
                args: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ),
                timestamp: Date.now()
            });
            
            originalConsole.warn.apply(console, args);
        };
        
        // console.error
        console.error = (...args) => {
            this.log('error', {
                type: 'console_error',
                args: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ),
                timestamp: Date.now()
            });
            
            originalConsole.error.apply(console, args);
        };
        
        // console.info
        console.info = (...args) => {
            this.log('info', {
                type: 'console_info',
                args: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ),
                timestamp: Date.now()
            });
            
            originalConsole.info.apply(console, args);
        };
        
        // console.debug
        console.debug = (...args) => {
            this.log('debug', {
                type: 'console_debug',
                args: args.map(arg => 
                    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
                ),
                timestamp: Date.now()
            });
            
            originalConsole.debug.apply(console, args);
        };
    }
    
    // تسجيل حدث
    log(level, data) {
        if (!this.isEnabled) return null;
        
        // التحقق من مستوى التسجيل
        const levels = ['debug', 'info', 'warn', 'error'];
        const currentLevelIndex = levels.indexOf(this.settings.logLevel);
        const logLevelIndex = levels.indexOf(level);
        
        if (logLevelIndex < currentLevelIndex) {
            return null;
        }
        
        const logEntry = {
            id: this.generateId(),
            level: level,
            timestamp: new Date().toISOString(),
            ...data,
            metadata: {
                userAgent: navigator.userAgent,
                url: window.location.href,
                screen: `${window.screen.width}x${window.screen.height}`,
                language: navigator.language,
                platform: navigator.platform,
                online: navigator.onLine
            }
        };
        
        // إضافة إلى السجلات
        this.logs.push(logEntry);
        
        // إرسال إلى النظام المركزي إذا كان متوفراً
        this.sendToBrain(logEntry);
        
        // حفظ تلقائي للسجلات المهمة
        if (level === 'error' || level === 'warn') {
            this.saveLogs();
        }
        
        return logEntry.id;
    }
    
    // إرسال إلى النظام المركزي
    sendToBrain(logEntry) {
        try {
            // إرسال عبر localStorage (للاتصال بين النوافذ)
            localStorage.setItem('brain_kelog', JSON.stringify(logEntry));
            
            // إرسال عبر postMessage
            window.parent.postMessage({
                type: 'kelog',
                data: logEntry,
                timestamp: Date.now()
            }, '*');
            
        } catch (error) {
            console.warn('⚠️ Brain send error:', error);
        }
    }
    
    // توليد معرف فريد
    generateId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // البحث في السجلات
    searchLogs(query, options = {}) {
        const {
            level = null,
            startTime = null,
            endTime = null,
            limit = 100,
            type = null
        } = options;
        
        let results = this.logs;
        
        // فلترة حسب المستوى
        if (level) {
            results = results.filter(log => log.level === level);
        }
        
        // فلترة حسب النوع
        if (type) {
            results = results.filter(log => log.type === type);
        }
        
        // فلترة حسب الوقت
        if (startTime) {
            const start = new Date(startTime).getTime();
            results = results.filter(log => new Date(log.timestamp).getTime() >= start);
        }
        
        if (endTime) {
            const end = new Date(endTime).getTime();
            results = results.filter(log => new Date(log.timestamp).getTime() <= end);
        }
        
        // فلترة حسب الاستعلام
        if (query) {
            const searchStr = query.toLowerCase();
            results = results.filter(log => {
                return JSON.stringify(log).toLowerCase().includes(searchStr);
            });
        }
        
        // ترتيب حسب الوقت (الأحدث أولاً)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // تحديد الحد الأقصى
        return results.slice(0, limit);
    }
    
    // الحصول على إحصائيات السجلات
    getStats() {
        const stats = {
            total: this.logs.length,
            byLevel: {
                debug: 0,
                info: 0,
                warn: 0,
                error: 0
            },
            byType: {},
            last24Hours: 0,
            lastHour: 0
        };
        
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const hourAgo = now - 60 * 60 * 1000;
        
        this.logs.forEach(log => {
            // حسب المستوى
            stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
            
            // حسب النوع
            const type = log.type || 'unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            // حسب الوقت
            const logTime = new Date(log.timestamp).getTime();
            if (logTime > dayAgo) stats.last24Hours++;
            if (logTime > hourAgo) stats.lastHour++;
        });
        
        return stats;
    }
    
    // تصدير السجلات
    exportLogs(format = 'json', options = {}) {
        let logsToExport = this.logs;
        
        // تطبيق الفلاتر إذا وجدت
        if (Object.keys(options).length > 0) {
            logsToExport = this.searchLogs(null, options);
        }
        
        let content, filename, mimeType;
        
        switch(format) {
            case 'json':
                content = JSON.stringify(logsToExport, null, 2);
                filename = `kelog_export_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':
                content = this.convertToCSV(logsToExport);
                filename = `kelog_export_${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
                
            case 'txt':
                content = this.convertToTXT(logsToExport);
                filename = `kelog_export_${Date.now()}.txt`;
                mimeType = 'text/plain';
                break;
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        return { content, filename, mimeType };
    }
    
    // تحويل إلى CSV
    convertToCSV(logs) {
        if (logs.length === 0) return '';
        
        const headers = ['Timestamp', 'Level', 'Type', 'Message', 'URL', 'UserAgent'];
        let csv = headers.join(',') + '\n';
        
        logs.forEach(log => {
            const row = [
                `"${log.timestamp}"`,
                `"${log.level}"`,
                `"${log.type || 'N/A'}"`,
                `"${(log.message || log.args || 'N/A').toString().replace(/"/g, '""')}"`,
                `"${log.metadata?.url || 'N/A'}"`,
                `"${log.metadata?.userAgent?.replace(/"/g, '""') || 'N/A'}"`
            ];
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    // تحويل إلى نص
    convertToTXT(logs) {
        let txt = '='.repeat(80) + '\n';
        txt += 'KELOG SYSTEM EXPORT\n';
        txt += '='.repeat(80) + '\n\n';
        
        txt += `Total Logs: ${logs.length}\n`;
        txt += `Export Time: ${new Date().toLocaleString('de-DE')}\n\n`;
        
        logs.forEach((log, index) => {
            txt += `[${index + 1}] ${log.timestamp} [${log.level.toUpperCase()}] ${log.type || 'N/A'}\n`;
            
            if (log.message) {
                txt += `   Message: ${log.message}\n`;
            }
            
            if (log.args) {
                txt += `   Args: ${JSON.stringify(log.args)}\n`;
            }
            
            if (log.error) {
                txt += `   Error: ${log.error}\n`;
            }
            
            txt += `   URL: ${log.metadata?.url || 'N/A'}\n`;
            txt += '-'.repeat(60) + '\n';
        });
        
        return txt;
    }
    
    // تنظيف السجلات القديمة
    cleanupOldLogs() {
        const now = Date.now();
        const maxAge = this.settings.maxAge;
        
        const initialLength = this.logs.length;
        
        this.logs = this.logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            return (now - logTime) < maxAge;
        });
        
        const removedCount = initialLength - this.logs.length;
        if (removedCount > 0) {
            console.log(`🧹 Removed ${removedCount} old logs`);
            this.saveLogs();
        }
        
        // تشغيل التنظيف يومياً
        setTimeout(() => this.cleanupOldLogs(), 24 * 60 * 60 * 1000);
    }
    
    // حذف السجلات
    clearLogs() {
        this.logs = [];
        localStorage.removeItem('kelog_system');
        console.log('🗑️ All logs cleared');
        
        this.log('info', {
            type: 'logs_cleared',
            timestamp: new Date().toISOString()
        });
    }
    
    // تمكين/تعطيل النظام
    setEnabled(enabled) {
        this.isEnabled = enabled;
        
        this.log('info', {
            type: 'kelog_' + (enabled ? 'enabled' : 'disabled'),
            timestamp: new Date().toISOString()
        });
        
        return this.isEnabled;
    }
    
    // تحديث الإعدادات
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        
        // حفظ الإعدادات
        localStorage.setItem('kelog_settings', JSON.stringify(this.settings));
        
        this.log('info', {
            type: 'settings_updated',
            settings: this.settings,
            timestamp: new Date().toISOString()
        });
        
        return this.settings;
    }
    
    // تحميل الإعدادات المحفوظة
    loadSettings() {
        try {
            const savedSettings = localStorage.getItem('kelog_settings');
            if (savedSettings) {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.warn('⚠️ Settings load error:', error);
        }
    }
    
    // الحصول على تقرير النظام
    getSystemReport() {
        const stats = this.getStats();
        const performance = {};
        
        if (performance.memory) {
            performance.memory = {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
        }
        
        return {
            version: this.version,
            status: this.isEnabled ? 'enabled' : 'disabled',
            settings: this.settings,
            statistics: stats,
            performance: performance,
            lastUpdate: new Date().toISOString()
        };
    }
}

// تصدير النظام للاستخدام العالمي
window.KelogSystem = KelogSystem;

// تهيئة النظام تلقائياً إذا كان متوفراً
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        if (!window.kelog) {
            window.kelog = new KelogSystem();
            console.log('🧠 Kelog System loaded globally as window.kelog');
        }
    });
}

export default KelogSystem;
