from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
import numpy as np

# 1. Загружаем легковесную ИИ-модель для понимания текста
print("Загрузка ML-модели...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Модель готова!")

# 1. ЗАЩИТА: Создаем базовый словарь русских мусорных слов
RU_STOP_WORDS = [
    "на", "от", "для", "из", "по", "как", "что", "это", "или", "при", 
    "то", "за", "об", "до", "со", "же", "вы", "мы", "они", "он", "она"
]

# Объединяем английский и русский словари
COMBINED_STOP_WORDS = list(ENGLISH_STOP_WORDS) + RU_STOP_WORDS

def get_cluster_name(abstracts, top_k=3):
    """
    Генерирует умное название для кластера на основе текстов его статей.
    """
    valid_texts = [text for text in abstracts if text and len(text.strip()) > 0]
    if not valid_texts:
        return "Разное"

    try:
        vectorizer = TfidfVectorizer(
            stop_words=COMBINED_STOP_WORDS,
            max_features=1000,
            token_pattern=r'(?u)\b[a-zA-Zа-яА-ЯёЁ]{3,}\b' # Только слова из 3 и более букв
        )
        tfidf_matrix = vectorizer.fit_transform(valid_texts)
        feature_names = vectorizer.get_feature_names_out()
        
        # ЗАЩИТА: Если после фильтрации слов не осталось вообще
        if len(feature_names) == 0:
            return "Общая тема"
        
        summed_tfidf = np.sum(tfidf_matrix, axis=0)
        top_indices = np.argsort(summed_tfidf).A1[-top_k:][::-1]
        
        top_words = [feature_names[i] for i in top_indices]
        return ", ".join(top_words).title()
    
    except Exception as e:
        print(f"Ошибка при генерации имени: {e}")
        return "Группа статей"

def process_clusters(papers, num_clusters=3):
    """
    Принимает список статей, векторизует, кластеризует и дает названия группам.
    """
    if len(papers) < num_clusters:
        num_clusters = max(1, len(papers))

    texts = []
    valid_papers = []

    # 2. Подготавливаем тексты
    for paper in papers:
        text = paper.get("abstract") or paper.get("title") or ""
        if text.strip():
            texts.append(text)
            valid_papers.append(paper)

    if not texts:
        return papers

    # 3. Векторизация и Кластеризация
    embeddings = model.encode(texts)
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    kmeans.fit(embeddings)

    # 4. Распределяем тексты по корзинам (чтобы дать их почитать TF-IDF)
    # Создаем словарь, где ключ - номер группы, а значение - список текстов
    cluster_texts_dict = {i: [] for i in range(num_clusters)}
    for i, text in enumerate(texts):
        cluster_id = int(kmeans.labels_[i])
        cluster_texts_dict[cluster_id].append(text)

    # 5. Генерируем красивые названия для каждой корзины
    cluster_names_dict = {}
    for cluster_id, c_texts in cluster_texts_dict.items():
         cluster_names_dict[cluster_id] = get_cluster_name(c_texts)

    # 6. Раздаем статьям их номера и новые красивые имена
    for i, paper in enumerate(valid_papers):
        c_id = int(kmeans.labels_[i])
        paper["group"] = c_id
        # НОВОЕ: добавляем текстовое имя кластера
        paper["group_name"] = cluster_names_dict[c_id] 

    return valid_papers