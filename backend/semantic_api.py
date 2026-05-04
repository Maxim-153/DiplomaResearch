import requests

def fetch_papers(query: str, limit: int = 30):
    # Основной адрес API Semantic Scholar
    url = "https://api.semanticscholar.org/graph/v1/paper/search"
    
    # "Паспорт" запроса, чтобы сервер не принял нас за бота
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    # Параметры: что ищем, сколько штук и какие поля нам нужны
    params = {
        "query": query,
        "limit": limit,
        "fields": "paperId,title,abstract,year,authors,citations"
    }
    
    try:
        # Отправляем запрос
        response = requests.get(url, params=params, headers=headers)
        
        # Если сервер ответил ошибкой (например, 403), сработает блок except
        response.raise_for_status() 
        
        data = response.json()
        
        # Возвращаем список статей из ключа 'data'
        return data.get("data", [])
        
    except Exception as e:
        # Если что-то пошло не так, пишем ошибку в консоль и возвращаем пустой список
        print(f"Ошибка API: {str(e)}")
        return []