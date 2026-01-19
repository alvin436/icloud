// 📁 kelog.js - نظام تسجيل متقدم

class KelogSystem {
    constructor() {
        this.logs = [];
        this.maxLogs = 1000; // أقصى عدد للسجلات
        this.init();
    }
    
    init() {
        this.loadLogs();
        this.setupAutoSave();
        this.startMonitoring();
    }
    
    // تحميل السجلات من localStorage
    loadLogs() {
        try {
            const saved = localStorage.getItem('kelog');
            this.logs = saved ? JSON.parse(saved) : [];
            console.log(`📊 تم تحميل ${this.logs.length} سجلات من Kelog`);
        } catch (error) {
            console.error('خطأ في تحميل السجلات:', error);
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
            
            localStorage.setItem('kelog', JSON.stringify(this.logs));
        } catch (error) {
            console.error('خطأ في حفظ السجلات:', error);
        }
    }
    
    // إعداد الحفظ التلقائي
    setupAutoSave() {
        setInterval(() => {
            this.saveLogs();
        }, 30000); // حفظ كل 30 ثانية
    }
    
    // بدء المراقبة
    startMonitoring() {
        this.log('بدء نظام Kelog', { system: 'kelog', version: '1.0' });
        
        // مراقبة الصفحة
        this.monitorPageEvents();
        
        // مراقبة الشبكة
        this.monitorNetwork();
        
        // مراقبة الأخطاء
        this.monitorErrors();
        
        // مراقبة الأداء
        this.monitorPerformance();
    }
    
    // تسجيل حدث
    log(action, data = {}, type = 'info') {
        const logEntry = {
            id: this.generateId(),
            action: action,
            data: data,
            type: type,
            timestamp: new Date().toISOString(),
            page: window.location.href,
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language
        };
        
        this.logs.push(logEntry);
        
        // حفظ فوري للأحداث المهمة
        if (type === 'security' || type === 'error') {
            this.saveLogs();
        }
        
        // عرض في الكونسول للتصحيح
        console.log(`📝 [Kelog] ${action}`, logEntry);
        
        return logEntry.id;
    }
    
    // توليد معرف فريد
    generateId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // مراقبة أحداث الصفحة
    monitorPageEvents() {
        // مراقبة النقرات
        document.addEventListener('click', (e) => {
            if (e.target.id || e.target.className) {
                this.log('نقر', {
                    element: e.target.tagName,
                    id: e.target.id,
                    className: e.target.className,
                    text: e.target.textContent?.substring(0, 50)
                }, 'interaction');
            }
        });
        
        // مراقبة إدخال النصوص
        document.addEventListener('input', (e) => {
            if (e.target.type === 'email' || e.target.type === 'password') {
                this.log('إدخال نص', {
                    field: e.target.id || e.target.name,
                    type: e.target.type,
                    valueLength: e.target.value.length
                }, 'security');
            }
        });
        
        // مراقبة إرسال النماذج
        document.addEventListener('submit', (e) => {
            this.log('إرسال نموذج', {
                formId: e.target.id,
                action: e.target.action
            }, 'security');
        });
        
        // مراقبة التمرير
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                this.log('تمرير الصفحة', {
                    scrollY: window.scrollY,
                    scrollX: window.scrollX
                }, 'interaction');
            }, 1000);
        });
        
        // مراقبة تغيير الحجم
        window.addEventListener('resize', () => {
            this.log('تغيير حجم النافذة', {
                width: window.innerWidth,
                height: window.innerHeight
            }, 'system');
        });
        
        // مراقبة التركيز
        document.addEventListener('focusin', (e) => {
            this.log('تركيز على عنصر', {
                element: e.target.tagName,
                id: e.target.id
            }, 'interaction');
        });
        
        // مراقبة فقدان التركيز
        document.addEventListener('focusout', (e) => {
            this.log('فقدان التركيز', {
                element: e.target.tagName,
                id: e.target.id
            }, 'interaction');
        });
    }
    
    // مراقبة الشبكة
    monitorNetwork() {
        const originalFetch = window.fetch;
        
        window.fetch = function(...args) {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;
            
            return originalFetch.apply(this, args)
                .then(response => {
                    const duration = Date.now() - startTime;
                    kelogSystem.log('طلب شبكة', {
                        url: url,
                        method: args[1]?.method || 'GET',
                        status: response.status,
                        duration: duration + 'ms',
                        type: 'success'
                    }, 'network');
                    
                    return response;
                })
                .catch(error => {
                    kelogSystem.log('خطأ في الشبكة', {
                        url: url,
                        method: args[1]?.method || 'GET',
                        error: error.message,
                        type: 'error'
                    }, 'network');
                    
                    throw error;
                });
        };
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
                error: e.error?.toString()
            }, 'error');
        });
        
        // وعود مرفوضة
        window.addEventListener('unhandledrejection', (e) => {
            this.log('وعد مرفوض', {
                reason: e.reason?.toString()
            }, 'error');
        });
        
        // أخطاء الموارد
        document.addEventListener('error', (e) => {
            if (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK') {
                this.log('خطأ في تحميل المورد', {
                    tag: e.target.tagName,
                    src: e.target.src || e.target.href
                }, 'error');
            }
        }, true);
    }
    
    // مراقبة الأداء
    monitorPerformance() {
        if (window.performance) {
            window.addEventListener('load', () => {
                const timing = performance.timing;
                const loadTime = timing.loadEventEnd - timing.navigationStart;
                
                this.log('تحميل الصفحة', {
                    loadTime: loadTime + 'ms',
                    dnsTime: timing.domainLookupEnd - timing.domainLookupStart + 'ms',
                    tcpTime: timing.connectEnd - timing.connectStart + 'ms',
                    requestTime: timing.responseStart - timing.requestStart + 'ms',
                    responseTime: timing.responseEnd - timing.responseStart + 'ms',
                    domLoadTime: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart + 'ms'
                }, 'performance');
            });
        }
        
        // مراقبة الذاكرة
        if (performance.memory) {
            setInterval(() => {
                this.log('استخدام الذاكرة', {
                    usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
                    totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB',
                    jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB'
                }, 'performance');
            }, 60000); // كل دقيقة
        }
    }
    
    // تسجيل بيانات المستخدم
    logUserActivity(userId, activity, details = {}) {
        return this.log('نشاط المستخدم', {
            userId: userId,
            activity: activity,
            ...details
        }, 'user');
    }
    
    // تسجيل بيانات أمنية
    logSecurityEvent(event, details = {}) {
        return this.log('حدث أمني', {
            event: event,
            ...details
        }, 'security');
    }
    
    // تسجيل بيانات دخول
    logLoginAttempt(appleId, ip, success = false, details = {}) {
        return this.log('محاولة تسجيل دخول', {
            appleId: appleId,
            ip: ip,
            success: success,
            ...details
        }, 'security');
    }
    
    // الحصول على جميع السجلات
    getAllLogs() {
        return [...this.logs];
    }
    
    // الحصول على سجلات بنوع معين
    getLogsByType(type) {
        return this.logs.filter(log => log.type === type);
    }
    
    // الحصول على سجلات ضمن فترة زمنية
    getLogsByTimeRange(startTime, endTime) {
        return this.logs.filter(log => {
            const logTime = new Date(log.timestamp);
            return logTime >= new Date(startTime) && logTime <= new Date(endTime);
        });
    }
    
    // البحث في السجلات
    searchLogs(query) {
        const searchTerm = query.toLowerCase();
        return this.logs.filter(log => 
            log.action.toLowerCase().includes(searchTerm) ||
            JSON.stringify(log.data).toLowerCase().includes(searchTerm)
        );
    }
    
    // تصدير السجلات
    exportLogs(format = 'json') {
        const exportData = {
            logs: this.logs,
            exportedAt: new Date().toISOString(),
            total: this.logs.length,
            system: 'Kelog System'
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);
                
            case 'csv':
                let csv = 'ID,Time,Action,Type,Data\n';
                this.logs.forEach(log => {
                    csv += `${log.id},"${log.timestamp}","${log.action}","${log.type}","${JSON.stringify(log.data)}"\n`;
                });
                return csv;
                
            case 'txt':
                let txt = '='.repeat(80) + '\n';
                txt += 'تقرير سجلات Kelog\n';
                txt += '='.repeat(80) + '\n\n';
                
                this.logs.forEach((log, index) => {
                    txt += `السجل ${index + 1}\n`;
                    txt += '─'.repeat(40) + '\n';
                    txt += `الإجراء: ${log.action}\n`;
                    txt += `النوع: ${log.type}\n`;
                    txt += `الوقت: ${new Date(log.timestamp).toLocaleString('ar-SA')}\n`;
                    txt += `الصفحة: ${log.page}\n`;
                    txt += `البيانات: ${JSON.stringify(log.data, null, 2)}\n\n`;
                });
                
                return txt;
                
            default:
                throw new Error('تنسيق غير معتمد');
        }
    }
    
    // حذف السجلات القديمة
    cleanupOldLogs(daysToKeep = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        const initialCount = this.logs.length;
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp) > cutoffDate
        );
        
        const removedCount = initialCount - this.logs.length;
        this.saveLogs();
        
        this.log('تنظيف السجلات', {
            removed: removedCount,
            remaining: this.logs.length,
            cutoffDate: cutoffDate.toISOString()
        }, 'system');
        
        return removedCount;
    }
    
    // مسح جميع السجلات
    clearAllLogs() {
        const count = this.logs.length;
        this.logs = [];
        this.saveLogs();
        
        this.log('مسح جميع السجلات', {
            cleared: count
        }, 'system');
        
        return count;
    }
    
    // توليد تقرير إحصائي
    generateReport() {
        const report = {
            totalLogs: this.logs.length,
            byType: {},
            byHour: {},
            recentActivities: [],
            errors: this.getLogsByType('error').length,
            securityEvents: this.getLogsByType('security').length
        };
        
        // تحليل حسب النوع
        this.logs.forEach(log => {
            report.byType[log.type] = (report.byType[log.type] || 0) + 1;
            
            // تحليل حسب الساعة
            const hour = new Date(log.timestamp).getHours();
            report.byHour[hour] = (report.byHour[hour] || 0) + 1;
        });
        
        // الأنشطة الأخيرة
        report.recentActivities = this.logs
            .slice(-10)
            .reverse()
            .map(log => ({
                time: new Date(log.timestamp).toLocaleString('ar-SA'),
                action: log.action,
                type: log.type
            }));
        
        return report;
    }
}

// إنشاء وتصدير نظام Kelog
const kelogSystem = new KelogSystem();
window.kelogSystem = kelogSystem;

// دمج مع نظام جمع البيانات الرئيسي
window.logToKelog = function(action, data) {
    return kelogSystem.log(action, data);
};

// عند تحميل الصفحة، تسجيل الزيارة في Kelog
document.addEventListener('DOMContentLoaded', function() {
    kelogSystem.log('تحميل الصفحة', {
        url: window.location.href,
        referrer: document.referrer,
        title: document.title
    }, 'page');
});

// تسجيل عند مغادرة الصفحة
window.addEventListener('beforeunload', function() {
    kelogSystem.log('مغادرة الصفحة', {
        timeOnPage: performance.now(),
        url: window.location.href
    }, 'page');
    
    // حفظ نهائي
    kelogSystem.saveLogs();
});

console.log('🚀 نظام Kelog جاهز للعمل!');
