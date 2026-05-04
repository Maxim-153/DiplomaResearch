from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from semantic_api import fetch_papers # Импортируем нашу новую функцию!

app = FastAPI(title="Research Graph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Бэкенд успешно запущен! Tech Lead одобряет."}

# НОВЫЙ ЭНДПОИНТ ДЛЯ ПОИСКА СТАТЕЙ
@app.get("/api/search")
async def search_endpoint(query: str):
    try:
        # Вызываем функцию из файла semantic_api.py
        papers = fetch_papers(query)
        return {"status": "success", "count": len(papers), "data": papers}
    except Exception as e:
        return {"status": "error", "message": f"Ошибка поиска: {str(e)}"}