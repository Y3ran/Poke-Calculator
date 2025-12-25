:root {
    --bg-color: #f0f2f5;
    --card-bg: #ffffff;
    --primary-blue: #3b82f6;
    --accent-pink: #ec4899;
    --text-dark: #1f2937;
    --status-burn: #ef4444;
    --status-psn: #a855f7;
}

body {
    font-family: 'Roboto', sans-serif;
    background: var(--bg-color);
    color: var(--text-dark);
    margin: 0; padding: 20px;
    display: flex; flex-direction: column; align-items: center;
}

header { 
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; max-width: 1100px; margin-bottom: 20px;
}
.logo-text-blue { font-size: 1.8rem; font-weight: 900; color: var(--primary-blue); }
.logo-text-pink { font-size: 1.8rem; font-weight: 900; color: var(--accent-pink); }

.toggle-group {
    display: flex; align-items: center; gap: 10px; background: white; padding: 5px;
    border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.toggle-btn {
    padding: 5px 15px; cursor: pointer; border-radius: 6px; font-weight: bold; color: #666;
}
.toggle-btn.active {
    background: var(--primary-blue); color: white;
}

/* LAYOUT */
main { width: 100%; max-width: 1100px; }
.engine-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 20px; margin-top: 20px; }
.card { background: var(--card-bg); border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

/* ARENA */
.arena-card { border-top: 5px solid var(--primary-blue); }
.battle-display { display: flex; justify-content: space-around; align-items: center; }

.slot-circle {
    width: 120px; height: 120px; background: #e0f2fe; border-radius: 50%;
    border: 4px solid white; display: flex; justify-content: center; align-items: center;
    position: relative; box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    overflow: hidden;
}
.tank-circle { background: #fee2e2; }
.slot-circle img { width: 110%; height: 110%; object-fit: contain; }

.status-badge {
    position: absolute; bottom: 0; right: 0;
    padding: 2px 8px; border-radius: 10px; color: white;
    font-size: 0.7rem; font-weight: bold; text-transform: uppercase;
}
.status-burn { background: var(--status-burn); }
.status-psn { background: var(--status-psn); }
.hidden { display: none; }

.vs-column { text-align: center; }
.damage-badge { font-size: 2.5rem; font-weight: 900; color: var(--accent-pink); }

/* CONTROLS */
.input-group { margin-bottom: 12px; position: relative; }
.row-group { display: flex; gap: 10px; margin-bottom: 12px; }
.half { flex: 1; }

label { display: block; font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
input, select { width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }

/* STATS ROW IMPROVED */
.stats-panel { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px; }
.stats-header { display: flex; gap: 5px; font-size: 0.7rem; font-weight: bold; color: #6b7280; margin-bottom: 10px; text-align: center; }
.stats-header span:nth-child(1) { width: 30px; text-align: left; } /* Stat */
.stats-header span:nth-child(2) { flex-grow: 1; } /* Slider */
.stats-header span:nth-child(3) { width: 55px; } /* EV */
.stats-header span:nth-child(4) { width: 50px; } /* IV */
.stats-header span:nth-child(5) { width: 55px; } /* Nature */
.stats-header span:nth-child(6) { width: 45px; text-align: right;} /* Total */


.stat-row { display: flex; align-items: center; gap: 5px; margin-bottom: 8px; }
.stat-label { width: 30px; font-weight: bold; font-size: 0.8rem; }

.ev-slider { flex-grow: 1; height: 6px; cursor: pointer; }
/* Increased widths for better visibility */
.ev-number { width: 55px !important; text-align: center; font-weight: 500; }
.iv-input { width: 50px !important; text-align: center; background: #fff; }
.nature-select { width: 55px !important; padding: 4px 2px; text-align: center; }
.nature-placeholder { width: 55px; } /* Spacer for HP row */

.stat-total { width: 45px; text-align: right; font-weight: 900; color: var(--primary-blue); font-size: 0.95rem; }

/* READ ONLY PANEL */
.info-panel { border-left: 4px solid var(--accent-pink); background: #fff; }
.stat-info-row { display: flex; justify-content: space-between; margin: 8px 0; border-bottom: 1px solid #f0f0f0; padding-bottom: 4px;}
.info-note { font-size: 0.7rem; color: #999; margin-top: 10px; font-style: italic; }

/* CHIPS */
.quick-picks { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 15px; }
.chip { background: white; border: 1px solid #d1d5db; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.chip:hover { border-color: var(--primary-blue); color: var(--primary-blue); }
.boss-chip { background: #1e293b; color: #facc15; border: none; }

/* SUGGESTIONS */
.suggestions-list {
    position: absolute; top: 100%; left: 0; right: 0;
    background: white; border: 1px solid #e5e7eb; z-index: 100;
    max-height: 200px; overflow-y: auto; border-radius: 0 0 6px 6px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); display: none;
}
.suggestions-list div { padding: 10px; cursor: pointer; border-bottom: 1px solid #f3f4f6; text-transform: capitalize; }
.suggestions-list div:hover { background: #f0f9ff; color: var(--primary-blue); }

@media (max-width: 800px) {
    .engine-grid { grid-template-columns: 1fr; }
    .battle-display { flex-direction: column; gap: 20px; }
}
