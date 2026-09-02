
from document_loader import DocumentLoader
from vector_store import VectorStore
from models import CustomerProfile
from rag_pipeline import RAGPipeline
import os

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data'))
import os
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv('GEMINI_API_KEY')

doc_loader = DocumentLoader(DATA_DIR)
documents = doc_loader.load_documents()

# Convert loaded documents to LangChain Document objects if needed
vector_store = VectorStore()
vector_store.build_store(documents)


# RAG pipeline
rag_pipeline = RAGPipeline(vector_store, gemini_api_key=API_KEY, gemini_model="gemini-1.5-flash")

# Example customer profile
customer = CustomerProfile(customer_id='cust0', name='Arjun Sharma', age=30, income=355000)

# Example query
query = "Suggest a financial plan for retirement considering my current loans and insurance."

# Semantic retrieval
retrieved_docs = rag_pipeline.retrieve(query)
print("Retrieved Docs:", retrieved_docs)

# Context-aware generation
response = rag_pipeline.generate(query)
print("Generated Response:", response)

# Agent tool orchestration
agent_response = rag_pipeline.run_agent(query)
print("Agent Response:", agent_response)
