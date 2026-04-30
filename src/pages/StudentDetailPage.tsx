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
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  MoreHoriz as MoreHorizIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Student, Communication } from '../types';

const StudentDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [addCommDialogOpen, setAddCommDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
  
  // Активный контакт с сервера
  const [serverActiveContact, setServerActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
  // Флаг - включен ли активный контакт для ЭТОГО студента
  const [isActiveContactEnabledForThisStudent, setIsActiveContactEnabledForThisStudent] = useState(false);
  const [isActiveContactLoading, setIsActiveContactLoading] = useState(false);

  // Форма редактирования
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    prior_contact: '',
    status: 'active',
    application_status: 'pending',
    contact_status: 'new',
    contact_type: 'call',
    consent_status: false,
  });

  // Новая коммуникация
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

  const applicationStatusOptions = [
    { value: 'pending', label: 'Ожидает' },
    { value: 'accepted', label: 'Принято' },
    { value: 'rejected', label: 'Отклонено' },
    { value: 'paid', label: 'Оплачено' },
  ];

  const contactStatusOptions = [
    { value: 'new', label: 'Новый' },
    { value: 'met', label: 'Был на встрече' },
    { value: 'interested', label: 'Заинтересован' },
    { value: 'original_submitted', label: 'Подан оригинал' },
    { value: 'waiting_original', label: 'Ждем оригинал' },
    { value: 'not_interested', label: 'Не заинтересован' },
  ];

  const contactTypeOptions = [
    { value: 'call', label: 'Звонок' },
    { value: 'message', label: 'Сообщение' },
    { value: 'meeting', label: 'Встреча' },
  ];

  // Опции для приоритетного контакта (русские значения для бэкенда)
  const priorContactOptions = [
    { value: '', label: 'Не указан' },
    { value: 'телеграмм', label: 'Telegram', icon: <TelegramIcon fontSize="small" /> },
    { value: 'вк', label: 'WhatsApp', icon: <WhatsAppIcon fontSize="small" /> },
    { value: 'просто сообщения', label: 'SMS', icon: <SmsIcon fontSize="small" /> },
    { value: 'звонок', label: 'Звонок', icon: <CallIcon fontSize="small" /> },
  ];

  // Функция для отображения названия приоритетного контакта
  const getPriorContactDisplayLabel = (value: string): string => {
    const mapping: Record<string, string> = {
      'телеграмм': 'Telegram',
      'вк': 'WhatsApp',
      'просто сообщения': 'SMS',
      'звонок': 'Звонок',
    };
    return mapping[value] || 'Не указан';
  };

  // Получение типа контакта из приоритетного
  const getContactTypeFromPrior = (priorContact: string): string => {
    if (priorContact === 'телеграмм') return 'telegram';
    if (priorContact === 'вк') return 'whatsapp';
    if (priorContact === 'просто сообщения') return 'sms';
    if (priorContact === 'звонок') return 'call';
    return 'other';
  };

  // Загрузка активного контакта с сервера и проверка соответствия текущему студенту
  const loadActiveContactState = async () => {
    try {
      const response = await apiService.getActiveContact();
      setServerActiveContact(response);
      
      // Проверяем, соответствует ли активный контакт текущему студенту
      if (response && student && response.contact_value === student.phone) {
        setIsActiveContactEnabledForThisStudent(true);
      } else {
        setIsActiveContactEnabledForThisStudent(false);
      }
      
      console.log('📱 Активный контакт с сервера:', response);
      console.log('📱 Текущий студент:', student?.phone);
      console.log('📱 Соответствует:', response?.contact_value === student?.phone);
    } catch (err) {
      console.error('Ошибка загрузки активного контакта:', err);
      setServerActiveContact(null);
      setIsActiveContactEnabledForThisStudent(false);
    }
  };

  // Включение активного контакта для текущего студента
  const handleEnableActiveContact = async () => {
    const studentPhone = student?.phone;
    if (!studentPhone) {
      setSnackbar({ 
        open: true, 
        message: 'У студента не указан номер телефона. Сначала добавьте его в форму редактирования.', 
        severity: 'error' 
      });
      return;
    }
    
    // Определяем тип контакта из приоритетного контакта студента
    const priorContact = formData.prior_contact || student?.prior_contact || '';
    const contactType = getContactTypeFromPrior(priorContact);
    
    setIsActiveContactLoading(true);
    try {
      await apiService.setActiveContact(contactType, studentPhone);
      await loadActiveContactState(); // Перезагружаем состояние с сервера
      setSnackbar({ 
        open: true, 
        message: `Активный контакт включен. Способ связи: ${getPriorContactDisplayLabel(priorContact) || 'Другое'}, Номер: ${studentPhone}`, 
        severity: 'success' 
      });
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.detail || 'Ошибка включения активного контакта', 
        severity: 'error' 
      });
    } finally {
      setIsActiveContactLoading(false);
    }
  };

  // Выключение активного контакта
  const handleDisableActiveContact = async () => {
    setIsActiveContactLoading(true);
    try {
      await apiService.deleteActiveContact();
      await loadActiveContactState(); // Перезагружаем состояние с сервера
      setSnackbar({ open: true, message: 'Активный контакт выключен', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка выключения', severity: 'error' });
    } finally {
      setIsActiveContactLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  // Отдельный эффект для загрузки активного контакта после загрузки студента
  useEffect(() => {
    if (student) {
      loadActiveContactState();
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
        application_status: studentData.application_status || 'pending',
        contact_status: studentData.contact_status || 'new',
        contact_type: studentData.contact_type || 'call',
        consent_status: studentData.consent_status || false,
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
        application_status: formData.application_status,
        contact_status: formData.contact_status,
        contact_type: formData.contact_type,
        consent_status: formData.consent_status,
      };
      
      console.log('Отправка данных на сервер:', updateData);
      
      const updatedStudent = await apiService.updateStudent(student.id, updateData);
      setStudent(updatedStudent);
      setIsEditMode(false);
      
      // После обновления студента проверяем активный контакт
      await loadActiveContactState();
      
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
        application_status: student.application_status || 'pending',
        contact_status: student.contact_status || 'new',
        contact_type: student.contact_type || 'call',
        consent_status: student.consent_status || false,
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

  const getStatusColor = (status?: string | null): "success" | "error" | "info" | "warning" | "default" => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'enrolled': return 'info';
      case 'pending': return 'warning';
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status?: string | null): string => {
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

  const getCommTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <CallIcon />;
      case 'meeting': return <GroupIcon />;
      case 'email': return <EmailIcon />;
      default: return <ChatIcon />;
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

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!student) {
    return (
      <Container>
        <Alert severity="error">Студент не найден</Alert>
      </Container>
    );
  }

  const hasPhone = !!student?.phone;
  const hasPriorContact = !!(formData.prior_contact || student?.prior_contact);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
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

      {/* Header */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/students')}>
          <ArrowBackIcon />
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
              <Typography variant="h5" component="h1" fontWeight="bold">
                {student.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID: {student.russian_student_id || student.id}
              </Typography>
            </>
          )}
        </Box>
        {isEditMode ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleCancelEdit} disabled={isSaving} color="error">
              <CancelIcon />
            </IconButton>
            <IconButton onClick={handleSave} disabled={isSaving} color="primary">
              {isSaving ? <CircularProgress size={24} /> : <SaveIcon />}
            </IconButton>
          </Box>
        ) : (
          <IconButton onClick={() => setIsEditMode(true)}>
            <EditIcon />
          </IconButton>
        )}
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Contact Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Контактная информация
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PhoneIcon color="action" />
                  {isEditMode ? (
                    <TextField
                      label="Телефон"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  ) : (
                    <Typography sx={{ flex: 1 }}>{student.phone || '—'}</Typography>
                  )}
                  {!isEditMode && student.phone && (
                    <Button size="small" startIcon={<CallIcon />} onClick={handleCall}>
                      Позвонить
                    </Button>
                  )}
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonIcon color="action" />
                  {isEditMode ? (
                    <TextField
                      select
                      label="Приоритетный контакт"
                      value={formData.prior_contact}
                      onChange={(e) => setFormData({ ...formData, prior_contact: e.target.value })}
                      size="small"
                      sx={{ flex: 1 }}
                      SelectProps={{
                        renderValue: (selected) => {
                          const option = priorContactOptions.find(opt => opt.value === selected);
                          return option ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {option.icon}
                              {option.label}
                            </Box>
                          ) : 'Не указан';
                        }
                      }}
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
                    <Typography>
                      Приоритетный контакт: <strong>{getPriorContactDisplayLabel(student.prior_contact || '')}</strong>
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Status Info */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Статусы
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  {isEditMode ? (
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
                  ) : (
                    <Chip
                      label={`Общий: ${getStatusText(student.status)}`}
                      color={getStatusColor(student.status)}
                      size="small"
                    />
                  )}
                </Grid>
                <Grid item xs={6}>
                  {isEditMode ? (
                    <TextField
                      select
                      label="Статус заявления"
                      value={formData.application_status}
                      onChange={(e) => setFormData({ ...formData, application_status: e.target.value })}
                      size="small"
                      fullWidth
                    >
                      {applicationStatusOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Chip
                      label={`Заявление: ${getStatusText(student.application_status)}`}
                      color={getStatusColor(student.application_status)}
                      size="small"
                    />
                  )}
                </Grid>
                <Grid item xs={6}>
                  {isEditMode ? (
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
                  ) : (
                    <Chip
                      label={`Контакт: ${getStatusText(student.contact_status)}`}
                      color={getStatusColor(student.contact_status)}
                      size="small"
                    />
                  )}
                </Grid>
                <Grid item xs={6}>
                  {isEditMode ? (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.consent_status}
                          onChange={(e) => setFormData({ ...formData, consent_status: e.target.checked })}
                          size="small"
                        />
                      }
                      label="Согласие"
                    />
                  ) : (
                    <Chip
                      icon={student.consent_status ? <CheckCircleIcon /> : <CancelIcon />}
                      label={`Согласие: ${student.consent_status ? 'Да' : 'Нет'}`}
                      color={student.consent_status ? 'success' : 'error'}
                      size="small"
                    />
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Academic Info */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Академическая информация
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <SchoolIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Направление:</Typography>
                    <Typography variant="body2">{student.department_name || '—'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <WorkIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Специальность:</Typography>
                    <Typography variant="body2">{student.speciality_name || '—'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <PersonIcon color="action" fontSize="small" />
                    <Typography variant="body2" color="text.secondary">Профиль:</Typography>
                    <Typography variant="body2">{student.profile_name || '—'}</Typography>
                  </Box>
                  {student.total_score && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScoreIcon color="action" fontSize="small" />
                      <Typography variant="body2" color="text.secondary">Баллы:</Typography>
                      <Typography variant="body2" fontWeight="bold" color={student.total_score >= 200 ? 'success.main' : 'warning.main'}>
                        {student.total_score}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Активный контакт - кнопка включения/выключения */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: 'grey.50' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Активный контакт для мобильного приложения
              </Typography>
              
              {!isActiveContactEnabledForThisStudent ? (
                <Button
                  variant="contained"
                  onClick={handleEnableActiveContact}
                  disabled={!hasPhone || !hasPriorContact || isActiveContactLoading}
                  startIcon={<AddIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
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
                  sx={{ mb: 2 }}
                >
                  Выключить активный контакт
                </Button>
              )}
              
              {!hasPhone && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  У студента не указан номер телефона. Сначала добавьте его в форму редактирования.
                </Alert>
              )}
              
              {hasPhone && !hasPriorContact && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  У студента не указан приоритетный контакт. Сначала выберите его в форме редактирования.
                </Alert>
              )}
              
              {isActiveContactEnabledForThisStudent && serverActiveContact && (
                <Alert severity="success" icon={<CheckCircleIcon />}>
                  Активный контакт включен для этого студента.
                  <br />
                  Способ связи: <strong>{getPriorContactDisplayLabel(formData.prior_contact || student?.prior_contact || '') || serverActiveContact.contact_type}</strong>
                  <br />
                  Номер: <strong>{serverActiveContact.contact_value}</strong>
                </Alert>
              )}
              
              {serverActiveContact && !isActiveContactEnabledForThisStudent && serverActiveContact.contact_value !== student?.phone && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Активный контакт установлен на другой номер (<strong>{serverActiveContact.contact_value}</strong>). 
                  Нажмите "Включить", чтобы переключить на текущего студента.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Communications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">
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
                <List>
                  {communications.map((comm, index) => (
                    <React.Fragment key={comm.id}>
                      {index > 0 && <Divider variant="inset" component="li" />}
                      <ListItem alignItems="flex-start">
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light' }}>
                            {getCommTypeIcon(comm.communication_type)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                {getCommTypeText(comm.communication_type)}
                              </Typography>
                              <Chip
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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

      {/* Add Communication Dialog */}
      <Dialog open={addCommDialogOpen} onClose={() => setAddCommDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Добавить коммуникацию</DialogTitle>
        <DialogContent>
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
        <DialogActions>
          <Button onClick={() => setAddCommDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleAddCommunication} variant="contained" disabled={!newComm.notes}>
            Сохранить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentDetailPage;