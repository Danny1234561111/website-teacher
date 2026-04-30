// src/services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { LoginCredentials, AuthResponse, Student, User, Communication } from '../types';

const API_BASE_URL = 'http://158.160.67.3:8000';

class ApiService {
  private api: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Интерсептор для добавления токена в заголовки
    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Всегда берем свежий токен из localStorage
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔑 Добавлен токен в запрос:', config.url);
        } else {
          console.log('⚠️ Нет токена для запроса:', config.url);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Интерсептор для обработки ошибок 401
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          console.log('🔒 Ошибка 401 - очищаем токен');
          this.setToken(null);
          localStorage.removeItem('user');
          // Не перенаправляем автоматически, чтобы не было цикла
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
      console.log('✅ Токен сохранен');
    } else {
      localStorage.removeItem('access_token');
      console.log('🗑️ Токен удален');
    }
  }

  getToken(): string | null {
    // Сначала из памяти, потом из localStorage
    if (this.token) return this.token;
    const stored = localStorage.getItem('access_token');
    if (stored) {
      this.token = stored;
      return stored;
    }
    return null;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      console.log('🔄 Попытка входа:', credentials.email);
      const response = await this.api.post('/api/auth/login', {
        email: credentials.email.trim().toLowerCase(),
        password: credentials.password,
      });
      
      console.log('📥 Ответ от сервера:', response.data);
      
      if (response.data.access_token) {
        this.setToken(response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        console.log('✅ Токен получен и сохранен');
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Ошибка входа:', error.response?.data || error.message);
      throw error;
    }
  }

  async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Нет токена');
    }
    
    console.log('🔄 Запрос профиля с токеном:', token.substring(0, 20) + '...');
    
    const response = await this.api.get('/api/auth/me', {
      params: { token }
    });
    
    console.log('📥 Профиль получен:', response.data);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await this.api.post('/api/auth/logout', null, {
          params: { token }
        });
        console.log('👋 Выход с сервера');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('saved_email');
    localStorage.removeItem('saved_password');
    console.log('✅ Локальные данные очищены');
  }

  async getStudents(params?: {
    skip?: number;
    limit?: number;
    status?: string | null;
    application_status?: string | null;
    contact_status?: string | null;
    consent_status?: boolean | null;
    department_id?: number | null;
    speciality_id?: number | null;
    search?: string | null;
  }): Promise<{ total: number; students: Student[] }> {
    const token = this.getToken();
    console.log('🔍 Запрос студентов, токен есть:', !!token);
    
    const response = await this.api.get('/api/students/api/students', { 
      params: {
        skip: params?.skip || 0,
        limit: params?.limit || 100,
        ...params,
      }
    });
    return response.data;
  }

  async getStudent(id: number): Promise<Student> {
    const response = await this.api.get(`/api/students/api/students/${id}`);
    return response.data;
  }

  async createStudent(studentData: Partial<Student>): Promise<Student> {
    const response = await this.api.post('/api/students/api/students', {
      full_name: studentData.full_name,
      russian_student_id: studentData.russian_student_id,
      phone: studentData.phone,
    });
    return response.data;
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const response = await this.api.put(`/api/students/api/students/${id}`, studentData);
    return response.data;
  }

  async deleteStudent(id: number): Promise<void> {
    await this.api.delete(`/api/students/api/students/${id}`);
  }

  // ========== КОММУНИКАЦИИ ==========

  async getStudentCommunications(
    studentId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Communication[]> {
    const response = await this.api.get(
      `/api/students/api/students/${studentId}/communications`,
      { params: { limit, offset } }
    );
    return response.data;
  }

  async createCommunication(
    studentId: number,
    data: {
      communication_type: string;
      status: string;
      date_time: string;
      duration_minutes?: number;
      notes: string;
    }
  ): Promise<Communication> {
    const response = await this.api.post(
      `/api/students/api/students/${studentId}/communications`,
      data
    );
    return response.data;
  }

  async updateCommunication(
    commId: number,
    data: Partial<{
      communication_type: string;
      status: string;
      date_time: string;
      duration_minutes?: number;
      notes: string;
    }>
  ): Promise<Communication> {
    const response = await this.api.put(
      `/api/students/api/students/communications/${commId}`,
      data
    );
    return response.data;
  }

  async deleteCommunication(commId: number): Promise<void> {
    await this.api.delete(`/api/students/api/students/communications/${commId}`);
  }

  // ========== СПРАВОЧНИКИ ==========

  async getDepartments(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/departments');
      return response.data;
    } catch {
      return [];
    }
  }

  async getSpecialities(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/specialities');
      return response.data;
    } catch {
      return [];
    }
  }

  async getProfiles(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/profiles');
      return response.data;
    } catch {
      return [];
    }
  }

  // ========== АКТИВНЫЙ КОНТАКТ ==========

  async getActiveContact(): Promise<{ contact_type: string; contact_value: string; updated_at?: string } | null> {
    try {
      const response = await this.api.get('/api/user/contact/get');
      console.log('📱 Активный контакт получен:', response.data);
      return response.data;
    } catch (error) {
      console.log('⚠️ Активный контакт не установлен');
      return null;
    }
  }

  async setActiveContact(contactType: string, contactValue: string): Promise<{ contact_type: string; contact_value: string; updated_at?: string }> {
    const response = await this.api.post('/api/user/contact/set', {
      contact_type: contactType,
      contact_value: contactValue,
    });
    console.log('✅ Активный контакт установлен:', response.data);
    return response.data;
  }

  async deleteActiveContact(): Promise<void> {
    await this.api.delete('/api/user/contact/delete');
    console.log('🗑️ Активный контакт удален');
  }

  // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

  async checkAuth(): Promise<boolean> {
    try {
      await this.getProfile();
      return true;
    } catch {
      return false;
    }
  }

  saveCredentials(email: string, password: string) {
    localStorage.setItem('saved_email', email);
    localStorage.setItem('saved_password', password);
  }

  getSavedCredentials(): { email: string; password: string } | null {
    const email = localStorage.getItem('saved_email');
    const password = localStorage.getItem('saved_password');
    if (email && password) {
      return { email, password };
    }
    return null;
  }

  clearCredentials() {
    localStorage.removeItem('saved_email');
    localStorage.removeItem('saved_password');
  }
}

export const apiService = new ApiService();