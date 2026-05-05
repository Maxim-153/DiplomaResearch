import requests
import json
import os

# Путь к папке, где будут лежать наши "сейвы" результатов
CACHE_DIR = "api_cache"

# Создаем папку для кэша, если её еще нет
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def fetch_papers(query: str, limit: int = 15):
    # 1. Проверяем кэш: не искали ли мы это раньше?
    cache_path = os.path.join(CACHE_DIR, f"{query.replace(' ', '_').lower()}.json")
    
    if os.path.exists(cache_path):
        print(f"--- [CACHE] Беру данные из файла: {cache_path} ---")
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # 2. Если в кэше нет, идем в интернет
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    params = {
        "query": query,
        "limit": limit,
        "fields": "paperId,title,abstract,year,authors,citations"
    }

    try:
        print(f"--- [API] Стучусь в Semantic Scholar: {query} ---")
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        # Если нас заблокировали (429) или другая ошибка
        if response.status_code != 200:
            print(f"!!! Ошибка API ({response.status_code}). Включаю Mock-данные.")
            return get_mock_data(query)

        data = response.json().get("data", [])

        # 3. Сохраняем результат в кэш, чтобы не тратить лимиты в следующий раз
        if data:
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        
        return data

    except Exception as e:
        print(f"Ошибка связи: {e}")
        return get_mock_data(query)

def get_mock_data(query):
    """Функция-заглушка: отдает данные, когда API лежит"""
    return [
        {
            "paperId": "mock-1",
            "title": f"Future of {query} Research",
            "abstract": "This is a synthetic paper generated because the API is currently unavailable. It allows you to continue developing the UI.",
            "citations": [{"paperId": "mock-2"}]
        },
        {
            "paperId": "mock-2",
            "title": f"Foundations of {query}",
            "abstract": "Another mock paper to create a link in your graph visualization.",
            "citations": []
        }
    ]