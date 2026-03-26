import os
import shutil
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def run_backup(db_path="instance/delivery_app.db", backup_dir="backups"):
    """
    Creates a backup of the SQLite database and deletes backups older than 7 days.
    """
    try:
        if not os.path.exists(db_path):
            # If instance/delivery_app.db doesn't exist, try just delivery_app.db
            if os.path.exists("delivery_app.db"):
                db_path = "delivery_app.db"
            else:
                logger.error(f"❌ Backup FAILED: db not found at {db_path}")
                return False

        os.makedirs(backup_dir, exist_ok=True)
        date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        dst = os.path.join(backup_dir, f"db_{date_str}.sqlite")
        
        shutil.copy2(db_path, dst)
        size = os.path.getsize(dst)
        logger.info(f"✅ Backup completed: {dst} ({size} bytes)")

        # Delete backups older than 7 days
        cutoff = datetime.now() - timedelta(days=7)
        for f in os.listdir(backup_dir):
            fpath = os.path.join(backup_dir, f)
            if os.path.isfile(fpath) and os.path.getmtime(fpath) < cutoff.timestamp():
                os.remove(fpath)
                logger.debug(f"Deleted old backup: {fpath}")

        return True, dst
    except Exception as e:
        logger.error(f"❌ Backup FAILED: {str(e)}", exc_info=True)
        return False, str(e)

def init_scheduler():
    from apscheduler.schedulers.background import BackgroundScheduler
    scheduler = BackgroundScheduler()
    # Run backup every night at 02:00 AM
    scheduler.add_job(run_backup, 'cron', hour=2, minute=0)
    scheduler.start()
    logger.info("APScheduler started: Daily backups configured for 02:00 AM.")
