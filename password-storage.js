// 📁 password-storage.js - نظام تخزين كلمات المرور الآمن

class PasswordStorage {
    constructor() {
        this.version = '2.0.0';
        this.passwords = [];
        this.encryptionKey = null;
        this.settings = {
            autoSave: true,
            encryption: true,
            backup: true,
            maxPasswords: 1000,
            sessionTimeout: 30 * 60 * 1000 // 30 دقيقة
        };
        
        this.initialize();
    }
    
    // تهيئة النظام
    async initialize() {
        console.log(`🔐 Password Storage v${this.version} initializing...`);
        
        // تحميل الإعدادات
        this.loadSettings();
        
        // تحميل كلمات المرور
        await this.loadPasswords();
        
        // إعداد التشفير
        await this.setupEncryption();
        
        // بدء مراقبة الجلسة
        this.startSessionMonitoring();
        
        console.log('✅ Password Storage ready');
    }
    
    // تحميل الإعدادات
    loadSettings() {
        try {
            const saved = localStorage.getItem('password_storage_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('⚠️ Settings load error:', error);
        }
    }
    
    // تحميل كلمات المرور
    async loadPasswords() {
        try {
            const saved = localStorage.getItem('encrypted_passwords');
            if (saved) {
                if (this.settings.encryption && this.encryptionKey) {
                    const decrypted = await this.decryptData(saved);
                    this.passwords = JSON.parse(decrypted) || [];
                } else {
                    this.passwords = JSON.parse(saved) || [];
                }
            }
            
            console.log(`🔑 Loaded ${this.passwords.length} passwords`);
            
        } catch (error) {
            console.warn('⚠️ Password load error:', error);
            this.passwords = [];
        }
    }
    
    // إعداد التشفير
    async setupEncryption() {
        if (!this.settings.encryption) return;
        
        try {
            // محاولة استخدام مفتاح موجود
            let key = localStorage.getItem('password_encryption_key');
            
            if (!key) {
                // إنشاء مفتاح جديد
                key = this.generateEncryptionKey();
                localStorage.setItem('password_encryption_key', key);
            }
            
            this.encryptionKey = key;
            console.log('🔐 Encryption setup complete');
            
        } catch (error) {
            console.warn('⚠️ Encryption setup error:', error);
            this.settings.encryption = false;
        }
    }
    
    // توليد مفتاح تشفير
    generateEncryptionKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let key = '';
        
        for (let i = 0; i < 32; i++) {
            key += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return key;
    }
    
    // تشفير البيانات
    async encryptData(data) {
        if (!this.settings.encryption || !this.encryptionKey) {
            return data;
        }
        
        try {
            // تشفير بسيط باستخدام XOR (يمكن استبداله بمكتبة تشفير أقوى)
            const str = JSON.stringify(data);
            let encrypted = '';
            
            for (let i = 0; i < str.length; i++) {
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                encrypted += String.fromCharCode(str.charCodeAt(i) ^ keyChar);
            }
            
            return btoa(encrypted);
            
        } catch (error) {
            console.warn('⚠️ Encryption error:', error);
            return data;
        }
    }
    
    // فك تشفير البيانات
    async decryptData(encrypted) {
        if (!this.settings.encryption || !this.encryptionKey) {
            return encrypted;
        }
        
        try {
            const decoded = atob(encrypted);
            let decrypted = '';
            
            for (let i = 0; i < decoded.length; i++) {
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ keyChar);
            }
            
            return decrypted;
            
        } catch (error) {
            console.warn('⚠️ Decryption error:', error);
            return encrypted;
        }
    }
    
    // حفظ كلمة المرور
    async savePassword(passwordData) {
        try {
            // التحقق من البيانات
            if (!passwordData || !passwordData.password) {
                throw new Error('Invalid password data');
            }
            
            // إنشاء سجل جديد
            const passwordRecord = {
                id: this.generateId(),
                timestamp: new Date().toISOString(),
                ...passwordData,
                metadata: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                    device: this.getDeviceInfo(),
                    ip: await this.getIPAddress()
                }
            };
            
            // تحليل كلمة المرور
            passwordRecord.analysis = this.analyzePassword(passwordData.password);
            
            // إضافة إلى القائمة
            this.passwords.push(passwordRecord);
            
            // الاحتفاظ بعدد محدود
            if (this.passwords.length > this.settings.maxPasswords) {
                this.passwords = this.passwords.slice(-this.settings.maxPasswords);
            }
            
            // حفظ التغييرات
            await this.saveAllPasswords();
            
            // إنشاء نسخة احتياطية
            if (this.settings.backup) {
                await this.createBackup();
            }
            
            console.log('💾 Password saved:', passwordRecord.id);
            
            return {
                success: true,
                id: passwordRecord.id,
                analysis: passwordRecord.analysis
            };
            
        } catch (error) {
            console.error('❌ Password save error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // توليد معرف فريد
    generateId() {
        return 'pwd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // الحصول على معلومات الجهاز
    getDeviceInfo() {
        const ua = navigator.userAgent.toLowerCase();
        let device = 'desktop';
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            device = 'tablet';
        } else if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi/i.test(ua)) {
            device = 'mobile';
        }
        
        return {
            type: device,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: `${screen.width}x${screen.height}`
        };
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
    
    // تحليل كلمة المرور
    analyzePassword(password) {
        const analysis = {
            length: password.length,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecial: /[^A-Za-z0-9]/.test(password),
            commonPatterns: this.detectCommonPatterns(password),
            strength: this.calculatePasswordStrength(password),
            entropy: this.calculateEntropy(password)
        };
        
        return analysis;
    }
    
    // اكتشاف الأنماط الشائعة
    detectCommonPatterns(password) {
        const patterns = [];
        
        // تسلسلات لوحة المفاتيح
        const keyboardPatterns = [
            'qwerty', 'asdfgh', 'zxcvbn', '123456', 'password',
            'admin', 'welcome', 'qwertyuiop', '1q2w3e4r', '1qaz2wsx'
        ];
        
        keyboardPatterns.forEach(pattern => {
            if (password.toLowerCase().includes(pattern)) {
                patterns.push(`keyboard_pattern_${pattern}`);
            }
        });
        
        // التواريخ
        const datePattern = /\d{4}|\d{2}[-/]\d{2}[-/]\d{2,4}/;
        if (datePattern.test(password)) {
            patterns.push('contains_date');
        }
        
        // أسماء شائعة
        const commonNames = ['john', 'michael', 'david', 'maria', 'anna'];
        commonNames.forEach(name => {
            if (password.toLowerCase().includes(name)) {
                patterns.push(`common_name_${name}`);
            }
        });
        
        return patterns;
    }
    
    // حساب قوة كلمة المرور
    calculatePasswordStrength(password) {
        let score = 0;
        
        // الطول
        if (password.length >= 8) score += 1;
        if (password.length >= 12) score += 1;
        if (password.length >= 16) score += 1;
        
        // التعقيد
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/\d/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        // التقييم
        if (score <= 3) return 'very_weak';
        if (score <= 5) return 'weak';
        if (score <= 7) return 'medium';
        if (score <= 9) return 'strong';
        return 'very_strong';
    }
    
    // حساب الإنتروبيا
    calculateEntropy(password) {
        const charsetSize = this.getCharsetSize(password);
        const entropy = Math.log2(Math.pow(charsetSize, password.length));
        return Math.round(entropy * 100) / 100;
    }
    
    // حساب حجم مجموعة الأحرف
    getCharsetSize(password) {
        let size = 0;
        if (/[a-z]/.test(password)) size += 26;
        if (/[A-Z]/.test(password)) size += 26;
        if (/\d/.test(password)) size += 10;
        if (/[^A-Za-z0-9]/.test(password)) size += 32; // تقدير للأحرف الخاصة
        
        return size || 1;
    }
    
    // حفظ جميع كلمات المرور
    async saveAllPasswords() {
        try {
            let dataToSave = JSON.stringify(this.passwords);
            
            // تشفير إذا كان مفعلاً
            if (this.settings.encryption && this.encryptionKey) {
                dataToSave = await this.encryptData(dataToSave);
            }
            
            localStorage.setItem('encrypted_passwords', dataToSave);
            
            // تحديث timestamp
            localStorage.setItem('passwords_last_save', Date.now().toString());
            
            return true;
            
        } catch (error) {
            console.error('❌ Save all passwords error:', error);
            return false;
        }
    }
    
    // إنشاء نسخة احتياطية
    async createBackup() {
        try {
            const backup = {
                id: `backup_${Date.now()}`,
                timestamp: new Date().toISOString(),
                count: this.passwords.length,
                passwords: this.passwords.slice(-100), // آخر 100 كلمة مرور
                metadata: {
                    userAgent: navigator.userAgent,
                    device: this.getDeviceInfo()
                }
            };
            
            const backups = JSON.parse(localStorage.getItem('password_backups') || '[]');
            backups.push(backup);
            
            // الاحتفاظ بـ 10 نسخ فقط
            if (backups.length > 10) {
                backups.splice(0, backups.length - 10);
            }
            
            localStorage.setItem('password_backups', JSON.stringify(backups));
            
            console.log('💾 Password backup created');
            
            return backup.id;
            
        } catch (error) {
            console.warn('⚠️ Backup error:', error);
            return null;
        }
    }
    
    // استعادة من نسخة احتياطية
    async restoreBackup(backupId) {
        try {
            const backups = JSON.parse(localStorage.getItem('password_backups') || '[]');
            const backup = backups.find(b => b.id === backupId);
            
            if (!backup) {
                throw new Error('Backup not found');
            }
            
            this.passwords = backup.passwords;
            await this.saveAllPasswords();
            
            console.log('🔄 Backup restored:', backupId);
            
            return {
                success: true,
                count: backup.passwords.length
            };
            
        } catch (error) {
            console.error('❌ Restore error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // البحث في كلمات المرور
    searchPasswords(query, options = {}) {
        const {
            field = 'all', // all, website, username, email, password
            exactMatch = false,
            limit = 100
        } = options;
        
        let results = this.passwords;
        
        if (query) {
            const searchStr = query.toLowerCase();
            
            results = results.filter(record => {
                if (field === 'all') {
                    return (
                        (record.website && record.website.toLowerCase().includes(searchStr)) ||
                        (record.username && record.username.toLowerCase().includes(searchStr)) ||
                        (record.email && record.email.toLowerCase().includes(searchStr)) ||
                        (record.password && record.password.toLowerCase().includes(searchStr))
                    );
                } else if (record[field]) {
                    const fieldValue = String(record[field]).toLowerCase();
                    return exactMatch ? 
                        fieldValue === searchStr : 
                        fieldValue.includes(searchStr);
                }
                return false;
            });
        }
        
        // ترتيب حسب الوقت (الأحدث أولاً)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return results.slice(0, limit);
    }
    
    // الحصول على إحصائيات
    getStatistics() {
        const stats = {
            total: this.passwords.length,
            byStrength: {
                very_weak: 0,
                weak: 0,
                medium: 0,
                strong: 0,
                very_strong: 0
            },
            byDevice: {},
            last24Hours: 0,
            lastHour: 0
        };
        
        const now = Date.now();
        const dayAgo = now - 24 * 60 * 60 * 1000;
        const hourAgo = now - 60 * 60 * 1000;
        
        this.passwords.forEach(pwd => {
            // حسب القوة
            const strength = pwd.analysis?.strength || 'unknown';
            stats.byStrength[strength] = (stats.byStrength[strength] || 0) + 1;
            
            // حسب الجهاز
            const device = pwd.metadata?.device?.type || 'unknown';
            stats.byDevice[device] = (stats.byDevice[device] || 0) + 1;
            
            // حسب الوقت
            const pwdTime = new Date(pwd.timestamp).getTime();
            if (pwdTime > dayAgo) stats.last24Hours++;
            if (pwdTime > hourAgo) stats.lastHour++;
        });
        
        return stats;
    }
    
    // تصدير كلمات المرور
    exportPasswords(format = 'json', options = {}) {
        const {
            includeAnalysis = true,
            includeMetadata = true,
            password = true
        } = options;
        
        let dataToExport = this.passwords;
        
        // تطبيق الفلاتر
        if (!password) {
            dataToExport = dataToExport.map(pwd => ({
                ...pwd,
                password: '***REDACTED***'
            }));
        }
        
        if (!includeAnalysis) {
            dataToExport = dataToExport.map(({ analysis, ...rest }) => rest);
        }
        
        if (!includeMetadata) {
            dataToExport = dataToExport.map(({ metadata, ...rest }) => rest);
        }
        
        let content, filename, mimeType;
        
        switch(format) {
            case 'json':
                content = JSON.stringify(dataToExport, null, 2);
                filename = `passwords_export_${Date.now()}.json`;
                mimeType = 'application/json';
                break;
                
            case 'csv':
                content = this.convertToCSV(dataToExport);
                filename = `passwords_export_${Date.now()}.csv`;
                mimeType = 'text/csv';
                break;
                
            case 'txt':
                content = this.convertToTXT(dataToExport);
                filename = `passwords_export_${Date.now()}.txt`;
                mimeType = 'text/plain';
                break;
                
            default:
                throw new Error(`Unsupported format: ${format}`);
        }
        
        return { content, filename, mimeType };
    }
    
    // تحويل إلى CSV
    convertToCSV(passwords) {
        if (passwords.length === 0) return '';
        
        const headers = ['Timestamp', 'Website', 'Username', 'Email', 'Password', 'Strength', 'Length'];
        let csv = headers.join(',') + '\n';
        
        passwords.forEach(pwd => {
            const row = [
                `"${pwd.timestamp}"`,
                `"${pwd.website || 'N/A'}"`,
                `"${pwd.username || 'N/A'}"`,
                `"${pwd.email || 'N/A'}"`,
                `"${pwd.password || 'N/A'}"`,
                `"${pwd.analysis?.strength || 'N/A'}"`,
                `"${pwd.analysis?.length || '0'}"`
            ];
            
            csv += row.join(',') + '\n';
        });
        
        return csv;
    }
    
    // تحويل إلى نص
    convertToTXT(passwords) {
        let txt = '='.repeat(80) + '\n';
        txt += 'PASSWORD STORAGE EXPORT\n';
        txt += '='.repeat(80) + '\n\n';
        
        txt += `Total Passwords: ${passwords.length}\n`;
        txt += `Export Time: ${new Date().toLocaleString('de-DE')}\n\n`;
        
        passwords.forEach((pwd, index) => {
            txt += `[${index + 1}] ${pwd.timestamp}\n`;
            txt += `   Website: ${pwd.website || 'N/A'}\n`;
            txt += `   Username: ${pwd.username || 'N/A'}\n`;
            txt += `   Email: ${pwd.email || 'N/A'}\n`;
            txt += `   Password: ${pwd.password || 'N/A'}\n`;
            txt += `   Strength: ${pwd.analysis?.strength || 'N/A'}\n`;
            txt += `   Length: ${pwd.analysis?.length || '0'} characters\n`;
            
            if (pwd.metadata?.device) {
                txt += `   Device: ${pwd.metadata.device.type}\n`;
            }
            
            txt += '-'.repeat(60) + '\n';
        });
        
        return txt;
    }
    
    // بدء مراقبة الجلسة
    startSessionMonitoring() {
        // إعادة تعيين المهلة عند التفاعل
        const resetTimeout = () => {
            if (this.sessionTimeout) {
                clearTimeout(this.sessionTimeout);
            }
            
            this.sessionTimeout = setTimeout(() => {
                this.clearSession();
            }, this.settings.sessionTimeout);
        };
        
        // إعادة تعيين عند التفاعل مع الصفحة
        document.addEventListener('click', resetTimeout);
        document.addEventListener('keypress', resetTimeout);
        document.addEventListener('mousemove', resetTimeout);
        
        // بدء المهلة
        resetTimeout();
    }
    
    // مسح بيانات الجلسة
    clearSession() {
        console.log('🔒 Clearing session data...');
        
        // هنا يمكنك إضافة منطق لمسح البيانات الحساسة من الذاكرة
        // لكننا نحتفظ بالبيانات في localStorage للاستخدام المستقبلي
        
        // إعادة تعيين المهلة
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
    }
    
    // تغيير مفتاح التشفير
    async changeEncryptionKey(newKey) {
        if (!newKey || newKey.length < 8) {
            throw new Error('Encryption key must be at least 8 characters');
        }
        
        try {
            const oldKey = this.encryptionKey;
            this.encryptionKey = newKey;
            
            // إعادة تشفير جميع البيانات بالمفتاح الجديد
            await this.saveAllPasswords();
            
            localStorage.setItem('password_encryption_key', newKey);
            
            console.log('🔐 Encryption key changed');
            
            return {
                success: true,
                message: 'Encryption key changed successfully'
            };
            
        } catch (error) {
            console.error('❌ Key change error:', error);
            
            // استعادة المفتاح القديم في حالة الخطأ
            this.encryptionKey = oldKey;
            
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // حذف جميع كلمات المرور
    async deleteAllPasswords() {
        try {
            this.passwords = [];
            localStorage.removeItem('encrypted_passwords');
            localStorage.removeItem('password_backups');
            
            console.log('🗑️ All passwords deleted');
            
            return {
                success: true,
                message: 'All passwords deleted'
            };
            
        } catch (error) {
            console.error('❌ Delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // الحصول على تقرير النظام
    getSystemReport() {
        const stats = this.getStatistics();
        
        return {
            version: this.version,
            settings: this.settings,
            statistics: stats,
            encryption: {
                enabled: this.settings.encryption,
                hasKey: !!this.encryptionKey
            },
            lastUpdate: localStorage.getItem('passwords_last_save') || 'never'
        };
    }
}

// تصدير النظام للاستخدام العالمي
window.PasswordStorage = PasswordStorage;

// تهيئة النظام تلقائياً
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        if (!window.passwordStorage) {
            window.passwordStorage = new PasswordStorage();
            console.log('🔐 Password Storage loaded globally as window.passwordStorage');
        }
    });
}

export default PasswordStorage;
