import api from './axios';

export const analyticsAPI = {
  getOverview:     ()       => api.get('/analytics/overview'),
  getRevenue:      (params) => api.get('/analytics/revenue',      { params }),
  getOrdersTrend:  (params) => api.get('/analytics/orders-trend', { params }),
  getTopProducts:  (params) => api.get('/analytics/top-products', { params }),
  getCategories:   ()       => api.get('/analytics/categories'),
  getInventory:    (params) => api.get('/analytics/inventory',    { params }),
  exportExcel:     (type, params) => api.get(`/analytics/export/${type}`, { params }),
};
