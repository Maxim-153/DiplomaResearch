import requests

def fetch_papers(query: str, limit: int = 30):
    # Endpoint для поиска из технической документации
    url = "https://api.semanticscholar.org/graph/v1/paper/search" #
    
    # Параметры запроса
    params = {
        "query": query, #[cite: 1]
        "limit": limit, #[cite: 1]
        "fields": "paperId,title,abstract,year,authors,citations" #[cite: 1]
    }
    
    try:
        # Отправляем GET-запрос к Semantic Scholar
        response = requests.get(url, params=params)
        response.raise_for_status() # Проверяем, не вернул ли сервер ошибку (например, 404 или 500)
        
        # Превращаем ответ в удобный словарь Python
        data = response.json()
        
        # Возвращаем только массив данных (список статей) или пустой список, если ничего нет
        return data.get("data", [])
        
    except Exception as e:
        # Безопасный код: если интернет отпал или API недоступно, возвращаем пустой список
        print(f"Ошибка при обращении к Semantic Scholar: {e}")
        return []