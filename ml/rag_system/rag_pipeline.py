

from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableSequence, RunnableParallel
from langchain.chains import ConversationalRetrievalChain
from langchain.agents import initialize_agent, Tool
from vector_store import VectorStore
from langchain_google_genai import ChatGoogleGenerativeAI

class RAGPipeline:
    def __init__(self, vector_store, gemini_api_key=None, gemini_model="gemini-1.5-flash"):
        import os
        from dotenv import load_dotenv
        load_dotenv()
        self.vector_store = vector_store

        # Example prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful financial assistant."),
            ("human", "{question}")
        ])

        # Use env or passed API key/model
        if gemini_api_key is None:
            gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_model is None:
            gemini_model = "gemini-2.5-flash"

        # Gemini LLM (LangChain official)
        self.llm = ChatGoogleGenerativeAI(
            google_api_key=gemini_api_key,
            model=gemini_model
        )

        # Example tools
        self.tools = [
            Tool(
                name="search",
                func=lambda q: self.vector_store.search(q),
                description="Searches customer documents."
            ),
            # Add more tools (calculator, API, etc.) here
        ]

        # Agent setup
        self.agent = initialize_agent(self.tools, self.llm, agent_type="zero-shot-react-description")

    def retrieve(self, query):
        # Use embeddings + FAISS for semantic retrieval
        return self.vector_store.search(query)

    def generate(self, question, chat_history=None):
        # Use ConversationalRetrievalChain for context-aware QA
        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=self.vector_store.store.as_retriever()
        )
        return chain({"question": question, "chat_history": chat_history or []})

    def run_agent(self, query):
        # Use LangChain agent to dynamically choose tools
        return self.agent.run(query)
