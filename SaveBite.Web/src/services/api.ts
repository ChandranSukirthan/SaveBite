import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("savebite_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes("/Auth/login") &&
      !error.config?.url?.includes("/Auth/register")
    ) {
      localStorage.removeItem("savebite_token");
      localStorage.removeItem("savebite_user");
      window.dispatchEvent(new Event("savebite:auth-expired"));
    }
    return Promise.reject(error);
  },
);

export default api;