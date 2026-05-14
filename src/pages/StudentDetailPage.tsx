  // src/pages/StudentDetailPage.tsx
  import React, { useState, useEffect } from 'react';
  import {
    Container,
    Box,
    Typography,
    Paper,
    Card,
    CardContent,
    Chip,
    IconButton,
    CircularProgress,
    Alert,
    Divider,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Grid,
    Avatar,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    Switch,
    FormControlLabel,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Collapse,
    Tooltip,
  } from '@mui/material';
  import {
    ArrowBack as ArrowBackIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Phone as PhoneIcon,
    Call as CallIcon,
    Group as GroupIcon,
    Email as EmailIcon,
    Chat as ChatIcon,
    AccessTime as AccessTimeIcon,
    Person as PersonIcon,
    School as SchoolIcon,
    Work as WorkIcon,
    Score as ScoreIcon,
    CheckCircle as CheckCircleIcon,
    Add as AddIcon,
    Telegram as TelegramIcon,
    Sms as SmsIcon,
    Link as LinkIcon,
    OpenInNew as OpenInNewIcon,
    EmojiEvents as EmojiEventsIcon,
    HowToReg as HowToRegIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    TrendingUp as TrendingUpIcon,
    CloudSync as CloudSyncIcon,
    Logout as LogoutIcon,
    AccountCircle as AccountCircleIcon,
    Star as StarIcon,
  } from '@mui/icons-material';
  import { useNavigate, useParams } from 'react-router-dom';
  import { useAuth } from '../contexts/AuthContext';
  import { apiService } from '../services/api';
  import { Student, Communication, StudentApplication, CompetitiveInfo, GroupStatistics } from '../types';
  import styles from './StudentDetailPage.module.scss';
  interface SquareChipProps {
    label: string;
    size?: 'small' | 'medium';
    sx?: any;
    variant?: 'outlined' | 'filled';
    onClick?: () => void;
    onDelete?: () => void;
    icon?: React.ReactElement;  // ← поменяй React.ReactNode на React.ReactElement
    color?: 'success' | 'error' | 'info' | 'warning' | 'default';
  }

  const SquareChip: React.FC<SquareChipProps> = ({ 
    label, 
    size = 'small', 
    sx, 
    variant = 'outlined', 
    onClick, 
    onDelete, 
    icon, 
    color 
  }) => {
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

  const StudentDetailPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { user, logout } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [communications, setCommunications] = useState<Communication[]>([]);
    const [applications, setApplications] = useState<StudentApplication[]>([]);
    const [competitiveInfoMap, setCompetitiveInfoMap] = useState<Map<number, CompetitiveInfo>>(new Map());
    const [groupStatisticsMap, setGroupStatisticsMap] = useState<Map<number, GroupStatistics>>(new Map());
    const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
    const [loadingStatsId, setLoadingStatsId] = useState<number | null>(null);
    const [loadingGroupStatsId, setLoadingGroupStatsId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingApplications, setIsLoadingApplications] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [addCommDialogOpen, setAddCommDialogOpen] = useState(false);
    const [additionalContactsDialogOpen, setAdditionalContactsDialogOpen] = useState(false);
    const [additionalContacts, setAdditionalContacts] = useState<Record<string, string>>({});
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
    const [isParserRunning, setIsParserRunning] = useState(false);
    const [activeContact, setActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
    
    const [serverActiveContact, setServerActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
    const [isActiveContactEnabledForThisStudent, setIsActiveContactEnabledForThisStudent] = useState(false);
    const [isActiveContactLoading, setIsActiveContactLoading] = useState(false);

    const [formData, setFormData] = useState({
      full_name: '',
      phone: '',
      prior_contact: '',
      status: 'active',
      contact_status: 'new',
      consent_status: false,
      meeting_status: 'not_met',
      call_status: 'not_reached',
      decision_status: 'thinking',
      documents_status: 'not_submitted',
    });

    const [newComm, setNewComm] = useState({
      communication_type: 'call',
      status: 'completed',
      date_time: new Date().toISOString().slice(0, 16),
      duration_minutes: '',
      notes: '',
    });

    const statusOptions = [
      { value: 'active', label: 'Активный' },
      { value: 'inactive', label: 'Неактивный' },
      { value: 'enrolled', label: 'Зачислен' },
      { value: 'withdrawn', label: 'Отчислен' },
    ];

    const contactStatusOptions = [
      { value: 'new', label: 'Новый' },
      { value: 'met', label: 'Был на встрече' },
      { value: 'interested', label: 'Заинтересован' },
      { value: 'original_submitted', label: 'Подан оригинал' },
      { value: 'waiting_original', label: 'Ждем оригинал' },
      { value: 'not_interested', label: 'Не заинтересован' },
    ];

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
      { value: 'decided', label: 'Решил поступать', color: 'success' as const },
    ];

    const documentsStatusOptions = [
      { value: 'not_submitted', label: 'Нет заявл.', color: 'default' as const },
      { value: 'original_submitted', label: 'Подан оригинал', color: 'success' as const },
      { value: 'waiting_original', label: 'Ждем оригинал', color: 'warning' as const },
      { value: 'enrolled', label: 'Зачислен', color: 'info' as const },
    ];

    const priorContactOptions = [
      { value: '', label: 'Не указан' },
      { value: 'телеграмм', label: 'Telegram', icon: <TelegramIcon fontSize="small" /> },
      { value: 'просто сообщения', label: 'SMS', icon: <SmsIcon fontSize="small" /> },
      { value: 'звонок', label: 'Звонок', icon: <CallIcon fontSize="small" /> },
      { value: 'ссылка', label: 'Ссылка', icon: <LinkIcon fontSize="small" /> },
    ];

    const getPriorContactDisplayLabel = (value: string): string => {
      const mapping: Record<string, string> = {
        'телеграмм': 'Telegram',
        'просто сообщения': 'SMS',
        'звонок': 'Звонок',
        'ссылка': 'Ссылка',
      };
      return mapping[value] || 'Не указан';
    };

    const getContactValue = (priorContact: string): string | null => {
      if (priorContact === 'звонок' || priorContact === 'просто сообщения') {
        return student?.phone || null;
      }
      if (priorContact === 'телеграмм') {
        return additionalContacts.telegram || student?.phone || null;
      }
      if (priorContact === 'ссылка') {
        return additionalContacts.url || null;
      }
      return null;
    };

    const getContactTypeForApi = (priorContact: string): string => {
      const mapping: Record<string, string> = {
        'телеграмм': 'telegram',
        'просто сообщения': 'sms',
        'звонок': 'call',
        'ссылка': 'url',
      };
      return mapping[priorContact] || 'other';
    };

    const getApplicationStatusText = (status: string | null): string => {
      switch (status?.toLowerCase()) {
        case 'pending': return 'Ожидает';
        case 'accepted': return 'Принято';
        case 'rejected': return 'Отклонено';
        case 'paid': return 'Оплачено';
        default: return status || '—';
      }
    };

    const getApplicationStatusColor = (status: string | null): "success" | "error" | "warning" | "info" | "default" => {
      switch (status?.toLowerCase()) {
        case 'pending': return 'warning';
        case 'accepted': return 'success';
        case 'rejected': return 'error';
        case 'paid': return 'info';
        default: return 'default';
      }
    };

    const getStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "warning" | "default" => {
      switch (status?.toLowerCase()) {
        case 'active': return 'success';
        case 'inactive': return 'error';
        case 'enrolled': return 'info';
        default: return 'default';
      }
    };

    const getStatusText = (status: string | null | undefined): string => {
      switch (status?.toLowerCase()) {
        case 'active': return 'Активный';
        case 'inactive': return 'Неактивный';
        case 'enrolled': return 'Зачислен';
        case 'withdrawn': return 'Отчислен';
        default: return status || '—';
      }
    };

    const getContactStatusText = (status: string | null | undefined): string => {
      const mapping: Record<string, string> = {
        'new': 'Новый',
        'met': 'Был на встрече',
        'interested': 'Заинтересован',
        'original_submitted': 'Подан оригинал',
        'waiting_original': 'Ждем оригинал',
        'not_interested': 'Не заинтересован',
        'enrolled': 'Зачислен',
        'withdrawn': 'Отозван'
      };
      return mapping[status?.toLowerCase() || ''] || status || '—';
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

    const handleActiveContactClick = () => {
      if (!activeContact) return;
      
      const contactType = activeContact.contact_type?.toLowerCase();
      const contactValue = activeContact.contact_value;
      
      if (contactType === 'telegram') {
        openTelegram(contactValue);
      } else if (contactType === 'url') {
        handleOpenLink(contactValue);
      }
    };
    const getActiveContactLabel = () => {
    const contactType = activeContact?.contact_type?.toLowerCase();
    switch (contactType) {
      case 'telegram': return 'Telegram';
      case 'url': return 'Ссылка';
      default: return 'Активный контакт';
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
          loadData();
        }, 3000);
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Ошибка запуска парсера', severity: 'error' });
      } finally {
        setIsParserRunning(false);
      }
    };

    const loadActiveContactState = async () => {
      try {
        const response = await apiService.getActiveContact();
        setServerActiveContact(response);
        
        const contactValue = getContactValue(formData.prior_contact || student?.prior_contact || '');
        if (response && student && contactValue && response.contact_value === contactValue) {
          setIsActiveContactEnabledForThisStudent(true);
        } else {
          setIsActiveContactEnabledForThisStudent(false);
        }
      } catch (err) {
        console.error('Ошибка загрузки активного контакта:', err);
        setServerActiveContact(null);
        setIsActiveContactEnabledForThisStudent(false);
      }
    };

    const loadAdditionalContacts = () => {
      if (student?.additional_contacts) {
        if (typeof student.additional_contacts === 'string') {
          try {
            setAdditionalContacts(JSON.parse(student.additional_contacts));
          } catch {
            setAdditionalContacts({});
          }
        } else {
          setAdditionalContacts(student.additional_contacts as Record<string, string> || {});
        }
      } else {
        setAdditionalContacts({});
      }
    };

    const loadStudentApplications = async () => {
      if (!student?.id) return;
      setIsLoadingApplications(true);
      try {
        const response = await apiService.getStudentApplications(student.id);
        setApplications(response);
      } catch (err) {
        console.error('Ошибка загрузки заявлений:', err);
      } finally {
        setIsLoadingApplications(false);
      }
    };

    const loadCompetitiveInfoForApplication = async (app: StudentApplication) => {
      setLoadingStatsId(app.id);
      try {
        const info = await apiService.getCompetitiveInfoForSpeciality(student!.id, app.speciality_id);
        setCompetitiveInfoMap(prev => new Map(prev).set(app.speciality_id, info));
      } catch (err) {
        console.error(`Ошибка загрузки статистики:`, err);
      } finally {
        setLoadingStatsId(null);
      }
    };

    const loadGroupStatistics = async (app: StudentApplication) => {
    setLoadingGroupStatsId(app.id);
    try {
      const allGroupStats = await apiService.getGroupStatistics();
      
      // Ищем статистику по profile_id (самый точный способ)
      let groupStat = null;
      
      if (app.profile_id) {
        groupStat = allGroupStats.find(s => s.profile_id === app.profile_id);
      }
      
      // Если не нашли по profile_id, ищем по названию
      if (!groupStat && app.profile_name) {
        groupStat = allGroupStats.find(s => 
          s.group_name.toLowerCase().includes(app.profile_name!.toLowerCase())
        );
      }
      
      // Если всё еще не нашли, ищем по специальности
      if (!groupStat && app.speciality_name) {
        groupStat = allGroupStats.find(s => 
          s.group_name.toLowerCase().includes(app.speciality_name.toLowerCase())
        );
      }
      
      if (groupStat) {
        const key = app.profile_id || app.speciality_id;
        setGroupStatisticsMap(prev => new Map(prev).set(key, groupStat));
      }
    } catch (err) {
      console.error(`Ошибка загрузки статистики группы:`, err);
    } finally {
      setLoadingGroupStatsId(null);
    }
  };

    const handleRowClick = async (app: StudentApplication) => {
      if (expandedAppId === app.id) {
        setExpandedAppId(null);
      } else {
        setExpandedAppId(app.id);
        if (!competitiveInfoMap.has(app.speciality_id)) {
          await loadCompetitiveInfoForApplication(app);
        }
        const statKey = app.profile_id || app.speciality_id;
        if (!groupStatisticsMap.has(statKey)) {
          await loadGroupStatistics(app);
        }
      }
    };

    const handleEnableActiveContact = async () => {
      const priorContact = formData.prior_contact || student?.prior_contact || '';
      const contactValue = getContactValue(priorContact);
      
      if (!priorContact) {
        setSnackbar({ open: true, message: 'У студента не указан приоритетный контакт', severity: 'error' });
        return;
      }
      
      if (!contactValue) {
        let message = '';
        if (priorContact === 'звонок' || priorContact === 'просто сообщения') {
          message = 'У студента не указан номер телефона.';
        } else if (priorContact === 'телеграмм') {
          message = 'У студента не указан Telegram. Добавьте его в дополнительные контакты.';
        } else if (priorContact === 'ссылка') {
          message = 'У студента не указана ссылка. Добавьте её в дополнительные контакты.';
        }
        setSnackbar({ open: true, message, severity: 'error' });
        return;
      }
      
      const contactType = getContactTypeForApi(priorContact);
      
      setIsActiveContactLoading(true);
      try {
        await apiService.setActiveContact(contactType, contactValue);
        await loadActiveContactState();
        await loadActiveContact();
        setSnackbar({ open: true, message: `Активный контакт включен. Способ: ${getPriorContactDisplayLabel(priorContact)}`, severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: err.response?.data?.detail || 'Ошибка включения', severity: 'error' });
      } finally {
        setIsActiveContactLoading(false);
      }
    };

    const handleDisableActiveContact = async () => {
      setIsActiveContactLoading(true);
      try {
        await apiService.deleteActiveContact();
        await loadActiveContactState();
        await loadActiveContact();
        setSnackbar({ open: true, message: 'Активный контакт выключен', severity: 'success' });
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Ошибка выключения', severity: 'error' });
      } finally {
        setIsActiveContactLoading(false);
      }
    };

    const handleOpenLink = (url: string) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        window.open(url, '_blank');
      } else {
        window.open('https://' + url, '_blank');
      }
    };

    const openTelegram = (contact: string) => {
      if (!contact) {
        setSnackbar({ open: true, message: 'Контакт не указан', severity: 'warning' });
        return;
      }
      
      let cleanContact = contact.startsWith('@') ? contact.substring(1) : contact;
      const isPhoneNumber = /^[\d+\s\-\(\)]+$/.test(cleanContact);
      
      if (isPhoneNumber) {
        const phoneNumber = cleanContact.replace(/[^\d+]/g, '');
        // Только tg:// протокол, без window.open
        window.location.href = `tg://resolve?phone=${phoneNumber}`;
      } else {
        window.location.href = `tg://resolve?domain=${cleanContact}`;
      }
    };

    const handleSaveAdditionalContacts = async () => {
      try {
        await apiService.updateStudent(student!.id, {
          additional_contacts: additionalContacts,
        });
        setAdditionalContactsDialogOpen(false);
        setSnackbar({ open: true, message: 'Дополнительные контакты сохранены', severity: 'success' });
        await loadData();
      } catch (err: any) {
        setSnackbar({ open: true, message: 'Ошибка сохранения', severity: 'error' });
      }
    };

    useEffect(() => {
      loadData();
      loadActiveContact();
    }, [id]);

    useEffect(() => {
      if (student) {
        loadAdditionalContacts();
        loadActiveContactState();
        loadStudentApplications();
      }
    }, [student]);

    const loadData = async () => {
      if (!id) return;
      setIsLoading(true);
      setError('');
      try {
        const [studentData, commsData] = await Promise.all([
          apiService.getStudent(parseInt(id)),
          apiService.getStudentCommunications(parseInt(id)),
        ]);
        
        setStudent(studentData);
        setCommunications(commsData);
        setFormData({
          full_name: studentData.full_name,
          phone: studentData.phone || '',
          prior_contact: studentData.prior_contact || '',
          status: studentData.status || 'active',
          contact_status: studentData.contact_status || 'new',
          consent_status: studentData.consent_status || false,
          meeting_status: studentData.meeting_status?.toLowerCase() || 'not_met',
          call_status: studentData.call_status?.toLowerCase() || 'not_reached',
          decision_status: studentData.decision_status?.toLowerCase() || 'thinking',
          documents_status: studentData.documents_status?.toLowerCase() || 'not_submitted',
        });
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка загрузки данных');
      } finally {
        setIsLoading(false);
      }
    };

    const handleSave = async () => {
      if (!student) return;
      setIsSaving(true);
      setError('');
      
      try {
        const updateData = {
          full_name: formData.full_name,
          phone: formData.phone,
          prior_contact: formData.prior_contact || null,
          status: formData.status,
          contact_status: formData.contact_status,
          consent_status: formData.consent_status,
          meeting_status: formData.meeting_status ? formData.meeting_status.toUpperCase() : null,
          call_status: formData.call_status ? formData.call_status.toUpperCase() : null,
          decision_status: formData.decision_status ? formData.decision_status.toUpperCase() : null,
          documents_status: formData.documents_status ? formData.documents_status.toUpperCase() : null,
        };
        
        const updatedStudent = await apiService.updateStudent(student.id, updateData);
        
        setStudent(updatedStudent);
        setFormData(prev => ({
          ...prev,
          meeting_status: updatedStudent.meeting_status?.toLowerCase() || 'not_met',
          call_status: updatedStudent.call_status?.toLowerCase() || 'not_reached',
          decision_status: updatedStudent.decision_status?.toLowerCase() || 'thinking',
          documents_status: updatedStudent.documents_status?.toLowerCase() || 'not_submitted',
        }));
        
        setIsEditMode(false);
        await loadActiveContactState();
        await loadActiveContact();
        setSnackbar({ open: true, message: 'Данные сохранены', severity: 'success' });
      } catch (err: any) {
        console.error('Ошибка сохранения:', err);
        setError(err.response?.data?.detail || 'Ошибка сохранения');
      } finally {
        setIsSaving(false);
      }
    };

    const handleCancelEdit = () => {
      if (student) {
        setFormData({
          full_name: student.full_name,
          phone: student.phone || '',
          prior_contact: student.prior_contact || '',
          status: student.status || 'active',
          contact_status: student.contact_status || 'new',
          consent_status: student.consent_status || false,
          meeting_status: student.meeting_status?.toLowerCase() || 'not_met',
          call_status: student.call_status?.toLowerCase() || 'not_reached',
          decision_status: student.decision_status?.toLowerCase() || 'thinking',
          documents_status: student.documents_status?.toLowerCase() || 'not_submitted',
        });
      }
      setIsEditMode(false);
    };

    const handleAddCommunication = async () => {
      if (!student) return;
      try {
        const newCommunication = await apiService.createCommunication(student.id, {
          communication_type: newComm.communication_type,
          status: newComm.status,
          date_time: new Date(newComm.date_time).toISOString(),
          duration_minutes: newComm.duration_minutes ? parseInt(newComm.duration_minutes) : undefined,
          notes: newComm.notes,
        });
        setCommunications([newCommunication, ...communications]);
        setAddCommDialogOpen(false);
        setNewComm({
          communication_type: 'call',
          status: 'completed',
          date_time: new Date().toISOString().slice(0, 16),
          duration_minutes: '',
          notes: '',
        });
        setSnackbar({ open: true, message: 'Коммуникация добавлена', severity: 'success' });
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Ошибка добавления коммуникации');
      }
    };

    const handleCall = () => {
      if (student?.phone) {
        window.location.href = `tel:${student.phone}`;
      }
    };
    
    const getCommTypeIcon = (type: string) => {
      switch (type) {
        case 'call': 
          return <img src={require('../icons/phonecomm.png')} alt="Звонок" style={{ width: 36, height: 36 }} />;
        case 'meeting': 
          return <img src={require('../icons/meetingcomm.png')} alt="Встреча" style={{ width: 40, height: 40 }} />;
        case 'email': 
          return <img src={require('../icons/emailcomm.png')} alt="Email" style={{ width: 36, height: 36 }} />;
        default: 
          return <img src={require('../icons/messagecomm.png')} alt="Сообщение" style={{ width: 40, height: 40 }} />;
      }
    };

    const getCommTypeText = (type: string) => {
      switch (type) {
        case 'call': return 'Звонок';
        case 'meeting': return 'Встреча';
        case 'email': return 'Email';
        default: return 'Сообщение';
      }
    };

    const formatDateTime = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const renderApplications = () => {
      if (isLoadingApplications) {
        return (
          <Card className={styles.card}>
            <CardContent className={styles.cardContent} sx={{ textAlign: 'center' }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>Загрузка заявлений...</Typography>
            </CardContent>
          </Card>
        );
      }

      if (applications.length === 0) {
        return (
          <Card className={styles.card}>
            <CardContent className={styles.cardContent}>
              <Typography variant="h6" className={styles.cardTitle}>
                Заявления на специальности
              </Typography>
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                Нет заявлений на специальности
              </Typography>
            </CardContent>
          </Card>
        );
      }

      return (
        <Card className={styles.card}>
          <CardContent className={styles.cardContent}>
            <Typography variant="h6" className={styles.cardTitle}>
              Заявления на специальности ({applications.length})
            </Typography>
            
            <TableContainer component={Paper} className={styles.applicationsTable}>
              <Table size="small">
                <TableHead>
                  <TableRow className={styles.applicationsTableHeader}>
                    <TableCell style={{ width: '40px' }} />
                    <TableCell>Специальность</TableCell>
                    <TableCell>Профиль</TableCell>
                    <TableCell align="center">Форма/Основа</TableCell>
                    <TableCell align="center">Место</TableCell>
                    <TableCell align="center">Баллы</TableCell>
                    <TableCell align="center">Статус заявления</TableCell>
                    <TableCell align="center">Согласие</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {applications.map((app) => (
                    <React.Fragment key={app.id}>
                      <TableRow 
                        hover 
                        onClick={() => handleRowClick(app)}
                        className={styles.applicationsTableRow}
                      >
                        <TableCell align="center">
                          <IconButton size="small">
                            {expandedAppId === app.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{app.speciality_name}</TableCell>
                        <TableCell>{app.profile_name || '—'}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {app.study_form && (
                              <SquareChip label={app.study_form} size="small" variant="outlined" />
                            )}
                            {app.study_basis && (
                              <SquareChip 
                                label={app.study_basis} 
                                size="small" 
                                color={app.study_basis === 'Бюджетная' ? 'success' : app.study_basis === 'Платная' ? 'warning' : 'info'}
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {app.position ? (
                            <SquareChip 
                              label={app.position?.toString() || '—'} 
                              size="small" 
                              color={app.position <= 10 ? 'success' : app.position <= 30 ? 'warning' : 'default'}
                            />
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          {app.total_score ? (
                            <Typography fontWeight="bold" color={app.total_score >= 200 ? 'success.main' : 'warning.main'}>
                              {app.total_score}
                            </Typography>
                          ) : '—'}
                        </TableCell>
                        <TableCell align="center">
                          <SquareChip 
                            label={getApplicationStatusText(app.application_status)} 
                            size="small"
                            color={getApplicationStatusColor(app.application_status)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {app.consent_status ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                          <Collapse in={expandedAppId === app.id} timeout="auto" unmountOnExit>
                            <Box className={styles.expandedContent}>
                              {loadingStatsId === app.id || loadingGroupStatsId === app.id ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                  <CircularProgress size={24} />
                                </Box>
                              ) : (
                                (() => {
                                  const info = competitiveInfoMap.get(app.speciality_id);
                                  const statKey = app.profile_id || app.speciality_id;
                                  const groupStat = groupStatisticsMap.get(statKey);
                                  
                                  if (!info && !groupStat) return null;
                                  
                                  const studyBasis = app.study_basis?.toLowerCase() || '';
                                  const isBudget = studyBasis === 'бюджетная';
                                  const isPaid = studyBasis === 'платная';
                                  const isTarget = studyBasis === 'целевая';
                                  
                                  let placesTotal = 0;
                                  let placesFilled = 0;
                                  let applicantsWithConsent = 0;
                                  
                                  if (isBudget && groupStat) {
                                    placesTotal = groupStat.budget.total;
                                    placesFilled = groupStat.budget.filled;
                                    applicantsWithConsent = groupStat.budget.applicants_with_consent;
                                  } else if (isPaid && groupStat) {
                                    placesTotal = groupStat.paid.total;
                                    placesFilled = groupStat.paid.filled;
                                    applicantsWithConsent = groupStat.paid.applicants_with_consent;
                                  } else if (isTarget && groupStat) {
                                    placesTotal = groupStat.target.total;
                                    placesFilled = groupStat.target.filled;
                                    applicantsWithConsent = groupStat.target.applicants_with_consent;
                                  }
                                   
                                  return (
                                    <Box className={styles.statsGrid}>
                                      <Box className={styles.statCard}>
                                        <Typography className={styles.statLabel}>Место в конкурсе</Typography>
                                        <Typography className={styles.statValue}>
                                          {app.position|| '—'} из {groupStat?.total_applications || '?'}
                                        </Typography>
                                      </Box>
                                      
                                      {placesTotal > 0 && (
                                        <Box className={styles.statCard}>
                                          <Typography className={styles.statLabel}>
                                            {isBudget ? 'Бюджетных мест' : isPaid ? 'Платных мест' : 'Целевых мест'}
                                          </Typography>
                                          <Typography className={styles.statValue}>
                                            {placesFilled} / {placesTotal}
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {groupStat && placesTotal > 0 && (
                                        <Box className={styles.statCard}>
                                          <Typography className={styles.statLabel}>Конкурс</Typography>
                                          <Typography className={styles.statValue}>
                                            {groupStat.competition} чел/место
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {groupStat && (
                                        <Box className={styles.statCard}>
                                          <Typography className={styles.statLabel}>Средний балл</Typography>
                                          <Typography className={styles.statValue}>
                                            {groupStat.average_score}
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {groupStat && (
                                        <Box className={styles.statCard}>
                                          <Typography className={styles.statLabel}>Максимальный балл</Typography>
                                          <Typography className={styles.statValue}>
                                            {groupStat.max_score}
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      {applicantsWithConsent > 0 && (
                                        <Box className={styles.statCard}>
                                          <Typography className={styles.statLabel}>Подали согласие</Typography>
                                          <Typography className={styles.statValue}>
                                            {applicantsWithConsent}
                                          </Typography>
                                        </Box>
                                      )}
                                      
                                      <Box className={styles.statCard}>
                                        <Typography className={styles.statLabel}>Ваши баллы</Typography>
                                        <Typography className={styles.statValue} color={info?.student_score && info.student_score >= 200 ? 'success.main' : 'warning.main'}>
                                          {info?.student_score || '—'}
                                        </Typography>
                                      </Box>
                                      
                                      <Box className={styles.statCard}>
                                        <Typography className={styles.statLabel}>Статус заявления</Typography>
                                        <Typography className={styles.statValue}>
                                          {getApplicationStatusText(app.application_status)}
                                        </Typography>
                                      </Box>
                                      
                                      <Box className={styles.statCard}>
                                        <Typography className={styles.statLabel}>Согласие</Typography>
                                        <Typography className={styles.statValue}>
                                          {app.consent_status ? 'Да' : 'Нет'}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  );
                                })()
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      );
    };

    if (isLoading) {
      return (
        <Box className={styles.loaderContainer}>
          <CircularProgress />
        </Box>
      );
    }

    if (!student) {
      return (
        <Container className={styles.innerContainer}>
          <Alert severity="error">Студент не найден</Alert>
        </Container>
      );
    }

    const priorContact = formData.prior_contact || student?.prior_contact || '';
    const contactValue = getContactValue(priorContact);
    const hasContactValue = !!contactValue;
    const hasPriorContact = !!priorContact;
    const isUrlContact = priorContact === 'ссылка';
    const isTelegramContact = priorContact === 'телеграмм';

    const getDocumentsStatusLabel = (status: string | undefined) => {
      const opt = documentsStatusOptions.find(d => d.value === status?.toLowerCase());
      return opt?.label || 'Нет заявл.';
    };

    const getDocumentsStatusColor = (status: string | undefined) => {
      const opt = documentsStatusOptions.find(d => d.value === status?.toLowerCase());
      return opt?.color;
    };

    const getMeetingStatusLabel = (status: string | undefined) => {
      const opt = meetingStatusOptions.find(m => m.value === status?.toLowerCase());
      return opt?.label || 'Не был на сборе';
    };

    const getMeetingStatusColor = (status: string | undefined) => {
      const opt = meetingStatusOptions.find(m => m.value === status?.toLowerCase());
      return opt?.color;
    };

    const getCallStatusLabel = (status: string | undefined) => {
      const opt = callStatusOptions.find(c => c.value === status?.toLowerCase());
      return opt?.label || 'Не дозвонились';
    };

    const getCallStatusColor = (status: string | undefined) => {
      const opt = callStatusOptions.find(c => c.value === status?.toLowerCase());
      return opt?.color;
    };

    const getDecisionStatusLabel = (status: string | undefined) => {
      const opt = decisionStatusOptions.find(d => d.value === status?.toLowerCase());
      return opt?.label || 'Думает';
    };

    const getDecisionStatusColor = (status: string | undefined) => {
      const opt = decisionStatusOptions.find(d => d.value === status?.toLowerCase());
      return opt?.color;
    };

    return (
      <Container maxWidth="lg" className={styles.innerContainer}>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>

        <Paper className={styles.paperHeader}>
          <IconButton onClick={() => navigate('/students')}>
            <img 
                  src={require('../icons/home.png')} 
                  alt="Студенты" 
                  style={{ width: 28, height: 28 }}
                />
          </IconButton>
          
          <Box sx={{ flex: 1 }}>
            {isEditMode ? (
              <TextField
                label="ФИО"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                size="small"
                sx={{ width: '100%', maxWidth: 400 }}
              />
            ) : (
              <>
                <Typography variant="h5" component="h1" className={styles.headerTitle}>
                  {student.full_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ID: {student.russian_student_id || student.id}
                </Typography>
              </>
            )}
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
          </Box>

          {isEditMode ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton onClick={() => navigate('/students')} title="Список студентов" color="primary">
                <img 
                  src={require('../icons/cancel.png')} 
                  alt="Студенты" 
                  style={{ width: 28, height: 28 }}
                />
              </IconButton>
              <IconButton onClick={handleSave} disabled={isSaving} color="primary">
                {isSaving ? (
                  <CircularProgress size={24} />
                ) : (
                  <img 
                    src={require('../icons/save.png')} 
                    alt="Сохранить" 
                    style={{ width: 24, height: 24 }}
                  />
                )}
              </IconButton>
            </Box>
          ) : (
            <IconButton onClick={() => setIsEditMode(true)}>
              <img 
                src={require('../icons/edit.png')} 
                alt="Редактировать" 
                style={{ width: 24, height: 24 }}
              />
            </IconButton>
          )}
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card className={styles.card}>
              <CardContent className={styles.cardContent}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" className={styles.cardTitle}>
                    Контактная информация
                  </Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAdditionalContactsDialogOpen(true)}>
                    Доп. контакты
                  </Button>
                </Box>
                
                <Box className={styles.contactRow}>
                  <img 
                    src={require('../icons/call.png')} 
                    alt="Телефон" 
                    style={{ width: 22, height: 22 }}
                  />
                  {isEditMode ? (
                    <TextField
                      label="Телефон"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      size="small"
                      fullWidth
                    />
                  ) : (
                    <>
                      <Typography sx={{ flex: 1 }}>{student.phone || '—'}</Typography>
                      {student.phone && (
                        <Button size="small" startIcon={<CallIcon />} onClick={handleCall}>
                          Позвонить
                        </Button>
                      )}
                    </>
                  )}
                </Box>
                
                <Box className={styles.contactRow}>
                  <img 
                    src={require('../icons/profile3.png')} 
                    alt="Приоритетный контакт" 
                    style={{ width: 22, height: 22 }}
                  />
                  {isEditMode ? (
                    <TextField
                      select
                      label="Приоритетный контакт"
                      value={formData.prior_contact}
                      onChange={(e) => setFormData({ ...formData, prior_contact: e.target.value })}
                      size="small"
                      fullWidth
                    >
                      {priorContactOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {opt.icon}
                            {opt.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography>
                        Приоритетный контакт: <strong>{getPriorContactDisplayLabel(student.prior_contact || '')}</strong>
                      </Typography>
                      {isUrlContact && contactValue && (
                        <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => handleOpenLink(contactValue)}>
                          Открыть ссылку
                        </Button>
                      )}
                      {isTelegramContact && contactValue && (
                        <Button size="small" startIcon={<TelegramIcon />} onClick={() => openTelegram(contactValue)}>
                          Открыть Telegram
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                {Object.keys(additionalContacts).length > 0 && !isEditMode && (
                  <Box className={styles.additionalContactsContainer}>
                    <Typography variant="caption" color="text.secondary">
                      Дополнительные контакты:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                      {Object.entries(additionalContacts).map(([key, value]) => {
                        if (key === 'telegram') {
                          return (
                            <SquareChip
                              key={key}
                              size="small"
                              icon={<TelegramIcon />}
                              label={`Telegram: ${value}`}
                              onClick={() => openTelegram(value)}
                              sx={{ cursor: 'pointer' }}
                            />
                          );
                        }
                        if (key === 'url') {
                          return (
                            <SquareChip
                              key={key}
                              size="small"
                              icon={<LinkIcon />}
                              label={`Ссылка: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`}
                              onClick={() => handleOpenLink(value)}
                              sx={{ cursor: 'pointer' }}
                            />
                          );
                        }
                        return (
                          <SquareChip
                            key={key}
                            size="small"
                            label={`${key}: ${value}`}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card className={styles.card}>
              <CardContent className={styles.cardContent}>
                <Typography variant="h6" className={styles.cardTitle}>
                  Статусы студента
                </Typography>
                
                {isEditMode ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Статус документов"
                        value={formData.documents_status}
                        onChange={(e) => setFormData({ ...formData, documents_status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {documentsStatusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Был на сборе"
                        value={formData.meeting_status}
                        onChange={(e) => setFormData({ ...formData, meeting_status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {meetingStatusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Дозвонились"
                        value={formData.call_status}
                        onChange={(e) => setFormData({ ...formData, call_status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {callStatusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Решение"
                        value={formData.decision_status}
                        onChange={(e) => setFormData({ ...formData, decision_status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {decisionStatusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Общий статус"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {statusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        select
                        label="Статус контакта"
                        value={formData.contact_status}
                        onChange={(e) => setFormData({ ...formData, contact_status: e.target.value })}
                        size="small"
                        fullWidth
                      >
                        {contactStatusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.consent_status}
                            onChange={(e) => setFormData({ ...formData, consent_status: e.target.checked })}
                          />
                        }
                        label="Согласие на зачисление"
                      />
                    </Grid>
                  </Grid>
                ) : (
                  <Box className={styles.statusGrid}>
                    <SquareChip
                      label={getDocumentsStatusLabel(student.documents_status ?? undefined)}
                      color={getDocumentsStatusColor(student.documents_status ?? undefined)}
                    />
                    <SquareChip
                      label={getMeetingStatusLabel(student.meeting_status ?? undefined)}
                      color={getMeetingStatusColor(student.meeting_status ?? undefined)}
                    />
                    <SquareChip
                      label={getCallStatusLabel(student.call_status ?? undefined)}
                      color={getCallStatusColor(student.call_status ?? undefined)}
                    />
                    <SquareChip
                      label={getDecisionStatusLabel(student.decision_status ?? undefined)}
                      color={getDecisionStatusColor(student.decision_status ?? undefined)}
                    />
                    <SquareChip
                      label={getStatusText(student.status)}
                      color={getStatusColor(student.status)}
                    />
                    <SquareChip
                      label={getContactStatusText(student.contact_status)}
                      variant="outlined"
                    />
                    <SquareChip
                      label={`Согласие: ${student.consent_status ? 'Да' : 'Нет'}`}
                      color={student.consent_status ? 'success' : 'error'}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12}>
            {renderApplications()}
          </Grid>

          <Grid item xs={12}>
            <Card className={styles.activeContactCard}>
              <CardContent className={styles.cardContent}>
                <Typography variant="h6" className={styles.cardTitle}>
                  Активный контакт для мобильного приложения
                </Typography>
                
                {!isActiveContactEnabledForThisStudent ? (
                  <Button
                    variant="contained"
                    onClick={handleEnableActiveContact}
                    disabled={!hasPriorContact || !hasContactValue || isActiveContactLoading}
                    startIcon={<AddIcon />}
                    fullWidth
                    className={styles.activeContactButton}
                  >
                    Включить активный контакт для этого студента
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={handleDisableActiveContact}
                    disabled={isActiveContactLoading}
                    startIcon={<CancelIcon />}
                    fullWidth
                    className={styles.activeContactButton}
                  >
                    Выключить активный контакт
                  </Button>
                )}
                
                {!hasPriorContact && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    У студента не указан приоритетный контакт. Сначала выберите его в форме редактирования.
                  </Alert>
                )}
                
                {hasPriorContact && !hasContactValue && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    {priorContact === 'звонок' || priorContact === 'просто сообщения' 
                      ? 'У студента не указан номер телефона.'
                      : priorContact === 'телеграмм'
                      ? 'У студента не указан Telegram. Добавьте его в дополнительные контакты.'
                      : 'У студента не указана ссылка. Добавьте её в дополнительные контакты.'
                    }
                  </Alert>
                )}
                
                {isActiveContactEnabledForThisStudent && serverActiveContact && (
                  <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 2 }}>
                    Активный контакт включен для этого студента.
                    <br />
                    Способ связи: <strong>{getPriorContactDisplayLabel(priorContact)}</strong>
                    <br />
                    Значение: <strong>{serverActiveContact.contact_value}</strong>
                    {isUrlContact && (
                      <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => handleOpenLink(serverActiveContact.contact_value)} sx={{ ml: 1 }}>
                        Открыть
                      </Button>
                    )}
                    {isTelegramContact && (
                      <Button size="small" startIcon={<TelegramIcon />} onClick={() => openTelegram(serverActiveContact.contact_value)} sx={{ ml: 1 }}>
                        Открыть в Telegram
                      </Button>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card className={styles.card}>
              <CardContent className={styles.cardContent}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" className={styles.cardTitle}>
                    История коммуникаций
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddCommDialogOpen(true)}>
                    Добавить
                  </Button>
                </Box>
                
                {communications.length === 0 ? (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Нет записей о коммуникациях
                  </Typography>
                ) : (
                  <List className={styles.communicationsList}>
                    {communications.map((comm, index) => (
                      <React.Fragment key={comm.id}>
                        {index > 0 && <Divider variant="inset" component="li" />}
                        <ListItem alignItems="flex-start" className={styles.communicationItem}>
                          <ListItemAvatar>
                            <Avatar sx={{backgroundColor: 'white'}}>
                              {getCommTypeIcon(comm.communication_type)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box className={styles.communicationHeader}>
                                <Typography className={styles.communicationType}>
                                  {getCommTypeText(comm.communication_type)}
                                </Typography>
                                <SquareChip
                                  label={comm.status === 'completed' ? 'Завершено' : comm.status === 'planned' ? 'Запланировано' : 'Отменено'}
                                  size="small"
                                  color={comm.status === 'completed' ? 'success' : comm.status === 'planned' ? 'info' : 'error'}
                                />
                              </Box>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.primary" sx={{ mt: 1 }}>
                                  {comm.notes}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
                                  <Box className={styles.communicationDate}>
                                    <AccessTimeIcon fontSize="small" color="action" />
                                    <Typography variant="caption" color="text.secondary">
                                      {formatDateTime(comm.date_time)}
                                    </Typography>
                                  </Box>
                                  {comm.duration_minutes && (
                                    <Typography variant="caption" color="text.secondary">
                                      Длительность: {comm.duration_minutes} мин
                                    </Typography>
                                  )}
                                  {comm.created_by_name && (
                                    <Typography variant="caption" color="text.secondary">
                                      Создал: {comm.created_by_name}
                                    </Typography>
                                  )}
                                </Box>
                              </>
                            }
                          />
                        </ListItem>
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Dialog open={addCommDialogOpen} onClose={() => setAddCommDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle className={styles.dialogTitle}>Добавить коммуникацию</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                select
                label="Тип коммуникации"
                value={newComm.communication_type}
                onChange={(e) => setNewComm({ ...newComm, communication_type: e.target.value })}
                fullWidth
              >
                <MenuItem value="call">Звонок</MenuItem>
                <MenuItem value="meeting">Встреча</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="message">Сообщение</MenuItem>
              </TextField>
              
              <TextField
                select
                label="Статус"
                value={newComm.status}
                onChange={(e) => setNewComm({ ...newComm, status: e.target.value })}
                fullWidth
              >
                <MenuItem value="completed">Завершено</MenuItem>
                <MenuItem value="planned">Запланировано</MenuItem>
                <MenuItem value="cancelled">Отменено</MenuItem>
              </TextField>
              
              <TextField
                label="Дата и время"
                type="datetime-local"
                value={newComm.date_time}
                onChange={(e) => setNewComm({ ...newComm, date_time: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="Длительность (минуты)"
                type="number"
                value={newComm.duration_minutes}
                onChange={(e) => setNewComm({ ...newComm, duration_minutes: e.target.value })}
                fullWidth
              />
              
              <TextField
                label="Заметки"
                multiline
                rows={4}
                value={newComm.notes}
                onChange={(e) => setNewComm({ ...newComm, notes: e.target.value })}
                fullWidth
                required
              />
            </Box>
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
            <Button onClick={() => setAddCommDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleAddCommunication} variant="contained" disabled={!newComm.notes}>
              Сохранить
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={additionalContactsDialogOpen} onClose={() => setAdditionalContactsDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle className={styles.dialogTitle}>Дополнительные контакты</DialogTitle>
          <DialogContent className={styles.dialogContent}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Telegram"
                value={additionalContacts.telegram || ''}
                onChange={(e) => setAdditionalContacts({ ...additionalContacts, telegram: e.target.value })}
                fullWidth
                placeholder="@username или номер телефона"
                helperText="Можно указать @username или номер телефона для поиска в Telegram"
              />
              <TextField
                label="Ссылка (URL)"
                value={additionalContacts.url || ''}
                onChange={(e) => setAdditionalContacts({ ...additionalContacts, url: e.target.value })}
                fullWidth
                placeholder="https://example.com/student/123"
                helperText="Любая ссылка на страницу студента"
              />
              <TextField
                label="Другой контакт"
                value={additionalContacts.other || ''}
                onChange={(e) => setAdditionalContacts({ ...additionalContacts, other: e.target.value })}
                fullWidth
                placeholder="Другой способ связи"
              />
            </Box>
          </DialogContent>
          <DialogActions className={styles.dialogActions}>
            <Button onClick={() => setAdditionalContactsDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSaveAdditionalContacts} variant="contained">Сохранить</Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  };

  export default StudentDetailPage;