from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from semantic_api import fetch_papers
from ml_processor import process_clusters

app = FastAPI()

# ЗАЩИТА CORS: Критически важна, чтобы React смог достучаться до FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Разрешаем запросы с любых адресов (для разработки)
    allow_credentials=True,
    allow_methods=["*"], # Разрешаем все типы запросов (GET, POST и т.д.)
    allow_headers=["*"], # Разрешаем любые заголовки
)

@app.get("/api/search")
async def search(query: str):
    try:
        # 1. Сбор данных через API Semantic Scholar
        raw_papers = fetch_papers(query)
        
        # Если ничего не нашли, возвращаем пустые списки
        if not raw_papers:
            return {"nodes": [], "edges": []}

        # 2. ML-обработка: Векторизация и кластеризация
        # На выходе получаем статьи, где у каждой есть поле 'group'
        processed_papers = process_clusters(raw_papers)

        # 3. Форматирование под React Flow
        nodes = []
        edges = []

        for paper in processed_papers:
            # Создаем узел (Node)
            nodes.append({
                "id": paper["paperId"],
                "data": {
                    "label": paper["title"],
                    "abstract": paper.get("abstract", ""),
                    "group": paper.get("group", 0), # Группа от K-Means
                    "year": paper.get("year", 0),
                 "authors": paper.get("authors", [])
                }
            })

            # Создаем связи (Edges) на основе цитирований
            if "citations" in paper:
                for citation in paper["citations"]:
                    # Проверяем, есть ли цитируемая статья в нашем списке найденных
                    # (чтобы не рисовать связи "в никуда")
                    edges.append({
                        "id": f"e-{paper['paperId']}-{citation['paperId']}",
                        "source": paper["paperId"],
                        "target": citation["paperId"]
                    })

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        # Если что-то упало, сервер не должен "молчать"
        return {"error": str(e), "status": "failed"}