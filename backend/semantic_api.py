import requests
import json
import os
import time

# Папка для локального кэша, чтобы не "спамить" API одинаковыми запросами
CACHE_DIR = "api_cache"

# Создаем папку, если ее еще нет
if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def fetch_papers(query: str, limit: int = 30):
    # Формируем имя файла для кэша (например, machine_learning.json)
    cache_filename = f"{query.replace(' ', '_').lower()}.json"
    cache_path = os.path.join(CACHE_DIR, cache_filename)
    
    # 1. ПРОВЕРКА КЭША
    if os.path.exists(cache_path):
        print(f"--- [CACHE] Беру данные из файла: {cache_path} ---")
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Ошибка чтения кэша: {e}")

    # 2. ПОДГОТОВКА ЗАПРОСА К SEMANTIC SCHOLAR
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    headers = {
        # Притворяемся обычным браузером
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    # Рекомендуется запрашивать limit=30 и определенный список полей
    params = {
        "query": query,
        "limit": limit,
        "fields": "paperId,title,abstract,year,authors,citations"
    }

    # 3. ПАТТЕРН RETRY (Умные повторные попытки)
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            print(f"--- [API] Попытка {attempt + 1} из {max_retries} для запроса: '{query}' ---")
            
            # Делаем запрос (таймаут 10 секунд, чтобы сервер не завис)
            response = requests.get(url, params=params, headers=headers, timeout=10)
            
            # УСПЕХ
            if response.status_code == 200:
                data = response.json().get("data", [])
                
                # Сохраняем свежие данные в кэш
                if data:
                    with open(cache_path, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                
                return data
                
            # ОШИБКА 429 (Слишком много запросов)
            elif response.status_code == 429:
                print("!!! Ошибка 429: Сервер перегружен. Сплю 3 секунды...")
                time.sleep(3) # Ждем перед следующей попыткой
                continue 
                
            # ДРУГИЕ ОШИБКИ (Например, 500)
            else:
                print(f"!!! Неизвестная ошибка API: {response.status_code}")
                break 
                
        except Exception as e:
            print(f"!!! Ошибка сети: {e}")
            break

    # 4. РЕЗЕРВНЫЙ ПЛАН (Mock-данные)
    # Если мы вышли из цикла (все 3 попытки провалились), отдаем заглушку, чтобы Фронтенд не упал
    print("!!! API полностью недоступен. Отдаю Mock-данные.")
    return get_mock_data(query)

def get_mock_data(query):
    """Генератор фейковых статей для защиты от 'белого экрана' на Фронтенде"""
    return [
        {
            "paperId": "mock-1",
            "title": f"The Evolution of {query}",
            "abstract": f"This is a placeholder abstract for {query}. The actual API is currently unavailable due to rate limits.",
            "year": 2024,
            "authors": [{"authorId": "1", "name": "AI Assistant"}],
            "citations": [{"paperId": "mock-2"}]
        },
        {
            "paperId": "mock-2",
            "title": f"Fundamental Principles of {query}",
            "abstract": "Another mock paper providing a structural link in the graph visualization.",
            "year": 2023,
            "authors": [{"authorId": "2", "name": "Tech Lead"}],
            "citations": []
        }
    ]