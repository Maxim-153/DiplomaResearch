from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans
import numpy as np

# Загружаем компактную, но мощную модель ИИ для работы с текстом
model = SentenceTransformer('all-MiniLM-L6-v2')

def process_clusters(papers, n_clusters=5):
    if not papers:
        return []

    # 1. Собираем все аннотации (abstract) в один список
    # Если у статьи нет аннотации, используем название
    texts = []
    for p in papers:
        content = p.get("abstract") or p.get("title") or ""
        texts.append(content)

    # 2. ВЕКТОРИЗАЦИЯ: Превращаем тексты в числа (эмбеддинги)
    # ИИ анализирует смысл и выдает уникальный числовой код для каждого текста
    embeddings = model.encode(texts)

    # 3. КЛАСТЕРИЗАЦИЯ: Группируем похожие векторы
    # Если статей меньше, чем мы хотим групп, уменьшаем кол-во групп
    actual_clusters = min(n_clusters, len(papers))
    kmeans = KMeans(n_clusters=actual_clusters, n_init=10, random_state=42)
    
    # Алгоритм присваивает каждой статье номер группы (0, 1, 2...)
    cluster_labels = kmeans.fit_predict(embeddings)

    # 4. Добавляем номер группы в данные каждой статьи
    for i, paper in enumerate(papers):
        paper["cluster"] = int(cluster_labels[i])

    return papers