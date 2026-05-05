# Файл: /backend/semantic_api.py
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
        max_idx = max([max(positions) for positions in inverted_index.values()])
        abstract_words = [""] * (max_idx + 1)
        
        for word, positions in inverted_index.items():
            for pos in positions:
                abstract_words[pos] = word
                
        return " ".join(abstract_words).strip()
    except Exception as e:
        print(f"Ошибка сборки текста: {e}")
        return ""

# ИЗМЕНЕНИЕ 1: Добавили year_from и year_to в параметры функции
def fetch_papers(query: str, year_from: int = None, year_to: int = None, limit: int = 30):
    
    # ИЗМЕНЕНИЕ 2: Делаем имя файла кэша уникальным для каждого набора дат!
    # Иначе запрос с годами выдаст старый кэш без годов.
    cache_filename = f"{query.replace(' ', '_').lower()}_{year_from}_{year_to}.json"
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
    
    # ИЗМЕНЕНИЕ 3: Собираем фильтры для OpenAlex
    filter_parts = []
    if year_from is not None:
        filter_parts.append(f"from_publication_date:{year_from}-01-01")
    if year_to is not None:
        filter_parts.append(f"to_publication_date:{year_to}-12-31")
        
    # Если есть хотя бы один фильтр, склеиваем их через запятую и добавляем в запрос
    if filter_parts:
        params["filter"] = ",".join(filter_parts)
    
    print(f"--- [API] Ищу '{query}' с фильтрами: {params.get('filter', 'нет')} ---")
    
    try:
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            results = response.json().get("results", [])
            
            # 3. ПАТТЕРН АДАПТЕР (Превращаем OpenAlex в Semantic Scholar)
            formatted_data = []
            for item in results:
                authors = [{"name": auth.get("author", {}).get("display_name", "Unknown")} 
                           for auth in item.get("authorships", [])]
                
                citations = [{"paperId": ref.replace("https://openalex.org/", "")} 
                             for ref in item.get("referenced_works", [])]
                
                formatted_data.append({
                    "paperId": item.get("id", "").replace("https://openalex.org/", ""),
                    "title": item.get("title") or "Без названия",
                    "abstract": reconstruct_abstract(item.get("abstract_inverted_index")),
                    "year": item.get("publication_year", 0),
                    "authors": authors[:5], 
                    "citations": citations,
                    "url": item.get("doi") or item.get("id")
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

    return []

# Дополнительная функция для получения цитирований конкретной статьи (по её ID)

def fetch_citations_for_paper(paper_id: str, limit: int = 15):
    """
    Ищет статьи, которые ссылаются (цитируют) конкретную статью по её ID.
    """
    # 1. Уникальный кэш для цитирований
    cache_filename = f"citations_{paper_id}.json"
    cache_path = os.path.join(CACHE_DIR, cache_filename)

    if os.path.exists(cache_path):
        print(f"--- [CACHE] Беру цитирования из файла: {cache_path} ---")
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            pass

    # 2. Запрос к OpenAlex со специальным фильтром
    url = "https://api.openalex.org/works"
    params = {
        "filter": f"cites:{paper_id}", # Магия здесь: ищем тех, кто цитирует этот ID
        "per_page": limit,
        "mailto": "m46385650@gmail.com" 
    }
    
    print(f"--- [API] Ищу кто цитирует статью: {paper_id} ---")
    
    try:
        response = requests.get(url, params=params, timeout=15)
        
        if response.status_code == 200:
            results = response.json().get("results", [])
            formatted_data = []
            
            # 3. Переупаковка в наш формат (Адаптер)
            for item in results:
                authors = [{"name": auth.get("author", {}).get("display_name", "Unknown")} 
                           for auth in item.get("authorships", [])]
                
                citations = [{"paperId": ref.replace("https://openalex.org/", "")} 
                             for ref in item.get("referenced_works", [])]
                
                formatted_data.append({
                    "paperId": item.get("id", "").replace("https://openalex.org/", ""),
                    "title": item.get("title") or "Без названия",
                    "abstract": reconstruct_abstract(item.get("abstract_inverted_index")),
                    "year": item.get("publication_year", 0),
                    "authors": authors[:5], 
                    "citations": citations
                })
            
            # Сохраняем в кэш
            if formatted_data:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(formatted_data, f, ensure_ascii=False, indent=2)
                    
            return formatted_data
            
        else:
            print(f"!!! Ошибка API при поиске цитирований: {response.status_code}")
            
    except Exception as e:
        print(f"!!! Ошибка сети: {e}")

    return []