from langgraph.graph import StateGraph
from models import CustomerProfile, FinancialPlan, ChatHistory

from pydantic import BaseModel

class AgentState(BaseModel):
    customer_profile: CustomerProfile
    query: str

class FinancialAgentGraph:
    def __init__(self, tools):
        self.graph = StateGraph(AgentState)
        # Custom node functions to extract correct input
        def retrieve_docs_node(state: AgentState):
            docs = tools[0]._run(state.query)
            return {"retrieved_docs": docs, **state.model_dump()}

        def get_history_node(state: AgentState):
            history = tools[1]._run(state.customer_profile)
            return {"customer_history": history, **state.model_dump()}

        def gemini_plan_node(state: AgentState):
            docs = getattr(state, "retrieved_docs", None)
            history = getattr(state, "customer_history", None)
            context = f"Docs: {docs}\nHistory: {history}\nProfile: {state.customer_profile}"
            plan = tools[2]._run(context)
            return {"final_plan": plan, **state.model_dump()}

        self.graph.add_node("retrieve_docs", retrieve_docs_node)
        self.graph.add_node("get_customer_history", get_history_node)
        self.graph.add_node("gemini_plan", gemini_plan_node)
        self.graph.add_edge("__start__", "retrieve_docs")
        self.graph.add_edge("retrieve_docs", "get_customer_history")
        self.graph.add_edge("get_customer_history", "gemini_plan")
        self.compiled_graph = self.graph.compile()

    def run(self, customer_profile: CustomerProfile, query: str):
        state = AgentState(customer_profile=customer_profile, query=query)
        result = self.compiled_graph.invoke(state)
        return result
