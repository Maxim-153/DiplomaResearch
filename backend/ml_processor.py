from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

# 1. Загружаем легковесную ИИ-модель для понимания текста
# Она скачается один раз при первом запуске
print("Загрузка ML-модели...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Модель готова!")

def process_clusters(papers, num_clusters=3):
    """
    Принимает список статей, анализирует их тексты и добавляет каждой поле 'group'.
    """
    # ЗАЩИТА: Если статей меньше, чем кластеров, уменьшаем количество групп
    if len(papers) < num_clusters:
        num_clusters = max(1, len(papers))

    texts = []
    valid_papers = []

    # 2. Подготавливаем тексты
    for paper in papers:
        # Пытаемся взять абстракт. Если его нет (None) - берем заголовок.
        text = paper.get("abstract") or paper.get("title") or ""
        
        if text.strip(): # Если текст не пустой
            texts.append(text)
            valid_papers.append(paper)

    # ЗАЩИТА: Если нет ни одного текста для анализа
    if not texts:
        return papers

    # 3. Векторизация: превращаем человеческий текст в массивы чисел
    embeddings = model.encode(texts)

    # 4. Кластеризация (K-Means): находим 'num_clusters' центров и группируем статьи
    kmeans = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
    kmeans.fit(embeddings)

    # 5. Раздаем статьям номера их групп (0, 1, 2...)
    for i, paper in enumerate(valid_papers):
        paper["group"] = int(kmeans.labels_[i])

    return valid_papers