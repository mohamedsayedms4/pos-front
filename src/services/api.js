/**
 * POS API Client — Centralized HTTP layer with JWT auth
 */
const PROD_BASE = 'http://localhost:8080/api/v1';
const DEV_BASE = 'http://localhost:8080/api/v1';

// Use production URL when not running on Vite dev server (port 5173)
export const API_BASE = window.location.hostname === 'localhost' && window.location.port === '5173'
  ? DEV_BASE
  : PROD_BASE;


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
  // Stock Receipts
  async getStockReceipts(page = 0, size = 10, query = '') {
    const res = await this._request(`/stock-receipts?page=${page}&size=${size}&query=${query}`);
    return res.data;
  },

  async saveStockReceiptQuantities(id, itemQuantities = null) {
    return await this._request(`/stock-receipts/${id}/save`, {
      method: 'POST',
      body: itemQuantities ? JSON.stringify(itemQuantities) : null
    });
  },

  async commitStockReceiptToInventory(id) {
    return await this._request(`/stock-receipts/${id}/commit`, {
      method: 'POST'
    });
  },

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
          console.warn('Session expired - redirecting to login');
          window.location.href = '/login';
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
    const refreshToken = this._getRefreshToken();
    this._clearTokens(); // Clear local state immediately

    if (refreshToken) {
      try {
        // Use direct fetch for logout instead of this._request to avoid 401 refresh loop
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });
      } catch (err) {
        console.error('Logout API call failed', err);
      }
    }

    window.location.href = '/login';
  },

  // ─── Products ───
  async getProducts(page = 0, size = 1000) {
    const res = await this._request(`/products?page=${page}&size=${size}`);
    // Support both old array format and new PaginatedResponse/PageImpl format
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getProductsPaged(page = 0, size = 20, search = '', sort = 'id,desc') {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await this._request(`/products?page=${page}&size=${size}${query}${sortQuery}`);
    const raw = res.data;
    if (Array.isArray(raw)) {
      return { items: raw, totalPages: 1, totalElements: raw.length, page: 0 };
    }
    return {
      items: raw.items || raw.content || [],
      totalPages: raw.totalPages ?? 1,
      totalElements: raw.totalElements ?? 0,
      page: raw.number ?? page,
    };
  },

  async getProductsByCategory(categoryId, page = 0, size = 1000) {
    const res = await this._request(`/products/category/${categoryId}?page=${page}&size=${size}`);
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getProductStatistics() {
    const res = await this._request('/products/statistics');
    return res.data;
  },

  async exportProductsExcel(search = '', sort = 'id,desc') {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await fetch(`${API_BASE}/products/export/excel?${query}${sortQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportProductsPdf(search = '', sort = 'id,desc') {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await fetch(`${API_BASE}/products/export/pdf?${query}${sortQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_export_${new Date().getTime()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportCategoriesExcel() {
    const res = await fetch(`${API_BASE}/categories/export/excel`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportCategoriesPdf() {
    const res = await fetch(`${API_BASE}/categories/export/pdf`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories_export_${new Date().getTime()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportComprehensiveCategoriesExcel() {
    const res = await fetch(`${API_BASE}/categories/export/comprehensive/excel`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير التقرير الشامل إلى Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive_report_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportComprehensiveCategoriesPdf() {
    const res = await fetch(`${API_BASE}/categories/export/comprehensive/pdf`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير التقرير الشامل إلى PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive_report_${new Date().getTime()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
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
  async getSuppliers(page = 0, size = 10, query = '', sort = 'name,asc') {
    const res = await this._request(`/suppliers?page=${page}&size=${size}&query=${encodeURIComponent(query)}&sort=${sort}`);
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

  async exportSuppliersExcel(search = '', sort = 'name,asc') {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await fetch(`${API_BASE}/suppliers/export/excel?${query}${sortQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportSuppliersPdf(search = '', sort = 'name,asc') {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await fetch(`${API_BASE}/suppliers/export/pdf?${query}${sortQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل في تصدير البيانات إلى PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suppliers_export_${new Date().getTime()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
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
  async getPurchases(page = 0, size = 10, query = '') {
    const res = await this._request(`/purchases?page=${page}&size=${size}&query=${query}`);
    return res.data;
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
  async getUsers(page = 0, size = 10, query = '') {
    const res = await this._request(`/admin/users?page=${page}&size=${size}&query=${query}`);
    return res.data;
  },

  async getUser(id) {
    const res = await this._request(`/admin/users/${id}`);
    return res.data;
  },

  async createUser(data, avatarFile) {
    const formData = new FormData();
    formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const res = await this._request('/admin/users', {
      method: 'POST',
      body: formData,
      headers: {} // Browser sets boundary
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

  async updateUser(id, data, avatarFile) {
    const formData = new FormData();
    formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const res = await this._request(`/admin/users/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {}
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

  // ─── Role Management ───
  async getRolesFull() {
    const res = await this._request('/admin/roles');
    return res.data;
  },

  async createRole(data) {
    const res = await this._request('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateRole(id, data) {
    const res = await this._request(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteRole(id) {
    await this._request(`/admin/roles/${id}`, { method: 'DELETE' });
  },

  // ─── Product Units ───
  async getProductUnits(productId) {
    const res = await this._request(`/products/${productId}/units`);
    return res.data;
  },

  async addProductUnit(productId, data) {
    const res = await this._request(`/products/${productId}/units`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateProductUnit(productId, unitId, data) {
    const res = await this._request(`/products/${productId}/units/${unitId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteProductUnit(productId, unitId) {
    await this._request(`/products/${productId}/units/${unitId}`, { method: 'DELETE' });
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

  // ─── Customers ───
  async getCustomers(page = 0, size = 10, query = '') {
    const res = await this._request(`/customers?page=${page}&size=${size}&query=${query}`);
    return res.data;
  },

  async createCustomer(data) {
    const res = await this._request('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateCustomer(id, data) {
    const res = await this._request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteCustomer(id) {
    await this._request(`/customers/${id}`, { method: 'DELETE' });
  },

  // ─── Sales ───
  async getSales(page = 0, size = 10, query = '') {
    const res = await this._request(`/sales?page=${page}&size=${size}&query=${query}`);
    return res.data;
  },

  async createSale(data) {
    const res = await this._request('/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async createSaleReturn(data) {
    const res = await this._request('/sales/returns', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getReturns(page = 0, size = 10, query = '') {
    const res = await this._request(`/sales/returns?page=${page}&size=${size}&query=${query}`);
    return res.data;
  },

  // ─── Treasury ───
  async getMainTreasury() {
    const res = await this._request('/treasury/main');
    return res.data;
  },

  async getTreasuryTransactions(page = 0, size = 20, query = '') {
    const res = await this._request(`/treasury/transactions?page=${page}&size=${size}&query=${query}`);
    return res.data;
  }
};

export default Api;
