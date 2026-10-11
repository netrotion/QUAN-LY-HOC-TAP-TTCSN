import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import App from './App.jsx';
import { api } from './services/apiClient.js';
import { connectApi } from './services/academicStore.js';

// Đồng bộ phiên sinh viên & dữ liệu mock của API (status, curriculum, audit) theo academicStore,
// để Sidebar (TV2) và các màn TV3 (đọc qua `api`) luôn hiển thị cùng một sinh viên.
connectApi(api);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
