/**
 * POS API Client â€” Centralized HTTP layer with JWT auth
 */
const envUrl = import.meta.env.VITE_API_URL;
// Base server URL (without /api/v1 prefix) - dynamically resolves in production
export const SERVER_URL = (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
  ? 'https://posapi.digitalrace.net'
  : (envUrl || 'https://posapi.digitalrace.net');


// Use production URL when not running on Vite dev server (port 5173)
export const API_BASE = `${SERVER_URL}/api/v1`;
// Centralized LocalStorage & SessionStorage Obfuscation to protect sensitive client-side data
const originalGetItem = localStorage.getItem.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);

const originalSessionGetItem = (typeof sessionStorage !== 'undefined') ? sessionStorage.getItem.bind(sessionStorage) : null;
const originalSessionSetItem = (typeof sessionStorage !== 'undefined') ? sessionStorage.setItem.bind(sessionStorage) : null;
const originalSessionRemoveItem = (typeof sessionStorage !== 'undefined') ? sessionStorage.removeItem.bind(sessionStorage) : null;

const SEC_KEY = 'pos_secure_obfuscation_salt_2026';
const PREFIX = 'possec_';
const ENCRYPTED_KEYS = [
  'pos_access_token',
  'pos_refresh_token',
  'pos_user',
  'pos_tenant_id',
  'pos_tenant_slug',
  'inactive_reason_code',
  'inactive_reason_msg'
];

function obfuscate(str) {
  if (!str) return '';
  if (str.startsWith(PREFIX)) return str;
  try {
    const utf8Str = unescape(encodeURIComponent(str));
    let xorStr = '';
    for (let i = 0; i < utf8Str.length; i++) {
      xorStr += String.fromCharCode(utf8Str.charCodeAt(i) ^ SEC_KEY.charCodeAt(i % SEC_KEY.length));
    }
    return PREFIX + btoa(xorStr);
  } catch (e) {
    return str;
  }
}

function deobfuscate(encoded) {
  if (!encoded) return '';
  if (!encoded.startsWith(PREFIX)) return encoded;
  try {
    const actualCipher = encoded.slice(PREFIX.length);
    const decodedB64 = atob(actualCipher);
    let xorStr = '';
    for (let i = 0; i < decodedB64.length; i++) {
      xorStr += String.fromCharCode(decodedB64.charCodeAt(i) ^ SEC_KEY.charCodeAt(i % SEC_KEY.length));
    }
    return decodeURIComponent(escape(xorStr));
  } catch (e) {
    return encoded;
  }
}

localStorage.getItem = function (key) {
  let val = originalGetItem(key);
  if (!val && originalSessionGetItem) {
    val = originalSessionGetItem(key);
  }
  if (ENCRYPTED_KEYS.includes(key) && val) {
    return deobfuscate(val);
  }
  return val;
};

localStorage.setItem = function (key, val) {
  const rememberMe = originalGetItem('pos_remember_me') !== 'false';
  if (ENCRYPTED_KEYS.includes(key) && val !== null && val !== undefined) {
    const obfuscatedVal = obfuscate(String(val));
    if (rememberMe) {
      originalSetItem(key, obfuscatedVal);
      if (originalSessionRemoveItem) originalSessionRemoveItem(key);
    } else {
      if (originalSessionSetItem) originalSessionSetItem(key, obfuscatedVal);
      originalRemoveItem(key);
    }
  } else {
    originalSetItem(key, val);
  }
};

localStorage.removeItem = function (key) {
  originalRemoveItem(key);
  if (originalSessionRemoveItem) {
    originalSessionRemoveItem(key);
  }
};


const Api = {
  API_BASE,
  _refreshIntervalId: null,
  _refreshPromise: null,

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

  _getTenantId() {
    return localStorage.getItem('pos_tenant_id');
  },

  _setTenantId(id) {
    if (id) localStorage.setItem('pos_tenant_id', id);
  },

  _clearTokens() {
    localStorage.removeItem('pos_access_token');
    localStorage.removeItem('pos_refresh_token');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_tenant_id');
    localStorage.removeItem('pos_hide_desktop_banner');
    this.stopTokenRefreshInterval();
  },

  _getUser() {
    try {
      return JSON.parse(localStorage.getItem('pos_user'));
    } catch { return null; }
  },

  _setUser(user) {
    localStorage.setItem('pos_user', JSON.stringify(user));
  },

  uploadDesktopApp(version, releaseNotes, file, onProgress) {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('version', version);
      if (releaseNotes) formData.append('releaseNotes', releaseNotes);
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/desktop-app/upload`);
      const token = this._getToken();
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      const tenantId = this._getTenantId();
      if (tenantId) xhr.setRequestHeader('X-Tenant-ID', tenantId);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText).data);
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || 'فشل الرفع'));
          } catch (e) {
            reject(new Error('فشل الرفع: ' + xhr.status));
          }
        }
      };

      xhr.onerror = () => reject(new Error('حدث خطأ في الاتصال بالخادم أثناء الرفع.'));
      xhr.send(formData);
    });
  },

  async getLatestDesktopApp() {
    const res = await fetch(`${SERVER_URL}/api/public/desktop-app/latest`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('فشل جلب أحدث إصدار لبرنامج الديسكتوب');
    }
    const json = await res.json();
    const data = json.data;
    if (data && data.downloadUrl && !data.downloadUrl.startsWith('http')) {
      data.downloadUrl = `${SERVER_URL}${data.downloadUrl}`;
    }
    return data;
  },

  async getTenantDetails(slug) {
    const res = await fetch(`${SERVER_URL}/api/public/tenants/resolve/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('فشل في جلب بيانات المؤسسة');
    return await res.json();
  },

  async getCurrentTenantDetails() {
    const res = await this._request('/tenant/current');
    return res.data;
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

  // ——————————————————————————————————————————————————————————————————————————
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
  // ——————————————————————————————————————————————————————————————————————————

  // ——————————————————————————————————————————————————————————————————————————
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
  // ——————————————————————————————————————————————————————————————————————————

  // ——————————————————————————————————————————————————————————————————————————
  async getStockTransfers(branchId = null) {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/stock-transfers?${params.toString()}`);
    return res.data;
  },

  async createStockTransfer(dto) {
    const res = await this._request('/stock-transfers', {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    return res.data;
  },

  async approveStockTransfer(id, approvedBy) {
    const res = await this._request(`/stock-transfers/${id}/approve?approvedBy=${encodeURIComponent(approvedBy)}`, {
      method: 'PUT'
    });
    return res.data;
  },

  async receiveStockTransfer(id) {
    const res = await this._request(`/stock-transfers/${id}/receive`, {
      method: 'PUT'
    });
    return res.data;
  },

  async cancelStockTransfer(id) {
    const res = await this._request(`/stock-transfers/${id}/cancel`, {
      method: 'PUT'
    });
    return res.data;
  },
  // ——————————————————————————————————————————————————————————————————————————

  async _request(path, options = {}) {
    // If path starts with http(s), use it as-is (absolute URL)
    const url = path.startsWith('http')
      ? path
      : path.startsWith('/v2')
        ? `${SERVER_URL}/api${path}`
        : `${API_BASE}${path}`;
    const headers = options.headers || {};

    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const token = this._getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    headers['Accept-Language'] = 'ar';

    const tenantId = this._getTenantId();
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    console.log(`[Request] ${options.method || 'GET'} ${url}`, { tenantId, headers });
    try {
      let response = await fetch(url, { ...options, headers });

      // If 401 try refresh
      if (response.status === 401 && this._getRefreshToken()) {
        const refreshed = await this._tryRefresh();
        if (refreshed === true) {
          headers['Authorization'] = `Bearer ${this._getToken()}`;
          response = await fetch(url, { ...options, headers });
        } else if (refreshed === 'REFUSED') {
          this._clearTokens();
          console.warn('Session expired - redirecting to login');
          window.location.href = '/login';
          throw new Error('Session expired');
        } else {
          // Temporary network failure or server error.
          // Do not clear tokens, but fail this request.
          throw new Error('لا يمكن الاتصال بالسيرفر حالياً، يرجى المحاولة لاحقاً');
        }
      }

      if (response.status === 403) {
        throw new Error('ليس لديك صلاحية لهذا الإجراء!');
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));

        // Handle inactive store or expired subscription (402)
        if (response.status === 402 || err.errorCode === 'SHOP_DISABLED' || err.errorCode === 'SUBSCRIPTION_EXPIRED') {
          const currentPath = window.location.pathname;
          if (!currentPath.includes('/store-inactive') && !currentPath.includes('/login') && !currentPath.includes('/register') && currentPath !== '/') {
            localStorage.setItem('inactive_reason_code', err.errorCode || 'SHOP_DISABLED');
            localStorage.setItem('inactive_reason_msg', err.message || 'عذراً، هذا المتجر غير نشط حالياً. يرجى التواصل مع الإدارة.');
            window.location.href = '/store-inactive';
          }
        }

        const errorObj = new Error(err.message || err.error || `Request failed: ${response.status}`);
        errorObj.status = response.status;
        errorObj.errors = err.errors;
        errorObj.errorCode = err.errorCode || err.code;
        throw errorObj;
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

  async get(path) {
    return await this._request(path);
  },

  async post(path, body) {
    return await this._request(path, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  async put(path, body) {
    return await this._request(path, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  async delete(path) {
    return await this._request(path, {
      method: 'DELETE'
    });
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

  _isTokenValid(token) {
    if (!token) return false;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return false;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const payload = JSON.parse(jsonPayload);
      if (!payload.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > (now + 15); // 15-second grace buffer
    } catch (e) {
      return false;
    }
  },

  async _tryRefresh(force = false) {
    // 1. Check if the current token is already valid
    const currentAccessToken = this._getToken();
    if (!force && this._isTokenValid(currentAccessToken)) {
      return true;
    }

    // 2. Prevent concurrent refresh in the same tab
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      const lockKey = 'pos_refresh_lock';
      const lockVal = localStorage.getItem(lockKey);
      const nowMs = Date.now();

      if (lockVal) {
        const lockTime = parseInt(lockVal, 10);
        // If the lock was set less than 5 seconds ago, another tab is actively refreshing
        if (nowMs - lockTime < 5000) {
          console.log('[Auth] Token refresh is in progress in another tab. Waiting...');
          const refreshedInOtherTab = await new Promise((resolve) => {
            let attempts = 0;
            const interval = setInterval(() => {
              attempts++;
              const activeToken = this._getToken();
              if (this._isTokenValid(activeToken)) {
                clearInterval(interval);
                resolve(true);
              } else if (attempts >= 10) { // Timeout after 5 seconds
                clearInterval(interval);
                resolve(false);
              }
            }, 500);
          });

          if (refreshedInOtherTab) {
            console.log('[Auth] Token successfully refreshed in another tab.');
            return true;
          }
          console.warn('[Auth] Wait timeout or failed refresh in other tab. Proceeding with our own refresh.');
        }
      }

      // Acquire lock and do refresh
      localStorage.setItem(lockKey, Date.now().toString());
      try {
        const refreshToken = this._getRefreshToken();
        if (!refreshToken) {
          localStorage.removeItem(lockKey);
          return false;
        }

        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (res.ok) {
          const data = await res.json();
          this._setTokens(data.data.accessToken, data.data.refreshToken);
          localStorage.removeItem(lockKey);
          return true;
        }

        // 4xx client errors (excluding network timeout 408 / rate limit 429) mean the refresh token is invalid/revoked
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          localStorage.removeItem(lockKey);
          return 'REFUSED';
        }

        localStorage.removeItem(lockKey);
        return 'NETWORK_ERROR';
      } catch (err) {
        console.error('Refresh token API call failed due to network/server issue:', err);
        localStorage.removeItem(lockKey);
        return 'NETWORK_ERROR';
      } finally {
        this._refreshPromise = null;
      }
    })();

    return this._refreshPromise;
  },

  startTokenRefreshInterval() {
    if (this._refreshIntervalId) {
      clearInterval(this._refreshIntervalId);
    }
    this._refreshIntervalId = setInterval(async () => {
      console.log('[Interval] Proactive token refresh ticking...');
      const refreshed = await this._tryRefresh(true);
      if (refreshed === 'REFUSED') {
        console.warn('[Interval] Token explicitly refused. Logging out.');
        this.logout();
      }
    }, 21600000); // 6 hours in ms (proactive buffer for 7-day access token)
  },

  stopTokenRefreshInterval() {
    if (this._refreshIntervalId) {
      clearInterval(this._refreshIntervalId);
      this._refreshIntervalId = null;
    }
  },

  // â”€â”€â”€ Auth â”€â”€â”€
  async login(email, password, tenantId = null) {
    if (tenantId) {
      this._setTenantId(tenantId);
    }
    const res = await this._request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this._setTokens(res.data.accessToken, res.data.refreshToken);
    this._setUser(res.data.user);
    if (res.data.user && res.data.user.tenantId) {
      this._setTenantId(res.data.user.tenantId);
    }
    this.startTokenRefreshInterval();
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

  async initForgotPassword(identifier) {
    const res = await this._request('/auth/forgot-password/init', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
    return res.data;
  },

  async forgotPassword(identifier, method = 'EMAIL', fullPhone = null) {
    const clientUrl = window.location.origin;
    const res = await this._request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, clientUrl, method, fullPhone })
    });
    return res;
  },

  async resetPassword(token, newPassword) {
    const res = await this._request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
    return res;
  },

  // â”€â”€â”€ Products â”€â”€â”€
  async getProducts(page = 0, size = 1000, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/products?page=${page}&size=${size}${branchQuery}`);
    return res?.data?.items || res?.data?.content || res?.content || res?.items || res?.data || res || [];
  },

  async getProductsPaged(page = 0, size = 20, search = '', sort = 'id,desc', branchId = null, categoryId = null, isRawMaterial = null) {
    const searchQuery = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `&branchId=${branchId}` : '';
    const isRawMaterialQuery = (isRawMaterial !== null && isRawMaterial !== undefined) ? `&isRawMaterial=${isRawMaterial}` : '';

    let endpoint;
    if (categoryId && categoryId !== 'null' && categoryId !== 'undefined' && categoryId !== '' && !search) {
      endpoint = `/v2/products/category/${categoryId}?page=${page}&size=${size}${sortQuery}${branchQuery}${isRawMaterialQuery}`;
    } else {
      endpoint = `/v2/products?page=${page}&size=${size}${searchQuery}${sortQuery}${branchQuery}${isRawMaterialQuery}`;
    }

    console.log(`%c[ðŸš€ API CALL] Requesting Products Endpoint: ${endpoint} | Selected Branch: ${branchId || 'All Branches'}`, 'color: #00ff00; font-weight: bold; font-size: 14px;');

    const res = await this._request(endpoint);
    const raw = res.data;
    return {
      items: raw.items || [],
      totalPages: raw.totalPages ?? 1,
      totalElements: raw.totalItems ?? 0,
      page: raw.currentPage ?? page,
    };
  },

  async getProductsByCategory(categoryId, page = 0, size = 1000) {
    const res = await this._request(`/v2/products/category/${categoryId}?page=${page}&size=${size}`);
    return res.data.items || [];
  },



  async exportProductsExcel(search = '', sort = 'id,desc', branchId = null) {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `&branchId=${branchId}` : '';
    const res = await fetch(`${SERVER_URL}/api/v2/products/export/excel?${query}${sortQuery}${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async importProductsExcel(file, branchId = null) {
    const formData = new FormData();
    formData.append('file', file);
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `?branchId=${branchId}` : '';
    const res = await this._request(`/v2/products/import${branchQuery}`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res;
  },

  async downloadProductsImportTemplate() {
    const res = await fetch(`${SERVER_URL}/api/v2/products/import/template`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async getDeletedProducts(branchId = null) {
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `?branchId=${branchId}` : '';
    const res = await this._request(`/v2/products/trash${branchQuery}`);
    return res ? res.data : [];
  },

  async restoreProductGlobal(id) {
    const res = await this._request(`/v2/products/${id}/restore/global`, {
      method: 'POST'
    });
    return res;
  },

  async restoreProductInBranch(id, branchId) {
    const res = await this._request(`/v2/products/${id}/restore?branchId=${branchId}`, {
      method: 'POST'
    });
    return res;
  },

  async adminRemoveProductFromBranch(productId, branchId) {
    const res = await this._request(`/admin/products/${productId}/branches/${branchId}`, {
      method: 'DELETE'
    });
    return res;
  },

  async adminTransferProductBetweenBranches(productId, dto) {
    const res = await this._request(`/admin/products/${productId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(dto)
    });
    return res;
  },

  async exportProductsPdf(search = '', sort = 'id,desc', branchId = null) {
    const query = search ? `&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `&branchId=${branchId}` : '';
    const res = await fetch(`${SERVER_URL}/api/v2/products/export/pdf?${query}${sortQuery}${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ PDF');
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
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Excel');
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
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ PDF');
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
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§Ù…Ù„ Ø¥Ù„Ù‰ Excel');
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
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø´Ø§Ù…Ù„ Ø¥Ù„Ù‰ PDF');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive_report_${new Date().getTime()}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async getProductStatistics(branchId = null) {
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `?branchId=${branchId}` : '';
    const res = await this._request(`/v2/products/statistics${branchQuery}`);
    return res.data;
  },

  async getDailyProductStats(days = 30, branchId = null) {
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `&branchId=${branchId}` : '';
    const res = await this._request(`/v2/products/daily-stats?days=${days}${branchQuery}`);
    return res.data;
  },

  async incrementProductView(id) {
    try {
      await this._request(`/v2/products/${id}/view`, { method: 'POST' });
    } catch (e) {
      // Just ignore if it fails, not critical
    }
  },

  async getProduct(id) {
    const res = await this._request(`/v2/products/${id}`);
    return res.data;
  },

  async addProductToBranch(productId, data) {
    return await this._request(`/v2/products/${productId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async updateBranchInventory(productId, branchId, data) {
    return await this._request(`/v2/products/${productId}/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getProductBarcode(id) {
    const res = await this._request(`/v2/products/${id}/barcode`);
    return res.data;
  },

  async getProductBarcodeLabel(id) {
    const res = await fetch(`${SERVER_URL}/api/v2/products/${id}/barcode/label`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error("ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ ØµÙˆØ±Ø© Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±");
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async getProductQrCode(id) {
    const res = await this._request(`/v2/products/${id}/qrcode`);
    return res.data;
  },

  async addProductToOnlineStore(id, purchasePrice, salePrice) {
    // Use the correct v1 endpoint without duplicating the version prefix
    const res = await this._request(`/products/${id}/add-to-online`, {
      method: 'POST',
      body: JSON.stringify({ purchasePrice, salePrice }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
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
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `?branchId=${branchId}` : '';
    const res = await this._request(`/v2/products${branchQuery}`, {
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
    const res = await this._request(`/v2/products/${id}`, {
      method: 'PUT',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res.data;
  },

  async deleteProduct(id) {
    await this._request(`/v2/products/${id}`, { method: 'DELETE' });
  },

  // â”€â”€â”€ Printer Config â”€â”€â”€
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
    if (!res.ok) throw new Error("Ù Ø´Ù„ Ø§Ø®ØªØ¨Ø§Ø± Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©");
    const blob = await res.blob();
    return window.URL.createObjectURL(blob);
  },

  async getAvailablePrinters() {
    const res = await this._request('/v2/products/printers');
    return res.data;
  },

  async directPrintBarcode(productId, copies, printerName) {
    const res = await this._request(`/v2/products/${productId}/barcode/direct-print?copies=${copies}&printerName=${encodeURIComponent(printerName)}`, {
      method: 'POST'
    });
    return res.data;
  },

  // â”€â”€â”€ Categories â”€â”€â”€
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

  async getSuppliers(page = 0, size = 10, search = '', type = '', branchId = null) {
    const searchQuery = search ? `&query=${encodeURIComponent(search)}&search=${encodeURIComponent(search)}` : '';
    const typeQuery = type ? `&type=${type}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/suppliers?page=${page}&size=${size}${searchQuery}${typeQuery}${branchQuery}`);
    return res.data;
  },

  async getSuppliersSummary(page = 0, size = 10, search = '', sort = '', branchId = null) {
    const searchQuery = search ? `&query=${encodeURIComponent(search)}&search=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/summary?page=${page}&size=${size}${searchQuery}${sortQuery}${branchQuery}`);
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

  async importSuppliersExcel(file, branchId = null) {
    const formData = new FormData();
    formData.append('file', file);
    const branchQuery = (branchId && branchId !== 'null' && branchId !== 'undefined' && branchId !== '') ? `?branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/import${branchQuery}`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res;
  },

  async downloadSuppliersImportTemplate() {
    const res = await fetch(`${SERVER_URL}/api/v1/suppliers/import/template`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل تحميل قالب الاستيراد من السيرفر');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'suppliers_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async exportSuppliersExcel(search = '', sort = 'name,asc', branchId = null) {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/suppliers/export/excel?${query}${sortQuery}${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª Ø¥Ù„Ù‰ Excel');
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

  async downloadSalesImportTemplate() {
    const res = await fetch(`${SERVER_URL}/api/v1/sales/import/template`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل تحميل قالب استيراد المبيعات من السيرفر');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sales_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async importSalesExcel(file, branchId) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this._request(`/sales/import?branchId=${branchId}`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res;
  },

  async exportSalesExcel(search = '', branchId = null) {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/sales/export/excel?${query}${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل تصدير فواتير المبيعات');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async downloadPurchasesImportTemplate() {
    const res = await fetch(`${SERVER_URL}/api/v1/purchases/import/template`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل تحميل قالب استيراد المشتريات من السيرفر');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchases_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async importPurchasesExcel(file, branchId, warehouseId) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await this._request(`/purchases/import?branchId=${branchId}&warehouseId=${warehouseId}`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res;
  },

  async exportPurchasesExcel(search = '', branchId = null) {
    const query = search ? `&query=${encodeURIComponent(search)}` : '';
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${API_BASE}/purchases/export/excel?${query}${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('فشل تصدير فواتير المشتريات');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases_export_${new Date().getTime()}.xlsx`;
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
      throw new Error('ÙØ´Ù„ ØªØµØ¯ÙŠØ± Ø§Ù„Ù…Ù„Ù');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `ÙƒØ´Ù_Ø­Ø³Ø§Ø¨_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`;
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
      throw new Error('ÙØ´Ù„ ØªØµØ¯ÙŠØ± Ø§Ù„ØªÙ‚Ø±ÙŠØ±');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `ØªÙ‚Ø±ÙŠØ±_Ø´Ø§Ù…Ù„_${supplierName}_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  // â”€â”€â”€ Purchases â”€â”€â”€
  async getPurchases(page = 0, size = 10, query = '', branchId = null, sort = 'id,desc') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await this._request(`/purchases?page=${page}&size=${size}&query=${encodeURIComponent(query)}${sortQuery}${branchQuery}`);
    return res.data;
  },

  async getPurchasesSummary(page = 0, size = 10, query = '', branchId = null, sort = 'id,desc') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const sortQuery = sort ? `&sort=${sort}` : '';
    const res = await this._request(`/purchases/summary?page=${page}&size=${size}&query=${encodeURIComponent(query)}${sortQuery}${branchQuery}`);
    return res.data;
  },

  async getPurchaseById(id) {
    const res = await this._request(`/purchases/${id}`);
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

  async getSalesSummary(date = '', branchId = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const res = await this._request(`/sales/analytics/summary${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  async getCashierAnalytics(date = '', branchId = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const res = await this._request(`/sales/analytics/cashiers${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  async getProductAnalytics(date = '', branchId = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const res = await this._request(`/sales/analytics/products${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  async getHourlyAnalytics(date = '', branchId = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const res = await this._request(`/sales/analytics/hourly${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  async getReturnAnalytics(date = '', branchId = '') {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (branchId) params.append('branchId', branchId);
    const queryString = params.toString();
    const res = await this._request(`/sales/analytics/returns${queryString ? `?${queryString}` : ''}`);
    return res.data;
  },

  async getStockReceiptAnalytics(date = '') {
    const res = await this._request(`/stock/analytics/stats${date ? `?date=${date}` : ''}`);
    return res.data;
  },

  // â”€â”€â”€ Users â”€â”€â”€
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

  // â”€â”€â”€ Job Titles â”€â”€â”€
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

  // â”€â”€â”€ Role Management â”€â”€â”€
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

  // â”€â”€â”€ Product Units â”€â”€â”€
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

  // â”€â”€â”€ Audit Logs â”€â”€â”€
  async getAuditLogs(page = 0, size = 20) {
    const res = await this._request(`/audit?page=${page}&size=${size}`);
    return res.data;
  },

  async getAuditLog(id) {
    const res = await this._request(`/audit/${id}`);
    return res.data;
  },

  // â”€â”€â”€ Notifications â”€â”€â”€
  async getNotifications() {
    const res = await this._request('/notifications');
    return res.data;
  },

  async markNotificationRead(id) {
    await this._request(`/notifications/${id}/read`, { method: 'POST' });
  },

  // â”€â”€â”€ Debt Management â”€â”€â”€
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

  // â”€â”€â”€ Unified Debt & Installments â”€â”€â”€
  async generateInstallmentPlan(invoiceId, months, downPayment, startDate, isSale = false) {
    const source = isSale ? 'SALE' : 'PURCHASE';
    // First, find the debt record for this invoice
    const installments = await this.getInstallmentsForInvoice(invoiceId, isSale);
    // If debt exists, generate plan
    // This is a simplification; in a real app we'd need the Debt ID.
    // For now, we assume the backend can find it by source.
    // Actually, I added a /debts/{id}/generate-plan endpoint, but for convenience I'll add a source-based one if needed.
    // Let's use the source-based lookup first to get the ID.
    const res = await this._request(`/debts?source=${source}&sourceId=${invoiceId}`);
    const debt = res.data.content[0];
    if (!debt) throw new Error('Debt record not found for this invoice');

    return await this._request(`/debts/${debt.id}/generate-plan`, {
      method: 'POST',
      body: JSON.stringify({ months, downPayment, startDate })
    });
  },

  async payInstallment(id, amount) {
    // Systems A uses /debts/installments/{id}/pay
    return await this._request(`/debts/installments/${id}/pay?amount=${amount}`, { method: 'POST' });
  },

  async getInstallmentsForInvoice(invoiceId, isSale = false) {
    const source = isSale ? 'SALE' : 'PURCHASE';
    const res = await this._request(`/debts/source/${source}/${invoiceId}/installments`);
    return res.data;
  },

  // â”€â”€â”€ Customers â”€â”€â”€
  async getCustomers(page = 0, size = 10, query = '', branchId = null) {
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/customers?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchParam}`);
    return res.data;
  },

  async getCustomersSummary(page = 0, size = 10, query = '', branchId = null) {
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/customers/summary?page=${page}&size=${size}&query=${encodeURIComponent(query)}${branchParam}`);
    return res.data;
  },

  async getCustomer(id, branchId = null) {
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/customers/${id}${branchQuery}`);
    return res.data;
  },

  async getCustomerDto(id, branchId = null) {
    return this.getCustomer(id, branchId);
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

  async getCustomerInvoices(id, page = 0, size = 10, branchId = null) {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/customers/${id}/invoices?page=${page}&size=${size}${branchQuery}`);
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

  async exportCustomersExcel(query = '', branchId = null) {
    const branchParam = branchId ? `&branchId=${branchId}` : '';
    const res = await fetch(`${SERVER_URL}/api/v1/customers/export/excel?query=${encodeURIComponent(query)}${branchParam}`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ ØªØµØ¯ÙŠØ± Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ Ø¥Ù„Ù‰ Excel');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_export_${new Date().getTime()}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async importCustomersExcel(file, branchId = null) {
    const formData = new FormData();
    formData.append('file', file);
    const branchQuery = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/customers/import${branchQuery}`, {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    return res;
  },

  async downloadCustomersImportTemplate() {
    const res = await fetch(`${SERVER_URL}/api/v1/customers/import/template`, {
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
    if (!res.ok) throw new Error('ÙØ´Ù„ ØªØ­Ù…ÙŠÙ„ Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  },

  // â”€â”€â”€ Sales â”€â”€â”€
  async getSales(page = 0, size = 10, query = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const searchQuery = query ? `&query=${encodeURIComponent(query)}&search=${encodeURIComponent(query)}` : '';
    const res = await this._request(`/sales?page=${page}&size=${size}${searchQuery}${branchQuery}`);
    return res.data;
  },

  async getSalesInvoicesSummary(page = 0, size = 10, query = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const searchQuery = query ? `&query=${encodeURIComponent(query)}&search=${encodeURIComponent(query)}` : '';
    const res = await this._request(`/sales/summary?page=${page}&size=${size}${searchQuery}${branchQuery}`);
    return res.data;
  },

  async getSaleById(id) {
    const res = await this._request(`/sales/${id}`);
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

  // â”€â”€â”€ Treasury â”€â”€â”€
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

  // â”€â”€â”€ Damaged Goods â”€â”€â”€
  async getDamagedProducts(page = 0, size = 10, search = '', branchId = '') {
    const branchQuery = branchId ? `&branchId=${branchId}` : '';
    const res = await this._request(`/damaged?page=${page}&size=${size}&search=${encodeURIComponent(search)}${branchQuery}`);
    return res.data;
  },

  async recordDamagedProduct(data) {
    const res = await this._request('/damaged', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  // â”€â”€â”€ Expenses â”€â”€â”€
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

  // â”€â”€â”€ Profit & Loss â”€â”€â”€
  async getProfitLossReport(start = '', end = '', branchId = '') {
    const params = new URLSearchParams({ start, end });
    if (branchId) params.append('branchId', branchId);
    const res = await this._request(`/profit-loss?${params.toString()}`);
    return res.data;
  },

  // â”€â”€â”€ Partners â”€â”€â”€
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

  // â”€â”€â”€ Barcode Scanner (Server-Side) â”€â”€â”€
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

  // â”€â”€â”€ Shifts â”€â”€â”€
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

  // â”€â”€â”€ Employee Bonuses â”€â”€â”€
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

  // â”€â”€â”€ Employee Deductions â”€â”€â”€
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

  // â”€â”€â”€ Attendance â”€â”€â”€
  /** ÙŠØ¬Ù„Ø¨ ØµÙˆØ±Ø© QR Code Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ù„Ù„Ø­Ø¶ÙˆØ± (ØªØªØºÙŠØ± ÙƒÙ„ 60 Ø«Ø§Ù†ÙŠØ©) */
  async getAttendanceQr() {
    const baseUrl = window.location.origin;
    const res = await this._request('/attendance/qr?baseUrl=' + encodeURIComponent(baseUrl));
    return res.data; // { qrImage, token, expiresInSeconds, refreshAfterSeconds }
  },

  /** ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ± Ø¨Ù€ QR Token + GPS */
  async checkInEmployee(userId, qrToken, latitude = null, longitude = null) {
    const res = await this._request(`/attendance/${userId}/check-in`, {
      method: 'POST',
      body: JSON.stringify({ qrToken, latitude, longitude })
    });
    return res.data;
  },

  /** ØªØ³Ø¬ÙŠÙ„ Ø§Ù†ØµØ±Ø§Ù Ø¨Ù€ QR Token + GPS */
  async checkOutEmployee(userId, qrToken, latitude = null, longitude = null) {
    const res = await this._request(`/attendance/${userId}/check-out`, {
      method: 'PUT',
      body: JSON.stringify({ qrToken, latitude, longitude })
    });
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

  // â”€â”€â”€ Attendance Security Settings â”€â”€â”€
  async getAttendanceAllowedIps() {
    const res = await this._request('/tenant/settings/attendance/allowed-ips');
    return res.data || [];
  },

  async setAttendanceAllowedIps(ips) {
    const res = await this._request('/tenant/settings/attendance/allowed-ips', {
      method: 'PUT',
      body: JSON.stringify(ips)
    });
    return res;
  },

  async addAttendanceAllowedIp(ip) {
    const res = await this._request('/tenant/settings/attendance/allowed-ips/add', {
      method: 'POST',
      body: JSON.stringify({ ip })
    });
    return res;
  },

  async removeAttendanceAllowedIp(ip) {
    const res = await this._request('/tenant/settings/attendance/allowed-ips/remove', {
      method: 'DELETE',
      body: JSON.stringify({ ip })
    });
    return res;
  },

  async getAttendanceGeofenceStatus() {
    const res = await this._request('/tenant/settings/attendance/geofence');
    return res.data; // { geoFenceEnabled: bool }
  },

  async setAttendanceGeofenceEnabled(enabled) {
    const res = await this._request('/tenant/settings/attendance/geofence', {
      method: 'PUT',
      body: JSON.stringify({ enabled })
    });
    return res;
  },

  // â”€â”€â”€ Payroll â”€â”€â”€
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

  // ——— Branches & Warehouses ———
  async getBranches() {
    const res = await this._request('/branches');
    return res.data;
  },

  async getBranchesSummary() {
    const res = await this._request('/branches/summary');
    return res.data;
  },

  async createBranch(data) {
    const res = await this._request('/branches', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateBranch(id, data) {
    const res = await this._request(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteBranch(id) {
    await this._request(`/branches/${id}`, { method: 'DELETE' });
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

  // â”€â”€â”€ Treasury â”€â”€â”€
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

  // â”€â”€â”€ Checks â”€â”€â”€
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

  // â”€â”€â”€ Customer Offers (Targeted Discounts) â”€â”€â”€
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

  // â”€â”€â”€ Fixed Assets â”€â”€â”€
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

  // â”€â”€â”€ Employee Custody (Ø§Ù„Ø¹Ù‡Ø¯ Ø§Ù„Ø´Ø®ØµÙŠØ©) â”€â”€â”€
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

  // â”€â”€â”€ Accounting (American Journal) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  },

  // â”€â”€â”€ Super Admin â€” Subscription Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  isSuperAdmin() {
    const user = this._getUser();
    if (!user) return false;
    return (user.roles || []).includes('ROLE_SUPER_ADMIN');
  },

  async getSuperAdminTenants() {
    const res = await this._request('/super-admin/tenants');
    return res.data || [];
  },

  async getSuperAdminStats() {
    const res = await this._request('/super-admin/stats');
    return res.data || {};
  },

  async getTenantCommunications(tenantId) {
    const res = await this._request(`/super-admin/tenants/${tenantId}/communications`);
    return res.data || [];
  },

  async addTenantCommunication(tenantId, data) {
    const res = await this._request(`/super-admin/tenants/${tenantId}/communications`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async toggleTenantStatus(tenantId, active) {
    return await this._request(`/super-admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
  },

  async impersonateTenant(tenantId) {
    const res = await this._request(`/super-admin/tenants/${tenantId}/impersonate`, {
      method: 'POST'
    });
    return res.data;
  },
  async deleteSuperAdminTenant(tenantId, password, mode = 'soft') {
    const res = await this._request(`/super-admin/tenants/${tenantId}`, {
      method: 'DELETE',
      body: JSON.stringify({ password, mode })
    });
    return res;
  },

  async extendTenantSubscription(tenantId, { months, days }) {
    const body = months ? { months } : { days };
    return await this._request(`/super-admin/tenants/${tenantId}/subscription`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },

  async submitSubscriptionRequest({ packageName, durationMonths, amount, paymentMethod, senderDetail, receiptFile }) {
    const formData = new FormData();
    formData.append('packageName', packageName);
    formData.append('durationMonths', durationMonths);
    formData.append('amount', amount);
    formData.append('paymentMethod', paymentMethod);
    formData.append('senderDetail', senderDetail);
    formData.append('receipt', receiptFile);

    return await this._request('/subscriptions/request', {
      method: 'POST',
      body: formData,
      headers: { 'Authorization': `Bearer ${this._getToken()}` }
    });
  },

  async getMySubscriptionRequests() {
    const res = await this._request('/subscriptions/my-requests');
    return res.data || [];
  },

  async getSuperAdminSubscriptionRequests(status = '') {
    const statusQuery = status ? `?status=${status}` : '';
    const res = await this._request(`/super-admin/subscriptions/requests${statusQuery}`);
    return res.data || [];
  },

  async approveSubscriptionRequest(id) {
    return await this._request(`/super-admin/subscriptions/requests/${id}/approve`, {
      method: 'POST'
    });
  },

  async rejectSubscriptionRequest(id, reason) {
    return await this._request(`/super-admin/subscriptions/requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async getGlobalConfig() {
    const res = await fetch(`${SERVER_URL}/api/public/system-config`);
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù†Ø¸Ø§Ù…');
    const data = await res.json();
    return data.data;
  },

  async updateGlobalConfig(configData) {
    return await this._request('/super-admin/system-config', {
      method: 'PUT',
      body: JSON.stringify(configData)
    });
  },

  // â”€â”€â”€ Technical Support Tickets â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async submitSupportTicket({ type, description, attachment }) {
    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description);
    if (attachment) {
      formData.append('attachment', attachment);
    }
    return await this._request('/tickets', {
      method: 'POST',
      body: formData
    });
  },

  async getTenantSupportTickets() {
    const res = await this._request('/tickets');
    return res.data || [];
  },

  async getSuperAdminSupportTickets() {
    const res = await this._request('/super-admin/tickets');
    return res.data || [];
  },

  async replyToSupportTicket(id, { reply, status }) {
    const res = await this._request(`/super-admin/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply, status })
    });
    return res.data;
  },

  // â”€â”€â”€ Articles (Public Blog) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getPublicArticles(page = 0, size = 9, search = '', category = '') {
    const params = new URLSearchParams({ page, size });
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    const res = await fetch(`${API_BASE}/public/articles?${params.toString()}`);
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ù…Ù‚Ø§Ù„Ø§Øª');
    const json = await res.json();
    return json.data;
  },

  async getPublicArticleBySlug(slug) {
    const res = await fetch(`${API_BASE}/public/articles/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error('Ø§Ù„Ù…Ù‚Ø§Ù„ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯');
    const json = await res.json();
    return json.data;
  },

  async getPublicFeaturedArticles() {
    const res = await fetch(`${API_BASE}/public/articles/featured`);
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„Ù…Ù‚Ø§Ù„Ø§Øª Ø§Ù„Ù…Ù…ÙŠØ²Ø©');
    const json = await res.json();
    return json.data;
  },

  async getPublicArticleCategories() {
    const res = await fetch(`${API_BASE}/public/articles/categories`);
    if (!res.ok) throw new Error('ÙØ´Ù„ ÙÙŠ Ø¬Ù„Ø¨ Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª');
    const json = await res.json();
    return json.data;
  },

  // â”€â”€â”€ Articles (Super Admin Management) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  async getSuperAdminArticles(page = 0, size = 10) {
    const res = await this._request(`/super-admin/articles?page=${page}&size=${size}`);
    return res.data;
  },

  async createSuperAdminArticle(data) {
    const res = await this._request('/super-admin/articles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async updateSuperAdminArticle(id, data) {
    const res = await this._request(`/super-admin/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return res.data;
  },

  async deleteSuperAdminArticle(id) {
    await this._request(`/super-admin/articles/${id}`, { method: 'DELETE' });
  },

  async toggleSuperAdminArticlePublish(id) {
    const res = await this._request(`/super-admin/articles/${id}/publish`, { method: 'PATCH' });
    return res.data;
  },

  async archiveSuperAdminArticle(id) {
    const res = await this._request(`/super-admin/articles/${id}/archive`, { method: 'PATCH' });
    return res.data;
  },

  async uploadSuperAdminArticleImage(file, customName) {
    const formData = new FormData();
    formData.append('file', file);
    if (customName) {
      formData.append('customName', customName);
    }

    // We cannot use _request easily with FormData because _request sets Content-Type to application/json.
    // So we'll use a direct fetch with the token.
    const token = this._getToken();
    const res = await fetch(`${API_BASE}/super-admin/articles/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!res.ok) {
      let errStr = 'Upload failed';
      try {
        const errJson = await res.json();
        errStr = errJson.message || errStr;
      } catch (e) { }
      throw new Error(errStr);
    }
    const json = await res.json();
    return json.data;
  },

  getImageUrl(url) {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    if (url.startsWith('/')) return `${SERVER_URL}${url}`;
    return `${API_BASE}/products/images/${url.split('/').pop()}`;
  },
  // --- Cashier Sessions ---
  async openSession(data) {
    const res = await this._request('/sessions/open', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res; // Assuming response wraps in data or just returns obj
  },

  async closeSession(data) {
    const res = await this._request('/sessions/close', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res;
  },

  async getCurrentSession() {
    const res = await this._request('/sessions/current');
    return res;
  },

  async getSessions(params = {}) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    return await this._request(`/sessions?${queryParams.toString()}`);
  },

  async getSessionSummary(sessionId) {
    return await this._request(`/sessions/${sessionId}/summary`);
  },

  async addCashMovement(data) {
    const res = await this._request('/sessions/cash-movement', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res;
  },

  // ─── Counts & Statistics ───
  async getBranchesCount() {
    const res = await this._request('/branches/count');
    return res.data;
  },

  async getSalesCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/sales/count${params}`);
    return res.data;
  },

  async getPurchasesCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/purchases/count${params}`);
    return res.data;
  },

  async getCustomersCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/customers/count${params}`);
    return res.data;
  },

  async getSuppliersCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/suppliers/count${params}`);
    return res.data;
  },

  async getProductsCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/v2/products/count${params}`);
    return res.data;
  },

  async getExpensesCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/expenses/count${params}`);
    return res.data;
  },

  async getDebtsCount(branchId = null) {
    const params = branchId ? `?branchId=${branchId}` : '';
    const res = await this._request(`/debts/count${params}`);
    return res.data;
  }
};


// Boot refresh: proactively refresh token on load.
// Store as Api._bootRefreshPromise so ProtectedRoute can await it.
if (Api._getRefreshToken()) {
  Api._bootRefreshPromise = Api._tryRefresh().then((refreshed) => {
    if (refreshed === 'REFUSED') {
      console.warn('[Boot] Refresh token invalid or expired. Logging out.');
      Api._clearTokens();
      return 'REFUSED';
    } else {
      Api.startTokenRefreshInterval();
      return refreshed;
    }
  }).catch((err) => {
    console.warn('[Boot] Network error during boot refresh:', err);
    // On network failure on boot, still start the interval to retry later
    Api.startTokenRefreshInterval();
    return 'NETWORK_ERROR';
  });
} else {
  Api._bootRefreshPromise = Promise.resolve(false);
}

export default Api;

