import axios from "axios";
import type {
  DashboardSummary,
  HealthCheck,
  Service,
  ServiceCreate,
  ServiceUpdate,
  User,
} from "../types";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Intercept 401 on token expiry, clear auth state, fire event to tell AuthContext.tsx to redirect to login
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event("auth:expired"));
    }
    return Promise.reject(error);
  },
);

// Auth
export const login = (username: string, password: string): Promise<void> =>
  api.post("/auth/login", { username, password });

export const logout = (): Promise<void> => api.post("/auth/logout");

export const getMe = (): Promise<User> => api.get("/auth/me");

// Services
export const getServices = (): Promise<Service[]> => api.get("/services");

export const createService = (data: ServiceCreate): Promise<Service> =>
  api.post("/services", data);

export const updateService = (
  id: number,
  data: ServiceUpdate,
): Promise<Service> => api.put(`/services/${id}`, data);

export const deleteService = (id: number): Promise<void> =>
  api.delete(`/services/${id}`).then(() => undefined);

export const getServiceHistory = (
  id: number,
  limit = 100,
): Promise<HealthCheck[]> =>
  api.get(`/services/${id}/history`, { params: { limit } });

// Dashboard
export const getDashboardSummary = (): Promise<DashboardSummary> =>
  api.get("/dashboard/summary");

// AI Summary
export const getAiSummary = (): Promise<{ summary: string }> =>
  api.get("/dashboard/ai-summary");

export default api;
