-- Protocol Templates Seed Data
INSERT INTO delivery_protocol_templates (code, name, steps) VALUES

('A', 'Personal Service', '[
  {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
  {"step": 2, "action": "verify_recipient_id", "label": "זיהוי נמען", "conditional": "requires_id_verification"},
  {"step": 3, "action": "deliver_to_recipient", "label": "מסירה אישית"},
  {"step": 4, "action": "collect_signature_or_photo", "label": "קבלת אישור"},
  {"step": 5, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
]'),

('B', 'Institutional Filing', '[
  {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
  {"step": 2, "action": "deliver_to_institution", "label": "הגשה למוסד"},
  {"step": 3, "action": "collect_stamp_or_receipt", "label": "קבלת חותמת/אישור"},
  {"step": 4, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
]'),

('C', 'Multi-Signature Circuit', '[
  {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
  {"step": 2, "action": "stop_signature", "label": "החתמה — עצירה 1"},
  {"step": 3, "action": "stop_signature_optional", "label": "החתמה — עצירה 2", "conditional": "multi_stop_allowed"},
  {"step": 4, "action": "deliver_to_institution", "label": "הגשה למוסד", "conditional": "return_document_required"},
  {"step": 5, "action": "return_confirmation", "label": "החזרת אישור"}
]'),

('D', 'Attempted Service', '[
  {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
  {"step": 2, "action": "attempt_delivery", "label": "ניסיון מסירה 1"},
  {"step": 3, "action": "attempt_delivery_retry", "label": "ניסיון מסירה 2", "conditional": "max_attempts >= 2"},
  {"step": 4, "action": "attempt_delivery_final", "label": "ניסיון מסירה 3", "conditional": "max_attempts >= 3"},
  {"step": 5, "action": "door_posting", "label": "הדבקה על הדלת", "conditional": "max_attempts_exhausted"},
  {"step": 6, "action": "submit_service_affidavit", "label": "הגשת תצהיר מוסר"}
]')
ON CONFLICT (code) DO NOTHING;

-- Protocol Configs Seed Data
INSERT INTO delivery_protocol_configs
(name, slug, category, base_protocol, requires_id_verification, requires_photo,
 requires_signature, requires_otp, max_attempts, return_document_required,
 multi_stop_allowed, chain_of_custody, pricing_tier, pricing_multiplier) VALUES

-- CATEGORY: legal
('כתב תביעה', 'legal-claim', 'legal', 'A', TRUE, TRUE, TRUE, FALSE, 3, TRUE, FALSE, TRUE, 2, 1.5),
('אזהרת הוצאה לפועל', 'legal-enforcement-warning', 'legal', 'D', TRUE, TRUE, TRUE, FALSE, 3, TRUE, FALSE, TRUE, 2, 1.5),
('זימון לדיון', 'legal-court-summons', 'legal', 'A', TRUE, TRUE, TRUE, FALSE, 3, TRUE, FALSE, TRUE, 2, 1.4),
('צו מניעה', 'legal-injunction', 'legal', 'A', TRUE, TRUE, TRUE, FALSE, 1, TRUE, FALSE, TRUE, 3, 2.0),
('צו עיקול', 'legal-seizure-order', 'legal', 'A', TRUE, TRUE, TRUE, FALSE, 3, TRUE, FALSE, TRUE, 3, 2.0),
('הגשה לבית משפט', 'legal-court-filing', 'legal', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, TRUE, 2, 1.4),
('הגשה להוצאה לפועל', 'legal-enforcement-filing', 'legal', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, TRUE, 2, 1.4),
('תצהיר + החתמה', 'legal-affidavit-signing', 'legal', 'C', FALSE, TRUE, TRUE, FALSE, 1, TRUE, TRUE, TRUE, 2, 1.6),
('ייפוי כוח', 'legal-power-of-attorney', 'legal', 'C', TRUE, TRUE, TRUE, FALSE, 1, TRUE, TRUE, TRUE, 2, 1.6),
('הגשה לטאבו', 'legal-tabu-filing', 'legal', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, FALSE, 2, 1.3),
('הגשה לרשם החברות', 'legal-companies-registrar', 'legal', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, FALSE, 2, 1.3),
('מסירה בינלאומית (האג)', 'legal-international-hague', 'legal', 'D', TRUE, TRUE, TRUE, FALSE, 3, TRUE, FALSE, TRUE, 3, 2.5),

-- CATEGORY: parcel
('חבילה קטנה', 'parcel-small', 'parcel', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, FALSE, FALSE, 1, 1.0),
('חבילה בינונית', 'parcel-medium', 'parcel', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, FALSE, FALSE, 1, 1.2),
('חבילה שבירה', 'parcel-fragile', 'parcel', 'A', FALSE, TRUE, TRUE, TRUE, 1, FALSE, FALSE, FALSE, 2, 1.4),
('משלוח דחוף', 'parcel-urgent', 'parcel', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, FALSE, FALSE, 3, 2.0),

-- CATEGORY: distribution
('קו חלוקה קטן', 'distribution-small-route', 'distribution', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, TRUE, FALSE, 1, 1.0),
('קו חלוקה עם OTP', 'distribution-otp-route', 'distribution', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, TRUE, FALSE, 2, 1.3),

-- CATEGORY: biomedical
('דגימות מעבדה', 'bio-lab-samples', 'biomedical', 'A', FALSE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 3, 2.0),
('ציוד רפואי', 'bio-medical-equipment', 'biomedical', 'A', FALSE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 2, 1.5),
('תוצאות בדיקות', 'bio-test-results', 'biomedical', 'A', TRUE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 2, 1.5),

-- CATEGORY: government
('טפסים לרשות מקומית', 'gov-municipal-forms', 'government', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, FALSE, 1, 1.2),
('היתר בנייה', 'gov-building-permit', 'government', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, FALSE, 2, 1.4),
('רישיון עסק', 'gov-business-license', 'government', 'B', FALSE, TRUE, FALSE, FALSE, 1, TRUE, FALSE, FALSE, 2, 1.4),

-- CATEGORY: financial
('שיקים', 'fin-checks', 'financial', 'A', TRUE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 2, 1.5),
('מסמכי בנק', 'fin-bank-docs', 'financial', 'A', TRUE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 2, 1.5),
('חוזי ביטוח', 'fin-insurance-contracts', 'financial', 'C', TRUE, TRUE, TRUE, FALSE, 1, TRUE, TRUE, TRUE, 2, 1.5),

-- CATEGORY: realestate
('חוזה שכירות', 'realestate-rental', 'realestate', 'C', TRUE, TRUE, TRUE, FALSE, 1, TRUE, TRUE, FALSE, 2, 1.4),
('מסמכי עסקת נדלן', 'realestate-transaction', 'realestate', 'C', TRUE, TRUE, TRUE, FALSE, 1, TRUE, TRUE, TRUE, 3, 1.8),
('מסירת מפתחות', 'realestate-keys', 'realestate', 'A', TRUE, TRUE, TRUE, TRUE, 1, FALSE, FALSE, FALSE, 2, 1.3),

-- CATEGORY: medical
('מרשם רפואי', 'med-prescription', 'medical', 'A', FALSE, TRUE, FALSE, TRUE, 1, FALSE, FALSE, FALSE, 1, 1.0),
('תיק רפואי', 'med-patient-file', 'medical', 'A', TRUE, TRUE, TRUE, FALSE, 1, FALSE, FALSE, TRUE, 2, 1.5)
ON CONFLICT (slug) DO NOTHING;

-- Academy Courses Seed Data
INSERT INTO academy_protocol_courses (protocol_slug, title, description, estimated_minutes, passing_score, required_level) VALUES
('legal-claim', 'מסירת כתב תביעה — הכשרה מלאה', 'כל מה שצריך לדעת על מסירה אישית של כתבי תביעה לפי חוק סדר הדין האזרחי', 20, 85, 1),
('legal-court-summons', 'זימון לדיון — פרוטוקול ודרישות חוקיות', 'הכשרה לביצוע זימונים לדיון בבתי משפט בישראל', 20, 85, 1),
('legal-injunction', 'צו מניעה — מסירה בדחיפות', 'הכשרה מיוחדת למסירת צווי מניעה הדורשת מהירות ודיוק מרביים', 25, 90, 3),
('legal-seizure-order', 'צו עיקול — נהלי תפיסה ודיווח', 'הכשרה לביצוע צווי עיקול', 25, 90, 3),
('legal-international-hague', 'מסירה בינלאומית (האג)', 'נהלי מסירה מורכבים תחת אמנת האג', 30, 90, 4),
('legal-enforcement-warning', 'אזהרת הוצאה לפועל — ניסיונות מסירה', 'פרוטוקול D: ניסיונות מסירה חוזרים, הדבקה, ותצהיר מוסר', 25, 85, 1),
('bio-lab-samples', 'שינוע דגימות מעבדה — כללי בטיחות והכשרה', 'טיפול נכון בדגימות רפואיות, שרשרת קור, ודרישות רגולטוריות', 30, 90, 3),
('fin-checks', 'שינוע שיקים ומסמכים פיננסיים', 'אחריות משפטית, אימות זהות, ושמירה על שרשרת משמורת', 20, 85, 2)
ON CONFLICT (protocol_slug) DO NOTHING;
