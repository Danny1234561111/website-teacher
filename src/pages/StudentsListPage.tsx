// src/pages/StudentsListPage.tsx
import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
  Telegram as TelegramIcon,
  Link as LinkIcon,
  Sms as SmsIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
  Cancel as CancelIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  CloudSync as CloudSyncIcon,
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

const STUDENT_FILTERS_KEY = 'student_filters';

// Кастомный компонент для квадратного чипа
const SquareChip: React.FC<{
  label: string;
  size?: 'small' | 'medium';
  sx?: any;
  variant?: 'outlined' | 'filled';
  onClick?: () => void;
  onDelete?: () => void;
  icon?: React.ReactNode;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [isParserRunning, setIsParserRunning] = useState(false);
  const [activeContact, setActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeContactMap, setActiveContactMap] = useState<Map<number, { contact_type: string; contact_value: string } | null>>(new Map());
  const [loadingActiveContact, setLoadingActiveContact] = useState<number | null>(null);
  
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

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

  // Опции для новых статусов
  const meetingStatusOptions = [
    { value: 'not_met', label: 'Не был на сборе', color: 'error' as const },
    { value: 'met', label: 'Был на сборе', color: 'success' as const },
  ];

  const callStatusOptions = [
    { value: 'not_reached', label: 'Не дозвонились', color: 'error' as const },
    { value: 'reached', label: 'Дозвонились', color: 'success' as const },
  ];

  const decisionStatusOptions = [
    { value: 'thinking', label: 'Думает', color: 'warning' as const },
    { value: 'decided', label: 'Решил', color: 'success' as const },
  ];

  const documentsStatusOptions = [
    { value: 'not_submitted', label: 'Нет заявл.', color: 'default' as const },
    { value: 'original_submitted', label: 'Подан оригинал', color: 'success' as const },
    { value: 'waiting_original', label: 'Ждем оригинал', color: 'warning' as const },
    { value: 'enrolled', label: 'Зачислен', color: 'info' as const },
  ];

  const getInitialFilters = (): Filters => {
    const saved = localStorage.getItem(STUDENT_FILTERS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          status: parsed.status || [],
          application_status: parsed.application_status || [],
          contact_status: parsed.contact_status || [],
          department_id: parsed.department_id || '',
          speciality_id: parsed.speciality_id || '',
          study_form: parsed.study_form || [],
          study_basis: parsed.study_basis || [],
          consent_status: parsed.consent_status !== undefined ? parsed.consent_status : null,
          meeting_status: parsed.meeting_status !== undefined ? parsed.meeting_status : null,
          call_status: parsed.call_status !== undefined ? parsed.call_status : null,
          decision_status: parsed.decision_status !== undefined ? parsed.decision_status : null,
          documents_status: parsed.documents_status !== undefined ? parsed.documents_status : null,
        };
      } catch (e) {
        console.error('Ошибка загрузки фильтров:', e);
      }
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
    localStorage.setItem(STUDENT_FILTERS_KEY, JSON.stringify(filters));
  }, [filters]);

  const getStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'enrolled': return 'info';
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string | null | undefined): string => {
    switch (status?.toLowerCase()) {
      case 'active': return 'Активный';
      case 'inactive': return 'Неактивный';
      case 'enrolled': return 'Зачислен';
      case 'pending': return 'Ожидает';
      case 'accepted': return 'Принято';
      case 'rejected': return 'Отклонено';
      case 'paid': return 'Оплачено';
      default: return status || '—';
    }
  };

  const getMeetingStatusLabel = (status: string | null | undefined): string => {
    const opt = meetingStatusOptions.find(m => m.value === status?.toLowerCase());
    return opt?.label || 'Не был на сборе';
  };

  const getMeetingStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const opt = meetingStatusOptions.find(m => m.value === status?.toLowerCase());
    return opt?.color || 'default';
  };

  const getCallStatusLabel = (status: string | null | undefined): string => {
    const opt = callStatusOptions.find(c => c.value === status?.toLowerCase());
    return opt?.label || 'Не дозвонились';
  };

  const getCallStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const opt = callStatusOptions.find(c => c.value === status?.toLowerCase());
    return opt?.color || 'default';
  };

  const getDecisionStatusLabel = (status: string | null | undefined): string => {
    const opt = decisionStatusOptions.find(d => d.value === status?.toLowerCase());
    return opt?.label || 'Думает';
  };

  const getDecisionStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const opt = decisionStatusOptions.find(d => d.value === status?.toLowerCase());
    return opt?.color || 'default';
  };

  const getDocumentsStatusLabel = (status: string | null | undefined): string => {
    const opt = documentsStatusOptions.find(d => d.value === status?.toLowerCase());
    return opt?.label || 'Нет заявл.';
  };

  const getDocumentsStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
    const opt = documentsStatusOptions.find(d => d.value === status?.toLowerCase());
    return opt?.color || 'default';
  };

  // Загрузка активного контакта
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

  // Обработка клика по активному контакту
  const handleActiveContactClick = () => {
    if (!activeContact) return;
    
    const contactType = activeContact.contact_type?.toLowerCase();
    const contactValue = activeContact.contact_value;
    
    if (contactType === 'telegram') {
      openTelegramDesktop(contactValue);
    } else if (contactType === 'url') {
      openLink(contactValue);
    }
  };

  // Получение иконки активного контакта (всегда звезда)
  const getActiveContactIcon = () => {
    return <StarIcon sx={{ fontSize: 20, color: '#FFD700' }} />;
  };

  // Получение названия активного контакта
  const getActiveContactLabel = () => {
    const contactType = activeContact?.contact_type?.toLowerCase();
    switch (contactType) {
      case 'telegram': return 'Telegram';
      case 'url': return 'Ссылка';
      default: return 'Активный контакт';
    }
  };

  useEffect(() => {
    loadStudents();
    loadFiltersData();
    loadActiveContact();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, students, filters]);

  const loadStudents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getStudents({ limit: 500 });
      const studentsList = response.students || [];
      setStudents(studentsList);
      setFilteredStudents(studentsList);
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
      result = result.filter(student => student.contact_status && filters.contact_status.includes(student.contact_status));
    }

    if (filters.department_id !== '') {
      result = result.filter(student => student.department_id === filters.department_id);
    }

    if (filters.speciality_id !== '') {
      result = result.filter(student => student.speciality_id === filters.speciality_id);
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
      result = result.filter(student => student.meeting_status === filters.meeting_status);
    }

    if (filters.call_status !== null) {
      result = result.filter(student => student.call_status === filters.call_status);
    }

    if (filters.decision_status !== null) {
      result = result.filter(student => student.decision_status === filters.decision_status);
    }

    if (filters.documents_status !== null) {
      result = result.filter(student => student.documents_status === filters.documents_status);
    }

    result.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

    setFilteredStudents(result);
    setPage(0);
  };

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
        newFilters[key] = currentArray.filter(v => v !== value) as any;
      } else if (key === 'department_id' || key === 'speciality_id') {
        newFilters[key] = '';
      } else {
        newFilters[key] = null;
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
    let cleanContact = contact.startsWith('@') ? contact.substring(1) : contact;
    const isPhoneNumber = /^[\d+\s\-\(\)]+$/.test(cleanContact);
    if (isPhoneNumber) {
      const phoneNumber = cleanContact.replace(/[^\d+]/g, '');
      window.location.href = `tg://resolve?phone=${phoneNumber}`;
      setTimeout(() => {
        window.open(`https://t.me/${phoneNumber}`, '_blank');
      }, 2000);
    } else {
      window.location.href = `tg://resolve?domain=${cleanContact}`;
      setTimeout(() => {
        window.open(`https://t.me/${cleanContact}`, '_blank');
      }, 2000);
    }
  };

  const openLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      window.open('https://' + url, '_blank');
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

  const handlePriorContactAction = (student: Student, event: React.MouseEvent) => {
    event.stopPropagation();
    const priorContact = student.prior_contact?.toLowerCase();
    if (priorContact === 'телеграмм' || priorContact === 'telegram') {
      const telegram = student.additional_contacts?.telegram || student.phone;
      if (telegram) openTelegramDesktop(telegram);
    } else if (priorContact === 'ссылка' || priorContact === 'url') {
      const url = student.additional_contacts?.url;
      if (url) openLink(url);
    } else if (priorContact === 'звонок' || priorContact === 'phone' || priorContact === 'call') {
      setSnackbar({ open: true, message: 'Звонок доступен только в мобильном приложении', severity: 'info' });
    } else if (priorContact === 'просто сообщения' || priorContact === 'sms' || priorContact === 'messages') {
      setSnackbar({ open: true, message: 'SMS доступны только в мобильном приложении', severity: 'info' });
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

  const handleMenuAction = (action: string) => {
    if (!selectedStudent) return;
    switch (action) {
      case 'profile':
        navigate(`/students/${selectedStudent.id}`);
        break;
      case 'telegram':
        if (selectedStudent.phone) openTelegramDesktop(selectedStudent.phone);
        else setSnackbar({ open: true, message: 'Номер телефона не указан', severity: 'warning' });
        break;
      case 'url':
        const url = selectedStudent.additional_contacts?.url;
        if (url) openLink(url);
        else setSnackbar({ open: true, message: 'Ссылка не указана', severity: 'warning' });
        break;
      case 'setActive':
        handleToggleActiveContact(selectedStudent, {} as React.MouseEvent);
        break;
    }
    handleMenuClose();
  };

  const getPriorContactIcon = (priorContact: string | null | undefined) => {
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
              <Tooltip title={`Активный контакт: ${getActiveContactLabel()}`}>
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
        <Button variant="contained" startIcon={<AddIcon />} className={styles.addButton}>
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
              <TableCell className={styles.statusCell}>Статусы</TableCell>
              <TableCell className={styles.profileCell}>Профиль</TableCell>
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
                      <Typography variant="body2" className={`${styles.scoreCell} ${student.total_score >= 200 ? styles.scoreHigh : student.total_score >= 150 ? styles.scoreMedium : styles.scoreLow}`}>
                        {student.total_score}
                      </Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{student.full_name}</Typography>
                  </TableCell>
                  <TableCell className={styles.statusCell}>
                    <Box className={styles.statusContainer}>
                      <SquareChip 
                        label={getDocumentsStatusLabel(student.documents_status)} 
                        size="small" 
                        color={getDocumentsStatusColor(student.documents_status)}
                              sx={{ width: '100%', minWidth: '150px', maxWidth: '150px' }}
                      />
                      <SquareChip 
                        label={getMeetingStatusLabel(student.meeting_status)} 
                        size="small" 
                        color={getMeetingStatusColor(student.meeting_status)}
                              sx={{ width: '100%', minWidth: '150px', maxWidth: '150px' }}
                      />
                      <SquareChip 
                        label={getCallStatusLabel(student.call_status)} 
                        size="small" 
                        color={getCallStatusColor(student.call_status)}
                              sx={{ width: '100%', minWidth: '150px', maxWidth: '150px' }}
                      />
                      <SquareChip 
                        label={getDecisionStatusLabel(student.decision_status)} 
                        size="small" 
                        color={getDecisionStatusColor(student.decision_status)}
                        sx={{ width: '100%', minWidth: '150px', maxWidth: '150px' }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell className={styles.profileCell}>{student.department_name || '—'}</TableCell>
                  <TableCell className={styles.priorContactCell}>
                    {priorIcon ? (
                      <SquareChip 
                        icon={priorIcon} 
                        label={getPriorContactLabel(student.prior_contact)} 
                        size="small" 
                        variant="outlined" 
                        onClick={(e) => handlePriorContactAction(student, e)} 
                        sx={{ 
                          borderColor: priorIconColor, 
                          color: priorIconColor, 
                          '& .MuiChip-icon': { color: priorIconColor },
                          cursor: 'pointer',
                          '&:hover': { transform: 'scale(1.02)' },
                        }} 
                      />
                    ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                  </TableCell>
                  <TableCell className={styles.activeContactCell} align="center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={isActive ? "Выключить активный контакт" : "Включить как активный контакт"}>
                      <IconButton size="small" onClick={(e) => handleToggleActiveContact(student, e)} disabled={isLoadingActive || !student.prior_contact} className={isActive ? styles.activeContactBtn : ''}>
                        {isLoadingActive ? <CircularProgress size={20} /> : isActive ? <StarIcon className={styles.starActive} /> : <StarIcon />}
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
                <TableCell colSpan={7} align="center" className={styles.emptyRow}>
                  <Typography color="text.secondary">Студенты не найдены</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredStudents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
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
      </Menu>
    </Container>
  );
};

export default StudentsListPage;