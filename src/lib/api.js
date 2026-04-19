const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const getAuthToken = () => sessionStorage.getItem('iwogate_token');

const request = async (path, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    credentials: 'same-origin',
    ...options,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message || 'Server request failed');
  }
  return body;
};

export const login = (username, password) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const resetPassword = (email, password, confirmPassword) =>
  request('/password-reset', {
    method: 'POST',
    body: JSON.stringify({ email, password, confirmPassword }),
  });

export const getUser = (id) => request(`/user/${id}`);
export const getUsers = () => request('/users');
export const createUser = (data) =>
  request('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id, data) =>
  request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) => request(`/users/${id}`, { method: 'DELETE' });

export const getRoles = () => request('/roles');
export const createRole = (data) =>
  request('/roles', { method: 'POST', body: JSON.stringify(data) });
export const updateRole = (id, data) =>
  request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteRole = (id) => request(`/roles/${id}`, { method: 'DELETE' });

export const getDepartments = () => request('/departments');
export const getDepartmentStats = () => request('/departments/stats');
export const createDepartment = (data) =>
  request('/departments', { method: 'POST', body: JSON.stringify(data) });
export const updateDepartment = (id, data) =>
  request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDepartment = (id) => request(`/departments/${id}`, { method: 'DELETE' });

export const getTasks = ({ type, status, search, userId, userRole, userDept } = {}) => {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (userId) params.set('userId', userId);
  if (userRole) params.set('userRole', userRole);
  if (userDept) params.set('userDept', userDept);
  return request(`/tasks?${params.toString()}`);
};

export const getTask = (id, { userId, userRole, userDept } = {}) => {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (userRole) params.set('userRole', userRole);
  if (userDept) params.set('userDept', userDept);
  const query = params.toString() ? `?${params.toString()}` : '';
  return request(`/tasks/${id}${query}`);
};
export const createTasks = (payload) =>
  request('/tasks', { method: 'POST', body: JSON.stringify(payload) });
export const deleteTask = (id) => request(`/tasks/${id}`, { method: 'DELETE' });
export const taskAction = (id, payload) =>
  request(`/tasks/${id}/action`, { method: 'POST', body: JSON.stringify(payload) });
