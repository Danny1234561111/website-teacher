// src/types/index.ts
export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface Communication {
  id: number;
  student_id: number;
  student_name?: string | null;
  communication_type: 'call' | 'meeting' | 'email' | 'message';
  status: 'planned' | 'completed' | 'cancelled';
  date_time: string;
  duration_minutes?: number | null;
  notes: string;
  created_by_name?: string | null;
  created_at: string;
}

export interface Student {
  id: number;
  russian_student_id?: number | null;
  full_name: string;
  phone?: string | null;
  additional_contacts?: Record<string, any> | null;
  prior_contact?: string | null;
  department_id?: number | null;
  department_name?: string | null;
  speciality_id?: number | null;
  speciality_name?: string | null;
  profile_id?: number | null;
  profile_name?: string | null;
  study_level?: string | null;
  study_form?: string | null;
  study_basis?: string | null;
  status?: string | null;
  application_status?: string | null;
  contact_status?: string | null;
  contact_type?: string | null;
  consent_status?: boolean | null;
  total_score?: number | null;
  last_communication?: string | null;
  last_communication_note?: string | null;
  kurator_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}