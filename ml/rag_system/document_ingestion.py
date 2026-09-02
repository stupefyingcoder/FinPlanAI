import os
import pdfplumber

class DocumentIngestion:
    def __init__(self, data_dir):
        self.data_dir = data_dir

    def extract_text_from_pdfs(self):
        docs = {}
        for filename in os.listdir(self.data_dir):
            if filename.endswith('.pdf'):
                path = os.path.join(self.data_dir, filename)
                with pdfplumber.open(path) as pdf:
                    text = " ".join([page.extract_text() or "" for page in pdf.pages])
                docs[filename] = text
        return docs
