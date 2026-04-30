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
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { User } from '../types';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Container>
        <Alert severity="error">Профиль не найден</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <IconButton onClick={() => navigate('/students')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Мой профиль
          </Typography>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: 'primary.main',
              fontSize: 40,
              margin: '0 auto',
            }}
          >
            {user.full_name.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="h4" component="h1" sx={{ mt: 2 }}>
            {user.full_name}
          </Typography>
          <Chip
            label={user.role === 'admin' ? 'Администратор' : 'Пользователь'}
            color={user.role === 'admin' ? 'error' : 'primary'}
            sx={{ mt: 1 }}
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Информация о пользователе
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <BadgeIcon color="action" />
              <Box>
                <Typography variant="body2" color="text.secondary">ID</Typography>
                <Typography variant="body1">{user.id}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <EmailIcon color="action" />
              <Box>
                <Typography variant="body2" color="text.secondary">Email</Typography>
                <Typography variant="body1">{user.email}</Typography>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <WorkIcon color="action" />
              <Box>
                <Typography variant="body2" color="text.secondary">Роль</Typography>
                <Typography variant="body1">{user.role}</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<PeopleIcon />}
            onClick={() => navigate('/students')}
            sx={{ py: 1.5 }}
          >
            К списку студентов
          </Button>
          <Button
            variant="contained"
            color="error"
            fullWidth
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{ py: 1.5 }}
          >
            Выйти
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default ProfilePage;