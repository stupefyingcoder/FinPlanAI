import json
import os

class DataStore:
    def __init__(self, db_path):
        self.db_path = db_path
        if not os.path.exists(db_path):
            with open(db_path, 'w') as f:
                json.dump({}, f)

    def save_customer(self, customer_id, data):
        db = self._load_db()
        db[customer_id] = data
        self._save_db(db)

    def get_customer(self, customer_id):
        db = self._load_db()
        return db.get(customer_id, {})

    def save_plan(self, customer_id, plan):
        db = self._load_db()
        if customer_id not in db:
            db[customer_id] = {}
        if 'plans' not in db[customer_id]:
            db[customer_id]['plans'] = []
        db[customer_id]['plans'].append(plan)
        self._save_db(db)

    def get_plans(self, customer_id):
        db = self._load_db()
        return db.get(customer_id, {}).get('plans', [])

    def _load_db(self):
        with open(self.db_path, 'r') as f:
            return json.load(f)

    def _save_db(self, db):
        with open(self.db_path, 'w') as f:
            json.dump(db, f, indent=2)
