
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document

class VectorStore:
    def __init__(self, model_name="sentence-transformers/all-MiniLM-L6-v2"):
        self.embeddings = HuggingFaceEmbeddings(model_name=model_name)
        self.store = None

    def build_store(self, documents):
        # documents: List[Document] (LangChain Document objects)
        self.store = FAISS.from_documents(documents, self.embeddings)

    def search(self, query, k=5):
        # Returns top-k semantically similar documents
        if not self.store:
            return []
        return self.store.similarity_search(query, k=k)
