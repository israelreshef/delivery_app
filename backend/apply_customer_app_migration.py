import sqlite3
import os
import json

def run_migrations():
    db_path = os.path.join(os.path.dirname(__file__), 'delivery.db')
    if not os.path.exists(db_path):
        print(f"Error: {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Creating new tables for customer wallets and transactions...")
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS customer_wallets (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id      INTEGER UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        balance         DECIMAL(10,2) DEFAULT 0.00,
        currency        VARCHAR(3) DEFAULT 'ILS',
        last_topup_at   TIMESTAMP,
        is_frozen       BOOLEAN DEFAULT 0,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
        id                INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_id         INTEGER NOT NULL REFERENCES customer_wallets(id) ON DELETE CASCADE,
        amount            DECIMAL(10,2) NOT NULL,
        transaction_type  VARCHAR(20) NOT NULL, -- topup, payment, refund, adjustment
        payment_method    VARCHAR(50), -- smartbee, manual, system
        reference_id      VARCHAR(100),
        status            VARCHAR(20) DEFAULT 'completed',
        description       TEXT,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Ensure protocol tables exist if they were missing (defensive)
    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS delivery_protocol_templates (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        code            VARCHAR(1) UNIQUE NOT NULL,
        name            VARCHAR(100) NOT NULL,
        description     TEXT,
        steps           TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS delivery_protocol_configs (
        id                        INTEGER PRIMARY KEY AUTOINCREMENT,
        name                      VARCHAR(100) NOT NULL,
        slug                      VARCHAR(100) UNIQUE NOT NULL,
        category                  VARCHAR(50) NOT NULL,
        base_protocol             VARCHAR(1) REFERENCES delivery_protocol_templates(code),
        requires_id_verification  BOOLEAN DEFAULT 0,
        requires_photo            BOOLEAN DEFAULT 1,
        requires_signature        BOOLEAN DEFAULT 1,
        requires_otp              BOOLEAN DEFAULT 0,
        otp_alternatives          TEXT,
        max_attempts              INTEGER DEFAULT 1,
        return_document_required  BOOLEAN DEFAULT 0,
        multi_stop_allowed        BOOLEAN DEFAULT 0,
        chain_of_custody          BOOLEAN DEFAULT 0,
        pricing_tier              INTEGER DEFAULT 1,
        pricing_multiplier        DECIMAL(4,2) DEFAULT 1.0,
        is_active                 BOOLEAN DEFAULT 1,
        created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Add protocol_slug to deliveries if missing (redundant but safe)
    cursor.execute('PRAGMA table_info(deliveries)')
    cols = [row[1] for row in cursor.fetchall()]
    if 'protocol_slug' not in cols:
        cursor.execute('ALTER TABLE deliveries ADD COLUMN protocol_slug VARCHAR(100) REFERENCES delivery_protocol_configs(slug)')
        print("Added protocol_slug to deliveries.")

    conn.commit()

    # Seeding Protocol Templates (4 Rows: A, B, C, D)
    print("Seeding protocol templates...")
    templates = [
        ('A', 'Personal Service', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "verify_recipient_id", "label": "זיהוי נמען", "conditional": "requires_id_verification"},
            {"step": 3, "action": "deliver_to_recipient", "label": "מסירה אישית"},
            {"step": 4, "action": "collect_signature_or_photo", "label": "קבלת אישור"},
            {"step": 5, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
        ])),
        ('B', 'Institutional Filing', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "deliver_to_institution", "label": "הגשה למוסד"},
            {"step": 3, "action": "collect_stamp_or_receipt", "label": "קבלת חותמת/אישור"},
            {"step": 4, "action": "return_confirmation", "label": "החזרת אישור למשרד"}
        ])),
        ('C', 'Multi-Signature Circuit', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "stop_signature", "label": "החתמה — עצירה 1"},
            {"step": 3, "action": "stop_signature_optional", "label": "החתמה — עצירה 2", "conditional": "multi_stop_allowed"},
            {"step": 4, "action": "deliver_to_institution", "label": "הגשה למוסד", "conditional": "return_document_required"},
            {"step": 5, "action": "return_confirmation", "label": "החזרת אישור"}
        ])),
        ('D', 'Attempted Service', json.dumps([
            {"step": 1, "action": "collect_documents", "label": "איסוף מסמכים"},
            {"step": 2, "action": "attempt_delivery", "label": "ניסיון מסירה 1"},
            {"step": 3, "action": "attempt_delivery_retry", "label": "ניסיון מסירה 2", "conditional": "max_attempts >= 2"},
            {"step": 4, "action": "attempt_delivery_final", "label": "ניסיון מסירה 3", "conditional": "max_attempts >= 3"},
            {"step": 5, "action": "door_posting", "label": "הדבקה על הדלת", "conditional": "max_attempts_exhausted"},
            {"step": 6, "action": "submit_service_affidavit", "label": "הגשת תצהיר מוסר"}
        ]))
    ]
    cursor.executemany("INSERT OR IGNORE INTO delivery_protocol_templates (code, name, steps) VALUES (?, ?, ?)", templates)

    # Seeding Protocol Configs (32 Rows)
    print("Seeding all 32 protocol configurations...")
    configs = [
        # legal
        ('כתב תביעה', 'legal-claim', 'legal', 'A', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.5),
        ('אזהרת הוצאה לפועל', 'legal-enforcement-warning', 'legal', 'D', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.5),
        ('זימון לדיון', 'legal-court-summons', 'legal', 'A', 1, 1, 1, 0, 3, 1, 0, 1, 2, 1.4),
        ('צו מניעה', 'legal-injunction', 'legal', 'A', 1, 1, 1, 0, 1, 1, 0, 1, 3, 2.0),
        ('צו עיקול', 'legal-seizure-order', 'legal', 'A', 1, 1, 1, 0, 3, 1, 0, 1, 3, 2.0),
        ('הגשה לבית משפט', 'legal-court-filing', 'legal', 'B', 0, 1, 0, 0, 1, 1, 0, 1, 2, 1.4),
        ('הגשה להוצאה לפועל', 'legal-enforcement-filing', 'legal', 'B', 0, 1, 0, 0, 1, 1, 0, 1, 2, 1.4),
        ('תצהיר + החתמה', 'legal-affidavit-signing', 'legal', 'C', 0, 1, 1, 0, 1, 1, 1, 1, 2, 1.6),
        ('ייפוי כוח', 'legal-power-of-attorney', 'legal', 'C', 1, 1, 1, 0, 1, 1, 1, 1, 2, 1.6),
        ('הגשה לטאבו', 'legal-tabu-filing', 'legal', 'B', 0, 1, 0, 0, 1, 1, 0, 0, 2, 1.3),
        ('הגשה לרשם החברות', 'legal-companies-registrar', 'legal', 'B', 0, 1, 0, 0, 1, 1, 0, 0, 2, 1.3),
        ('מסירה בינלאומית (האג)', 'legal-international-hague', 'legal', 'D', 1, 1, 1, 0, 3, 1, 0, 1, 3, 2.5),
        # parcel
        ('חבילה קטנה', 'parcel-small', 'parcel', 'A', 0, 1, 0, 1, 1, 0, 0, 0, 1, 1.0),
        ('חבילה בינונית', 'parcel-medium', 'parcel', 'A', 0, 1, 0, 1, 1, 0, 0, 0, 1, 1.2),
        ('חבילה שבירה', 'parcel-fragile', 'parcel', 'A', 0, 1, 1, 1, 1, 0, 0, 0, 2, 1.4),
        ('משלוח דחוף', 'parcel-urgent', 'parcel', 'A', 0, 1, 0, 1, 1, 0, 0, 0, 3, 2.0),
        # distribution
        ('קו חלוקה קטן', 'distribution-small-route', 'distribution', 'A', 0, 1, 0, 1, 1, 0, 1, 0, 1, 1.0),
        ('קו חלוקה עם OTP', 'distribution-otp-route', 'distribution', 'A', 0, 1, 0, 1, 1, 0, 1, 0, 2, 1.3),
        # biomedical
        ('דגימות מעבדה', 'bio-lab-samples', 'biomedical', 'A', 0, 1, 1, 0, 1, 0, 0, 1, 3, 2.0),
        ('ציוד רפואי', 'bio-medical-equipment', 'biomedical', 'A', 0, 1, 1, 0, 1, 0, 0, 1, 2, 1.5),
        ('תוצאות בדיקות', 'bio-test-results', 'biomedical', 'A', 1, 1, 1, 0, 1, 0, 0, 1, 2, 1.5),
        # government
        ('טפסים לרשות מקומית', 'gov-municipal-forms', 'government', 'B', 0, 1, 0, 0, 1, 1, 0, 0, 1, 1.2),
        ('היתר בנייה', 'gov-building-permit', 'government', 'B', 0, 1, 0, 0, 1, 1, 0, 0, 2, 1.4),
        ('רישיון עסק', 'gov-business-license', 'government', 'B', 0, 1, 0, 0, 1, 1, 0, 0, 2, 1.4),
        # financial
        ('שיקים', 'fin-checks', 'financial', 'A', 1, 1, 1, 0, 1, 0, 0, 1, 2, 1.5),
        ('מסמכי בנק', 'fin-bank-docs', 'financial', 'A', 1, 1, 1, 0, 1, 0, 0, 1, 2, 1.5),
        ('חוזי ביטוח', 'fin-insurance-contracts', 'financial', 'C', 1, 1, 1, 0, 1, 1, 1, 1, 2, 1.5),
        # realestate
        ('חוזה שכירות', 'realestate-rental', 'realestate', 'C', 1, 1, 1, 0, 1, 1, 1, 0, 2, 1.4),
        ('מסמכי עסקת נדלן', 'realestate-transaction', 'realestate', 'C', 1, 1, 1, 0, 1, 1, 1, 1, 3, 1.8),
        ('מסירת מפתחות', 'realestate-keys', 'realestate', 'A', 1, 1, 1, 1, 1, 0, 0, 0, 2, 1.3),
        # medical
        ('מרשם רפואי', 'med-prescription', 'medical', 'A', 0, 1, 0, 1, 1, 0, 0, 0, 1, 1.0),
        ('תיק רפואי', 'med-patient-file', 'medical', 'A', 1, 1, 1, 0, 1, 0, 0, 1, 2, 1.5)
    ]
    cursor.executemany("""
        INSERT OR IGNORE INTO delivery_protocol_configs 
        (name, slug, category, base_protocol, requires_id_verification, requires_photo,
         requires_signature, requires_otp, max_attempts, return_document_required,
         multi_stop_allowed, chain_of_custody, pricing_tier, pricing_multiplier)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, configs)

    conn.commit()
    conn.close()
    print("Migration and seeding complete!")

if __name__ == "__main__":
    run_migrations()
