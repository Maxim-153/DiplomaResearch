import requests
import json
import os

CACHE_DIR = "api_cache"

if not os.path.exists(CACHE_DIR):
    os.makedirs(CACHE_DIR)

def reconstruct_abstract(inverted_index):
    """
    OpenAlex присылает абстракт в виде: {"Word": [0, 5], "is": [1]}
    Эта функция собирает слова обратно в нормальный текст.
    """
    if not inverted_index:
        return ""
    try:
        # Находим максимальную позицию слова, чтобы создать пустой список нужной длины
        max_idx = max([max(positions) for positions in inverted_index.values()])
        abstract_words = [""] * (max_idx + 1)
        
        # Расставляем слова по своим местам
        for word, positions in inverted_index.items():
            for pos in positions:
                abstract_words[pos] = word
                
        return " ".join(abstract_words).strip()
    except Exception as e:
        print(f"Ошибка сборки текста: {e}")
        return ""

def fetch_papers(query: str, limit: int = 30):
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

    # 2. ЗАПРОС К OPENALEX API
    url = "https://api.openalex.org/works"
    params = {
        "search": query,
        "per_page": limit,
        "mailto": "m46385650@gmail.com" 
    }
    
    print(f"--- [API] Ищу '{query}' в новой базе OpenAlex ---")
    
    try:
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            results = response.json().get("results", [])
            
            # 3. ПАТТЕРН АДАПТЕР (Превращаем OpenAlex в Semantic Scholar)
            formatted_data = []
            for item in results:
                # Достаем авторов (OpenAlex прячет их глубоко)
                authors = [{"name": auth.get("author", {}).get("display_name", "Unknown")} 
                           for auth in item.get("authorships", [])]
                
                # Достаем ссылки (на кого ссылается статья)
                citations = [{"paperId": ref.replace("https://openalex.org/", "")} 
                             for ref in item.get("referenced_works", [])]
                
                # Формируем наш стандартный JSON
                formatted_data.append({
                    "paperId": item.get("id", "").replace("https://openalex.org/", ""),
                    "title": item.get("title") or "Без названия",
                    "abstract": reconstruct_abstract(item.get("abstract_inverted_index")),
                    "year": item.get("publication_year", 0),
                    "authors": authors[:5], # Берем только первых 5 авторов для красоты
                    "citations": citations
                })
            
            # Сохраняем в кэш
            if formatted_data:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(formatted_data, f, ensure_ascii=False, indent=2)
                    
            return formatted_data
            
        else:
            print(f"!!! Ошибка OpenAlex: {response.status_code}")
            
    except Exception as e:
        print(f"!!! Ошибка сети: {e}")

    # Если совсем пропал интернет, возвращаем пустой массив
    return []