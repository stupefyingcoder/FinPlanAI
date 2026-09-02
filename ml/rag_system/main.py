from document_ingestion import DocumentIngestion
from data_store import DataStore
from agent import FinancialAgent
from rag_pipeline import RAGPipeline

import os
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data'))
DB_PATH = 'customer_db.json'

ingestor = DocumentIngestion(DATA_DIR)
documents = ingestor.extract_text_from_pdfs()

store = DataStore(DB_PATH)
agent = FinancialAgent(DB_PATH)
rag = RAGPipeline()

# Example usage
customer_id = 'cust0'
new_info = {'income': 50000, 'age': 30}
customer, plans = agent.handle_customer(customer_id, new_info)
retrieved_docs = rag.retrieve('loan', documents)
context = ' '.join(retrieved_docs) + str(customer)
plan = agent.suggest_plan(customer_id, context)
print('Suggested Plan:', plan)
