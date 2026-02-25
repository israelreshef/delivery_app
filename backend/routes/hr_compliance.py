from flask import Blueprint, request, jsonify
from models import db, Courier, InsurancePolicy, EmploymentContract, User
from utils.decorators import token_required, role_required
import logging
from datetime import datetime
import os
import uuid
from werkzeug.utils import secure_filename

hr_compliance_bp = Blueprint('hr_compliance', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'files', 'hr_documents')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# =====================================================================
# Insurance Policy Management
# =====================================================================

@hr_compliance_bp.route('/insurance', methods=['POST'])
@token_required
@role_required(['courier', 'admin'])
def upload_insurance(current_user):
    """Couriers or Admins can upload a new insurance policy document."""
    try:
        if 'document' not in request.files:
            return jsonify({'error': 'No document file provided'}), 400
            
        file = request.files['document']
        if file.filename == '':
            return jsonify({'error': 'Empty file provided'}), 400
            
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Must be PDF or Image.'}), 400

        data = request.form
        policy_type = data.get('policy_type')
        provider_name = data.get('provider_name')
        policy_number = data.get('policy_number')
        valid_from = data.get('valid_from')
        valid_to = data.get('valid_to')
        
        if not all([policy_type, provider_name, policy_number, valid_from, valid_to]):
            return jsonify({'error': 'Missing required fields'}), 400

        # Determine target courier
        if current_user.user_type == 'courier':
            courier = current_user.courier
        else:
            courier_id = data.get('courier_id')
            if not courier_id:
                return jsonify({'error': 'Admin must provide courier_id'}), 400
            courier = Courier.query.get(courier_id)
            
        if not courier:
            return jsonify({'error': 'Courier not found'}), 404

        # Save File
        filename = secure_filename(f"ins_{courier.id}_{policy_type}_{uuid.uuid4().hex[:8]}.{file.filename.rsplit('.', 1)[1].lower()}")
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        file.save(file_path)

        # Create Policy Record
        policy = InsurancePolicy(
            courier_id=courier.id,
            policy_type=policy_type,
            provider_name=provider_name,
            policy_number=policy_number,
            valid_from=datetime.strptime(valid_from, '%Y-%m-%d').date(),
            valid_to=datetime.strptime(valid_to, '%Y-%m-%d').date(),
            document_url=f"/api/hr/documents/{filename}"
        )
        
        # Admin uploads are pre-verified
        if current_user.user_type == 'admin':
            policy.is_verified = True
            policy.verified_by = current_user.id
            
        db.session.add(policy)
        
        # Update Courier Master Record to link default policy
        courier.insurance_policy_number = policy_number
        db.session.commit()
        
        return jsonify({'message': 'Insurance uploaded successfully', 'id': policy.id}), 201

    except Exception as e:
        db.session.rollback()
        logging.error(f"Error uploading insurance: {e}")
        return jsonify({'error': str(e)}), 500

@hr_compliance_bp.route('/insurance/verify/<int:policy_id>', methods=['POST'])
@token_required
@role_required('admin')
def verify_insurance(current_user, policy_id):
    """Admin endpoint to verify a courier's uploaded insurance policy."""
    try:
        policy = InsurancePolicy.query.get_or_404(policy_id)
        policy.is_verified = True
        policy.verified_by = current_user.id
        db.session.commit()
        
        return jsonify({'message': 'Policy verified successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# =====================================================================
# HR Contracts (Employee vs Freelance)
# =====================================================================

@hr_compliance_bp.route('/contracts', methods=['GET'])
@token_required
@role_required(['admin'])
def list_contracts(current_user):
    try:
        contracts = EmploymentContract.query.order_by(EmploymentContract.signed_at.desc()).all()
        return jsonify([{
            'id': c.id,
            'courier_name': c.courier.full_name,
            'contract_type': c.contract_type,
            'signed_at': c.signed_at.isoformat(),
            'is_active': c.is_active
        } for c in contracts])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@hr_compliance_bp.route('/classification/<int:courier_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'hr_admin'])
def update_hr_classification(current_user, courier_id):
    """Updates the legal employment classification of a courier."""
    try:
        data = request.json
        new_type = data.get('employment_type') # 'freelance' or 'employee'
        
        if new_type not in ['freelance', 'employee']:
            return jsonify({'error': 'Invalid employment type'}), 400
            
        courier = Courier.query.get_or_404(courier_id)
        courier.employment_type = new_type
        courier.is_freelance_declared = (new_type == 'freelance')
        
        db.session.commit()
        
        # Audit Log
        from utils.audit import log_audit
        log_audit(
            action='UPDATE_HR_CLASSIFICATION',
            user_id=current_user.id,
            resource_type='Courier',
            resource_id=courier_id,
            details=f"Changed classification to {new_type}"
        )
        
        return jsonify({'message': 'Courier classification updated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
