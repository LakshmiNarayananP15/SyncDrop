import os
import socket
import json
import io
import time
import queue
from flask import Flask, request, render_template, jsonify, Response, send_file
import qrcode

app = Flask(__name__)

import tempfile

# Use a temp directory for Vercel compatibility
UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'syncdrop_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# For Server-Sent Events
clients = []

def notify_clients(file_info):
    for q in clients:
        q.put(file_info)

# ---------------------------------------------------------
# CORS configuration
# ---------------------------------------------------------
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

# ---------------------------------------------------------
# The Server Logic (Updated for Multiple Files)
# ---------------------------------------------------------
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        # Check if the post request has the file part
        if 'file' not in request.files:
            if request.headers.get('Accept') == 'application/json':
                return jsonify({"status": "error", "message": "No file part"}), 400
            return "No file part", 400
        
        # Use getlist() to retrieve all uploaded files!
        files = request.files.getlist('file')
        
        if not files or files[0].filename == '':
            if request.headers.get('Accept') == 'application/json':
                return jsonify({"status": "error", "message": "No selected files"}), 400
            return "No selected files", 400
            
        saved_count = 0
        for file in files:
            if file and file.filename:
                # Save each file to the laptop's hard drive
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
                file.save(filepath)
                print(f"✅ Received: {file.filename}")
                saved_count += 1
                
                size = os.path.getsize(filepath)
                if size > 1024 * 1024:
                    size_str = f"{size / (1024 * 1024):.1f} MB"
                else:
                    size_str = f"{size / 1024:.1f} KB"
                
                # Notify frontend clients
                notify_clients({
                    "id": file.filename + str(time.time()),
                    "name": file.filename,
                    "size": size_str,
                    "time": "Just now",
                    "timestamp": time.time()
                })
                
        if request.headers.get('Accept') == 'application/json' or request.is_json:
            return jsonify({
                "status": "success",
                "message": f"Saved {saved_count} file(s)",
                "count": saved_count
            }), 200
            
        return render_template('success.html', count=saved_count)
            
    return render_template('mobile.html')

# ---------------------------------------------------------
# API Endpoints for Frontend Integration
# ---------------------------------------------------------
from qrcode.image.pil import PilImage

@app.route('/api/qr')
def get_qr():
    ip_address = get_local_ip()
    port = 3000 # Point to Vite frontend
    url = f"http://{ip_address}:{port}"
    
    img = qrcode.make(url, image_factory=PilImage)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    return send_file(buf, mimetype='image/png')

@app.route('/api/files')
def get_files():
    files = []
    if os.path.exists(app.config['UPLOAD_FOLDER']):
        for filename in os.listdir(app.config['UPLOAD_FOLDER']):
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if os.path.isfile(filepath):
                size = os.path.getsize(filepath)
                if size > 1024 * 1024:
                    size_str = f"{size / (1024 * 1024):.1f} MB"
                else:
                    size_str = f"{size / 1024:.1f} KB"
                
                mtime = os.path.getmtime(filepath)
                diff = time.time() - mtime
                if diff < 60:
                    time_str = "Just now"
                elif diff < 3600:
                    time_str = f"{int(diff/60)} mins ago"
                elif diff < 86400:
                    time_str = f"{int(diff/3600)} hours ago"
                else:
                    time_str = f"{int(diff/86400)} days ago"
                
                files.append({
                    "id": filename + str(mtime),
                    "name": filename,
                    "size": size_str,
                    "time": time_str,
                    "timestamp": mtime
                })
        
    files.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify(files)

@app.route('/api/download/<filename>')
def download_file(filename):
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True)
    return jsonify({"error": "File not found"}), 404

@app.route('/api/stream')
def stream():
    def event_stream():
        q = queue.Queue()
        clients.append(q)
        try:
            while True:
                file_info = q.get()
                yield f"data: {json.dumps(file_info)}\n\n"
        finally:
            clients.remove(q)
    
    return Response(event_stream(), mimetype="text/event-stream")

# ---------------------------------------------------------
# Networking & QR Code Generation
# ---------------------------------------------------------
def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

if __name__ == '__main__':
    ip_address = get_local_ip()
    port = 5000
    frontend_url = f"http://{ip_address}:3000"
    
    print("\n" + "="*50)
    print(f"🚀 SYNCDROP SERVER IS RUNNING")
    print(f"🔗 URL: {frontend_url} (Frontend)")
    print("="*50 + "\n")
    print("Scan this QR code with your phone to connect:\n")
    
    qr = qrcode.QRCode()
    qr.add_data(frontend_url)
    qr.print_ascii(invert=True) 
    
    print("\nWaiting for files...")
    
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)