#!/usr/bin/env python3
"""
Backfill script: creates a CreditsBucket (3 credits) for every user
that doesn't already have one.

Run from the backend/ directory with the venv active:
    python scripts/backfill_credits.py
"""
import sys
import os

# Ensure backend/ is on the path so model/config imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from database import engine
from models.user import User
from models.credits_bucket import CreditsBucket


def backfill():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        created = 0
        for user in users:
            existing = session.exec(
                select(CreditsBucket).where(CreditsBucket.user_id == user.id)
            ).first()
            if existing:
                print(f"  skip  {user.email} (already has {existing.credits} credits)")
                continue
            bucket = CreditsBucket(user_id=user.id)
            session.add(bucket)
            created += 1
            print(f"  create {user.email} → 3 credits")

        session.commit()
        print(f"\nDone. Created {created} credits bucket(s).")


if __name__ == "__main__":
    backfill()
