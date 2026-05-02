import { SERVER_URL, API_BASE } from './api';

const PAGE_SIZE = 20;

const StoreApi = {
  _resolvingPromise: null,

  async _getTenantId() {
    // 1. Check URL param first
    const urlParams = new URLSearchParams(window.location.search);
    const urlTenant = urlParams.get('tenantId');
    if (urlTenant) {
        localStorage.setItem('public_tenant_id', urlTenant);
        return urlTenant;
    }

    // 2. Check local storage
    let saved = localStorage.getItem('public_tenant_id');
    
    // 3. Resolve by subdomain if needed
    const hostname = window.location.hostname;
    const isDR = hostname.endsWith('digitalrace.net');
    const isMobily = hostname.endsWith('mobily.cloud');
    
    if (isDR || isMobily) {
        const parts = hostname.split('.');
        if (parts.length >= 3 && parts[0] !== 'www') {
            const slug = parts[0];
            
            // If the slug changed or we don't have a saved ID, resolve it
            if (!saved || localStorage.getItem('public_tenant_slug') !== slug) {
                // Singleton pattern: if we are already resolving, wait for that
                if (this._resolvingPromise) {
                    return this._resolvingPromise;
                }

                this._resolvingPromise = (async () => {
                    try {
                        console.log(`[StoreApi] Resolving slug: ${slug}`);
                        const res = await fetch(`${SERVER_URL}/api/public/tenants/resolve/${slug}`);
                        if (res.ok) {
                            const data = await res.json();
                            localStorage.setItem('public_tenant_id', data.id);
                            localStorage.setItem('public_tenant_slug', slug);
                            this._resolvingPromise = null;
                            return data.id;
                        }
                    } catch (e) {
                        console.error('Failed to resolve tenant by subdomain', e);
                    }
                    this._resolvingPromise = null;
                    return saved || '1';
                })();
                
                return this._resolvingPromise;
            }
        }
    }

    return saved || '1';
  },

  async _get(path) {
    const tenantId = await this._getTenantId();
    const res = await fetch(`${SERVER_URL}/api/public/store${path}`, {
      headers: {
        'X-Tenant-ID': tenantId
      }
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'Request failed');
    }
    return res.json();
  },

  async getProducts(page = 0, size = PAGE_SIZE, search = '', categoryId = null) {
    let url = `/products?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (categoryId) url += `&categoryId=${categoryId}`;
    const res = await this._get(url);
    return res.data;
  },

  async getProduct(id) {
    const res = await this._get(`/products/${id}`);
    return res.data;
  },

  async getCategories() {
    const res = await this._get('/categories');
    return res.data;
  },

  async placeOrder(data) {
    const tenantId = await this._getTenantId();
    const res = await fetch(`${SERVER_URL}/api/public/store/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'فشل إرسال الطلب');
    }
    return res.json();
  },

  async trackOrder(orderNumber) {
    const res = await this._get(`/orders/${encodeURIComponent(orderNumber)}`);
    return res.data;
  },

  async getStoreInfoPublic() {
    return this._get('/info');
  },

  async getStoreInfoAdmin() {
    const res = await fetch(`${SERVER_URL}/api/v1/settings/info`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` }
    });
    return res.json();
  },

  // ─── STORE AUTHENTICATION ───
  async storeRegister(data) {
    const tenantId = await this._getTenantId();
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'فشل إنشاء الحساب');
    }
    return res.json();
  },

  async storeLogin(phone, password) {
    const tenantId = await this._getTenantId();
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Tenant-ID': tenantId
      },
      body: JSON.stringify({ phone, password })
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'بيانات الدخول غير صحيحة');
    }
    return res.json();
  },

  async getProfile() {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'فشل جلب بيانات الحساب');
    }
    return res.json();
  },

  async getMyOrders(page = 0, size = 10) {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me/orders?page=${page}&size=${size}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'فشل جلب الطلبات');
    }
    return res.json();
  },

  async updateStoreInfoAdmin(data) {
    const res = await fetch(`${SERVER_URL}/api/v1/settings/info`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` 
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async uploadLogo(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${SERVER_URL}/api/v1/settings/logo`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` },
      body: formData
    });
    return res.json();
  },

  // ─── HERO SECTIONS ───
  async getHeroSections() {
    const tenantId = await this._getTenantId();
    const res = await fetch(`${SERVER_URL}/api/public/store/hero-sections`, {
      headers: { 'X-Tenant-ID': tenantId }
    });
    const data = await res.json();
    return data.data;
  },

  async getHeroSectionsAdmin() {
    const res = await fetch(`${SERVER_URL}/api/v1/hero-sections`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` }
    });
    return res.json();
  },

  async saveHeroSection(section) {
    const res = await fetch(`${SERVER_URL}/api/v1/hero-sections`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` 
      },
      body: JSON.stringify(section)
    });
    return res.json();
  },

  async deleteHeroSection(id) {
    const res = await fetch(`${SERVER_URL}/api/v1/hero-sections/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` }
    });
    return res.json();
  },

  async toggleHeroSection(id) {
    const res = await fetch(`${SERVER_URL}/api/v1/hero-sections/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` }
    });
    return res.json();
  },

  async uploadHeroImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${SERVER_URL}/api/v1/hero-sections/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('pos_access_token')}` },
      body: formData
    });
    return res.json();
  },

  async trackInteraction(productId, type) {
    const token = localStorage.getItem('store_access_token');
    const tenantId = await this._getTenantId();
    const headers = { 
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${SERVER_URL}/api/public/store/interactions/track`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ productId, type })
      });
      return res.json();
    } catch (e) {
      console.error('Failed to track interaction', e);
    }
  },

  // ─── Customer Offers ───
  async getMyOffers() {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me/offers`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) throw new Error('فشل جلب العروض');
    return res.json();
  },

  async countMyOffers() {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me/offers/count`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) return { data: 0 };
    return res.json();
  },

  async getMyOffersForProduct(productId) {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me/offers/product/${productId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) return { data: [] };
    return res.json();
  },

  async useOffer(offerId) {
    const res = await fetch(`${SERVER_URL}/api/public/store/auth/me/offers/${offerId}/use`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('store_access_token')}` }
    });
    if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || 'فشل تطبيق العرض');
    }
    return res.json();
  },

  getImageUrl(imageUrl) {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;
    
    // For local files, the backend might store just the filename
    const fileName = imageUrl.split('/').pop();
    
    // We try the products directory first as it's the default in FileStorageService
    return `${API_BASE}/products/images/${fileName}`;
  }
};

export default StoreApi;
export { PAGE_SIZE };
