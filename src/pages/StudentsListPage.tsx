import React, { useState, useEffect,useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Snackbar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Grid,
  Badge,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MuiMenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
  RadioGroup,
  Radio,
  List,
  ListItem,
} from '@mui/material';
import {
  Search as SearchIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Telegram as TelegramIcon,
  Link as LinkIcon,
  Sms as SmsIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  UploadFile as UploadFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Student } from '../types';
import styles from './StudentsListPage.module.scss';

interface Filters {
  status: string[];
  application_status: string[];
  contact_status: string[];
  department_id: number | '';
  speciality_id: number | '';
  study_form: string[];
  study_basis: string[];
  consent_status: boolean | null;
  meeting_status: string | null;
  call_status: string | null;
  decision_status: string | null;
  documents_status: string | null;
}

// Ключи для localStorage
const STUDENT_FILTERS_KEY = 'student_filters';
const STUDENT_FILTERS_TIMESTAMP_KEY = 'student_filters_timestamp';
const STUDENT_PAGINATION_KEY = 'student_pagination';
const STUDENT_PAGINATION_TIMESTAMP_KEY = 'student_pagination_timestamp';
const STUDENT_SEARCH_KEY = 'student_search';
const STUDENT_SEARCH_TIMESTAMP_KEY = 'student_search_timestamp';

// Время жизни кэша в минутах (можно менять здесь)
const CACHE_TTL_MINUTES = 60;

// Функции для работы с TTL
const isCacheExpired = (timestamp: number | null): boolean => {
  if (!timestamp) return true;
  return Date.now() - timestamp > CACHE_TTL_MINUTES * 60 * 1000;
};

const setWithExpiry = (key: string, value: any, timestampKey: string) => {
  localStorage.setItem(key, JSON.stringify(value));
  localStorage.setItem(timestampKey, Date.now().toString());
};

const getWithExpiry = (key: string, timestampKey: string): any | null => {
  const timestamp = localStorage.getItem(timestampKey);
  if (isCacheExpired(timestamp ? parseInt(timestamp) : null)) {
    localStorage.removeItem(key);
    localStorage.removeItem(timestampKey);
    return null;
  }
  const data = localStorage.getItem(key);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

// Функция нормализации ФИО
const normalizeFullName = (name: string): string => {
  if (!name) return '';
  
  let cleaned = name.replace(/[*]/g, '').trim();
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  const words = cleaned.split(' ');
  const normalizedWords = words.map(word => {
    if (word.length === 0) return word;
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return normalizedWords.join(' ');
};

// Кастомный компонент для квадратного чипа
const SquareChip: React.FC<{
  label: string;
  size?: 'small' | 'medium';
  sx?: any;
  variant?: 'outlined' | 'filled';
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDelete?: (event: React.MouseEvent<HTMLDivElement>) => void;
  icon?: React.ReactElement;
  color?: 'success' | 'error' | 'info' | 'warning' | 'default';
}> = ({ label, size = 'small', sx, variant = 'outlined', onClick, onDelete, icon, color }) => {
  return (
    <Chip
      label={label}
      size={size}
      variant={variant}
      onClick={onClick}
      onDelete={onDelete}
      icon={icon}
      color={color}
      sx={{
        borderRadius: '4px',
        ...sx,
      }}
    />
  );
};

const StudentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const getInitialSearch = () => {
    const savedSearch = getWithExpiry(STUDENT_SEARCH_KEY, STUDENT_SEARCH_TIMESTAMP_KEY);
    return savedSearch !== null ? savedSearch : '';
  };
  
  const getInitialPagination = () => {
    const savedPagination = getWithExpiry(STUDENT_PAGINATION_KEY, STUDENT_PAGINATION_TIMESTAMP_KEY);
    if (savedPagination) {
      return {
        page: savedPagination.page ?? 0,
        rowsPerPage: savedPagination.rowsPerPage ?? 10
      };
    }
    return { page: 0, rowsPerPage: 10 };
  };
  
  const initialPagination = getInitialPagination();
  const [searchQuery, setSearchQuery] = useState(getInitialSearch);
  const [page, setPage] = useState(initialPagination.page);
  const [rowsPerPage, setRowsPerPage] = useState(initialPagination.rowsPerPage);
  const [total, setTotal] = useState(0);
  const [isParserRunning, setIsParserRunning] = useState(false);
  const [activeContact, setActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeContactMap, setActiveContactMap] = useState<Map<number, { contact_type: string; contact_value: string } | null>>(new Map());
  const [loadingActiveContact, setLoadingActiveContact] = useState<number | null>(null);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogTab, setAddDialogTab] = useState(0);
  const [newStudent, setNewStudent] = useState({
    full_name: '',
    phone: '',
    russian_student_id: '',
  });
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState<{
    success: boolean;
    total_rows: number;
    created_students: number;
    updated_students: number;
    created_applications: number;
    errors: any[];
    warnings: any[];
    message: string;
    duplicates_found?: any[];
  } | null>(null);
  
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'replace_all' | 'replace_selected'>('skip');
  const [replaceIds, setReplaceIds] = useState<Set<number>>(new Set());
  const [showDuplicatesDialog, setShowDuplicatesDialog] = useState(false);
  const [isRetryingImport, setIsRetryingImport] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);
  const [tempFilters, setTempFilters] = useState<Filters>({
    status: [],
    application_status: [],
    contact_status: [],
    department_id: '',
    speciality_id: '',
    study_form: [],
    study_basis: [],
    consent_status: null,
    meeting_status: null,
    call_status: null,
    decision_status: null,
    documents_status: null,
  });
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
  const [specialities, setSpecialities] = useState<{ id: number; name: string }[]>([]);
  
  // Настройки коммуникации
  const [communicationSettings, setCommunicationSettings] = useState<{
    telegram_open_on: string;
    vk_open_on: string;
    url_open_on: string;
  }>({
    telegram_open_on: 'pc',
    vk_open_on: 'pc',
    url_open_on: 'pc',
  });

  const meetingStatusOptions = [
    { value: 'not_met', label: 'Не был на сборе', color: 'error' as const },
    { value: 'met', label: 'Был на сборе', color: 'success' as const },
    { value: 'unknown', label: 'Не указано', color: 'default' as const },
  ];

  const callStatusOptions = [
    { value: 'not_reached', label: 'Не дозвонились', color: 'error' as const },
    { value: 'reached', label: 'Дозвонились', color: 'success' as const },
    { value: 'unknown', label: 'Не указано', color: 'default' as const },
  ];

  const decisionStatusOptions = [
    { value: 'thinking', label: 'Думает', color: 'warning' as const },
    { value: 'denied', label: 'Отказался', color: 'error' as const },
    { value: 'decided', label: 'Решил', color: 'success' as const },
    { value: 'unknown', label: 'Не указано', color: 'default' as const },
  ];

  const documentsStatusOptions = [
    { value: 'not_submitted', label: 'Нет заявл.', color: 'default' as const },
    { value: 'original_submitted', label: 'Подан оригинал', color: 'success' as const },
    { value: 'waiting_original', label: 'Ждем оригинал', color: 'warning' as const },
    { value: 'enrolled', label: 'Зачислен', color: 'info' as const },
    { value: 'unknown', label: 'Не указано', color: 'default' as const },
  ];

  const getPriorContactType = (priorContact: string | null | undefined): string => {
    const contact = priorContact?.toLowerCase();
    if (contact === 'телеграмм' || contact === 'telegram') return 'Telegram';
    if (contact === 'ссылка' || contact === 'url') return 'Url';
    if (contact === 'звонок' || contact === 'phone' || contact === 'call') return 'Call';
    if (contact === 'просто сообщения' || contact === 'sms' || contact === 'messages') return 'Sms';
    return 'Default';
  };

  const getInitialFilters = (): Filters => {
    const saved = getWithExpiry(STUDENT_FILTERS_KEY, STUDENT_FILTERS_TIMESTAMP_KEY);
    if (saved) {
      return {
        status: saved.status || [],
        application_status: saved.application_status || [],
        contact_status: saved.contact_status || [],
        department_id: saved.department_id || '',
        speciality_id: saved.speciality_id || '',
        study_form: saved.study_form || [],
        study_basis: saved.study_basis || [],
        consent_status: saved.consent_status !== undefined ? saved.consent_status : null,
        meeting_status: saved.meeting_status !== undefined ? saved.meeting_status : null,
        call_status: saved.call_status !== undefined ? saved.call_status : null,
        decision_status: saved.decision_status !== undefined ? saved.decision_status : null,
        documents_status: saved.documents_status !== undefined ? saved.documents_status : null,
      };
    }
    return {
      status: [],
      application_status: [],
      contact_status: [],
      department_id: '',
      speciality_id: '',
      study_form: [],
      study_basis: [],
      consent_status: null,
      meeting_status: null,
      call_status: null,
      decision_status: null,
      documents_status: null,
    };
  };

  const [filters, setFilters] = useState<Filters>(getInitialFilters);

  useEffect(() => {
    const init = async () => {
      await loadStudents();
    };
    
    init();
    loadFiltersData();
    loadActiveContact();
    loadCommunicationSettings();
  }, []);

  useEffect(() => {
    setWithExpiry(STUDENT_FILTERS_KEY, filters, STUDENT_FILTERS_TIMESTAMP_KEY);
  }, [filters]);

  useEffect(() => {
    setWithExpiry(STUDENT_PAGINATION_KEY, { page, rowsPerPage }, STUDENT_PAGINATION_TIMESTAMP_KEY);
  }, [page, rowsPerPage]);

  useEffect(() => {
    setWithExpiry(STUDENT_SEARCH_KEY, searchQuery, STUDENT_SEARCH_TIMESTAMP_KEY);
  }, [searchQuery]);

  
  useEffect(() => {
    applyFilters();
  }, [searchQuery, students, filters]);

  const getMeetingStatusLabel = (status: string | null | undefined): string => {
    if (status?.toLowerCase() === 'met') return 'Был на сборе';
    if (status?.toLowerCase() === 'not_met') return 'Не был на сборе';
    if (status?.toLowerCase() === 'unknown') return 'Не указано';
    return 'Не указано';
  };

  const getCallStatusLabel = (status: string | null | undefined): string => {
    if (status?.toLowerCase() === 'reached') return 'Дозвонились';
    if (status?.toLowerCase() === 'not_reached') return 'Не дозвонились';
    if (status?.toLowerCase() === 'unknown') return 'Не указано';
    return 'Не указано';
  };

  const getDecisionStatusLabel = (status: string | null | undefined): string => {
    if (status?.toLowerCase() === 'decided') return 'Решил';
    if (status?.toLowerCase() === 'thinking') return 'Думает';
    if (status?.toLowerCase() === 'denied') return 'Отказался';
    if (status?.toLowerCase() === 'unknown') return 'Не указано';
    return 'Не указано';
  };

  const getDocumentsStatusLabel = (status: string | null | undefined): string => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'original_submitted') return 'Подан оригинал';
    if (statusLower === 'waiting_original') return 'Ждем оригинал';
    if (statusLower === 'enrolled') return 'Зачислен';
    if (statusLower === 'not_submitted') return 'Нет заявл.';
    if (statusLower === 'unknown') return 'Не указано';
    return 'Не указано';
  };

  const getMeetingStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    if (status?.toLowerCase() === 'met') return 'success';
    if (status?.toLowerCase() === 'not_met') return 'error';
    if (status?.toLowerCase() === 'unknown') return 'default';
    return 'default';
  };

  const getCallStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    if (status?.toLowerCase() === 'reached') return 'success';
    if (status?.toLowerCase() === 'not_reached') return 'error';
    if (status?.toLowerCase() === 'unknown') return 'default';
    return 'default';
  };

  const getDecisionStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    if (status?.toLowerCase() === 'decided') return 'success';
    if (status?.toLowerCase() === 'thinking') return 'warning';
    if (status?.toLowerCase() === 'denied') return 'error';
    if (status?.toLowerCase() === 'unknown') return 'default';
    return 'default';
  };

  const getDocumentsStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const statusLower = status?.toLowerCase();
    if (statusLower === 'original_submitted') return 'success';
    if (statusLower === 'waiting_original') return 'warning';
    if (statusLower === 'enrolled') return 'info';
    if (statusLower === 'not_submitted') return 'default';
    if (statusLower === 'unknown') return 'default';
    return 'default';
  };

  const loadActiveContact = async () => {
    try {
      const contact = await apiService.getActiveContact();
      if (contact && (contact.contact_type === 'telegram' || contact.contact_type === 'url')) {
        setActiveContact(contact);
      } else {
        setActiveContact(null);
      }
    } catch (err) {
      console.error('Ошибка загрузки активного контакта:', err);
      setActiveContact(null);
    }
  };

  const loadCommunicationSettings = async () => {
    try {
      const settings = await apiService.getCommunicationSettings();
      setCommunicationSettings(settings);
    } catch (err) {
      console.error('Ошибка загрузки настроек коммуникации:', err);
    }
  };

  const handleActiveContactClick = () => {
    if (!activeContact) return;
    
    const contactType = activeContact.contact_type?.toLowerCase();
    const contactValue = activeContact.contact_value;
    
    if (contactType === 'telegram') {
      handleTelegramOpen(contactValue);
    } else if (contactType === 'url') {
      openLink(contactValue);
    }
  };

   const loadStudents = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await apiService.getStudents({ limit: 500 });
        const studentsList = response.students || [];
        setStudents(studentsList);
        setTotal(response.total || 0);
        await loadActiveContactsForStudents(studentsList);
      } catch (err: any) {
        console.error('Error loading students:', err);
        const errorMessage = err.response?.data?.detail || err.message || 'Ошибка загрузки студентов';
        setError(typeof errorMessage === 'object' ? 'Ошибка загрузки данных' : errorMessage);
        setStudents([]);
        setFilteredStudents([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    };

  const runParser = async () => {
    setIsParserRunning(true);
    try {
      const response = await fetch('http://158.160.67.3:8000/api/parser/run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      setSnackbar({ open: true, message: 'Парсер запущен: ' + (data.message || 'Успешно'), severity: 'success' });
      setTimeout(() => {
        loadStudents();
      }, 3000);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка запуска парсера', severity: 'error' });
    } finally {
      setIsParserRunning(false);
    }
  };

  const loadFiltersData = async () => {
    try {
      const [departmentsRes, specialitiesRes] = await Promise.all([
        apiService.getDepartments(),
        apiService.getSpecialities(),
      ]);
      setDepartments(departmentsRes || []);
      setSpecialities(specialitiesRes || []);
    } catch (err) {
      console.error('Ошибка загрузки данных для фильтров:', err);
    }
  };

  const loadActiveContactsForStudents = async (studentsList: Student[]) => {
    try {
      const activeContact = await apiService.getActiveContact();
      const newMap = new Map<number, { contact_type: string; contact_value: string } | null>();
      if (activeContact) {
        const studentWithActiveContact = studentsList.find(s => 
          s.phone === activeContact.contact_value || 
          s.additional_contacts?.telegram === activeContact.contact_value ||
          s.additional_contacts?.url === activeContact.contact_value
        );
        if (studentWithActiveContact) {
          newMap.set(studentWithActiveContact.id, activeContact);
        }
      }
      setActiveContactMap(newMap);
    } catch (err) {
      console.error('Ошибка загрузки активных контактов:', err);
    }
  };

  const applyFilters = () => {
    let result = [...students];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (student) =>
          student.full_name.toLowerCase().includes(query) ||
          (student.phone && student.phone.includes(query)) ||
          (student.russian_student_id && student.russian_student_id.toString().includes(query))
      );
    }

    if (filters.status.length > 0) {
      result = result.filter(student => student.status && filters.status.includes(student.status.toLowerCase()));
    }

    if (filters.application_status.length > 0) {
      result = result.filter(student => student.application_status && filters.application_status.includes(student.application_status.toLowerCase()));
    }

    if (filters.contact_status.length > 0) {
      result = result.filter(student => student.contact_status && filters.contact_status.includes(student.contact_status.toLowerCase()));
    }

    if (filters.department_id !== '') {
      result = result.filter(student => student.department_id === Number(filters.department_id));
    }

    if (filters.speciality_id !== '') {
      result = result.filter(student => student.speciality_id === Number(filters.speciality_id));
    }

    if (filters.study_form.length > 0) {
      result = result.filter(student => student.study_form && filters.study_form.includes(student.study_form));
    }

    if (filters.study_basis.length > 0) {
      result = result.filter(student => student.study_basis && filters.study_basis.includes(student.study_basis));
    }

    if (filters.consent_status !== null) {
      result = result.filter(student => student.consent_status === filters.consent_status);
    }

    if (filters.meeting_status !== null) {
      result = result.filter(student => student.meeting_status?.toLowerCase() === filters.meeting_status);
    }

    if (filters.call_status !== null) {
      result = result.filter(student => student.call_status?.toLowerCase() === filters.call_status);
    }

    if (filters.decision_status !== null) {
      result = result.filter(student => student.decision_status?.toLowerCase() === filters.decision_status);
    }

    if (filters.documents_status !== null) {
      result = result.filter(student => student.documents_status?.toLowerCase() === filters.documents_status);
    }

    result.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    setFilteredStudents(result);
  };
  
  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredStudents.length / rowsPerPage) - 1);
    if (page > maxPage && filteredStudents.length > 0) {
      setPage(maxPage);
    }
  }, [filteredStudents.length, rowsPerPage]);

  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.status.length) count++;
    if (filters.application_status.length) count++;
    if (filters.contact_status.length) count++;
    if (filters.department_id !== '') count++;
    if (filters.speciality_id !== '') count++;
    if (filters.study_form.length) count++;
    if (filters.study_basis.length) count++;
    if (filters.consent_status !== null) count++;
    if (filters.meeting_status !== null) count++;
    if (filters.call_status !== null) count++;
    if (filters.decision_status !== null) count++;
    if (filters.documents_status !== null) count++;
    return count;
  };

  const handleOpenFilters = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
    setTempFilters(JSON.parse(JSON.stringify(filters)));
  };

  const handleCloseFilters = () => {
    setFilterAnchorEl(null);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    handleCloseFilters();
    setPage(0);
  };

  const handleResetFilters = () => {
    const resetFilters: Filters = {
      status: [],
      application_status: [],
      contact_status: [],
      department_id: '',
      speciality_id: '',
      study_form: [],
      study_basis: [],
      consent_status: null,
      meeting_status: null,
      call_status: null,
      decision_status: null,
      documents_status: null,
    };
    setTempFilters(resetFilters);
    setFilters(resetFilters);
    handleCloseFilters();
    setPage(0);
    localStorage.removeItem(STUDENT_FILTERS_KEY);
    localStorage.removeItem(STUDENT_FILTERS_TIMESTAMP_KEY);
  };

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectChange = (key: keyof Filters, value: string) => {
    setTempFilters(prev => {
      const current = prev[key] as string[];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue };
    });
  };

  const handleRemoveFilter = (key: keyof Filters, value?: string) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value) {
        const currentArray = prev[key] as string[];
        (newFilters[key] as any) = currentArray.filter(v => v !== value);
      } else if (key === 'department_id' || key === 'speciality_id') {
        (newFilters[key] as any) = '';
      } else {
        (newFilters[key] as any) = null;
      }
      return newFilters;
    });
    setPage(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRowClick = (studentId: number) => {
    navigate(`/students/${studentId}`);
  };

  const openTelegramDesktop = (contact: string) => {
    if (!contact) return;
    
    let cleanContact = contact.startsWith('@') ? contact.substring(1) : contact;
    const isPhoneNumber = /^[\d+\s\-\(\)]+$/.test(cleanContact);
    
    let telegramUrl: string;
    if (isPhoneNumber) {
      const phoneNumber = cleanContact.replace(/[^\d+]/g, '');
      telegramUrl = `tg://resolve?phone=${phoneNumber}`;
    } else {
      telegramUrl = `tg://resolve?domain=${cleanContact}`;
    }
    
    window.location.href = telegramUrl;
  };

  const openLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      window.open('https://' + url, '_blank');
    }
  };

  const handleTelegramOpen = async (telegramContact: string, studentId?: number) => {
    if (!telegramContact) {
      setSnackbar({ open: true, message: 'Telegram контакт не указан', severity: 'warning' });
      return;
    }

    const targetDevice = communicationSettings.telegram_open_on;

    if (targetDevice === 'pc') {
      openTelegramDesktop(telegramContact);
    } else {
      if (!studentId) {
        setSnackbar({ open: true, message: 'ID студента не указан для WebSocket', severity: 'error' });
        return;
      }
      
      try {
        const result = await apiService.openTelegramViaWebSocket(studentId, telegramContact);
        
        if (result.success) {
          if (result.target_device === 'pc' && result.data?.url) {
            window.open(result.data.url, '_blank');
          } else if (result.target_device === 'mobile') {
            setSnackbar({ 
              open: true, 
              message: `📱 Telegram открывается на телефоне`, 
              severity: 'success' 
            });
          }
        } else {
          openTelegramDesktop(telegramContact);
        }
      } catch (err) {
        openTelegramDesktop(telegramContact);
      }
    }
  };

  const getContactValue = (student: Student): string | null => {
    const priorContact = student.prior_contact?.toLowerCase();
    if (priorContact === 'звонок' || priorContact === 'просто сообщения' || priorContact === 'phone' || priorContact === 'call' || priorContact === 'sms') {
      return student.phone || null;
    }
    if (priorContact === 'телеграмм' || priorContact === 'telegram') {
      return student.additional_contacts?.telegram || student.phone || null;
    }
    if (priorContact === 'ссылка' || priorContact === 'url') {
      return student.additional_contacts?.url || null;
    }
    return null;
  };

  const getContactTypeForApi = (student: Student): string | null => {
    const priorContact = student.prior_contact?.toLowerCase();
    if (priorContact === 'телеграмм' || priorContact === 'telegram') return 'telegram';
    if (priorContact === 'ссылка' || priorContact === 'url') return 'url';
    if (priorContact === 'звонок' || priorContact === 'phone' || priorContact === 'call') return 'call';
    if (priorContact === 'просто сообщения' || priorContact === 'sms' || priorContact === 'messages') return 'sms';
    return null;
  };

  const handleToggleActiveContact = async (student: Student, event: React.MouseEvent) => {
    event.stopPropagation();
    const isCurrentlyActive = activeContactMap.has(student.id);
    if (isCurrentlyActive) {
      setLoadingActiveContact(student.id);
      try {
        await apiService.deleteActiveContact();
        setActiveContactMap(new Map());
        await loadActiveContact();
        setSnackbar({ open: true, message: 'Активный контакт выключен', severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Ошибка выключения', severity: 'error' });
      } finally {
        setLoadingActiveContact(null);
      }
    } else {
      const contactType = getContactTypeForApi(student);
      const contactValue = getContactValue(student);
      if (!student.prior_contact) {
        setSnackbar({ open: true, message: 'У студента не указан приоритетный контакт', severity: 'warning' });
        return;
      }
      if (!contactValue) {
        setSnackbar({ open: true, message: 'Не удалось определить контакт', severity: 'warning' });
        return;
      }
      if (!contactType) {
        setSnackbar({ open: true, message: 'Неподдерживаемый тип контакта', severity: 'warning' });
        return;
      }
      setLoadingActiveContact(student.id);
      try {
        await apiService.setActiveContact(contactType, contactValue);
        const newMap = new Map();
        newMap.set(student.id, { contact_type: contactType, contact_value: contactValue });
        setActiveContactMap(newMap);
        await loadActiveContact();
        setSnackbar({ open: true, message: `Активный контакт включен`, severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Ошибка включения', severity: 'error' });
      } finally {
        setLoadingActiveContact(null);
      }
    }
  };

  const handlePriorContactAction = async (student: Student, event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const priorContact = student.prior_contact?.toLowerCase();
    
    if (priorContact === 'телеграмм' || priorContact === 'telegram') {
      const telegram = student.additional_contacts?.telegram || student.phone;
      if (telegram) {
        await handleTelegramOpen(telegram, student.id);
      }
    } 
    else if (priorContact === 'ссылка' || priorContact === 'url') {
      const url = student.additional_contacts?.url;
      if (url) {
        try {
          const result = await apiService.openUrlViaWebSocket(student.id, url);
          if (result.success && result.target_device === 'pc' && result.data?.url) {
            window.open(result.data.url, '_blank');
          } else if (result.success && result.target_device === 'mobile') {
            setSnackbar({ open: true, message: `🌐 Ссылка открывается на телефоне`, severity: 'success' });
          } else {
            openLink(url);
          }
        } catch {
          openLink(url);
        }
      }
    }
    else if (priorContact === 'звонок' || priorContact === 'phone' || priorContact === 'call') {
      if (student.phone) {
        try {
          const result = await apiService.callStudentViaWebSocket(student.id, student.phone);
          if (result.success && result.target_device === 'mobile') {
            setSnackbar({ open: true, message: `📞 Звонок инициирован на телефоне`, severity: 'success' });
          } else if (result.fallback) {
            const confirmCall = window.confirm('Мобильное приложение не подключено. Открыть системный звонок?');
            if (confirmCall) window.location.href = result.fallback;
          } else {
            setSnackbar({ open: true, message: result.message, severity: 'error' });
          }
        } catch {
          window.location.href = `tel:${student.phone}`;
        }
      } else {
        setSnackbar({ open: true, message: 'Номер телефона не указан', severity: 'warning' });
      }
    }
    else if (priorContact === 'просто сообщения' || priorContact === 'sms' || priorContact === 'messages') {
      if (student.phone) {
        try {
          const result = await apiService.sendSmsViaWebSocket(student.id, student.phone);
          if (result.success && result.target_device === 'mobile') {
            setSnackbar({ open: true, message: `✉️ SMS открыта на телефоне`, severity: 'success' });
          } else if (result.fallback) {
            const confirmSms = window.confirm('Мобильное приложение не подключено. Открыть SMS вручную?');
            if (confirmSms) window.location.href = result.fallback;
          } else {
            setSnackbar({ open: true, message: result.message, severity: 'error' });
          }
        } catch {
          window.location.href = `sms:${student.phone}`;
        }
      } else {
        setSnackbar({ open: true, message: 'Номер телефона не указан', severity: 'warning' });
      }
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, student: Student) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    setIsDeleting(true);
    try {
      await apiService.deleteStudent(studentToDelete.id);
      setSnackbar({ open: true, message: `Студент "${studentToDelete.full_name}" удален`, severity: 'success' });
      loadStudents();
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка удаления: ' + (err.response?.data?.detail || err.message), severity: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMenuAction = async (action: string) => {
    if (!selectedStudent) return;
    switch (action) {
      case 'profile':
        navigate(`/students/${selectedStudent.id}`);
        break;
      case 'telegram':
        if (selectedStudent.phone) {
          await handleTelegramOpen(selectedStudent.phone, selectedStudent.id);
        } else {
          setSnackbar({ open: true, message: 'Номер телефона не указан', severity: 'warning' });
        }
        break;
      case 'url':
        const url = selectedStudent.additional_contacts?.url;
        if (url) {
          try {
            const result = await apiService.openUrlViaWebSocket(selectedStudent.id, url);
            if (result.success && result.target_device === 'pc' && result.data?.url) {
              window.open(result.data.url, '_blank');
            } else if (result.success && result.target_device === 'mobile') {
              setSnackbar({ open: true, message: `🌐 Ссылка открывается на телефоне`, severity: 'success' });
            } else {
              openLink(url);
            }
          } catch {
            openLink(url);
          }
        } else {
          setSnackbar({ open: true, message: 'Ссылка не указана', severity: 'warning' });
        }
        break;
      case 'setActive':
        handleToggleActiveContact(selectedStudent, {} as React.MouseEvent);
        break;
      case 'delete':
        setStudentToDelete(selectedStudent);
        setDeleteDialogOpen(true);
        break;
    }
    handleMenuClose();
  };

  const getPriorContactIcon = (priorContact: string | null | undefined): React.ReactElement | null => {
    const contact = priorContact?.toLowerCase();
    if (contact === 'телеграмм' || contact === 'telegram') return <TelegramIcon fontSize="small" />;
    if (contact === 'ссылка' || contact === 'url') return <LinkIcon fontSize="small" />;
    if (contact === 'звонок' || contact === 'phone' || contact === 'call') return <PhoneIcon fontSize="small" />;
    if (contact === 'просто сообщения' || contact === 'sms' || contact === 'messages') return <SmsIcon fontSize="small" />;
    return null;
  };

  const getPriorContactLabel = (priorContact: string | null | undefined): string => {
    const contact = priorContact?.toLowerCase();
    if (contact === 'телеграмм' || contact === 'telegram') return 'Telegram';
    if (contact === 'ссылка' || contact === 'url') return 'Ссылка';
    if (contact === 'звонок' || contact === 'phone' || contact === 'call') return 'Звонок';
    if (contact === 'просто сообщения' || contact === 'sms' || contact === 'messages') return 'SMS';
    return priorContact || '—';
  };

  const getPriorContactIconColor = (priorContact: string | null | undefined): string => {
    const contact = priorContact?.toLowerCase();
    if (contact === 'телеграмм' || contact === 'telegram') return '#26A5E4';
    if (contact === 'ссылка' || contact === 'url') return '#9C27B0';
    if (contact === 'звонок' || contact === 'phone' || contact === 'call') return '#4CAF50';
    if (contact === 'просто сообщения' || contact === 'sms' || contact === 'messages') return '#2196F3';
    return '#9E9E9E';
  };

  const handleAddStudent = async () => {
    if (!newStudent.full_name || !newStudent.phone || !newStudent.russian_student_id) {
      setSnackbar({ open: true, message: 'Заполните все поля', severity: 'error' });
      return;
    }
    
    setIsAddingStudent(true);
    try {
      const normalizedFullName = normalizeFullName(newStudent.full_name);
      
      const studentData = {
        full_name: normalizedFullName,
        phone: newStudent.phone,
        russian_student_id: parseInt(newStudent.russian_student_id),
      };
      await apiService.createStudent(studentData);
      setSnackbar({ open: true, message: 'Студент добавлен', severity: 'success' });
      setAddDialogOpen(false);
      setNewStudent({ full_name: '', phone: '', russian_student_id: '' });
      setAddDialogTab(0);
      loadStudents();
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка добавления: ' + (err.response?.data?.detail || err.message), severity: 'error' });
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setExcelFile(event.target.files[0]);
      setExcelImportResult(null);
      setShowDuplicatesDialog(false);
      setPendingExcelFile(null);
      setReplaceIds(new Set());
    }
  };

  const closeAllImportDialogs = () => {
    setAddDialogOpen(false);
    setShowDuplicatesDialog(false);
    setExcelFile(null);
    setPendingExcelFile(null);
    setExcelImportResult(null);
    setReplaceIds(new Set());
    setDuplicateStrategy('skip');
  };

  const handleExcelImport = async () => {
    if (!excelFile) {
      setSnackbar({ open: true, message: 'Выберите файл Excel', severity: 'warning' });
      return;
    }

    setIsImportingExcel(true);
    setExcelImportResult(null);

    try {
      const data = await apiService.importExcel(excelFile, 'skip');

      if (data.success) {
        setExcelImportResult(data);
        setSnackbar({ open: true, message: data.message, severity: 'success' });
        loadStudents();
        closeAllImportDialogs();
      } else {
        setExcelImportResult(data);
        
        if (data.duplicates_found && data.duplicates_found.length > 0) {
          setPendingExcelFile(excelFile);
          setShowDuplicatesDialog(true);
          setDuplicateStrategy('skip');
          setReplaceIds(new Set());
        } else {
          setSnackbar({ open: true, message: data.message || 'Ошибка импорта', severity: 'error' });
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка импорта: ' + (err.message || 'Неизвестная ошибка'), severity: 'error' });
    } finally {
      setIsImportingExcel(false);
    }
  };

  const handleRetryImport = async () => {
    if (!pendingExcelFile) {
      setShowDuplicatesDialog(false);
      return;
    }

    setIsRetryingImport(true);

    try {
      let replaceIdsArray: number[] = [];
      if (duplicateStrategy === 'replace_selected') {
        replaceIdsArray = Array.from(replaceIds);
        console.log('📤 Отправка replace_selected с ID:', replaceIdsArray);
      }
      
      const data = await apiService.importExcel(
        pendingExcelFile, 
        duplicateStrategy, 
        duplicateStrategy === 'replace_selected' ? replaceIdsArray : undefined
      );

      if (data.success) {
        setExcelImportResult(data);
        setSnackbar({ open: true, message: data.message, severity: 'success' });
        loadStudents();
        closeAllImportDialogs();
      } else {
        if (data.duplicates_found && data.duplicates_found.length > 0) {
          setExcelImportResult(data);
          setReplaceIds(new Set());
          setSnackbar({ open: true, message: data.message || 'Обнаружены дубликаты', severity: 'warning' });
        } else {
          setSnackbar({ open: true, message: data.message || 'Ошибка импорта', severity: 'error' });
          setShowDuplicatesDialog(false);
        }
      }
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка импорта: ' + (err.message || 'Неизвестная ошибка'), severity: 'error' });
    } finally {
      setIsRetryingImport(false);
    }
  };

  const renderFiltersPopover = () => (
    <Popover
      open={Boolean(filterAnchorEl)}
      anchorEl={filterAnchorEl}
      onClose={handleCloseFilters}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ className: styles.filtersPopover }}
    >
      <Box className={styles.filtersHeader}>
        <Typography variant="h6" className={styles.filtersTitle}>Фильтры</Typography>
        <IconButton onClick={handleCloseFilters} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box className={styles.filtersContent}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Общий статус</Typography>
            <FormGroup>
              {['active', 'inactive', 'enrolled'].map(status => (
                <FormControlLabel
                  key={status}
                  control={
                    <Checkbox
                      checked={tempFilters.status.includes(status)}
                      onChange={() => handleMultiSelectChange('status', status)}
                      size="small"
                    />
                  }
                  label={status === 'active' ? 'Активный' : status === 'inactive' ? 'Неактивный' : 'Зачислен'}
                />
              ))}
            </FormGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Статус заявления</Typography>
            <FormGroup>
              {['pending', 'accepted', 'rejected', 'paid'].map(appStatus => (
                <FormControlLabel
                  key={appStatus}
                  control={
                    <Checkbox
                      checked={tempFilters.application_status.includes(appStatus)}
                      onChange={() => handleMultiSelectChange('application_status', appStatus)}
                      size="small"
                    />
                  }
                  label={appStatus === 'pending' ? 'Ожидает' : appStatus === 'accepted' ? 'Принято' : appStatus === 'rejected' ? 'Отклонено' : 'Оплачено'}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Был на сборе</Typography>
            <FormGroup>
              {meetingStatusOptions.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={tempFilters.meeting_status === opt.value}
                      onChange={(e) => handleFilterChange('meeting_status', e.target.checked ? opt.value : null)}
                      size="small"
                    />
                  }
                  label={opt.label}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Дозвонились</Typography>
            <FormGroup>
              {callStatusOptions.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={tempFilters.call_status === opt.value}
                      onChange={(e) => handleFilterChange('call_status', e.target.checked ? opt.value : null)}
                      size="small"
                    />
                  }
                  label={opt.label}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Решение</Typography>
            <FormGroup>
              {decisionStatusOptions.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={tempFilters.decision_status === opt.value}
                      onChange={(e) => handleFilterChange('decision_status', e.target.checked ? opt.value : null)}
                      size="small"
                    />
                  }
                  label={opt.label}
                />
              ))}
            </FormGroup>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Статус документов</Typography>
            <FormGroup>
              {documentsStatusOptions.map(opt => (
                <FormControlLabel
                  key={opt.value}
                  control={
                    <Checkbox
                      checked={tempFilters.documents_status === opt.value}
                      onChange={(e) => handleFilterChange('documents_status', e.target.checked ? opt.value : null)}
                      size="small"
                    />
                  }
                  label={opt.label}
                />
              ))}
            </FormGroup>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Статус контакта</Typography>
            <Box className={styles.chipContainer}>
              {['new', 'met', 'interested', 'original_submitted', 'waiting_original', 'not_interested', 'enrolled', 'withdrawn'].map(contactStatus => (
                <SquareChip
                  key={contactStatus}
                  label={contactStatus === 'new' ? 'Новый' : contactStatus === 'met' ? 'Встретились' : contactStatus === 'interested' ? 'Заинтересован' : contactStatus === 'original_submitted' ? 'Оригинал подан' : contactStatus === 'waiting_original' ? 'Ждём оригинал' : contactStatus === 'not_interested' ? 'Не заинтересован' : contactStatus === 'enrolled' ? 'Зачислен' : 'Отозван'}
                  variant={tempFilters.contact_status.includes(contactStatus) ? 'filled' : 'outlined'}
                  sx={{
                    backgroundColor: tempFilters.contact_status.includes(contactStatus) ? 'rgba(0, 136, 255, 0.2)' : undefined,
                    borderColor: 'rgba(197, 198, 208, 1)',
                    cursor: 'pointer',
                    '&:hover': { transform: 'scale(1.02)' },
                  }}
                  onClick={() => handleMultiSelectChange('contact_status', contactStatus)}
                />
              ))}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Направление</InputLabel>
              <Select
                value={tempFilters.department_id}
                onChange={(e) => handleFilterChange('department_id', e.target.value)}
                label="Направление"
              >
                <MuiMenuItem value="">Все</MuiMenuItem>
                {departments.map(dept => (
                  <MuiMenuItem key={dept.id} value={dept.id}>{dept.name}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Специальность</InputLabel>
              <Select
                value={tempFilters.speciality_id}
                onChange={(e) => handleFilterChange('speciality_id', e.target.value)}
                label="Специальность"
              >
                <MuiMenuItem value="">Все</MuiMenuItem>
                {specialities.map(spec => (
                  <MuiMenuItem key={spec.id} value={spec.id}>{spec.name}</MuiMenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Форма обучения</Typography>
            <FormGroup>
              {['Очная', 'Очно-заочная', 'Заочная'].map(form => (
                <FormControlLabel
                  key={form}
                  control={
                    <Checkbox
                      checked={tempFilters.study_form.includes(form)}
                      onChange={() => handleMultiSelectChange('study_form', form)}
                      size="small"
                    />
                  }
                  label={form}
                />
              ))}
            </FormGroup>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Основа обучения</Typography>
            <FormGroup>
              {['Бюджетная', 'Платная', 'Целевая'].map(basis => (
                <FormControlLabel
                  key={basis}
                  control={
                    <Checkbox
                      checked={tempFilters.study_basis.includes(basis)}
                      onChange={() => handleMultiSelectChange('study_basis', basis)}
                      size="small"
                    />
                  }
                  label={basis}
                />
              ))}
            </FormGroup>
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" className={styles.filterSectionTitle}>Дополнительно</Typography>
            <Box className={styles.additionalFilters}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={tempFilters.consent_status === true}
                    onChange={(e) => handleFilterChange('consent_status', e.target.checked ? true : null)}
                    size="small"
                  />
                }
                label="Согласие получено"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Box className={styles.filtersFooter}>
        <Button onClick={handleResetFilters} startIcon={<ClearIcon />}>Сбросить все</Button>
        <Box className={styles.filtersActions}>
          <Button onClick={handleCloseFilters}>Отмена</Button>
          <Button onClick={handleApplyFilters} variant="contained" color="primary">Применить</Button>
        </Box>
      </Box>
    </Popover>
  );

  if (isLoading) {
    return (
      <Box className={styles.loaderContainer}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" className={styles.innerContainer}>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Paper className={styles.header}>
        <Box>
          <Typography variant="h5" component="h1" className={styles.headerTitle}>
            Список абитуриентов
          </Typography>
          <Typography variant="body2" className={styles.headerSubtitle}>
            {user?.full_name || 'Пользователь'} • {user?.role === 'admin' ? 'Администратор' : 'Пользователь'} • Всего: {total}
          </Typography>
        </Box>
        <Box className={styles.headerActions}>
          {activeContact && (
            <Tooltip title={`Активный контакт: ${activeContact.contact_type === 'telegram' ? 'Telegram' : 'Ссылка'}`}>
              <IconButton onClick={handleActiveContactClick} title="Активный контакт">
                <img 
                  src={require('../icons/link.png')} 
                  alt="Активный контакт" 
                  style={{ width: 24, height: 24 }}
                />
              </IconButton>
            </Tooltip>
          )}
          
          <IconButton onClick={runParser} title="Запустить парсер" disabled={isParserRunning} color="secondary">
            {isParserRunning ? (
              <CircularProgress size={24} />
            ) : (
              <img src={require('../icons/parse2.png')} alt="Запустить парсер" style={{ width: 28, height: 28 }} />
            )}
          </IconButton>

          <IconButton onClick={() => navigate('/profile')} title="Профиль" color="primary">
            <img 
              src={require('../icons/profile3.png')} 
              alt="Профиль" 
              style={{ width: 28, height: 28 }}
            />
          </IconButton>
          
          <IconButton onClick={handleLogout} title="Выйти" color="error">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Paper>

      <Box className={styles.searchSection}>
        <TextField
          fullWidth
          placeholder="Поиск по номеру"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchField}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Badge badgeContent={getActiveFiltersCount()} color="primary" invisible={getActiveFiltersCount() === 0}>
          <Button
            variant={getActiveFiltersCount() > 0 ? "contained" : "outlined"}
            startIcon={<FilterIcon />}
            onClick={handleOpenFilters}
            className={styles.filterButton}
          >
            Фильтры
          </Button>
        </Badge>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />} 
          className={styles.addButton}
          onClick={() => setAddDialogOpen(true)}
        >
          Добавить
        </Button>
      </Box>

      {renderFiltersPopover()}

      {getActiveFiltersCount() > 0 && (
        <Box className={styles.activeFilters}>
          <Typography variant="body2" className={styles.activeFiltersLabel}>Активные фильтры:</Typography>
          {filters.status.map(status => (
            <SquareChip key={status} label={status === 'active' ? 'Активный' : status === 'inactive' ? 'Неактивный' : 'Зачислен'} size="small" onDelete={() => handleRemoveFilter('status', status)} />
          ))}
          {filters.application_status.map(appStatus => (
            <SquareChip key={appStatus} label={appStatus === 'pending' ? 'Ожидает' : appStatus === 'accepted' ? 'Принято' : appStatus === 'rejected' ? 'Отклонено' : 'Оплачено'} size="small" onDelete={() => handleRemoveFilter('application_status', appStatus)} />
          ))}
          {filters.meeting_status && (
            <SquareChip label={meetingStatusOptions.find(m => m.value === filters.meeting_status)?.label || ''} size="small" onDelete={() => handleRemoveFilter('meeting_status')} />
          )}
          {filters.call_status && (
            <SquareChip label={callStatusOptions.find(c => c.value === filters.call_status)?.label || ''} size="small" onDelete={() => handleRemoveFilter('call_status')} />
          )}
          {filters.decision_status && (
            <SquareChip label={decisionStatusOptions.find(d => d.value === filters.decision_status)?.label || ''} size="small" onDelete={() => handleRemoveFilter('decision_status')} />
          )}
          {filters.documents_status && (
            <SquareChip label={documentsStatusOptions.find(d => d.value === filters.documents_status)?.label || ''} size="small" onDelete={() => handleRemoveFilter('documents_status')} />
          )}
          {filters.contact_status.map(contactStatus => (
            <SquareChip key={contactStatus} label={contactStatus === 'new' ? 'Новый' : contactStatus === 'met' ? 'Встретились' : contactStatus === 'interested' ? 'Заинтересован' : contactStatus === 'original_submitted' ? 'Оригинал подан' : contactStatus === 'waiting_original' ? 'Ждём оригинал' : contactStatus === 'not_interested' ? 'Не заинтересован' : contactStatus === 'enrolled' ? 'Зачислен' : 'Отозван'} size="small" onDelete={() => handleRemoveFilter('contact_status', contactStatus)} />
          ))}
          {filters.study_form.map(form => (
            <SquareChip key={form} label={form} size="small" onDelete={() => handleRemoveFilter('study_form', form)} />
          ))}
          {filters.study_basis.map(basis => (
            <SquareChip key={basis} label={basis} size="small" onDelete={() => handleRemoveFilter('study_basis', basis)} />
          ))}
          {filters.department_id !== '' && departments.find(d => d.id === filters.department_id) && (
            <SquareChip label={`Направление: ${departments.find(d => d.id === filters.department_id)?.name}`} size="small" onDelete={() => handleRemoveFilter('department_id')} />
          )}
          {filters.speciality_id !== '' && specialities.find(s => s.id === filters.speciality_id) && (
            <SquareChip label={`Специальность: ${specialities.find(s => s.id === filters.speciality_id)?.name}`} size="small" onDelete={() => handleRemoveFilter('speciality_id')} />
          )}
          {filters.consent_status !== null && (
            <SquareChip label={filters.consent_status ? "Согласие получено" : "Согласие не получено"} size="small" onDelete={() => handleRemoveFilter('consent_status')} />
          )}
          <Button size="small" className={styles.clearAllBtn} onClick={handleResetFilters}>
            Очистить все
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" className={styles.errorAlert} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} className={styles.tableContainer}>
        <Table className={styles.table}>
          <TableHead>
            <TableRow className={styles.tableHeader}>
              <TableCell className={styles.scoreCell}>Баллы</TableCell>
              <TableCell className={styles.studentNameCell}>ФИО</TableCell>
              <TableCell className={styles.departmentCell}>Факультет</TableCell>
              <TableCell className={styles.documentsStatusCell}>Документы</TableCell>
              <TableCell className={styles.meetingStatusCell}>Сбор</TableCell>
              <TableCell className={styles.callStatusCell}>Звонок</TableCell>
              <TableCell className={styles.decisionStatusCell}>Решение</TableCell>
              <TableCell className={styles.priorContactCell}>Приоритетный контакт</TableCell>
              <TableCell className={styles.activeContactCell} align="center">Активный контакт</TableCell>
              <TableCell className={styles.actionsCell} align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => {
              const priorIcon = getPriorContactIcon(student.prior_contact);
              const priorIconColor = getPriorContactIconColor(student.prior_contact);
              const isActive = activeContactMap.has(student.id);
              const isLoadingActive = loadingActiveContact === student.id;
              
              return (
                <TableRow key={student.id} hover onClick={() => handleRowClick(student.id)} className={styles.tableRow}>
                  <TableCell className={styles.scoreCell}>
                    {student.total_score ? (
                      <Typography 
                        variant="body2" 
                        className={`${styles.scoreValue} ${
                          student.total_score >= 200 ? styles.scoreHigh : 
                          student.total_score >= 150 ? styles.scoreMedium : 
                          styles.scoreLow
                        }`}
                      >
                        {student.total_score}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  
                  <TableCell className={styles.studentNameCell}>
                    <Typography variant="body2">
                      {student.full_name}
                    </Typography>
                    {student.phone && (
                      <Typography variant="caption" className={styles.studentPhone}>
                        {student.phone}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell className={styles.departmentCell}>
                    <Typography variant="body2" className={styles.departmentName}>
                      {student.department_name || '—'}
                    </Typography>
                    {student.speciality_name && (
                      <Typography variant="caption" className={styles.specialityName}>
                        {student.speciality_name}
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell className={styles.documentsStatusCell}>
                    <Chip
                      label={getDocumentsStatusLabel(student.documents_status)}
                      size="small"
                      className={`${styles.statusChip} ${styles.documentsChip}`}
                      sx={{
                        backgroundColor: getDocumentsStatusColor(student.documents_status) === 'success' ? '#4caf50' :
                                       getDocumentsStatusColor(student.documents_status) === 'warning' ? '#ff9800' :
                                       getDocumentsStatusColor(student.documents_status) === 'info' ? '#2196f3' :
                                       getDocumentsStatusColor(student.documents_status) === 'error' ? '#f44336' : '#9e9e9e',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  
                  <TableCell className={styles.meetingStatusCell}>
                    <Chip
                      label={getMeetingStatusLabel(student.meeting_status)}
                      size="small"
                      sx={{
                        backgroundColor: getMeetingStatusColor(student.meeting_status) === 'success' ? '#4caf50' :
                                       getMeetingStatusColor(student.meeting_status) === 'error' ? '#f44336' : '#9e9e9e',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  
                  <TableCell className={styles.callStatusCell}>
                    <Chip
                      label={getCallStatusLabel(student.call_status)}
                      size="small"
                      sx={{
                        backgroundColor: getCallStatusColor(student.call_status) === 'success' ? '#4caf50' :
                                       getCallStatusColor(student.call_status) === 'error' ? '#f44336' : '#9e9e9e',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  
                  <TableCell className={styles.decisionStatusCell}>
                    <Chip
                      label={getDecisionStatusLabel(student.decision_status)}
                      size="small"
                      sx={{
                        backgroundColor: getDecisionStatusColor(student.decision_status) === 'success' ? '#4caf50' :
                        getDecisionStatusColor(student.decision_status) === 'warning' ? '#ff9800' :
                        getDecisionStatusColor(student.decision_status) === 'error' ? '#f44336' : '#9e9e9e',
                        color: '#fff',
                      }}
                    />
                  </TableCell>
                  
                  <TableCell className={styles.priorContactCell}>
                    {priorIcon ? (
                      <Chip
                        icon={priorIcon}
                        label={getPriorContactLabel(student.prior_contact)}
                        size="small"
                        variant="outlined"
                        onClick={(e) => handlePriorContactAction(student, e)}
                        className={`${styles.priorContactChip} ${styles[`contactType${getPriorContactType(student.prior_contact)}`]}`}
                        sx={{
                          borderColor: priorIconColor,
                          color: priorIconColor,
                          '& .MuiChip-icon': { color: priorIconColor },
                          cursor: 'pointer',
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  
                  <TableCell className={styles.activeContactCell} align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={isActive ? "Выключить активный контакт" : "Включить как активный контакт"}>
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleToggleActiveContact(student, e)} 
                        disabled={isLoadingActive || !student.prior_contact}
                        className={isActive ? styles.activeContactBtn : ''}
                      >
                        {isLoadingActive ? (
                          <CircularProgress size={20} />
                        ) : isActive ? (
                          <StarIcon className={styles.starActive} sx={{ color: '#FFD700' }} />
                        ) : (
                          <StarIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  
                  <TableCell className={styles.actionsCell} align="center" onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, student)} title="Дополнительные действия">
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center" className={styles.emptyRow}>
                  <Typography color="text.secondary">Студенты не найдены</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
            key={`pagination-${rowsPerPage}-${page}`}
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={filteredStudents.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              const newRowsPerPage = parseInt(e.target.value, 10);
              setRowsPerPage(newRowsPerPage);
              setPage(0);
            }}
            labelRowsPerPage="Строк на странице:"
          />
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => handleMenuAction('profile')}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Открыть профиль</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('setActive')}>
          <ListItemIcon>
            {activeContactMap.has(selectedStudent?.id || 0) ? <CancelIcon fontSize="small" color="error" /> : <StarIcon fontSize="small" sx={{ color: '#FFD700' }} />}
          </ListItemIcon>
          <ListItemText>
            {activeContactMap.has(selectedStudent?.id || 0) ? "Выключить активный контакт" : "Сделать активным контактом"}
          </ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleMenuAction('telegram')}>
          <ListItemIcon><TelegramIcon fontSize="small" sx={{ color: '#26A5E4' }} /></ListItemIcon>
          <ListItemText primary="Telegram" secondary={selectedStudent?.phone || 'Номер не указан'} />
        </MenuItem>
        {selectedStudent?.additional_contacts?.url && (
          <MenuItem onClick={() => handleMenuAction('url')}>
            <ListItemIcon><LinkIcon fontSize="small" sx={{ color: '#9C27B0' }} /></ListItemIcon>
            <ListItemText primary="Открыть ссылку" secondary={selectedStudent.additional_contacts.url.length > 30 ? `${selectedStudent.additional_contacts.url.substring(0, 30)}...` : selectedStudent.additional_contacts.url} />
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: '#d32f2f' }}>
          <ListItemIcon><DeleteIcon fontSize="small" sx={{ color: '#d32f2f' }} /></ListItemIcon>
          <ListItemText primary="Удалить абитуриента" />
        </MenuItem>
      </Menu>

      {/* Диалог добавления студента */}
      <Dialog open={addDialogOpen} onClose={() => {
        setAddDialogOpen(false);
        setAddDialogTab(0);
        setExcelFile(null);
        setExcelImportResult(null);
        setPendingExcelFile(null);
        setShowDuplicatesDialog(false);
        setNewStudent({ full_name: '', phone: '', russian_student_id: '' });
      }} maxWidth="md" fullWidth>
        <DialogTitle>
          <Tabs value={addDialogTab} onChange={(_, v) => setAddDialogTab(v)}>
            <Tab label="Добавить вручную" />
            <Tab label="Импорт из Excel" icon={<UploadFileIcon />} iconPosition="start" />
          </Tabs>
        </DialogTitle>
        <DialogContent>
          {addDialogTab === 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="ФИО *"
                fullWidth
                value={newStudent.full_name}
                onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
              />
              <TextField
                label="Телефон *"
                fullWidth
                value={newStudent.phone}
                onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                placeholder="+79991234567"
              />
              <TextField
                label="Российский ID *"
                fullWidth
                type="number"
                value={newStudent.russian_student_id}
                onChange={(e) => setNewStudent({ ...newStudent, russian_student_id: e.target.value })}
                placeholder="1234567890"
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Alert severity="info" sx={{ mb: 1 }}>
                <Typography variant="body2">
                  <strong>Требования к Excel файлу:</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  • Обязательные колонки: <strong>ФИО, Телефон, ID поступающего</strong>
                </Typography>
                <Typography variant="caption" component="div">
                  • Рекомендуемые: Профиль, Баллы, Приоритет, Форма обучения, Основа обучения, Email
                </Typography>
              </Alert>
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFileIcon />}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Выбрать файл Excel
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                />
              </Button>
              
              {excelFile && (
                <Alert severity="success" icon={<UploadFileIcon />}>
                  Выбран файл: {excelFile.name}
                </Alert>
              )}
              
              {excelImportResult && !excelImportResult.success && excelImportResult.errors && !excelImportResult.duplicates_found && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="error" sx={{ mb: 1 }}>
                    {excelImportResult.message}
                  </Alert>
                  {excelImportResult.errors.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="error.main">
                        ❌ Ошибки ({excelImportResult.errors.length}):
                      </Typography>
                      <Box sx={{ maxHeight: 150, overflow: 'auto', mt: 0.5 }}>
                        {excelImportResult.errors.slice(0, 5).map((err: any, idx: number) => (
                          <Typography key={idx} variant="caption" component="div" color="error">
                            Строка {err.row}: {err.error}
                          </Typography>
                        ))}
                        {excelImportResult.errors.length > 5 && (
                          <Typography variant="caption" color="text.secondary">
                            ...и еще {excelImportResult.errors.length - 5} ошибок
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
              
              {excelImportResult && excelImportResult.success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  {excelImportResult.message}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddDialogOpen(false);
            setAddDialogTab(0);
            setExcelFile(null);
            setExcelImportResult(null);
            setPendingExcelFile(null);
            setShowDuplicatesDialog(false);
          }}>
            Отмена
          </Button>
          {addDialogTab === 0 ? (
            <Button onClick={handleAddStudent} variant="contained" disabled={isAddingStudent}>
              {isAddingStudent ? <CircularProgress size={24} /> : 'Добавить'}
            </Button>
          ) : (
            <Button onClick={handleExcelImport} variant="contained" disabled={!excelFile || isImportingExcel}>
              {isImportingExcel ? <CircularProgress size={24} /> : 'Импортировать'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Диалог подтверждения удаления */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setStudentToDelete(null);
        }}
      >
        <DialogTitle>
          <Typography variant="h6">Подтверждение удаления</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Вы действительно хотите удалить абитуриента <strong>{studentToDelete?.full_name}</strong>?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            Это действие нельзя отменить. Все данные абитуриента будут удалены.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setStudentToDelete(null);
          }}>
            Отмена
          </Button>
          <Button 
            onClick={handleDeleteStudent} 
            variant="contained" 
            color="error"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} /> : 'Удалить'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Диалог обработки дубликатов */}
      <Dialog
        open={showDuplicatesDialog}
        onClose={() => {
          setShowDuplicatesDialog(false);
          setPendingExcelFile(null);
          setReplaceIds(new Set());
          setDuplicateStrategy('skip');
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6">Обнаружены дубликаты</Typography>
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            В загруженном файле обнаружены абитуриенты, которые уже есть в системе 
            ({excelImportResult?.duplicates_found?.length || 0} шт.).
          </Typography>
          
          <Typography gutterBottom sx={{ mt: 2 }}>
            Выберите, как обработать дубликаты:
          </Typography>
          
          <RadioGroup
            value={duplicateStrategy}
            onChange={(e) => {
              const newStrategy = e.target.value as any;
              setDuplicateStrategy(newStrategy);
              if (newStrategy !== 'replace_selected') {
                setReplaceIds(new Set());
              }
            }}
          >
            <FormControlLabel 
              value="skip" 
              control={<Radio />} 
              label="Пропустить все дубликаты (не обновлять существующих студентов)" 
            />
            <FormControlLabel 
              value="replace_all" 
              control={<Radio />} 
              label="Заменить данные всех дубликатов (обновить информацию)" 
            />
            <FormControlLabel 
              value="replace_selected" 
              control={<Radio />} 
              label="Выбрать дубликаты для замены вручную" 
            />
          </RadioGroup>

          {duplicateStrategy === 'replace_selected' && excelImportResult?.duplicates_found && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Отметьте студентов, данные которых нужно заменить:
              </Typography>
              <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto', p: 1 }}>
                {excelImportResult.duplicates_found.map((dup: any) => (
                  <ListItem 
                    key={dup.id} 
                    dense
                    secondaryAction={
                      <Checkbox
                        edge="end"
                        checked={replaceIds.has(dup.id)}
                        onChange={() => {
                          const newSet = new Set(replaceIds);
                          if (newSet.has(dup.id)) {
                            newSet.delete(dup.id);
                          } else {
                            newSet.add(dup.id);
                          }
                          setReplaceIds(newSet);
                        }}
                      />
                    }
                  >
                    <ListItemText 
                      primary={dup.full_name} 
                      secondary={`ID: ${dup.id}`}
                    />
                  </ListItem>
                ))}
              </Paper>
              {replaceIds.size === 0 && (
                <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                  ⚠️ Вы не выбрали ни одного студента для замены. Будет использована стратегия "пропустить".
                </Typography>
              )}
            </Box>
          )}
          
          {duplicateStrategy === 'replace_selected' && replaceIds.size > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Будет заменено {replaceIds.size} студентов. Остальные дубликаты будут пропущены.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setShowDuplicatesDialog(false);
              setPendingExcelFile(null);
              setReplaceIds(new Set());
              setDuplicateStrategy('skip');
            }}
          >
            Отмена
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetryImport}
            disabled={isRetryingImport}
          >
            {isRetryingImport ? <CircularProgress size={24} /> : 'Продолжить импорт'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentsListPage;