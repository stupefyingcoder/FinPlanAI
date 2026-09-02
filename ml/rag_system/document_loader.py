from langchain_community.document_loaders import PyPDFLoader
import os

class DocumentLoader:
    def __init__(self, data_dir):
        self.data_dir = data_dir

    def load_documents(self):
        docs = []
        for filename in os.listdir(self.data_dir):
            if filename.endswith('.pdf'):
                path = os.path.join(self.data_dir, filename)
                loader = PyPDFLoader(path)
                docs.extend(loader.load())
        return docs
