import api from './axios';

// ─── Auth ────────────────────────────────────────────────────────────────
export const authAPI = {
  register:       (data)         => api.post('/auth/register', data),
  login:          (data)         => api.post('/auth/login', data),
  logout:         (refreshToken) => api.post('/auth/logout', { refreshToken }),
  refresh:        (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe:          ()             => api.get('/auth/me'),
  updateProfile:  (data)         => api.patch('/auth/me', data),
  changePassword: (data)         => api.patch('/auth/change-password', data),
  getAllUsers:        (params)   => api.get('/auth/users', { params }),
  getUserDeepProfile: (id)      => api.get(`/auth/users/${id}/profile`),
  toggleUserActive:   (id)      => api.patch(`/auth/users/${id}/toggle-active`),
};

// ─── Products ────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll:       (params) => api.get('/products', { params }),
  getFeatured:  (limit)  => api.get('/products/featured', { params: { limit } }),
  getCategories: ()      => api.get('/products/categories'),
  getOne:       (id)     => api.get(`/products/${id}`),
  getAdminAll:  (params) => api.get('/products/admin/all', { params }),
  create:       (data)   => api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:       (id, data) => api.put(`/products/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:       (id)     => api.delete(`/products/${id}`),
  toggleActive: (id)     => api.patch(`/products/${id}/toggle-active`),
};

// ─── Cart ────────────────────────────────────────────────────────────────
export const cartAPI = {
  getCart:     ()              => api.get('/cart'),
  addItem:     (productId, quantity, variantId = null) => api.post('/cart/items', { productId, quantity, variantId }),
  updateItem:  (productId, quantity) => api.put(`/cart/items/${productId}`, { quantity }),
  removeItem:  (productId)    => api.delete(`/cart/items/${productId}`),
  clearCart:   ()              => api.delete('/cart'),
};

// ─── Orders ──────────────────────────────────────────────────────────────
export const ordersAPI = {
  checkout:      (data)   => api.post('/orders/checkout', data),
  getMyOrders:   (params) => api.get('/orders/my-orders', { params }),
  getMyOrder:    (id)     => api.get(`/orders/my-orders/${id}`),
  cancelOrder:   (id)     => api.patch(`/orders/my-orders/${id}/cancel`),
  // Admin
  getAll:        (params) => api.get('/orders/admin', { params }),
  getStats:      ()       => api.get('/orders/admin/stats'),
  getById:       (id)     => api.get(`/orders/admin/${id}`),
  updateStatus:  (id, data) => api.patch(`/orders/admin/${id}/status`, data),
};

// ─── Appointments ────────────────────────────────────────────────────────
export const appointmentsAPI = {
  getSlots:     (params) => api.get('/appointments/slots', { params }),
  getDoctors:   ()       => api.get('/appointments/doctors'),
  book:         (data)   => api.post('/appointments', data),
  getMyList:    (params) => api.get('/appointments/my', { params }),
  getMy:        (id)     => api.get(`/appointments/my/${id}`),
  cancelMy:     (id, data) => api.patch(`/appointments/my/${id}/cancel`, data),
  // Admin
  getAll:       (params) => api.get('/appointments/admin', { params }),
  getStats:     ()       => api.get('/appointments/admin/stats'),
  getOne:       (id)     => api.get(`/appointments/admin/${id}`),
  updateStatus: (id, data) => api.patch(`/appointments/admin/${id}/status`, data),
  delete:       (id)     => api.delete(`/appointments/admin/${id}`),
};

// ─── Blog ────────────────────────────────────────────────────────────────
export const blogAPI = {
  getAll:        (params) => api.get('/blog', { params }),
  getCategories: ()       => api.get('/blog/categories'),
  getBySlug:     (slug)   => api.get(`/blog/${slug}`),
  // Admin
  getAdminAll:   (params) => api.get('/blog/admin/all', { params }),
  getStats:      ()       => api.get('/blog/admin/stats'),
  getById:       (id)     => api.get(`/blog/admin/${id}`),
  create:        (data)   => api.post('/blog', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:        (id, data) => api.put(`/blog/${id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:        (id)     => api.delete(`/blog/${id}`),
  publish:       (id)     => api.patch(`/blog/${id}/publish`),
  unpublish:     (id)     => api.patch(`/blog/${id}/unpublish`),
};

// ─── Chat ────────────────────────────────────────────────────────────────
export const chatAPI = {
  getMyRoom:        ()       => api.get('/chat/my-room'),
  getMyMessages:    (params) => api.get('/chat/my-room/messages', { params }),
  // Admin
  getAllRooms:       (params) => api.get('/chat/admin/rooms', { params }),
  getRoomMessages:  (roomId, params) => api.get(`/chat/admin/rooms/${roomId}/messages`, { params }),
  closeRoom:        (roomId) => api.patch(`/chat/admin/rooms/${roomId}/close`),
  reopenRoom:       (roomId) => api.patch(`/chat/admin/rooms/${roomId}/reopen`),
};

// ─── Barcode ──────────────────────────────────────────────────────────────
export const barcodeAPI = {
  lookup:      (barcode)       => api.get(`/barcode/${encodeURIComponent(barcode)}`),
  assign:      (data)          => api.post('/barcode/assign', data),
  quickCreate: (data)          => api.post('/barcode/quick-create', data),
};

// ─── Prescriptions ────────────────────────────────────────────────────────
export const prescriptionAPI = {
  upload:     (fd)     => api.post('/prescriptions/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMy:      (params) => api.get('/prescriptions/my', { params }),
  getMyOne:   (id)     => api.get(`/prescriptions/my/${id}`),
  adminGetAll:(params) => api.get('/prescriptions/admin', { params }),
  adminStats: ()       => api.get('/prescriptions/admin/stats'),
  adminGet:   (id)     => api.get(`/prescriptions/admin/${id}`),
  adminRespond:(id,body)=>api.patch(`/prescriptions/admin/${id}/respond`, body),
};

// ─── Drug Interactions ────────────────────────────────────────────────────
export const interactionAPI = {
  check:      (drugs)  => api.post('/interactions/check', { drugs }),
  getAll:     (params) => api.get('/interactions', { params }),
  getByDrug:  (name)   => api.get(`/interactions/drug/${name}`),
  create:     (body)   => api.post('/interactions', body),
  update:     (id,body)=> api.put(`/interactions/${id}`, body),
  delete:     (id)     => api.delete(`/interactions/${id}`),
  seedCommon: ()       => api.post('/interactions/seed-common'),
};

// ─── Notifications ────────────────────────────────────────────────────────
export const notificationAPI = {
  getAll:       (params) => api.get('/notifications', { params }),
  markRead:     (id)     => api.patch(`/notifications/${id}/read`),
  markAllRead:  ()       => api.patch('/notifications/read-all'),
  deleteOne:    (id)     => api.delete(`/notifications/${id}`),
  clearAll:     ()       => api.delete('/notifications'),
  unreadCount:  ()       => api.get('/notifications/unread-count'),
};

// ─── Returns ──────────────────────────────────────────────────────────────
export const returnsAPI = {
  // Patient
  create:         (data)   => api.post('/returns', data),
  getMy:          (params) => api.get('/returns/my', { params }),
  getMyOne:       (id)     => api.get(`/returns/my/${id}`),

  // Admin
  adminGetAll:    (params) => api.get('/returns/admin', { params }),
  adminStats:     ()       => api.get('/returns/admin/stats'),
  adminGet:       (id)     => api.get(`/returns/admin/${id}`),
  // Decide a single item: PATCH /returns/admin/:id/items/:itemId
  adminDecideItem:(id, itemId, body) =>
    api.patch(`/returns/admin/${id}/items/${itemId}`, body),
  // Bulk-decide all pending items
  adminBulkDecide:(id, body) =>
    api.patch(`/returns/admin/${id}/bulk-decide`, body),
  // Move overall status (received/refunded/closed)
  adminSetStatus: (id, body) =>
    api.patch(`/returns/admin/${id}/status`, body),
};
