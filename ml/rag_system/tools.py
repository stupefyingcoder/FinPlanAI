from langchain.tools import BaseTool
from vector_store import VectorStore
from models import CustomerProfile
from pydantic import PrivateAttr

class RetrieveDocsTool(BaseTool):
    name: str = "retrieve_docs"
    description: str = "Retrieve relevant documents for a customer query."
    _vector_store: VectorStore = PrivateAttr()

    def __init__(self, vector_store: VectorStore):
        super().__init__()
        self._vector_store = vector_store

    def _run(self, query: str):
        return self._vector_store.search(query)

class GetCustomerHistoryTool(BaseTool):
    name: str = "get_customer_history"
    description: str = "Fetch past chat history and plans for a customer."

    def _run(self, customer_profile: CustomerProfile):
        return {
            "plans": customer_profile.plans,
            "chat_history": customer_profile.chat_history
        }

# Add more tools as needed for plan generation, updating profiles, etc.
