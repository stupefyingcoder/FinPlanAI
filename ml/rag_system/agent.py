from data_store import DataStore

class FinancialAgent:
    def __init__(self, db_path):
        self.store = DataStore(db_path)

    def handle_customer(self, customer_id, new_info=None):
        customer = self.store.get_customer(customer_id)
        plans = self.store.get_plans(customer_id)
        # Merge new_info with previous info
        if new_info:
            customer.update(new_info)
            self.store.save_customer(customer_id, customer)
        return customer, plans

    def suggest_plan(self, customer_id, context):
        # Placeholder for LLM-based suggestion
        plan = f"Suggested plan for {customer_id} based on context: {context}"
        self.store.save_plan(customer_id, plan)
        return plan
