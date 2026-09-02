from vector_store import VectorStore
from rag_pipeline import RAGPipeline
from langgraph_pipeline import MinimalLangGraphPipeline
from models import CustomerProfile
from langchain.schema import Document

# Dummy documents for testing
# Replace with your actual document loading logic
sample_docs = [
    Document(page_content="Retirement planning advice for loans and insurance.", metadata={"source": "doc1"}),
    Document(page_content="General financial tips for young professionals.", metadata={"source": "doc2"}),
]

# Prepare vector store and pipeline
vector_store = VectorStore()
vector_store.build_store(sample_docs)
rag_pipeline = RAGPipeline(vector_store)
langgraph_pipeline = MinimalLangGraphPipeline(rag_pipeline)

# Example customer and query
customer = CustomerProfile(customer_id='cust0', name='Arjun Sharma', age=30, income=355000)
query = "Suggest a financial plan for retirement considering my current loans and insurance."

result = langgraph_pipeline.run(customer, query)
print("LangGraph Pipeline Result:")
print(result)
