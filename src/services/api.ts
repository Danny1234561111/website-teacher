// src/services/api.ts
import axios, { AxiosInstance } from 'axios';
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

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,  // Важно для HttpOnly cookie
    });

    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/api/auth/web/login', {
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async getProfile(): Promise<User> {
    const response = await this.api.get('/api/auth/web/me');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/api/auth/web/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('user');
    localStorage.removeItem('saved_email');
    localStorage.removeItem('saved_password');
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
    
    const response = await this.api.get('/api/students/web', { params: cleanParams });
    return response.data;
  }

  async getStudent(id: number): Promise<Student> {
    const response = await this.api.get(`/api/students/web/${id}`);
    return response.data;
  }

  async getStudentApplications(studentId: number): Promise<StudentApplication[]> {
    const response = await this.api.get(`/api/students/web/${studentId}/applications`);
    return response.data;
  }

  async getCompetitiveInfoForSpeciality(studentId: number, specialityId: number): Promise<CompetitiveInfo> {
    const response = await this.api.get(`/api/students/web/${studentId}/competitive-info/${specialityId}`);
    return response.data;
  }

  async getStudentCompetitiveInfo(studentId: number): Promise<CompetitiveInfo> {
    const response = await this.api.get(`/api/students/web/${studentId}/competitive-info`);
    return response.data;
  }

  async getGroupStatistics(): Promise<GroupStatistics[]> {
    const response = await this.api.get('/api/students/web/statistics/groups');
    return response.data;
  }

  async createStudent(studentData: Partial<Student>): Promise<Student> {
    const response = await this.api.post('/api/students/web', {
      full_name: studentData.full_name,
      russian_student_id: studentData.russian_student_id,
      phone: studentData.phone,
    });
    return response.data;
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const dataToSend: any = { ...studentData };
    
    if (dataToSend.meeting_status !== undefined) {
      const val = String(dataToSend.meeting_status).toLowerCase();
      if (val === 'met') dataToSend.meeting_status = 'MET';
      else if (val === 'not_met') dataToSend.meeting_status = 'NOT_MET';
      else if (val === 'unknown') dataToSend.meeting_status = 'UNKNOWN';
      else dataToSend.meeting_status = 'UNKNOWN';
    }
    
    if (dataToSend.call_status !== undefined) {
      const val = String(dataToSend.call_status).toLowerCase();
      if (val === 'reached') dataToSend.call_status = 'REACHED';
      else if (val === 'not_reached') dataToSend.call_status = 'NOT_REACHED';
      else if (val === 'unknown') dataToSend.call_status = 'UNKNOWN';
      else dataToSend.call_status = 'UNKNOWN';
    }
    
    if (dataToSend.decision_status !== undefined) {
      const val = String(dataToSend.decision_status).toLowerCase();
      if (val === 'decided') dataToSend.decision_status = 'DECIDED';
      if (val === 'denied') dataToSend.decision_status = 'DENIED';
      else if (val === 'thinking') dataToSend.decision_status = 'THINKING';
      else if (val === 'unknown') dataToSend.decision_status = 'UNKNOWN';
      else dataToSend.decision_status = 'UNKNOWN';
    }
    
    if (dataToSend.documents_status !== undefined) {
      const val = String(dataToSend.documents_status).toLowerCase();
      if (val === 'original_submitted') dataToSend.documents_status = 'ORIGINAL_SUBMITTED';
      else if (val === 'waiting_original') dataToSend.documents_status = 'WAITING_ORIGINAL';
      else if (val === 'enrolled') dataToSend.documents_status = 'ENROLLED';
      else if (val === 'not_submitted') dataToSend.documents_status = 'NOT_SUBMITTED';
      else dataToSend.documents_status = 'NOT_SUBMITTED'; 
    }
    
    Object.keys(dataToSend).forEach(key => {
      if (dataToSend[key] === undefined) {
        delete dataToSend[key];
      }
    });
    
    console.log('📤 Отправка обновления студента:', { id, dataToSend });
    
    const response = await this.api.put(`/api/students/web/${id}`, dataToSend);
    return response.data;
  }

  async deleteStudent(id: number): Promise<void> {
    await this.api.delete(`/api/students/web/${id}`);
  }

  async getStudentCommunications(
    studentId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<Communication[]> {
    const response = await this.api.get(
      `/api/students/web/${studentId}/communications`,
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
      `/api/students/web/${studentId}/communications`,
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
      `/api/students/web/communications/${commId}`,
      data
    );
    return response.data;
  }

  async deleteCommunication(commId: number): Promise<void> {
    await this.api.delete(`/api/students/web/communications/${commId}`);
  }

  async getCommunicationStats(daysBack: number = 30): Promise<{
    total_communications: number;
    by_type: Record<string, number>;
    contact_status_distribution: Record<string, number>;
    recent_communications: Communication[];
    period_days: number;
  }> {
    const response = await this.api.get('/api/students/web/communications/stats', {
      params: { days_back: daysBack }
    });
    return response.data;
  }

  async getDepartments(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/web/departments');
      return response.data;
    } catch {
      return [];
    }
  }

  async getSpecialities(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/web/specialities');
      return response.data;
    } catch {
      return [];
    }
  }

  async getProfiles(): Promise<any[]> {
    try {
      const response = await this.api.get('/api/admin/web/profiles');
      return response.data;
    } catch {
      return [];
    }
  }

  async getActiveContact(): Promise<{ contact_type: string; contact_value: string; updated_at?: string } | null> {
    try {
      const response = await this.api.get('/api/user/contact/web/active/get');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async setActiveContact(contactType: string, contactValue: string): Promise<{ contact_type: string; contact_value: string; updated_at?: string }> {
    const response = await this.api.post('/api/user/contact/web/active/set', {
      contact_type: contactType,
      contact_value: contactValue,
    });
    return response.data;
  }

  async deleteActiveContact(): Promise<void> {
    await this.api.delete('/api/user/contact/web/active/delete');
  }

  async importExcel(
    file: File,
    duplicateStrategy: string = 'skip',
    replaceIds?: number[]
  ): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('duplicate_strategy', duplicateStrategy);
    
    if (replaceIds && replaceIds.length > 0) {
      formData.append('replace_ids', JSON.stringify(replaceIds));
    }
    
    const response = await this.api.post('/api/excel-import/web/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

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
  
  async getCommunicationSettings(): Promise<{
    telegram_open_on: string;
    vk_open_on: string;
    url_open_on: string;
  }> {
    const response = await this.api.get('/api/user/contact/web/settings');
    return response.data;
  }

  async updateCommunicationSettings(settings: {
    telegram_open_on?: string;
    vk_open_on?: string;
    url_open_on?: string;
  }): Promise<{
    telegram_open_on: string;
    vk_open_on: string;
    url_open_on: string;
  }> {
    const response = await this.api.put('/api/user/contact/web/settings', settings);
    return response.data;
  }

  async callStudentViaWebSocket(studentId: number, phoneNumber: string): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    fallback?: string;
  }> {
    const response = await this.api.post('/api/user/contact/web/call', {
      student_id: studentId,
      phone_number: phoneNumber,
    });
    return response.data;
  }

  async sendSmsViaWebSocket(studentId: number, phoneNumber: string, messageText?: string): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    fallback?: string;
  }> {
    const response = await this.api.post('/api/user/contact/web/sms', {
      student_id: studentId,
      phone_number: phoneNumber,
      message_text: messageText,
    });
    return response.data;
  }

  async openTelegramViaWebSocket(studentId: number, telegramContact: string): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    data?: { url: string };
  }> {
    const response = await this.api.post('/api/user/contact/web/telegram', {
      student_id: studentId,
      telegram_contact: telegramContact,
    });
    return response.data;
  }

  async openVkViaWebSocket(studentId: number, vkContact: string): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    data?: { url: string };
  }> {
    const response = await this.api.post('/api/user/contact/web/vk', {
      student_id: studentId,
      vk_contact: vkContact,
    });
    return response.data;
  }

  async openUrlViaWebSocket(studentId: number, url: string): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    data?: { url: string };
  }> {
    const response = await this.api.post('/api/user/contact/web/url', {
      student_id: studentId,
      url: url,
    });
    return response.data;
  }

  async useActiveContact(studentId: number): Promise<{
    success: boolean;
    action: string;
    target_device: string;
    message: string;
    student_name?: string;
    data?: { url: string };
    fallback?: string;
  }> {
    const response = await this.api.post('/api/user/contact/web/active/use', null, {
      params: { student_id: studentId }
    });
    return response.data;
  }
}

export const apiService = new ApiService();