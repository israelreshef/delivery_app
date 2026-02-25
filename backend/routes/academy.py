from flask import Blueprint, jsonify, request
from models import db, Courier, Course, CourseLesson, CourierCertification, CourierGamification
from utils.decorators import token_required, role_required
import logging
from services.certificates import CertificateService

academy_bp = Blueprint('academy', __name__)

@academy_bp.route('/courses', methods=['GET'])
@token_required
@role_required('courier')
def get_courses(current_user):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier: return jsonify({'error': 'Courier not found'}), 404
        
        # Determine courier level
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        level = gamification.level if gamification else 1
        
        # Get all courses and all certifications for this courier
        all_courses = Course.query.order_by(Course.required_level.asc()).all()
        certs = CourierCertification.query.filter_by(courier_id=courier.id).all()
        cert_map = {c.course_id: c for c in certs}
        
        result = []
        for course in all_courses:
            cert = cert_map.get(course.id)
            
            # Default state
            status = 'locked'
            progress = 0.0
            
            # Lock/Unlock logic based on level
            if level >= course.required_level:
                status = 'unlocked'
            
            # If they already interacted with this course
            if cert:
                status = cert.status
                progress = cert.progress_percent
            
            result.append({
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'required_level': course.required_level,
                'icon': course.badge_icon_url,
                'status': status,
                'progress': progress,
                'lessons_count': course.lessons.count()
            })
            
        return jsonify(result), 200
    except Exception as e:
        db.session.rollback()
        logging.error(f"Error fetching Academy courses: {e}")
        return jsonify({'error': str(e)}), 500

@academy_bp.route('/courses/<int:course_id>', methods=['GET'])
@token_required
@role_required('courier')
def get_course_details(current_user, course_id):
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        course = Course.query.get(course_id)
        if not course or not courier:
            return jsonify({'error': 'Not found'}), 404
            
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        level = gamification.level if gamification else 1
        
        cert = CourierCertification.query.filter_by(courier_id=courier.id, course_id=course.id).first()
        status = cert.status if cert else ('unlocked' if level >= course.required_level else 'locked')
        
        if status == 'locked':
            return jsonify({'error': f'Course locked. Requires level {course.required_level}'}), 403
            
        if not cert:
            # First time opening it -> Move to training
            cert = CourierCertification(courier_id=courier.id, course_id=course.id, status='training')
            db.session.add(cert)
            db.session.commit()
            status = 'training'

        lessons = CourseLesson.query.filter_by(course_id=course.id).order_by(CourseLesson.order_index).all()
        
        return jsonify({
            'course': {
                'id': course.id,
                'title': course.title,
                'description': course.description,
                'status': status,
                'progress': cert.progress_percent if cert else 0.0,
                'temporaries_completed': cert.temporary_orders_completed if cert else 0
            },
            'lessons': [{
                'id': L.id,
                'title': L.title,
                'content': L.content_text,
                'video': L.video_url
            } for L in lessons]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@academy_bp.route('/courses/<int:course_id>/complete-quiz', methods=['POST'])
@token_required
@role_required('courier')
def complete_course_quiz(current_user, course_id):
    """Called when the courier finishes the theoretical part (video + quiz)"""
    try:
        from services.gamification import GamificationService
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        cert = CourierCertification.query.filter_by(courier_id=courier.id, course_id=course_id).first()
        
        if not cert: return jsonify({'error': 'Not enrolled'}), 400
        
        # Upgrade status to temporary - they now need to do 5 real-world deliveries of this type
        if cert.status == 'training':
            cert.status = 'temporary'
            cert.progress_percent = 50.0
            
            # Option to grant XP
            GamificationService.award_xp(courier.id, 50, f"Passed Theory: {cert.course.title}")
            db.session.commit()
            return jsonify({'success': True, 'new_status': 'temporary', 'message': 'Passed Theory! Complete 5 deliveries to earn permanent certification.'}), 200
        
        return jsonify({'success': False, 'message': 'Course not in training state.'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@academy_bp.route('/courses/<int:course_id>/certificate', methods=['GET'])
@token_required
@role_required('courier')
def get_digital_certificate(current_user, course_id):
    """
    Phase 4: Return the cryptographic JWT for offline validation
    (e.g., to power an Apple Wallet pass or QR Code)
    """
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        cert = CourierCertification.query.filter_by(courier_id=courier.id, course_id=course_id).first()
        
        if not cert or cert.status != 'permanent':
            return jsonify({'error': 'No permanent certification available.'}), 403
            
        token = CertificateService.generate_certificate(
            courier_name=courier.full_name,
            courier_id=courier.id,
            course_title=cert.course.title
        )
        
        return jsonify({'success': True, 'token': token}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@academy_bp.route('/verify-certificate', methods=['POST'])
def verify_certificate():
    """
    STATIC, PUBLIC VERIFICATION ENDPOINT
    No authentication required, no database hit necessary!
    Can be used by 3rd party hospitals or dispatchers scanning a QR code.
    """
    data = request.json
    token = data.get('token') if data else None
    
    if not token:
        return jsonify({'error': 'Token required'}), 400
        
    result = CertificateService.verify_certificate(token)
    
    # In a real PKPass scenario, this data would drive the Wallet pass UI
    if result.get('valid'):
        return jsonify({'success': True, 'data': result['data']}), 200
    else:
        return jsonify({'success': False, 'error': result.get('error')}), 400
