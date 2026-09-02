from langgraph.graph import StateGraph
from pydantic import BaseModel
from rag_pipeline import RAGPipeline
from models import CustomerProfile

class LangGraphState(BaseModel):
    customer_profile: CustomerProfile
    query: str
    chat_history: list = []
    retrieved_docs: list = []
    response: str = ""

class MinimalLangGraphPipeline:
    def __init__(self, rag_pipeline: RAGPipeline):
        self.rag_pipeline = rag_pipeline
        self.graph = StateGraph(LangGraphState)

        def retrieve_node(state: LangGraphState):
            docs = self.rag_pipeline.retrieve(state.query)
            return {"retrieved_docs": docs, **state.model_dump()}

        def generate_node(state: LangGraphState):
            response = self.rag_pipeline.generate(state.query, state.chat_history)
            return {"response": response, **state.model_dump()}

        self.graph.add_node("retrieve", retrieve_node)
        self.graph.add_node("generate", generate_node)
        self.graph.add_edge("__start__", "retrieve")
        self.graph.add_edge("retrieve", "generate")
        self.compiled_graph = self.graph.compile()

    def run(self, customer_profile: CustomerProfile, query: str, chat_history=None):
        state = LangGraphState(customer_profile=customer_profile, query=query, chat_history=chat_history or [])
        result = self.compiled_graph.invoke(state)
        return result
