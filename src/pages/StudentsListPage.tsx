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
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  AccountCircle as AccountCircleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import { Student } from '../types';

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

  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, students]);

  const loadStudents = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getStudents({
        limit: 500,
      });
      console.log('Загружены студенты:', response);
      const studentsList = response.students || [];
      setStudents(studentsList);
      setFilteredStudents(studentsList);
      setTotal(response.total || 0);
    } catch (err: any) {
      console.error('Error loading students:', err);
      setError(err.response?.data?.detail || 'Ошибка загрузки студентов');
      setStudents([]);
      setFilteredStudents([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  const filterStudents = () => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.full_name.toLowerCase().includes(query) ||
        (student.phone && student.phone.includes(query)) ||
        (student.russian_student_id && student.russian_student_id.toString().includes(query))
    );
    setFilteredStudents(filtered);
    setPage(0);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRowClick = (studentId: number) => {
    navigate(`/students/${studentId}`);
  };

  const handleCall = (phone: string | null | undefined, event: React.MouseEvent) => {
    event.stopPropagation();
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const handleViewProfile = (studentId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/students/${studentId}`);
  };

  const getStatusColor = (status: string | null | undefined): "success" | "error" | "info" | "default" => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'enrolled': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status: string | null | undefined): string => {
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
      case 'active': return 'Активный';
      case 'inactive': return 'Неактивный';
      case 'enrolled': return 'Зачислен';
      default: return status || '—';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" component="h1" fontWeight="bold">
            Список студентов
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user?.full_name || 'Пользователь'} • {user?.role === 'admin' ? 'Администратор' : 'Пользователь'} • Всего: {total}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => navigate('/profile')} title="Профиль" color="primary">
            <AccountCircleIcon />
          </IconButton>
          <IconButton onClick={loadStudents} title="Обновить">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={handleLogout} title="Выйти" color="error">
            <LogoutIcon />
          </IconButton>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Поиск по имени, телефону или ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button variant="contained" startIcon={<AddIcon />}>
          Добавить
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>ID</TableCell>
              <TableCell>ФИО</TableCell>
              <TableCell>Телефон</TableCell>
              <TableCell>Направление</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Баллы</TableCell>
              <TableCell align="center">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((student) => (
              <TableRow 
                key={student.id} 
                hover 
                onClick={() => handleRowClick(student.id)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{student.russian_student_id || student.id}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {student.full_name}
                  </Typography>
                </TableCell>
                <TableCell>{student.phone || '—'}</TableCell>
                <TableCell>{student.department_name || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(student.status)}
                    color={getStatusColor(student.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {student.total_score ? (
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={student.total_score >= 200 ? 'success.main' : student.total_score >= 150 ? 'warning.main' : 'error.main'}
                    >
                      {student.total_score}
                    </Typography>
                  ) : '—'}
                </TableCell>
                <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                  {student.phone && (
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleCall(student.phone, e)} 
                      title="Позвонить" 
                      color="primary"
                    >
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  )}
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleViewProfile(student.id, e)} 
                    title="Подробнее"
                  >
                    <PersonIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredStudents.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
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
    </Container>
  );
};

export default StudentsListPage;