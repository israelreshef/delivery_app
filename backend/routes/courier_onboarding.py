from flask import Blueprint, request, jsonify
import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename

# Import from parent directory
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from models import db, Courier, CourierDocument, User
from utils.decorators import token_required, role_required
import logging

courier_onboarding_bp = Blueprint('courier_onboarding', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'pdf'}
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads', 'documents')

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@courier_onboarding_bp.route('/onboarding', methods=['POST'])
@token_required
@role_required(['courier', 'admin'])
def update_onboarding_details(current_user):
    """Update courier compliance details"""
    try:
        data = request.json
        
        # Get courier record
        courier = None
        if current_user.user_type == 'courier':
             courier = Courier.query.filter_by(user_id=current_user.id).first()
        elif current_user.user_type == 'admin' and 'courier_id' in data:
             courier = Courier.query.get(data['courier_id'])
             
        if not courier:
            return jsonify({'error': 'Courier not found'}), 404
            
        # Update fields
        if 'national_id' in data:
            courier.national_id = data['national_id']
        if 'drivers_license_number' in data:
            courier.drivers_license_number = data['drivers_license_number']
        if 'insurance_policy_number' in data:
            courier.insurance_policy_number = data['insurance_policy_number']
        if 'is_freelance_declared' in data:
            courier.is_freelance_declared = bool(data['is_freelance_declared'])
            
        # Update status if all fields are present
        if courier.national_id and courier.drivers_license_number and courier.insurance_policy_number:
            courier.onboarding_status = 'pending_approval'
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Onboarding details updated',
            'status': courier.onboarding_status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error updating onboarding: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@courier_onboarding_bp.route('/documents', methods=['POST'])
@token_required
@role_required(['courier', 'admin'])
def upload_document(current_user):
    """Upload a compliance document (Encrypted & Secure)"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        document_type = request.form.get('type') # id_card, license, insurance
        
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if not document_type:
             return jsonify({'error': 'Document type required'}), 400

        if file and allowed_file(file.filename):
            # 1. Secure Filename & Paths
            # Store in 'secure_uploads' (NOT static)
            SECURE_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'secure_uploads', 'documents')
            os.makedirs(SECURE_UPLOAD_FOLDER, exist_ok=True)
            
            ext = file.filename.rsplit('.', 1)[1].lower()
            filename = f"{current_user.id}_{document_type}_{uuid.uuid4().hex[:8]}.{ext}.enc" # .enc extension
            filepath = os.path.join(SECURE_UPLOAD_FOLDER, filename)
            
            # 2. Virus Scan
            from utils.audit import scan_file_virus
            file_content = file.read() # Read original
            
            if not scan_file_virus(file_content):
                from utils.audit import log_audit
                log_audit('UPLOAD_REJECTED', user_id=current_user.id, details=f"Virus detected in {filename}", status='FAILURE')
                return jsonify({'error': 'Malware detected'}), 400

            # 3. Basic Magic Number Check (Simple)
            if len(file_content) > 5 * 1024 * 1024: # 5MB limit
                return jsonify({'error': 'File too large (Max 5MB)'}), 400
            
            # 4. Encrypt Content
            from utils.file_encryption import encrypt_data
            encrypted_content = encrypt_data(file_content)
            
            # 5. Write to Disk
            with open(filepath, 'wb') as f:
                f.write(encrypted_content)
            
            # 6. Update DB
            courier = Courier.query.filter_by(user_id=current_user.id).first()
            if not courier:
                return jsonify({'error': 'Courier profile not found'}), 404
                
            doc = CourierDocument(
                courier_id=courier.id,
                document_type=document_type,
                file_path=filename, # Store just filename or relative path in secure folder
                status='pending'
            )
            db.session.add(doc)
            
            # Update courier status if needed
            courier.onboarding_status = 'docs_uploaded'
            db.session.commit()
            
            # Audit Log
            from utils.audit import log_audit
            log_audit('UPLOAD_DOCUMENT', user_id=current_user.id, resource_type='CourierDocument', resource_id=doc.id, details=f"Encrypted upload: {document_type}")
            
            return jsonify({
                'success': True,
                'message': 'File uploaded and encrypted successfully',
                'document_id': doc.id
            }), 201
            
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error uploading document: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@courier_onboarding_bp.route('/documents/<int:doc_id>', methods=['GET'])
@token_required
def get_document(current_user, doc_id):
    """Retrieve and decrypt a document"""
    try:
        doc = CourierDocument.query.get_or_404(doc_id)
        courier = Courier.query.get(doc.courier_id)
        
        # Access Control: Admin or Owner only
        is_owner = (current_user.user_type == 'courier' and courier.user_id == current_user.id)
        is_admin = (current_user.user_type == 'admin')
        
        if not (is_owner or is_admin):
            return jsonify({'error': 'Unauthorized'}), 403
            
        # Path logic
        SECURE_UPLOAD_FOLDER = os.path.join(os.getcwd(), 'secure_uploads', 'documents')
        # Handle cases where path might be relative or full (legacy vs new)
        filename = os.path.basename(doc.file_path) 
        filepath = os.path.join(SECURE_UPLOAD_FOLDER, filename)
        
        if not os.path.exists(filepath):
            return jsonify({'error': 'File not found'}), 404
            
        # Decrypt
        from utils.file_encryption import decrypt_file_to_memory
        from io import BytesIO
        from flask import send_file
        
        try:
            decrypted_data = decrypt_file_to_memory(filepath)
            
            # Determine mime type based on extension in filename (minus .enc)
            original_ext = filename.replace('.enc', '').rsplit('.', 1)[-1].lower()
            mimetypes = {'pdf': 'application/pdf', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
            mimetype = mimetypes.get(original_ext, 'application/octet-stream')
            
            return send_file(
                BytesIO(decrypted_data),
                mimetype=mimetype,
                as_attachment=False, # View in browser
                download_name=filename.replace('.enc', '')
            )
        except Exception as e:
            return jsonify({'error': f'Decryption failed: {str(e)}'}), 500
            
    except Exception as e:
        logging.error(f"Error retrieving document: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500
