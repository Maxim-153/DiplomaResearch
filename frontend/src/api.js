import axios from 'axios';

// Настраиваем "почтальона", который знает адрес нашего FastAPI-сервера
const apiClient = axios.create({
    baseURL: 'http://127.0.0.1:8000',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Асинхронная функция для запроса данных графа
export const fetchGraphData = async (searchQuery) => {
    try {
        // Делаем GET-запрос: http://127.0.0.1:8000/api/search?query=...
        const response = await apiClient.get('/api/search', {
            params: { query: searchQuery }
        });
        
        // Возвращаем данные (наши nodes и edges)
        return response.data;
        
    } catch (error) {
        // Обязательный перехват ошибок, чтобы сайт не превратился в белый экран
        console.error("Ошибка при получении данных с бэкенда:", error);
        
        // Возвращаем пустую структуру, чтобы React Flow не сломался
        return { nodes: [], edges: [] };
    }
};