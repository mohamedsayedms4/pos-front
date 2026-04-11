import { SERVER_URL, API_BASE } from './api';

const PAGE_SIZE = 20;

const StoreApi = {
  async _get(path) {
    const res = await fetch(`${SERVER_URL}/api/public/store${path}`);
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
    const res = await fetch(`${SERVER_URL}/api/public/store/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${SERVER_URL}/api/public/store/hero-sections`);
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
