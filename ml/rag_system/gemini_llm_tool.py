from langchain.tools import BaseTool
import google.generativeai as genai

class GeminiLLM:
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model)

    def __call__(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return response.text if hasattr(response, 'text') else str(response)

from pydantic import PrivateAttr

class GeminiPlanTool(BaseTool):
    name: str = "gemini_plan"
    description: str = "Generate a financial plan using Gemini LLM."
    _llm: GeminiLLM = PrivateAttr()

    def __init__(self, api_key):
        super().__init__()
        self._llm = GeminiLLM(api_key=api_key)

    def _run(self, context: str):
        return self._llm(context)
