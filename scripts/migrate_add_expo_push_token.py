#!/usr/bin/env python3
"""
migrate_add_expo_push_token.py
Run once from the server directory to add the expo_push_token column to the users table.

Usage:
    cd /home/leo/BYThron/Byt_gps_app/server
    python3 scripts/migrate_add_expo_push_token.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, inspect
from app.core.database import engine

def run():
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns("users")]

    if "expo_push_token" in cols:
        print("✅  expo_push_token already exists — nothing to do.")
        return

    with engine.begin() as conn:
        conn.execute(text(
            "ALTER TABLE users ADD COLUMN expo_push_token VARCHAR(255) NULL"
        ))
    print("✅  Migration complete: expo_push_token added to users table.")

if __name__ == "__main__":
    run()
