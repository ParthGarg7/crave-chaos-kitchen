"""
Patch script to add 'developer' to PostgreSQL userrole enum if missing.
Run once after pulling latest changes:
    python patch_db_user_role_developer.py
"""
from sqlalchemy import text

from app.db.base import get_engine, init_db


def patch_user_role_enum() -> None:
    init_db()
    engine = get_engine()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM pg_enum e
                        JOIN pg_type t ON e.enumtypid = t.oid
                        WHERE t.typname = 'userrole' AND e.enumlabel = 'developer'
                    ) THEN
                        ALTER TYPE userrole ADD VALUE 'developer';
                    END IF;
                END $$;
                """
            )
        )
    print("User role enum patched successfully (developer present).")


if __name__ == "__main__":
    patch_user_role_enum()
