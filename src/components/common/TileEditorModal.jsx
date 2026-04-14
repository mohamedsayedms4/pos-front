import React from 'react';
import ReactDOM from 'react-dom';
import { useTileCustomizer } from '../../context/TileContext';

const TileEditorModal = () => {
  const { 
    isEditMode, 
    activeTileId, 
    setActiveTileId, 
    registeredTiles, 
    tileSettings, 
    updateTile,
    resetTiles 
  } = useTileCustomizer();

  if (!isEditMode || !activeTileId) return null;

  const tile = registeredTiles[activeTileId];
  const settings = tileSettings[activeTileId] || {};

  const colors = [
    { name: 'Blue', class: 'blue' },
    { name: 'Emerald', class: 'emerald' },
    { name: 'Amber', class: 'amber' },
    { name: 'Rose', class: 'rose' },
    { name: 'Purple', class: 'purple' },
    { name: 'Teal', class: 'teal' },
    { name: 'Magenta', class: 'magenta' },
    { name: 'Cobalt', class: 'cobalt' }
  ];

  const sizes = [
    { name: 'صغير', class: 'tile-sq-sm' },
    { name: 'وسط', class: 'tile-wd-sm' },
    { name: 'كبير', class: 'tile-sq-md' }
  ];

  return ReactDOM.createPortal(
    <div className="modal-overlay active" onClick={() => setActiveTileId(null)}>
      <div className="modal tile-editor-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>تخصيص المربع: {tile?.label}</h3>
          <button className="modal-close" onClick={() => setActiveTileId(null)}>✕</button>
        </div>
        
        <div className="modal-body" style={{ padding: '25px' }}>
          <div className="picker-section">
            <label style={{ display: 'block', marginBottom: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>اللون</label>
            <div className="color-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {colors.map(c => (
                <div 
                  key={c.class} 
                  className={`color-swatch ${c.class} ${settings.color === c.class ? 'active' : ''}`}
                  onClick={() => updateTile(activeTileId, { color: c.class })}
                  style={{ height: '50px', borderRadius: '4px' }}
                />
              ))}
            </div>
          </div>

          <div className="picker-section" style={{ marginTop: '25px' }}>
            <label style={{ display: 'block', marginBottom: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>الحجم</label>
            <div className="size-options" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {sizes.map(s => (
                <button 
                  key={s.class}
                  className={`size-btn ${settings.size === s.class ? 'active' : ''}`}
                  onClick={() => updateTile(activeTileId, { size: s.class })}
                  style={{ padding: '12px' }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="picker-section" style={{ marginTop: '25px' }}>
            <label style={{ display: 'block', marginBottom: '15px', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>الترتيب</label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', padding: '15px', borderRadius: '4px' }}>
              <button 
                className="order-btn" 
                onClick={() => updateTile(activeTileId, { order: (settings.order || 0) - 1 })}
                style={{ width: '40px', height: '40px', fontSize: '1.2rem', background: '#333', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                🔼
              </button>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, minWidth: '40px', textAlign: 'center' }}>
                {settings.order || 0}
              </div>
              <button 
                className="order-btn" 
                onClick={() => updateTile(activeTileId, { order: (settings.order || 0) + 1 })}
                style={{ width: '40px', height: '40px', fontSize: '1.2rem', background: '#333', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                🔽
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '10px' }}>
              استخدم الأسهم لتحريك المربع للأمام أو الخلف (مفيد جداً على الموبايل).
            </p>
          </div>

          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px dashed #333' }}>
            <button className="btn btn-ghost w-100" onClick={resetTiles} style={{ color: 'var(--metro-red)', fontSize: '0.85rem' }}>
              🔄 إعادة ضبط كافة المربعات للأصل
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: 'none', paddingBottom: '25px' }}>
           <button className="btn btn-primary w-100" onClick={() => setActiveTileId(null)}>
             تم
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TileEditorModal;
