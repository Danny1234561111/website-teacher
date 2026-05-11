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
  position?: number | null;
  last_communication?: string | null;
  last_communication_note?: string | null;
  kurator_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  
  meeting_status?: string | null;
  call_status?: string | null;
  decision_status?: string | null;
  documents_status?: string | null;
  
  has_application?: boolean | null;
  was_on_gathering?: boolean | null;
  not_reached?: boolean | null;
  thinking?: boolean | null;
}

export interface StudentApplication {
  id: number;
  student_id: number;
  department_id: number;
  department_name: string;
  speciality_id: number;
  speciality_name: string;
  profile_id: number | null;
  profile_name: string | null;
  position: number | null;
  priority: number | null;
  total_score: number | null;
  application_status: string | null;
  consent_status: boolean;
  participation: boolean;
  is_main_contest: boolean;
  study_form?: string | null;
  study_basis?: string | null;
  study_level?: string | null;
  budget_places_total?: number | null;
  budget_places_filled?: number | null;
  paid_places_total?: number | null;
  paid_places_filled?: number | null;
  target_places_total?: number | null;
  target_places_filled?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveInfo {
  position: number | null;
  total_students: number;
  total_enrolled: number;
  total_submitted: number;
  average_score: number;
  min_score: number;
  max_score: number;
  passing_score: number | null;
  student_score: number | null;
  department_name: string | null;
  speciality_name: string | null;
  profile_name: string | null;
  study_form?: string | null;
  study_basis?: string | null;
  budget_places_total?: number | null;
  budget_places_filled?: number | null;
  budget_places_free?: number | null;
  competition?: number | null;
}

export interface GroupStatistics {
  group_name: string;
  profile_id?: number | null;  // ДОБАВЬ ЭТО ПОЛЕ!
  study_form: string | null;
  study_basis: string | null;
  total_applications: number;
  applications_submitted: number;
  enrolled: number;
  average_score: number;
  min_score: number;
  max_score: number;
  budget: {
    total: number;
    filled: number;
    free: number;
    applicants_in_range: number;
    applicants_with_consent: number;
    passing_score: number;
  };
  paid: {
    total: number;
    filled: number;
    free: number;
    applicants_with_consent: number;
  };
  target: {
    total: number;
    filled: number;
    free: number;
    applicants_with_consent: number;
  };
  competition: number;
  passing_score_current: number;
  passing_score_last_year: number;
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