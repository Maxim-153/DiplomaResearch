import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ModuleNotFoundError:
    pass

from semantic_api import fetch_papers, fetch_citations_for_paper
from ml_processor import process_clusters


def get_cors_origins():
    raw_origins = os.getenv("CORS_ORIGINS")
    if not raw_origins:
        return ["http://localhost:5173", "http://127.0.0.1:5173"]
    return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app = FastAPI()

# ЗАЩИТА CORS: Критически важна, чтобы React смог достучаться до FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"], # Разрешаем все типы запросов (GET, POST и т.д.)
    allow_headers=["*"], # Разрешаем любые заголовки
)

@app.get("/api/search")
async def search(query: str, year_from: int = None, year_to: int = None, sort: str = "relevance"):
    try:
        # 1. Сбор данных
        # ИЗМЕНЕНИЕ: Теперь мы передаем года прямо в наш Адаптер!
        raw_papers = fetch_papers(query, year_from, year_to, sort)

        # --- ДЕБАГ-МАЯЧОК ДЛЯ ТЕРМИНАЛА ---
        print("\n--- СТАТИСТИКА ФИЛЬТРАЦИИ ---")
        print(f"Всего скачано из API: {len(raw_papers)}")
        print(f"Осталось после фильтра по годам: {len(raw_papers)}")
        print("-----------------------------\n")

        # Если после фильтрации ничего не осталось
        if not raw_papers:
            return {"nodes": [], "edges": []}
        # ---------------------------------------------------

        # 2. ML-обработка: Векторизация и кластеризация
        # На выходе получаем статьи, где у каждой есть поле 'group'
        processed_papers = process_clusters(raw_papers)

        # --- МАЯЧОК ДЛЯ ДЕБАГА ---
        if processed_papers:
            print("--- ДЕБАГ БЭКЕНДА ---")
            print(f"Статья: {processed_papers[0].get('title')}")
            print(f"Сгенерированное имя кластера: {processed_papers[0].get('group_name')}")
            print("---------------------")

        # 3. Форматирование под React Flow
        nodes = []
        edges = []

        paper_ids = {paper.get("paperId") for paper in processed_papers if paper.get("paperId")}

        for paper in processed_papers:
            if not paper.get("paperId"):
                continue

            # Создаем узел (Node)
            nodes.append({
                "id": paper["paperId"],
                "data": {
                    "label": paper["title"],
                    "abstract": paper.get("abstract", ""),
                    "group": paper.get("group", 0), # Группа от K-Means
                    "year": paper.get("year", 0),
                    "authors": paper.get("authors", []),
                    "group_name": paper.get("group_name"),
                    "url": paper.get("url"),
                    "doi": paper.get("doi"),
                    "source": paper.get("source"),
                    "primary_location": paper.get("primary_location"),
                    "host_venue": paper.get("host_venue"),
                    "volume": paper.get("volume"),
                    "issue": paper.get("issue"),
                    "first_page": paper.get("first_page"),
                    "last_page": paper.get("last_page"),
                    "landing_page_url": paper.get("landing_page_url"),
                    "citation_count": paper.get("citation_count", 0),
                    "reference_count": paper.get("reference_count", 0),
                    "relevance_score": paper.get("relevance_score", 0)
                }
            })

            # Создаем связи (Edges) на основе цитирований
            if "citations" in paper:
                for citation in paper["citations"]:
                    # Проверяем, есть ли цитируемая статья в нашем списке найденных
                    # (чтобы не рисовать связи "в никуда")
                    if citation.get("paperId") not in paper_ids:
                        continue

                    edges.append({
                        "id": f"e-{paper['paperId']}-{citation['paperId']}",
                        "source": paper["paperId"],
                        "target": citation["paperId"]
                    })

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        # Если что-то упало, сервер не должен "молчать"
        return {"error": str(e), "status": "failed"}

@app.get("/api/expand")
async def expand_graph(paper_id: str):
    try:
        # 1. Скачиваем 15 статей, которые цитируют выбранную статью
        raw_papers = fetch_citations_for_paper(paper_id)
        
        # Если никто её не цитировал (или API вернуло пустоту)
        if not raw_papers:
            return {"nodes": [], "edges": []}

        # 2. Прогоняем новые статьи через ML (чтобы они тоже получили цвета и имена групп)
        processed_papers = process_clusters(raw_papers)

        # 3. Форматируем узлы и связи
        nodes = []
        edges = []

        expanded_ids = {paper.get("paperId") for paper in processed_papers if paper.get("paperId")}

        for paper in processed_papers:
            if not paper.get("paperId"):
                continue

            nodes.append({
                "id": paper.get("paperId"),
                "position": {"x": 0, "y": 0},
                "data": {
                    "label": paper.get("title"),
                    "abstract": paper.get("abstract", ""),
                    "group": paper.get("group", 0),
                    "year": paper.get("year", 0),
                    "authors": paper.get("authors", []),
                    "group_name": paper.get("group_name"),
                    "url": paper.get("url"),
                    "doi": paper.get("doi"),
                    "source": paper.get("source"),
                    "primary_location": paper.get("primary_location"),
                    "host_venue": paper.get("host_venue"),
                    "volume": paper.get("volume"),
                    "issue": paper.get("issue"),
                    "first_page": paper.get("first_page"),
                    "last_page": paper.get("last_page"),
                    "landing_page_url": paper.get("landing_page_url"),
                    "citation_count": paper.get("citation_count", 0),
                    "reference_count": paper.get("reference_count", 0),
                    "relevance_score": paper.get("relevance_score", 0)
                }
            })

            # ВАЖНО: Мы ЖЕСТКО создаем связь между новой статьей и оригинальной, 
            # по которой мы кликнули. Иначе они опять будут висеть в воздухе!
            edges.append({
                "id": f"e-{paper.get('paperId')}-{paper_id}",
                "source": paper.get("paperId"), # Кто ссылается (новая статья)
                "target": paper_id              # На кого ссылаются (оригинал)
            })

            # На всякий случай сохраняем и внутренние ссылки между новыми статьями
            if "citations" in paper:
                for citation in paper["citations"]:
                    if citation.get("paperId") not in expanded_ids and citation.get("paperId") != paper_id:
                        continue

                    edges.append({
                        "id": f"e-{paper.get('paperId')}-{citation.get('paperId')}",
                        "source": paper.get("paperId"),
                        "target": citation.get("paperId")
                    })

        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        print(f"Критическая ошибка при расширении графа: {e}")
        return {"error": str(e), "status": "failed"}
