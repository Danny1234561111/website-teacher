// src/services/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { 
  LoginCredentials, 
  AuthResponse, 
  Student, 
  User, 
  Communication, 
  StudentApplication, 
  CompetitiveInfo, 
  GroupStatistics 
} from '../types';

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

    this.api.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.setToken(null);
          localStorage.removeItem('user');
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    const stored = localStorage.getItem('access_token');
    if (stored) {
      this.token = stored;
      return stored;
    }
    return null;
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/api/auth/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Нет токена');
    }
    const response = await this.api.get('/api/auth/me', { params: { token } });
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await this.api.post('/api/auth/logout', null, { params: { token } });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    this.setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('saved_email');
    localStorage.removeItem('saved_password');
  }

  // ========== СТУДЕНТЫ ==========

  async getStudents(params?: {
    skip?: number;
    limit?: number;
    status?: string | null;
    application_status?: string | null;
    contact_status?: string | null;
    consent_status?: boolean | null;
    department_id?: number | null;
    speciality_id?: number | null;
    study_form?: string | null;
    study_basis?: string | null;
    search?: string | null;
    meeting_status?: string | null;
    call_status?: string | null;
    decision_status?: string | null;
    documents_status?: string | null;
  }): Promise<{ total: number; students: Student[] }> {
    const cleanParams: Record<string, any> = {
      skip: params?.skip ?? 0,
      limit: params?.limit ?? 100,
    };
    
    if (params?.status && params.status.length > 0) cleanParams.status = params.status;
    if (params?.application_status && params.application_status.length > 0) cleanParams.application_status = params.application_status;
    if (params?.contact_status && params.contact_status.length > 0) cleanParams.contact_status = params.contact_status;
    if (params?.consent_status !== null && params?.consent_status !== undefined) cleanParams.consent_status = params.consent_status;
    if (params?.department_id !== null && params?.department_id !== undefined) cleanParams.department_id = params.department_id;
    if (params?.speciality_id !== null && params?.speciality_id !== undefined) cleanParams.speciality_id = params.speciality_id;
    if (params?.study_form && params.study_form.length > 0) cleanParams.study_form = params.study_form;
    if (params?.study_basis && params.study_basis.length > 0) cleanParams.study_basis = params.study_basis;
    if (params?.search && params.search.length > 0) cleanParams.search = params.search;
    if (params?.meeting_status && params.meeting_status.length > 0) cleanParams.meeting_status = params.meeting_status;
    if (params?.call_status && params.call_status.length > 0) cleanParams.call_status = params.call_status;
    if (params?.decision_status && params.decision_status.length > 0) cleanParams.decision_status = params.decision_status;
    if (params?.documents_status && params.documents_status.length > 0) cleanParams.documents_status = params.documents_status;
    
    const response = await this.api.get('/api/students', { params: cleanParams });
    return response.data;
  }

  async getStudent(id: number): Promise<Student> {
    const response = await this.api.get(`/api/students/${id}`);
    return response.data;
  }

  async getStudentApplications(studentId: number): Promise<StudentApplication[]> {
    const response = await this.api.get(`/api/students/${studentId}/applications`);
    return response.data;
  }

  async getCompetitiveInfoForSpeciality(studentId: number, specialityId: number): Promise<CompetitiveInfo> {
    const response = await this.api.get(`/api/students/${studentId}/competitive-info/${specialityId}`);
    return response.data;
  }

  async getStudentCompetitiveInfo(studentId: number): Promise<CompetitiveInfo> {
    const response = await this.api.get(`/api/students/${studentId}/competitive-info`);
    return response.data;
  }

  // ========== СТАТИСТИКА ПО ГРУППАМ ==========

  async getGroupStatistics(): Promise<GroupStatistics[]> {
    const response = await this.api.get('/api/students/statistics/groups');
    return response.data;
  }

  async createStudent(studentData: Partial<Student>): Promise<Student> {
    const response = await this.api.post('/api/students', {
      full_name: studentData.full_name,
      russian_student_id: studentData.russian_student_id,
      phone: studentData.phone,
    });
    return response.data;
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const response = await this.api.put(`/api/students/${id}`, studentData);
    return response.data;
  }

  async deleteStudent(id: number): Promise<void> {
    await this.api.delete(`/api/students/${id}`);
  }

  // ========== КОММУНИКАЦИИ ==========

  async getStudentCommunications(
    studentId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Communication[]> {
    const response = await this.api.get(
      `/api/students/${studentId}/communications`,
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
      `/api/students/${studentId}/communications`,
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
      `/api/students/communications/${commId}`,
      data
    );
    return response.data;
  }

  async deleteCommunication(commId: number): Promise<void> {
    await this.api.delete(`/api/students/communications/${commId}`);
  }

  async getCommunicationStats(daysBack: number = 30): Promise<{
    total_communications: number;
    by_type: Record<string, number>;
    contact_status_distribution: Record<string, number>;
    recent_communications: Communication[];
    period_days: number;
  }> {
    const response = await this.api.get('/api/students/communications/stats', {
      params: { days_back: daysBack }
    });
    return response.data;
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
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async setActiveContact(contactType: string, contactValue: string): Promise<{ contact_type: string; contact_value: string; updated_at?: string }> {
    const response = await this.api.post('/api/user/contact/set', {
      contact_type: contactType,
      contact_value: contactValue,
    });
    return response.data;
  }

  async deleteActiveContact(): Promise<void> {
    await this.api.delete('/api/user/contact/delete');
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