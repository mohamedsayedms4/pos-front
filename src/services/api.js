/**
 * POS API Client — Centralized HTTP layer with JWT auth
 */
export const API_BASE = window.location.port === '8085'
  ? '/api/v1'
  : 'https://posapi.digitalrace.net/api/v1';

const Api = {
  _getToken() {
    return localStorage.getItem('pos_access_token');
  },

  _getRefreshToken() {
    return localStorage.getItem('pos_refresh_token');
  },

  _setTokens(access, refresh) {
    localStorage.setItem('pos_access_token', access);
    localStorage.setItem('pos_refresh_token', refresh);
  },

  _clearTokens() {
    localStorage.removeItem('pos_access_token');
    localStorage.removeItem('pos_refresh_token');
    localStorage.removeItem('pos_user');
  },

  _getUser() {
    try {
      return JSON.parse(localStorage.getItem('pos_user'));
    } catch { return null; }
  },

  _setUser(user) {
    localStorage.setItem('pos_user', JSON.stringify(user));
  },

  /**
   * Check if current user has a specific permission.
   * Admins (ROLE_ADMIN) have all permissions.
   */
  can(permission) {
    const user = this._getUser();
    if (!user) return false;

    const roles = user.roles || [];
    const perms = user.permissions || [];

    // Admin override
    if (roles.includes('ROLE_ADMIN')) return true;

    // Check specific permission
    return perms.includes(permission);
  },

  async _request(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = options.headers || {};

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this._getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    headers['Accept-Language'] = 'ar';

    try {
      let response = await fetch(url, { ...options, headers });

      // If 401 try refresh
      if (response.status === 401 && this._getRefreshToken()) {
        const refreshed = await this._tryRefresh();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this._getToken()}`;
          response = await fetch(url, { ...options, headers });
        } else {
          this._clearTokens();
          window.location.href = '../index.html';
          throw new Error('Session expired');
        }
      }

      if (response.status === 403) {
        throw new Error('ليس لديك صلاحية لهذا الإجراء');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || err.error || `Request failed: ${response.status}`);
      }

      if (response.status === 204) return null;
      return await response.json();
    } catch (err) {
      if (err.message === 'Failed to fetch') {
        throw new Error('لا يمكن الاتصال بالسيرفر');
      }
      throw err;
    }
  },

  async _tryRefresh() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this._getRefreshToken() })
      });
      if (res.ok) {
        const data = await res.json();
        this._setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  // ─── Auth ───
  async login(email, password) {
    const res = await this._request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this._setTokens(res.data.accessToken, res.data.refreshToken);
    this._setUser(res.data.user);
    return res.data;
  },

  async logout() {
    try {
      await this._request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this._getRefreshToken() })
      });
    } catch { }
    this._clearTokens();
  },

  // ─── Products ───
  async getProducts(page = 0, size = 1000) {
    const res = await this._request(`/products?page=${page}&size=${size}`);
    // Support both old array format and new PaginatedResponse/PageImpl format
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getProductsByCategory(categoryId, page = 0, size = 1000) {
    const res = await this._request(`/products/category/${categoryId}?page=${page}&size=${size}`);
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getProductStatistics() {
    const res = await this._request('/products/statistics');
    return res.data;
  },

  async incrementProductView(id) {
    try {
      await this._request(`/products/${id}/view`, { method: 'POST' });
    } catch (e) {
      // Just ignore if it fails, not critical
    }
  },

  async getProduct(id) {
    const res = await this._request(`/products/${id}`);
    return res.data;
  },

  async getProductBarcode(id) {
    const res = await this._request(`/products/${id}/barcode`);
    return res.data;
  },

  async getProductQrCode(id) {
    const res = await this._request(`/products/${id}/qrcode`);
    return res.data;
  },

  async createProduct(productData, images) {
    const formData = new FormData();
    formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
    if (images) {
      for (const img of images) {
        formData.append('images', img);
      }
    }
    const res = await this._request('/products', {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res.data;
  },

  async updateProduct(id, productData, images) {
    const formData = new FormData();
    formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
    if (images) {
      for (const img of images) {
        formData.append('images', img);
      }
    }
    const res = await this._request(`/products/${id}`, {
      method: 'PUT',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res.data;
  },

  async deleteProduct(id) {
    await this._request(`/products/${id}`, { method: 'DELETE' });
  },

  async getProductBarcode(id) {
    const res = await this._request(`/products/${id}/barcode`);
    return res.data;
  },

  async getProductQrCode(id) {
    const res = await this._request(`/products/${id}/qrcode`);
    return res.data;
  },

  // ─── Categories ───
  async getCategories(rootsOnly = false) {
    const res = await this._request(`/categories?rootsOnly=${rootsOnly}`);
    return res.data;
  },

  async getCategory(id) {
    const res = await this._request(`/categories/${id}`);
    return res.data;
  },

  async createCategory(data) {
    const res = await this._request('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateCategory(id, data) {
    const res = await this._request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteCategory(id) {
    await this._request(`/categories/${id}`, { method: 'DELETE' });
  },

  // ─── Suppliers ───
  async getSuppliers() {
    const res = await this._request('/suppliers');
    return res.data;
  },

  async getSupplier(id) {
    const res = await this._request(`/suppliers/${id}`);
    return res.data;
  },

  async createSupplier(data) {
    const res = await this._request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateSupplier(id, data) {
    const res = await this._request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteSupplier(id) {
    await this._request(`/suppliers/${id}`, { method: 'DELETE' });
  },

  async getSupplierLedger(id) {
    const res = await this._request(`/suppliers/${id}/ledger`);
    return res.data;
  },

  async getSupplierStatistics(id) {
    const res = await this._request(`/suppliers/${id}/statistics`);
    return res.data;
  },

  async exportSupplierStatement(id, supplierName) {
    const url = `${API_BASE}/suppliers/${id}/export`;
    const token = this._getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'ar'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('فشل تصدير الملف');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `كشف_حساب_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  },

  async downloadComprehensiveReport(id, supplierName) {
    const url = `${API_BASE}/suppliers/${id}/report`;
    const token = this._getToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept-Language': 'ar'
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error('فشل تصدير التقرير');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `تقرير_شامل_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    a.remove();
  },

  async paySupplier(id, amount, description) {
    await this._request(`/suppliers/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount, description })
    });
  },

  // ─── Purchases ───
  async getPurchases(page = 0, size = 1000) {
    const res = await this._request(`/purchases?page=${page}&size=${size}`);
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getSupplierPurchases(supplierId, page = 0, size = 1000) {
    const res = await this._request(`/purchases/supplier/${supplierId}?page=${page}&size=${size}`);
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async createPurchase(data) {
    const res = await this._request('/purchases', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async payPurchaseInvoice(id, amount) {
    await this._request(`/purchases/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount })
    });
  },

  // ─── Users ───
  async getUsers() {
    const res = await this._request('/admin/users');
    return res.data;
  },

  async getUser(id) {
    const res = await this._request(`/admin/users/${id}`);
    return res.data;
  },

  async createUser(data) {
    const res = await this._request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async setUserEnabled(id, enabled) {
    const res = await this._request(`/admin/users/${id}/enable?enabled=${enabled}`, {
      method: 'PUT'
    });
    return res.data;
  },

  async updateUserAccess(id, data) {
    const res = await this._request(`/admin/users/${id}/access`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteUser(id) {
    await this._request(`/admin/users/${id}`, { method: 'DELETE' });
  },

  async getRoles() {
    const res = await this._request('/admin/users/roles');
    return res.data;
  },

  async getPermissions() {
    const res = await this._request('/admin/users/permissions');
    return res.data;
  },

  // ─── Audit Logs ───
  async getAuditLogs(page = 0, size = 20) {
    const res = await this._request(`/audit?page=${page}&size=${size}`);
    return res.data;
  },

  async getAuditLog(id) {
    const res = await this._request(`/audit/${id}`);
    return res.data;
  },

  // ─── Notifications ───
  async getNotifications() {
    const res = await this._request('/notifications');
    return res.data;
  },

  async markNotificationRead(id) {
    await this._request(`/notifications/${id}/read`, { method: 'POST' });
  },

  // ─── Installments ───
  async generateInstallmentPlan(data) {
    const res = await this._request('/installments/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res;
  },

  async payInstallment(id) {
    const res = await this._request(`/installments/${id}/pay`, { method: 'POST' });
    return res;
  },

  async getInstallmentsForInvoice(invoiceId) {
    const res = await this._request(`/installments/invoice/${invoiceId}`);
    return res;
  },
};

export default Api;
