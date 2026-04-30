/**
 * POS API Client — Centralized HTTP layer with JWT auth
 */
// Base server URL (without /api/v1 prefix)
export const SERVER_URL = 'https://posapi.digitalrace.net';

// Use production URL when not running on Vite dev server (port 5173)
export const API_BASE = `${SERVER_URL}/api/v1`;


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
   * Admins (ROLE_ADMIN) and Branch Managers (ROLE_BRANCH_MANAGER) get their respective permissions.
   */
  can(permission) {
    const user = this._getUser();
    if (!user) return false;

    const roles = user.roles || [];
    const perms = user.permissions || [];

    // Admin override — full access
    if (roles.includes('ROLE_ADMIN')) return true;

    // Check specific permission (works for ROLE_BRANCH_MANAGER with its perms)
    return perms.includes(permission);
  },

  /**
   * Returns true if current user is a System Admin.
   */
  isAdmin() {
    const user = this._getUser();
    if (!user) return false;
    return (user.roles || []).includes('ROLE_ADMIN');
  },

  /**
   * Returns true if current user is a Branch Manager.
   */
  isBranchManager() {
    const user = this._getUser();
    if (!user) return false;
    return (user.roles || []).includes('ROLE_BRANCH_MANAGER');
  },

  /**
   * Returns true if current user is Admin OR Branch Manager.
   * Use this to show branch-selector dropdowns.
   */
  isAdminOrBranchManager() {
    return this.isAdmin() || this.isBranchManager();
  },

  // ─── Leaves Management ───────────────────────────────────────────────────────
  async getLeaveTypes() {
    const res = await this._request('/leaves/types');
    return res.data;
  },

  async createLeaveType(data) {
    const res = await this._request('/leaves/types', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateLeaveType(id, data) {
    const res = await this._request(`/leaves/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteLeaveType(id) {
    await this._request(`/leaves/types/${id}`, { method: 'DELETE' });
  },

  async getAllLeaveRequests() {
    const res = await this._request('/leaves/requests');
    return res.data;
  },

  async getMyLeaveRequests(userId) {
    const res = await this._request(`/leaves/my-requests/${userId}`);
    return res.data;
  },

  async submitLeaveRequest(data) {
    const res = await this._request('/leaves/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async approveLeaveRequest(id) {
    const res = await this._request(`/leaves/requests/${id}/approve`, { method: 'POST' });
    return res.data;
  },

  async rejectLeaveRequest(id) {
    const res = await this._request(`/leaves/requests/${id}/reject`, { method: 'POST' });
    return res.data;
  },

  async getMyLeaveBalances(userId, year = new Date().getFullYear()) {
    const res = await this._request(`/leaves/balances/${userId}/${year}`);
    return res.data;
  },
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Stock Receipts ──────────────────────────────────────────────────────────
  async getStockReceipts(page = 0, size = 10, query = '', branchId = null) {
    const params = new URLSearchParams({ page, size, query });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/stock-receipts?${params.toString()}`);
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
  // ─────────────────────────────────────────────────────────────────────────────

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

  async getProfitLossReport(startDate, endDate, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/expenses/profit-loss?startDate=${startDate}&endDate=${endDate}${branchQuery}`);
    return res.data;
  },

  async getCalendarInstallments(start, end) {
    const res = await this._request(`/debts/installments/calendar?start=${start}&end=${end}`);
    return res.data;
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

  async getProductsPaged(page = 0, size = 20, search = '', sort = 'id,desc', branchId = null) {
    const searchQuery = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/products?page=${page}&size=${size}${searchQuery}${sortQuery}${branchQuery}`);
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



  async exportProductsExcel(search = '', sort = 'id,desc', branchId = null) {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/products/export/excel?${query}${sortQuery}${branchQuery}`, {
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

  async exportProductsPdf(search = '', sort = 'id,desc', branchId = null) {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/products/export/pdf?${query}${sortQuery}${branchQuery}`, {
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

  async getProductStatistics(branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/products/statistics${branchQuery}`);
    return res.data;
  },

  async getDailyProductStats(days = 30) {
    const res = await this._request(`/products/daily-stats?days=${days}`);
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

  async getProductBarcodeLabel(id) {
    const res = await fetch(`${API_BASE}/products/${id}/barcode/label`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error("فشل تحميل صورة الباركود من السيرفر");
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async getProductQrCode(id) {
    const res = await this._request(`/products/${id}/qrcode`);
    return res.data;
  },

  async createProduct(productData, images, branchId = null) {
    const formData = new FormData();
    formData.append('product', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
    if (images) {
      for (const img of images) {
        formData.append('images', img);
      }
    }
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/products${branchQuery}`, {
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

  // ─── Printer Config ───
  async getPrinterConfig() {
    const res = await this._request('/printer-config');
    return res.data;
  },

  async updatePrinterConfig(data) {
    const res = await this._request('/printer-config', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async testPrintConfig(config) {
    const res = await fetch(`${API_BASE}/printer-config/test-print`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this._getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error("فشل اختبار الطباعة");
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async getAvailablePrinters() {
    const res = await this._request('/products/printers');
    return res.data;
  },

  async directPrintBarcode(productId, copies, printerName) {
    const res = await this._request(`/products/${productId}/barcode/direct-print?copies=${copies}&printerName=${encodeURIComponent(printerName)}`, {
      method: 'POST'
    });
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
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
    return res.data;
  },

  async updateCategory(id, data) {
    const res = await this._request(`/categories/${id}`, {
      method: 'PUT',
      body: data instanceof FormData ? data : JSON.stringify(data)
    });
    return res.data;
  },

  async deleteCategory(id) {
    await this._request(`/categories/${id}`, { method: 'DELETE' });
  },

  // ─── Suppliers ───
  async getSuppliers(page = 0, size = 10, search = '', type = '', branchId = null) {
    const searchQuery = search ? `&search=${encodeURIComponent(search)}` : '';
    const typeQuery = type ? `&type=${type}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/suppliers?page=${page}&size=${size}${searchQuery}${typeQuery}${branchQuery}`);
    return res.data;
  },

  async getSupplier(id) {
    const res = await this._request(`/suppliers/${id}`);
    return res.data;
  },

  async createSupplier(data, branchId = null) {
    const url = branchId ? `/suppliers?branchId=${branchId}` : '/suppliers';
    const res = await this._request(url, {
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

  async exportSuppliersExcel(search = '', sort = 'name,asc', branchId = null) {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/suppliers/export/excel?${query}${sortQuery}${branchQuery}`, {
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

  async exportSuppliersPdf(search = '', sort = 'name,asc', branchId = null) {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/suppliers/export/pdf?${query}${sortQuery}${branchQuery}`, {
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

  async getSupplierLedger(id, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/${id}/ledger${branchQuery}`);
    return res.data;
  },

  async getSupplierStatistics(id, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/${id}/statistics${branchQuery}`);
    return res.data;
  },

  async getDailySupplierStats(days = 30, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/daily-stats?days=${days}${branchQuery}`);
    return res.data;
  },

  async getSupplierDailyStats(id, days = 30) {
    const res = await this._request(`/suppliers/${id}/daily-stats?days=${days}`);
    return res.data;
  },

  async exportSupplierStatement(id, supplierName, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const url = `${API_BASE}/suppliers/${id}/export${branchQuery}`;
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

  async downloadComprehensiveReport(id, supplierName, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const url = `${API_BASE}/suppliers/${id}/report${branchQuery}`;
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

  async paySupplier(id, amount, description, branchId = null) {
    await this._request(`/suppliers/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({ amount, description, branchId })
    });
  },

  // ─── Purchases ───
  async getPurchases(page = 0, size = 10, query = '', branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/purchases?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchQuery}`);
    return res.data;
  },

  async getSupplierPurchases(supplierId, page = 0, size = 1000) {
    const res = await this._request(`/purchases/supplier/${supplierId}?page=${page}&size=${size}`);
    return Array.isArray(res.data) ? res.data : (res.data.items || res.data.content || res.data);
  },

  async getPurchaseAnalytics(branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/purchases/analytics${branchQuery}`);
    return res.data;
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

  async getSalesSummary(date = '') {
    const res = await this._request(`/sales/analytics/summary${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  async getCashierAnalytics(date = '') {
    const res = await this._request(`/sales/analytics/cashiers${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  async getProductAnalytics(date = '') {
    const res = await this._request(`/sales/analytics/products${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  async getHourlyAnalytics(date = '') {
    const res = await this._request(`/sales/analytics/hourly${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  async getReturnAnalytics(date = '') {
    const res = await this._request(`/sales/analytics/returns${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  async getStockReceiptAnalytics(date = '') {
    const res = await this._request(`/stock/analytics/stats${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  // ─── Users ───
  async getUsers(page = 0, size = 10, query = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/admin/users?page=${page}&size=${size}&query=${query}${branchQuery}`);
    return res.data;
  },

  async getUser(id) {
    const res = await this._request(`/admin/users/${id}`);
    return res.data;
  },

  async createUser(data, avatarFile, nationalIdFile) {
    const formData = new FormData();
    formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (avatarFile) formData.append('avatar', avatarFile);
    if (nationalIdFile) formData.append('nationalId', nationalIdFile);

    const res = await this._request('/admin/users', {
      method: 'POST',
      body: formData,
      headers: {}
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

  async updateUser(id, data, avatarFile, nationalIdFile) {
    const formData = new FormData();
    formData.append('user', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    if (avatarFile) formData.append('avatar', avatarFile);
    if (nationalIdFile) formData.append('nationalId', nationalIdFile);

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

  async updateUserProfile(id, profileData) {
    // This is a convenience method that updates just the profile part of the user
    // It uses the main update endpoint
    const formData = new FormData();
    formData.append('user', new Blob([JSON.stringify({ profile: profileData })], { type: 'application/json' }));

    const res = await this._request(`/admin/users/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {}
    });
    return res.data;
  },

  async getRoles() {
    const res = await this._request('/admin/users/roles');
    return res.data;
  },

  async getPermissions() {
    const res = await this._request('/admin/users/permissions');
    return res.data;
  },

  // ─── Job Titles ───
  async getJobTitles() {
    const res = await this._request('/job-titles');
    return res.data;
  },

  async createJobTitle(data) {
    const res = await this._request('/job-titles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateJobTitle(id, data) {
    const res = await this._request(`/job-titles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteJobTitle(id) {
    await this._request(`/job-titles/${id}`, { method: 'DELETE' });
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

  // ─── Debt Management ───
  async getDebts(page = 0, size = 10, type = '', status = '', entityType = '', query = '', branchId = null) {
    const params = new URLSearchParams({ page, size, type, status, entityType, query });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/debts?${params.toString()}`);
    return res.data;
  },

  async getDebt(id) {
    const res = await this._request(`/debts/${id}`);
    return res.data;
  },

  async createManualDebt(data) {
    const res = await this._request('/debts/manual', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async payDebtInstallment(id, amount) {
    await this._request(`/debts/installments/${id}/pay?amount=${amount}`, {
      method: 'POST'
    });
  },

  async getDebtStats(branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/debts/stats${branchQuery}`);
    return res.data;
  },

  async getDailyDebtStats(days = 7, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/debts/stats/daily?days=${days}${branchQuery}`);
    return res.data;
  },

  async triggerDebtReminders() {
    const res = await this._request('/debts/reminders/trigger', { method: 'POST' });
    return res;
  },

  async scheduleDebtReminders(hour, minute = 0) {
    const res = await this._request(`/debts/reminders/schedule?hour=${hour}&minute=${minute}`, { method: 'POST' });
    return res;
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
  async getCustomers(page = 0, size = 10, query = '', branchId = null) {
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/customers?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchParam}`);
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

  async getCustomerDebt(id, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/customers/${id}/debt${branchQuery}`);
    return res.data;
  },

  async getCustomerInvoices(id, page = 0, size = 10) {
    const res = await this._request(`/customers/${id}/invoices?page=${page}&size=${size}`);
    return res.data;
  },

  async getCustomerOnlineOrders(id, page = 0, size = 10) {
    const res = await this._request(`/customers/${id}/online-orders?page=${page}&size=${size}`);
    return res.data;
  },

  async collectCustomerPayment(id, data) {
    const res = await this._request(`/customers/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // ─── Sales ───
  async getSales(page = 0, size = 10, query = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/sales?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchQuery}`);
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

  async getReturns(page = 0, size = 10, query = '', branchId = null) {
    const params = new URLSearchParams({ page, size, query });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/sales/returns?${params.toString()}`);
    return res.data;
  },

  async getDailySaleStats(days = 7, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/sales/daily-stats?days=${days}${branchQuery}`);
    return res.data;
  },

  // ─── Treasury ───
  async getMainTreasury(branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/treasury/main?_=1${branchQuery}`);
    return res.data;
  },

  async getTreasuryTransactions(page = 0, size = 20, query = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/treasury/transactions?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchQuery}`);
    return res.data;
  },

  // ─── Damaged Goods ───
  async getDamagedProducts(page = 0, size = 10, search = '') {
    const res = await this._request(`/damaged?page=${page}&size=${size}&search=${encodeURIComponent(search)}`);
    return res.data;
  },

  async recordDamagedProduct(data) {
    const res = await this._request('/damaged', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // ─── Expenses ───
  async getExpenses(page = 0, size = 10, category = '', start = '', end = '', branchId = '') {
    const params = new URLSearchParams({ page, size, category, start, end });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/expenses?${params.toString()}`);
    return res.data;
  },

  async createExpense(data, branchId = '') {
    if (branchId) data.branchId = branchId;
    const res = await this._request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteExpense(id) {
    await this._request(`/expenses/${id}`, { method: 'DELETE' });
  },

  // ─── Profit & Loss ───
  async getProfitLossReport(start = '', end = '', branchId = '') {
    const params = new URLSearchParams({ start, end });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/profit-loss?${params.toString()}`);
    return res.data;
  },

  // ─── Partners ───
  async getPartners() {
    const res = await this._request('/partners');
    return res.data;
  },

  async createPartner(data) {
    const res = await this._request('/partners', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async addPartnerCapital(id, data) {
    const res = await this._request(`/partners/${id}/capital`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async partnerWithdraw(id, data) {
    const res = await this._request(`/partners/${id}/withdraw`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // ─── Barcode Scanner (Server-Side) ───
  async scanBarcodeFromImage(imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob, 'scan.jpg');
    const res = await this._request('/barcode/scan', {
      method: 'POST',
      body: formData,
      headers: {}
    });
    return res;
  },

  // ─── Shifts ───
  async getShifts() {
    const res = await this._request('/shifts');
    return res.data;
  },

  async createShift(data) {
    const res = await this._request('/shifts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateShift(id, data) {
    const res = await this._request(`/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteShift(id) {
    await this._request(`/shifts/${id}`, { method: 'DELETE' });
  },

  // ─── Employee Bonuses ───
  async getEmployeeBonuses(userId) {
    const res = await this._request(`/employees/${userId}/bonuses`);
    return res.data;
  },

  async addEmployeeBonus(userId, data) {
    const res = await this._request(`/employees/${userId}/bonuses`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async payEmployeeBonus(id) {
    const res = await this._request(`/employees/bonuses/${id}/pay`, { method: 'PUT' });
    return res.data;
  },

  async deleteEmployeeBonus(id) {
    await this._request(`/employees/bonuses/${id}`, { method: 'DELETE' });
  },

  // ─── Employee Deductions ───
  async getEmployeeDeductions(userId) {
    const res = await this._request(`/employees/${userId}/deductions`);
    return res.data;
  },

  async addEmployeeDeduction(userId, data) {
    const res = await this._request(`/employees/${userId}/deductions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteEmployeeDeduction(id) {
    await this._request(`/employees/deductions/${id}`, { method: 'DELETE' });
  },

  // ─── Attendance ───
  async checkInEmployee(userId) {
    const res = await this._request(`/attendance/${userId}/check-in`, { method: 'POST' });
    return res.data;
  },

  async checkOutEmployee(userId) {
    const res = await this._request(`/attendance/${userId}/check-out`, { method: 'PUT' });
    return res.data;
  },

  async getEmployeeAttendance(userId, month, year) {
    const res = await this._request(`/attendance/${userId}?month=${month}&year=${year}`);
    return res.data;
  },

  async markEmployeeAbsent(userId, date) {
    const res = await this._request(`/attendance/${userId}/mark-absent?date=${date}`, { method: 'POST' });
    return res.data;
  },

  // ─── Payroll ───
  async generateEmployeePayroll(userId, month, year) {
    const res = await this._request(`/payroll/generate/${userId}?month=${month}&year=${year}`, { method: 'POST' });
    return res.data;
  },

  async getMonthlyPayrolls(month, year, branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/payroll?month=${month}&year=${year}${branchQuery}`);
    return res.data;
  },

  async payEmployeePayroll(id) {
    const res = await this._request(`/payroll/${id}/pay`, { method: 'PUT' });
    return res.data;
  },

  // ─── Branches & Warehouses ───
  async getBranches() {
    const res = await this._request('/branches');
    return res.data;
  },

  async getWarehousesByBranch(branchId) {
    const res = await this._request(`/warehouses?branchId=${branchId}`);
    return res.data;
  },

  async getWarehouseProducts(warehouseId, page = 0, size = 10, search = '', sort = 'id,desc') {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('size', size);
    if (sort) params.append('sort', sort);
    if (search) params.append('search', search);

    const res = await this._request(`/warehouses/${warehouseId}/products?${params.toString()}`);
    return res.data;
  },

  async getBranchStats(id) {
    const res = await this._request(`/branches/${id}/stats`);
    return res.data;
  },

  async getInteractions(page = 0, size = 20, sort = 'timestamp,desc') {
    const res = await this._request(`/interactions?page=${page}&size=${size}&sort=${sort}`);
    return res.data;
  },

  async getInventoryReport(search = '', branchId = null, page = 0, size = 20) {
    let url = `/inventory/report?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (branchId) url += `&branchId=${branchId}`;
    const res = await this._request(url);
    return res.data;
  },

  async updateWarehouseStock(warehouseId, productId, quantity) {
    return this._request(`/warehouses/${warehouseId}/stock?productId=${productId}&quantity=${quantity}`, {
      method: 'POST'
    });
  },

  async getProductStockDistribution(productId) {
    const res = await this._request(`/warehouses/products/${productId}/distribution`);
    return res.data;
  },

  async addOrUpdateWarehouseStock(warehouseId, { productId, quantity, minQuantity, maxQuantity }) {
    const params = new URLSearchParams();
    params.append('productId', productId);
    params.append('quantity', quantity);
    if (minQuantity) params.append('minQuantity', minQuantity);
    if (maxQuantity) params.append('maxQuantity', maxQuantity);

    const res = await this._request(`/warehouses/${warehouseId}/stock?${params.toString()}`, {
      method: 'POST'
    });
    return res.data;
  },

  async getAllWarehouses() {
    const res = await this._request('/warehouses');
    return res.data;
  },

  // ─── Treasury ───
  async getTreasuryOverview() {
    const res = await this._request('/treasury/overview');
    return res.data;
  },

  async transferToCentral(data) {
    const res = await this._request('/treasury/transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async createFinancialAccount(data) {
    const res = await this._request('/treasury/accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async transferBetweenAccounts(data) {
    const res = await this._request('/treasury/account-transfer', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // ─── Checks ───
  async getChecks(page = 0, size = 10) {
    const res = await this._request(`/checks?page=${page}&size=${size}`);
    return res.data;
  },

  async registerCheck(data) {
    const res = await this._request('/checks', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateCheckStatus(id, status) {
    const res = await this._request(`/checks/${id}/status?status=${status}`, {
      method: 'PATCH'
    });
    return res.data;
  },

  async endorseCheck(id, endorsee) {
    const res = await this._request(`/checks/${id}/endorse?endorsee=${encodeURIComponent(endorsee)}`, {
      method: 'POST'
    });
    return res.data;
  },

  // ─── Customer Offers (Targeted Discounts) ───
  async createCustomerOffer(data) {
    const res = await this._request('/offers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async getAllOffers(page = 0, size = 20) {
    const res = await this._request(`/offers?page=${page}&size=${size}`);
    return res.data;
  },

  async getCustomerOffers(customerId, page = 0, size = 20) {
    const res = await this._request(`/offers/customers/${customerId}?page=${page}&size=${size}`);
    return res.data;
  },

  async deactivateOffer(offerId) {
    const res = await this._request(`/offers/${offerId}`, { method: 'DELETE' });
    return res.data;
  },

  // ─── Fixed Assets ───
  async getFixedAssets(branchId = null, warehouseId = null) {
    let path = '/fixed-assets';
    if (warehouseId) path = `/fixed-assets/warehouse/${warehouseId}`;
    else if (branchId) path = `/fixed-assets/branch/${branchId}`;

    const res = await this._request(path);
    return res.data;
  },

  async getFixedAsset(id) {
    const res = await this._request(`/fixed-assets/${id}`);
    return res.data;
  },

  async createFixedAsset(data) {
    const res = await this._request('/fixed-assets', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateFixedAsset(id, data) {
    const res = await this._request(`/fixed-assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteFixedAsset(id) {
    await this._request(`/fixed-assets/${id}`, { method: 'DELETE' });
  },

  // ─── Employee Custody (العهد الشخصية) ───
  async getCustody(page = 0, size = 10, query = '') {
    const res = await this._request(`/custody?page=${page}&size=${size}&query=${encodeURIComponent(query)}`);
    return res.data;
  },

  async issueCustody(data) {
    const res = await this._request('/custody', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async returnCustody(id, notes) {
    const res = await this._request(`/custody/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
    return res.data;
  },

  async deleteCustody(id) {
    await this._request(`/custody/${id}`, { method: 'DELETE' });
  },

  // ─── Accounting (American Journal) ──────────────────────────────────────────
  async getTrialBalance() {
    const res = await this._request('/accounting/trial-balance');
    return res.data;
  },

  async getAccountingAccounts() {
    const res = await this._request('/accounting/accounts');
    return res.data;
  },

  async getAccountingEntries(page = 0, size = 10) {
    const res = await this._request(`/accounting/entries?page=${page}&size=${size}`);
    return res.data;
  }
};

export default Api;
