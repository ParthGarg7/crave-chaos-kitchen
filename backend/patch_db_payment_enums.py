import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlalchemy import create_engine, text

def patch_payment_enums():
    print("Connecting to database...")
    # Default connection string as used in config.py
    DATABASE_URL = "postgresql://postgres:password@localhost:5432/food_delivery"
    engine = create_engine(DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # 1. Add lowercase 'card' and 'upi' (used by some frontend values mistakenly)
            conn.execute(text("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'card'"))
            conn.execute(text("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'upi'"))
            
            # 2. Add uppercase 'CARD' and 'UPI' (used by SQLAlchemy when storing Python Enum names)
            conn.execute(text("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'CARD'"))
            conn.execute(text("ALTER TYPE paymentmethod ADD VALUE IF NOT EXISTS 'UPI'"))
            conn.commit()
            
            print("✅ Successfully patched paymentmethod enum in the database.")
            print("Card and UPI payments should now work correctly!")
    except Exception as e:
        print(f"Error patching database: {e}")
        print("Note: If the type 'paymentmethod' does not exist yet, you may need to run init_db.py first.")

if __name__ == "__main__":
    patch_payment_enums()
