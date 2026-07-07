import { useState, useEffect } from 'react';
import Api from '../services/api';

/**
 * Custom hook to manage a searchable product dropdown inside modals.
 * Extracted from DamagedProducts and can be reused in any form
 * that requires selecting a product with paged search.
 *
 * @param {string|null} branchId - The branch to filter products by
 * @param {boolean} isOpen - Whether the parent modal/dropdown is open
 * @returns Product search state and handlers
 */
const useProductSearchSelect = (branchId, isOpen) => {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(productSearch), 300);
    return () => clearTimeout(timer);
  }, [productSearch]);

  // Fetch products whenever search, page, branchId, or modal open state changes
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const branchToUse = branchId || null;
    Api.getProductsPaged(page, 10, debouncedSearch, 'id,desc', branchToUse)
      .then(res => {
        setProducts(res.items || []);
        setTotalPages(res.totalPages || 0);
        setPage(prev => res.page ?? prev);
      })
      .catch(err => console.error('useProductSearchSelect: failed to fetch products', err))
      .finally(() => setLoading(false));
  }, [debouncedSearch, page, branchId, isOpen]);

  // Reset page when search or branch changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, branchId]);

  const selectProduct = (product) => {
    setSelectedProductId(product.id);
    setSelectedProductName(product.name);
    setProductSearch(product.name);
    setIsDropdownOpen(false);
  };

  const clearSelection = () => {
    setSelectedProductId('');
    setSelectedProductName('');
    setProductSearch('');
  };

  const reset = () => {
    clearSelection();
    setPage(0);
    setProducts([]);
    setIsDropdownOpen(false);
  };

  return {
    productSearch,
    setProductSearch,
    selectedProductId,
    selectedProductName,
    isDropdownOpen,
    setIsDropdownOpen,
    products,
    page,
    setPage,
    totalPages,
    loading,
    selectProduct,
    clearSelection,
    reset
  };
};

export default useProductSearchSelect;
