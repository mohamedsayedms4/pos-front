import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTileCustomizer } from '../../context/TileContext';

const StatTile = ({ id, label, value, subtitle, icon, defaults = {}, onClick, to, style = {}, className = "", children }) => {
  const navigate = useNavigate();
  const { 
    isEditMode, 
    getTileConfig, 
    registerTile, 
    unregisterTile, 
    setActiveTileId,
    swapTiles 
  } = useTileCustomizer();
  
  const config = getTileConfig(id, defaults);

  useEffect(() => {
    registerTile(id, label, icon);
    return () => unregisterTile(id);
  }, [id, label, icon]);

  const handleDragStart = (e) => {
    if (!isEditMode) return;
    e.dataTransfer.setData('tileId', id);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    if (!isEditMode) return;
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e) => {
    if (!isEditMode) return;
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('tileId');
    if (draggedId && draggedId !== id) {
      swapTiles(draggedId, id);
    }
  };

  const handleTileClick = (e) => {
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      setActiveTileId(id);
    } else if (to) {
      navigate(to);
    } else if (onClick) {
      onClick(e);
    }
  };

  return (
    <div 
      className={`stat-card ${config.color} ${config.size} ${isEditMode ? 'editing-tile' : ''} ${className}`}
      draggable={isEditMode}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleTileClick}
      style={{ 
        position: 'relative', 
        cursor: isEditMode ? 'grab' : (onClick ? 'pointer' : 'default'),
        order: config.order || 0,
        ...style
      }}
    >
      {children ? children : (
        <>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
          {subtitle && <div className="stat-subtitle">{subtitle}</div>}
          {icon && <div className="stat-icon">{icon}</div>}
        </>
      )}
      
      {isEditMode && (
        <div className="edit-badge" style={{ position: 'absolute', top: '5px', left: '5px', fontSize: '0.8rem', zIndex: 10 }}>
          ⚙️
        </div>
      )}
    </div>
  );
};

export default StatTile;
