import React, { createContext, useContext, useState, useEffect } from 'react';
import Api from '../services/api';

const BranchContext = createContext();

export const BranchProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    const saved = localStorage.getItem('selected_branch_id');
    return saved ? parseInt(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranches = async () => {
      const token = Api._getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await Api.getBranches();
        setBranches(data || []);
        
        const user = Api._getUser();
        const isAdmin = (user?.roles || []).some(r => r.includes('ADMIN'));
        
        // If no branch is selected and there are branches, select the first one if not admin
        if (!selectedBranchId && data?.length > 0) {
            if (!isAdmin) {
               setSelectedBranchId(data[0].id);
               localStorage.setItem('selected_branch_id', data[0].id);
            }
        }
      } catch (err) {
        console.error("Error fetching branches:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBranches();
  }, []);

  const selectBranch = (id) => {
    setSelectedBranchId(id);
    if (id) {
      localStorage.setItem('selected_branch_id', id);
    } else {
      localStorage.removeItem('selected_branch_id');
    }
    // Dispatch custom event for pages to listen if needed (optional since we use context)
    window.dispatchEvent(new Event('branchChange'));
  };

  const getSelectedBranch = () => {
    if (!selectedBranchId) return null;
    return branches.find(b => b.id === selectedBranchId) || null;
  };

  return (
    <BranchContext.Provider value={{
      branches,
      selectedBranchId,
      selectBranch,
      getSelectedBranch,
      loading
    }}>
      {children}
    </BranchContext.Provider>
  );
};

export const useBranch = () => useContext(BranchContext);
