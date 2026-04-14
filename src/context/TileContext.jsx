import React, { createContext, useContext, useState, useEffect } from 'react';
import { useGlobalUI } from '../components/common/GlobalUI';

const TileContext = createContext();

export const TileProvider = ({ children }) => {
  const { toast } = useGlobalUI();
  const [isEditMode, setIsEditMode] = useState(false);
  const [registeredTiles, setRegisteredTiles] = useState({});
  const [activeTileId, setActiveTileId] = useState(null);
  const [tileSettings, setTileSettings] = useState(() => {
    const saved = localStorage.getItem('pos_tile_settings');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F8') {
        e.preventDefault();
        setIsEditMode((prev) => {
          const newState = !prev;
          if (newState) {
            toast('🎨 وضع التخصيص مفعل. اسحب المربعات لترتيبها أو انقر للتعديل.', 'info');
          } else {
            setActiveTileId(null);
            toast('✅ تم حفظ التعديلات.', 'success');
          }
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toast]);

  const registerTile = (id, label, icon) => {
    setRegisteredTiles(prev => ({
      ...prev,
      [id]: { label, icon }
    }));
  };

  const unregisterTile = (id) => {
    setRegisteredTiles(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const swapTiles = (id1, id2) => {
    if (id1 === id2) return;
    
    setTileSettings((prev) => {
      const settings1 = prev[id1] || {};
      const settings2 = prev[id2] || {};
      
      const order1 = settings1.order || 0;
      const order2 = settings2.order || 0;

      // Swap logic: if both same order (e.g. 0), we need to ensure they diverge
      const newSettings = {
        ...prev,
        [id1]: { ...settings1, order: order2 || order1 + 1 },
        [id2]: { ...settings2, order: order1 || order2 - 1 }
      };
      
      localStorage.setItem('pos_tile_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const updateTile = (id, settings) => {
    setTileSettings((prev) => {
      const newSettings = {
        ...prev,
        [id]: { ...prev[id], ...settings }
      };
      localStorage.setItem('pos_tile_settings', JSON.stringify(newSettings));
      return newSettings;
    });
  };

  const resetTiles = () => {
    setTileSettings({});
    localStorage.removeItem('pos_tile_settings');
    toast('🔄 تم إعادة تعيين جميع المربعات للوضع الافتراضي.', 'success');
    window.location.reload(); // Hard reload to clear component states if needed
  };

  const getTileConfig = (id, defaults) => {
    return {
      color: tileSettings[id]?.color || defaults.color || 'cobalt',
      size: tileSettings[id]?.size || defaults.size || 'tile-sq-md',
      order: tileSettings[id]?.order || 0,
      ...tileSettings[id]
    };
  };

  return (
    <TileContext.Provider value={{ 
      isEditMode, 
      updateTile, 
      getTileConfig, 
      setIsEditMode,
      registeredTiles,
      registerTile,
      unregisterTile,
      resetTiles,
      tileSettings,
      activeTileId,
      setActiveTileId,
      swapTiles
    }}>
      {children}
    </TileContext.Provider>
  );
};

export const useTileCustomizer = () => {
  const context = useContext(TileContext);
  if (!context) {
    throw new Error('useTileCustomizer must be used within a TileProvider');
  }
  return context;
};
