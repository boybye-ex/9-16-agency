"""
Database module for lead management using SQLite.
Provides async operations for storing and retrieving lead data.
"""

import sqlite3
import aiosqlite
from datetime import datetime
from typing import Optional, List, Dict, Any
from pathlib import Path
import json
import logging

from config.settings import DATABASE_PATH, LeadStatus

logger = logging.getLogger(__name__)


def get_db_path() -> Path:
    """Get the database path, creating directories if needed."""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DATABASE_PATH


def init_database() -> None:
    """Initialize the database with required tables (synchronous)."""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create leads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page_id TEXT UNIQUE NOT NULL,
            business_name TEXT NOT NULL,
            page_url TEXT,
            industry TEXT,
            estimated_spend TEXT,
            ad_creative_sample TEXT,
            email TEXT,
            website TEXT,
            status TEXT DEFAULT 'pending',
            telegram_message_id INTEGER,
            generated_content TEXT,
            generated_video_url TEXT,
            strategy_pack_path TEXT,
            email_subject TEXT,
            email_body TEXT,
            sent_at TIMESTAMP,
            response_received_at TIMESTAMP,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create index on status for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)
    """)
    
    # Create index on page_id for duplicate checking
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_leads_page_id ON leads(page_id)
    """)
    
    # Create activity log table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
    """)
    
    conn.commit()
    conn.close()
    logger.info(f"Database initialized at {db_path}")


async def add_lead(lead_data: Dict[str, Any]) -> Optional[int]:
    """
    Add a new lead to the database.
    Returns the lead ID if successful, None if duplicate.
    """
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        try:
            cursor = await db.execute("""
                INSERT INTO leads (
                    page_id, business_name, page_url, industry,
                    estimated_spend, ad_creative_sample, website, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                lead_data.get("page_id"),
                lead_data.get("business_name"),
                lead_data.get("page_url"),
                lead_data.get("industry"),
                lead_data.get("estimated_spend"),
                lead_data.get("ad_creative_sample"),
                lead_data.get("website"),
                LeadStatus.PENDING
            ))
            await db.commit()
            lead_id = cursor.lastrowid
            
            # Log the action
            await log_activity(db, lead_id, "created", "Lead added from Meta Ad Library")
            
            logger.info(f"Added new lead: {lead_data.get('business_name')} (ID: {lead_id})")
            return lead_id
            
        except sqlite3.IntegrityError:
            logger.debug(f"Duplicate lead skipped: {lead_data.get('page_id')}")
            return None


async def get_lead(lead_id: int) -> Optional[Dict[str, Any]]:
    """Get a single lead by ID."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM leads WHERE id = ?", (lead_id,))
        row = await cursor.fetchone()
        
        if row:
            return dict(row)
        return None


async def get_leads_by_status(status: str, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all leads with a specific status."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT ?",
            (status, limit)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def update_lead_status(lead_id: int, status: str, notes: str = None) -> bool:
    """Update a lead's status."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        await db.execute("""
            UPDATE leads 
            SET status = ?, updated_at = ?, notes = COALESCE(?, notes)
            WHERE id = ?
        """, (status, datetime.now().isoformat(), notes, lead_id))
        await db.commit()
        
        await log_activity(db, lead_id, "status_change", f"Status changed to {status}")
        
        logger.info(f"Updated lead {lead_id} status to {status}")
        return True


async def update_lead(lead_id: int, updates: Dict[str, Any]) -> bool:
    """Update lead fields."""
    db_path = get_db_path()
    
    # Build dynamic update query
    set_clauses = []
    values = []
    for key, value in updates.items():
        if key not in ["id", "created_at"]:  # Protect certain fields
            set_clauses.append(f"{key} = ?")
            values.append(value)
    
    if not set_clauses:
        return False
    
    set_clauses.append("updated_at = ?")
    values.append(datetime.now().isoformat())
    values.append(lead_id)
    
    query = f"UPDATE leads SET {', '.join(set_clauses)} WHERE id = ?"
    
    async with aiosqlite.connect(db_path) as db:
        await db.execute(query, values)
        await db.commit()
        
        await log_activity(db, lead_id, "updated", f"Fields updated: {list(updates.keys())}")
        
        return True


async def set_telegram_message_id(lead_id: int, message_id: int) -> bool:
    """Set the Telegram message ID for a lead (for callback handling)."""
    return await update_lead(lead_id, {"telegram_message_id": message_id})


async def get_lead_by_telegram_message(message_id: int) -> Optional[Dict[str, Any]]:
    """Get a lead by its Telegram message ID."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM leads WHERE telegram_message_id = ?",
            (message_id,)
        )
        row = await cursor.fetchone()
        
        if row:
            return dict(row)
        return None


async def save_generated_content(lead_id: int, content: Dict[str, Any]) -> bool:
    """Save AI-generated content for a lead."""
    return await update_lead(lead_id, {
        "generated_content": json.dumps(content),
        "email_subject": content.get("email_subject"),
        "email_body": content.get("email_body"),
        "status": LeadStatus.CONTENT_READY
    })


async def mark_email_sent(lead_id: int) -> bool:
    """Mark a lead as having been sent an email."""
    return await update_lead(lead_id, {
        "status": LeadStatus.SENT,
        "sent_at": datetime.now().isoformat()
    })


async def get_pipeline_stats() -> Dict[str, int]:
    """Get counts for each status in the pipeline."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute("""
            SELECT status, COUNT(*) as count 
            FROM leads 
            GROUP BY status
        """)
        rows = await cursor.fetchall()
        
        stats = {
            LeadStatus.PENDING: 0,
            LeadStatus.APPROVED: 0,
            LeadStatus.REJECTED: 0,
            LeadStatus.CONTENT_READY: 0,
            LeadStatus.SENT: 0,
            LeadStatus.RESPONDED: 0,
            LeadStatus.CONVERTED: 0,
        }
        
        for row in rows:
            stats[row[0]] = row[1]
        
        # Add total
        stats["total"] = sum(stats.values())
        
        return stats


async def log_activity(db: aiosqlite.Connection, lead_id: int, action: str, details: str) -> None:
    """Log an activity for a lead."""
    await db.execute("""
        INSERT INTO activity_log (lead_id, action, details)
        VALUES (?, ?, ?)
    """, (lead_id, action, details))


async def check_duplicate(page_id: str) -> bool:
    """Check if a lead with this page_id already exists."""
    db_path = get_db_path()
    
    async with aiosqlite.connect(db_path) as db:
        cursor = await db.execute(
            "SELECT 1 FROM leads WHERE page_id = ?",
            (page_id,)
        )
        row = await cursor.fetchone()
        return row is not None


def get_stats_sync() -> Dict[str, int]:
    """Synchronous version of get_pipeline_stats for CLI use."""
    db_path = get_db_path()
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT status, COUNT(*) as count 
        FROM leads 
        GROUP BY status
    """)
    rows = cursor.fetchall()
    
    stats = {
        LeadStatus.PENDING: 0,
        LeadStatus.APPROVED: 0,
        LeadStatus.REJECTED: 0,
        LeadStatus.CONTENT_READY: 0,
        LeadStatus.SENT: 0,
        LeadStatus.RESPONDED: 0,
        LeadStatus.CONVERTED: 0,
    }
    
    for row in rows:
        stats[row[0]] = row[1]
    
    stats["total"] = sum(stats.values())
    
    conn.close()
    return stats


if __name__ == "__main__":
    # Initialize database when run directly
    init_database()
    print(f"Database initialized at {DATABASE_PATH}")
