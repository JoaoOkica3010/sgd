import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Anexa o token guardado em memória/sessionStorage a cada pedido.
apiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("sgd_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// RF005: se a sessão expirou (401), força novo login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem("sgd_token");
      sessionStorage.removeItem("sgd_utilizador");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
