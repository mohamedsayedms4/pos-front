const fs = require('fs');
const path = 'src/main/resources/react-app/src/assets/css/main.css';

const styles = `

/* ─── Tile Customizer Sidebar ─── */
.tile-sidebar {
  position: fixed;
  top: 0;
  right: -400px;
  width: 400px;
  height: 100vh;
  background: var(--bg-modal, #121212);
  border-left: 2px solid var(--metro-blue);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 50px rgba(0,0,0,0.8);
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: "Cairo", sans-serif;
  direction: rtl;
}

.tile-sidebar.active {
  right: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-main);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-header h3 {
  font-weight: 300;
  letter-spacing: 1px;
  margin: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.sidebar-section {
  margin-bottom: 25px;
  padding-bottom: 20px;
  border-bottom: 1px dashed #333;
}

.tile-config-item {
  background: #1a1a1a;
  padding: 15px;
  margin-bottom: 15px;
  border-left: 3px solid var(--metro-blue);
}

.tile-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
  font-weight: 600;
}

.tile-icon {
  font-size: 1.2rem;
  color: var(--metro-blue);
}

.control-group {
  margin-bottom: 15px;
}

.control-group label {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 10px;
  text-transform: uppercase;
}

.color-grid-mini {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 5px;
}

.color-swatch-mini {
  aspect-ratio: 1;
  cursor: pointer;
  border: 1px solid transparent;
}

.color-swatch-mini.active {
  border-color: #fff;
  transform: scale(1.1);
}

.size-selector-mini {
  display: flex;
  gap: 5px;
}

.size-tag {
  background: #222;
  border: 1px solid #333;
  color: #888;
  padding: 4px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.1s;
}

.size-tag.active {
  background: var(--metro-blue);
  color: #fff;
  border-color: var(--metro-blue);
}

.order-controls-mini {
  display: flex;
  align-items: center;
  gap: 15px;
}

.order-controls-mini button {
  background: #333;
  border: none;
  color: #fff;
  width: 30px;
  height: 30px;
  cursor: pointer;
  border-radius: 4px;
}

.order-controls-mini button:hover { background: #444; }

.order-val {
  font-size: 1.1rem;
  font-weight: 700;
  min-width: 20px;
  text-align: center;
}

.sidebar-footer {
  padding: 20px;
  background: #0d0d0d;
  border-top: 1px solid var(--border-main);
}

.w-100 { width: 100%; }
`;

try {
    fs.appendFileSync(path, styles, 'utf8');
    console.log('Sidebar styles appended successfully.');
    
    // Also clean null bytes just in case
    const content = fs.readFileSync(path, 'utf8');
    if (content.includes('\u0000')) {
        fs.writeFileSync(path, content.replace(/\u0000/g, ''), 'utf8');
        console.log('Null bytes cleaned.');
    }
} catch (err) {
    console.error('Error modifying CSS:', err);
    process.exit(1);
}
