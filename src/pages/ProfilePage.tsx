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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
  Star as StarIcon,
  CloudSync as CloudSyncIcon,
  AccountCircle as AccountCircleIcon,
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
      handleOpenLink(contactValue);
    }
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
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      // Можно добавить уведомление
    } catch (err: any) {
      console.error('Ошибка запуска парсера:', err);
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
      <Paper className={styles.header}>
        <IconButton onClick={() => navigate('/students')} title="Список студентов" color="primary">
            <img 
              src={require('../icons/home.png')} 
              alt="Студенты" 
              style={{ width: 28, height: 28 }}
            />
          </IconButton>
        <Box sx={{ flex: 1 , ml: 2 }}>
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
      </Box>
    </Container>
  );
};

export default ProfilePage;