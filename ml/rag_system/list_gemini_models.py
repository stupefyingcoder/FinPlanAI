import google.generativeai as genai

# Replace with your actual Gemini API key
API_KEY = "your-gemini-api-key"

genai.configure(api_key=API_KEY)

models = genai.list_models()
print("Available Gemini models:")
for model in models:
    print(model.name)
