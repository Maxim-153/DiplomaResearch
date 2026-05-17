import axios from 'axios';

// Настраиваем "почтальона", который знает адрес нашего FastAPI-сервера
const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Асинхронная функция для запроса данных графа (теперь поддерживает фильтр по годам)
export const fetchGraphData = async (searchQuery, yearFrom, yearTo) => {
    try {
        // 1. Формируем базовый объект с параметрами (запрос обязателен)
        const queryParams = { query: searchQuery };
        
        // 2. ЗАЩИТА: Превращаем текстовые строки из инпутов в числа.
        // Добавляем их в запрос ТОЛЬКО если пользователь действительно что-то ввел.
        if (yearFrom) {
            queryParams.year_from = parseInt(yearFrom, 10);
        }
        if (yearTo) {
            queryParams.year_to = parseInt(yearTo, 10);
        }

        // 3. Делаем GET-запрос. Axios сам склеит URL, например:
        // http://127.0.0.1:8000/api/search?query=Block&year_from=2020
        const response = await apiClient.get('/api/search', {
            params: queryParams
        });
        
        // Возвращаем данные (наши nodes и edges)
        return response.data;
        
    } catch (error) {
        // Обязательный перехват ошибок, чтобы сайт не превратился в белый экран
        console.error("Ошибка при получении данных с бэкенда:", error);
        throw error;
    }
};
export const expandGraphData = async (paperId) => {
    try {
        // Делаем GET-запрос на наш новый эндпоинт, передавая ID статьи
        const response = await apiClient.get('/api/expand', {
            params: { paper_id: paperId }
        });
        
        // Возвращаем новые узлы и связи от Бэкенда
        return response.data;
        
    } catch (error) {
        // Обязательный перехват ошибок
        console.error(`Ошибка при расширении графа для статьи ${paperId}:`, error);
        throw error;
    }
};
