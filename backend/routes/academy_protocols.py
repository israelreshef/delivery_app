from flask import Blueprint, jsonify, request
from models import db, AcademyProtocolCourse, AcademyProtocolLesson, AcademyProtocolProgress, Courier, CourierGamification
from utils.decorators import token_required, role_required
import logging
from datetime import datetime

academy_protocols_bp = Blueprint('academy_protocols', __name__)

@academy_protocols_bp.route('', methods=['GET'])
@token_required
@role_required('courier')
def get_protocol_courses(current_user):
    """List all protocol courses + courier's progress"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        if not courier:
            return jsonify({'error': 'Courier profile not found'}), 404
            
        # Get level from gamification or default to 1
        # (Assuming CourierGamification exists as seen in academy.py)
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        current_level = gamification.level if gamification else 1
        
        courses = AcademyProtocolCourse.query.filter_by(is_active=True).all()
        progress_entries = AcademyProtocolProgress.query.filter_by(courier_id=courier.id).all()
        progress_map = {p.course_id: p for p in progress_entries}
        
        result = []
        for course in courses:
            progress = progress_map.get(course.id)
            
            status = 'locked'
            if current_level >= course.required_level:
                status = progress.status if progress else 'not_started'
            
            result.append({
                'id': course.id,
                'protocol_slug': course.protocol_slug,
                'title': course.title,
                'description': course.description,
                'estimated_minutes': course.estimated_minutes,
                'passing_score': course.passing_score,
                'required_level': course.required_level,
                'status': status,
                'score': progress.score if progress else None,
                'completed_at': progress.completed_at.isoformat() if progress and progress.completed_at else None
            })
            
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error fetching Academy protocols: {e}")
        return jsonify({'error': str(e)}), 500

@academy_protocols_bp.route('/<int:course_id>', methods=['GET'])
@token_required
@role_required('courier')
def get_course_content(current_user, course_id):
    """Full course content (lessons)"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        course = AcademyProtocolCourse.query.get(course_id)
        if not course:
            return jsonify({'error': 'Course not found'}), 404
            
        # Check level requirement
        gamification = CourierGamification.query.filter_by(courier_id=courier.id).first()
        if (gamification.level if gamification else 1) < course.required_level:
            return jsonify({'error': f'Course requires level {course.required_level}'}), 403
            
        lessons = AcademyProtocolLesson.query.filter_by(course_id=course.id).order_by(AcademyProtocolLesson.order_index).all()
        
        # Ensure progress record exists
        progress = AcademyProtocolProgress.query.filter_by(courier_id=courier.id, course_id=course.id).first()
        if not progress:
            progress = AcademyProtocolProgress(courier_id=courier.id, course_id=course.id, status='in_progress')
            db.session.add(progress)
            db.session.commit()
            
        return jsonify({
            'course': {
                'id': course.id,
                'title': course.title,
                'status': progress.status
            },
            'lessons': [{
                'id': L.id,
                'order_index': L.order_index,
                'title': L.title,
                'lesson_type': L.lesson_type
            } for L in lessons]
        }), 200
    except Exception as e:
        logging.error(f"Error fetching course content: {e}")
        return jsonify({'error': str(e)}), 500

@academy_protocols_bp.route('/<int:course_id>/lessons/<int:lesson_id>', methods=['GET'])
@token_required
@role_required('courier')
def get_lesson(current_user, course_id, lesson_id):
    """Single lesson content"""
    try:
        lesson = AcademyProtocolLesson.query.filter_by(id=lesson_id, course_id=course_id).first()
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
            
        return jsonify({
            'id': lesson.id,
            'title': lesson.title,
            'content': lesson.content,
            'lesson_type': lesson.lesson_type
        }), 200
    except Exception as e:
        logging.error(f"Error fetching lesson: {e}")
        return jsonify({'error': str(e)}), 500

@academy_protocols_bp.route('/<int:course_id>/quiz/questions', methods=['GET'])
@token_required
@role_required('courier')
def get_quiz_questions(current_user, course_id):
    """Return quiz questions without revealing the correct answers."""
    try:
        from models import AcademyProtocolQuizQuestion
        questions = AcademyProtocolQuizQuestion.query.filter_by(course_id=course_id)\
            .order_by(AcademyProtocolQuizQuestion.order_index.asc()).all()

        return jsonify([{
            'id': q.id,
            'question_text': q.question_text,
            'option_1': q.option_1,
            'option_2': q.option_2,
            'option_3': q.option_3,
            'option_4': q.option_4
        } for q in questions]), 200
    except Exception as e:
        logging.error(f"Error fetching quiz questions: {e}")
        return jsonify({'error': str(e)}), 500

@academy_protocols_bp.route('/<int:course_id>/quiz/submit', methods=['POST'])
@token_required
@role_required('courier')
def submit_quiz(current_user, course_id):
    """Submit quiz answers, get score"""
    try:
        from models import AcademyProtocolQuizQuestion
        data = request.json
        answers = data.get('answers', []) # List of {"question_id": 1, "selected_option": 2}
        
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        course = AcademyProtocolCourse.query.get(course_id)
        
        if not course or not courier:
            return jsonify({'error': 'Invalid request'}), 400

        # Get all questions for this course
        questions = AcademyProtocolQuizQuestion.query.filter_by(course_id=course_id).all()
        if not questions:
            return jsonify({'error': 'No questions found for this course'}), 404

        total_questions = len(questions)
        correct_count = 0
        feedback = []

        # Build map for easier lookup
        answer_map = {a['question_id']: a['selected_option'] for a in answers}

        for q in questions:
            selected = answer_map.get(q.id)
            is_correct = (selected == q.correct_option)
            if is_correct:
                correct_count += 1
            
            feedback.append({
                'question_id': q.id,
                'question_text': q.question_text,
                'selected_option': selected,
                'correct_option': q.correct_option,
                'is_correct': is_correct,
                'explanation': q.explanation,
                'option_1': q.option_1,
                'option_2': q.option_2,
                'option_3': q.option_3,
                'option_4': q.option_4
            })

        score = int((correct_count / total_questions) * 100) if total_questions > 0 else 0
            
        progress = AcademyProtocolProgress.query.filter_by(courier_id=courier.id, course_id=course.id).first()
        if not progress:
            progress = AcademyProtocolProgress(courier_id=courier.id, course_id=course.id)
            db.session.add(progress)
            
        progress.attempts += 1
        progress.score = score
        
        if score >= course.passing_score:
            progress.status = 'passed'
            progress.completed_at = datetime.utcnow()
            passed = True
        else:
            progress.status = 'failed'
            passed = False
            
        db.session.commit()
        
        return jsonify({
            'passed': passed,
            'score': score,
            'passing_score': course.passing_score,
            'status': progress.status,
            'feedback': feedback
        }), 200
    except Exception as e:
        logging.error(f"Error submitting quiz: {e}")
        return jsonify({'error': str(e)}), 500

@academy_protocols_bp.route('/my-certifications', methods=['GET'])
@token_required
@role_required('courier')
def get_my_certs(current_user):
    """All passed courses for logged-in courier"""
    try:
        courier = Courier.query.filter_by(user_id=current_user.id).first()
        certs = db.session.query(AcademyProtocolProgress, AcademyProtocolCourse)\
            .join(AcademyProtocolCourse, AcademyProtocolProgress.course_id == AcademyProtocolCourse.id)\
            .filter(AcademyProtocolProgress.courier_id == courier.id, AcademyProtocolProgress.status == 'passed')\
            .all()
            
        result = []
        for progress, course in certs:
            result.append({
                'id': course.id,
                'protocol_slug': course.protocol_slug,
                'title': course.title,
                'completed_at': progress.completed_at.isoformat()
            })
            
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error fetching certifications: {e}")
        return jsonify({'error': str(e)}), 500
