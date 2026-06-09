// src/pages/ProfilePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Avatar,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Star as StarIcon,
  CloudSync as CloudSyncIcon,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Telegram as TelegramIcon,
  Link as LinkIcon,
  Language as UrlIcon,
  Save as SaveIcon,
  Phone as PhoneIcon,
  Sms as SmsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { User } from '../types';
import styles from './ProfilePage.module.scss';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isParserRunning, setIsParserRunning] = useState(false);
  const [activeContact, setActiveContact] = useState<{ contact_type: string; contact_value: string } | null>(null);
  
  const [settings, setSettings] = useState({
    telegram_open_on: 'pc',
    vk_open_on: 'pc',
    url_open_on: 'pc',
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

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
      const response = await apiService.getCommunicationSettings();
      setSettings({
        telegram_open_on: response.telegram_open_on || 'pc',
        vk_open_on: response.vk_open_on || 'pc',
        url_open_on: response.url_open_on || 'pc',
      });
    } catch (err) {
      console.error('Ошибка загрузки настроек:', err);
    }
  };

  const saveCommunicationSettings = async () => {
    setIsSettingsLoading(true);
    try {
      await apiService.updateCommunicationSettings({
        telegram_open_on: settings.telegram_open_on,
        vk_open_on: settings.vk_open_on,
        url_open_on: settings.url_open_on,
      });
      setSettingsSaved(true);
      setSnackbar({ open: true, message: 'Настройки сохранены', severity: 'success' });
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка сохранения настроек', severity: 'error' });
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const handleActiveContactClick = () => {
    if (!activeContact) return;
    
    const contactType = activeContact.contact_type?.toLowerCase();
    const contactValue = activeContact.contact_value;
    
    if (contactType === 'telegram') {
      openTelegramDesktop(contactValue);
    } else if (contactType === 'url') {
      handleOpenLink(contactValue);
    }
  };

  const openTelegramDesktop = (contact: string) => {
    let cleanContact = contact.startsWith('@') ? contact.substring(1) : contact;
    const isPhoneNumber = /^[\d+\s\-\(\)]+$/.test(cleanContact);
    if (isPhoneNumber) {
      const phoneNumber = cleanContact.replace(/[^\d+]/g, '');
      window.location.href = `tg://resolve?phone=${phoneNumber}`;
    } else {
      window.location.href = `tg://resolve?domain=${cleanContact}`;
    }
  };

  const handleOpenLink = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      window.open('https://' + url, '_blank');
    }
  };

  const runParser = async () => {
    setIsParserRunning(true);
    try {
      const response = await fetch('http://158.160.67.3:8000/api/parser/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 👈 ВАЖНО: отправляет HttpOnly cookie
      });
      const data = await response.json();
      setSnackbar({ open: true, message: 'Парсер запущен', severity: 'success' });
    } catch (err: any) {
      setSnackbar({ open: true, message: 'Ошибка запуска парсера', severity: 'error' });
    } finally {
      setIsParserRunning(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    loadProfile();
    loadActiveContact();
    loadCommunicationSettings();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await apiService.getProfile();
      setUser(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка загрузки профиля');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Box className={styles.loaderContainer}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container className={styles.innerContainer}>
        <Alert severity="error">Профиль не найден</Alert>
      </Container>
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
        <IconButton onClick={() => navigate('/students')} title="Список студентов" color="primary">
          <img 
            src={require('../icons/home.png')} 
            alt="Студенты" 
            style={{ width: 28, height: 28 }}
          />
        </IconButton>
        <Box sx={{ flex: 1, ml: 2 }}>
          <Typography variant="h5" component="h1" className={styles.headerTitle}>
            Мой профиль
          </Typography>
          <Typography variant="body2" className={styles.headerSubtitle}>
            {user?.full_name || 'Пользователь'} • {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
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
          
          <IconButton onClick={runParser} title="Запустить парсер" disabled={isParserRunning}>
            {isParserRunning ? (
              <CircularProgress size={24} />
            ) : (
              <img src={require('../icons/parse2.png')} alt="Запустить парсер" style={{ width: 28, height: 28 }} />
            )}
          </IconButton>
          <IconButton onClick={handleLogout} title="Выйти" color="error">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" className={styles.errorAlert} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box className={styles.profileContainer}>
        <Box className={styles.avatarSection}>
          <Avatar className={styles.avatar}>
            {user.full_name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h4" component="h1" className={styles.userName}>
            {user.full_name}
          </Typography>
          <Chip
            label={user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            className={user.role === 'admin' ? styles.adminChip : styles.userChip}
          />
        </Box>

        <Card className={styles.infoCard}>
          <CardContent className={styles.cardContent}>
            <Typography variant="h6" className={styles.cardTitle}>
              Информация о пользователе
            </Typography>
            <Divider className={styles.divider} />
            
            <Box className={styles.infoRow}>
              <img 
                src={require('../icons/id.png')} 
                alt="ID" 
                style={{ width: 24, height: 24 }}
              />
              <Box>
                <Typography className={styles.infoLabel}>ID</Typography>
                <Typography className={styles.infoValue}>{user.id}</Typography>
              </Box>
            </Box>
            
            <Box className={styles.infoRow}>
              <img 
                src={require('../icons/email.png')} 
                alt="Email" 
                style={{ width: 28, height: 28 }}
              />
              <Box>
                <Typography className={styles.infoLabel}>Email</Typography>
                <Typography className={styles.infoValue}>{user.email}</Typography>
              </Box>
            </Box>
            
            <Box className={styles.infoRow}>
              <img 
                src={require('../icons/role.png')} 
                alt="Роль" 
                style={{ width: 28, height: 28 }}
              />
              <Box>
                <Typography className={styles.infoLabel}>Роль</Typography>
                <Typography className={styles.infoValue}>
                  {user.role === 'admin' ? 'Администратор' : 'Преподаватель'}
                </Typography>
              </Box>
            </Box>

            <Box className={styles.infoRow}>
              <img 
                src={require('../icons/status.png')} 
                alt="Статус" 
                style={{ width: 28, height: 28 }}
              />
              <Box>
                <Typography className={styles.infoLabel}>Статус</Typography>
                <Typography className={styles.infoValue}>Активен</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Карточка настроек коммуникации - единый стиль */}
        <Card className={styles.settingsCard}>
          <CardContent className={styles.cardContent}>
            <Typography variant="h6" className={styles.cardTitle}>
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Настройки коммуникации
            </Typography>
            <Divider className={styles.divider} />

            {/* Telegram */}
            <Box className={styles.settingRow}>
              <Box className={styles.settingInfo}>
                <TelegramIcon sx={{ color: '#26A5E4', fontSize: 22 }} />
                <Box>
                  <Typography className={styles.settingLabel}>Telegram</Typography>
                  <Typography className={styles.settingHint}>
                    {settings.telegram_open_on === 'pc' 
                      ? 'Открывать в веб-версии (telegram desktop)' 
                      : 'Открывать в мобильном приложении'}
                  </Typography>
                </Box>
              </Box>
              <FormControl size="small" className={styles.settingSelect}>
                <Select
                  value={settings.telegram_open_on}
                  onChange={(e) => setSettings({ ...settings, telegram_open_on: e.target.value })}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="pc">На компьютере</MenuItem>
                  <MenuItem value="mobile">На телефоне</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* VK */}
            <Box className={styles.settingRow}>
              <Box className={styles.settingInfo}>
                <img 
                  src={require('../icons/vk.png')} 
                  alt="VK" 
                  style={{ width: 22, height: 22 }}
                />
                <Box>
                  <Typography className={styles.settingLabel}>VK</Typography>
                  <Typography className={styles.settingHint}>
                    {settings.vk_open_on === 'pc' 
                      ? 'Открывать в браузере (vk.com)' 
                      : 'Открывать в мобильном приложении'}
                  </Typography>
                </Box>
              </Box>
              <FormControl size="small" className={styles.settingSelect}>
                <Select
                  value={settings.vk_open_on}
                  onChange={(e) => setSettings({ ...settings, vk_open_on: e.target.value })}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="pc">На компьютере</MenuItem>
                  <MenuItem value="mobile">На телефоне</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Ссылки/URL */}
            <Box className={styles.settingRow}>
              <Box className={styles.settingInfo}>
                <UrlIcon sx={{ color: '#9C27B0', fontSize: 22 }} />
                <Box>
                  <Typography className={styles.settingLabel}>Ссылки/URL</Typography>
                  <Typography className={styles.settingHint}>
                    {settings.url_open_on === 'pc' 
                      ? 'Открывать в браузере на компьютере' 
                      : 'Открывать в браузере на телефоне'}
                  </Typography>
                </Box>
              </Box>
              <FormControl size="small" className={styles.settingSelect}>
                <Select
                  value={settings.url_open_on}
                  onChange={(e) => setSettings({ ...settings, url_open_on: e.target.value })}
                  sx={{ width: 180 }}
                >
                  <MenuItem value="pc">На компьютере</MenuItem>
                  <MenuItem value="mobile">На телефоне</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Звонки и SMS - readonly */}
            <Box className={styles.settingRowReadonly}>
              <Box className={styles.settingInfo}>
                <PhoneIcon sx={{ color: '#4CAF50', fontSize: 22 }} />
                <Box>
                  <Typography className={styles.settingLabel}>Звонки и SMS</Typography>
                  <Typography className={styles.settingHint}>
                    Всегда инициируются на мобильном устройстве
                  </Typography>
                </Box>
              </Box>
              <Chip label="Только на телефоне" size="small" className={styles.readonlyChip} />
            </Box>

            <Box className={styles.settingsActions}>
              <Button
                variant="contained"
                startIcon={isSettingsLoading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                onClick={saveCommunicationSettings}
                disabled={isSettingsLoading}
                className={styles.saveButton}
              >
                Сохранить настройки
              </Button>
            </Box>

            {settingsSaved && (
              <Alert severity="success" className={styles.successAlert} icon={<SaveIcon />}>
                Настройки успешно сохранены!
              </Alert>
            )}
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ProfilePage;