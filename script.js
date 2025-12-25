const API_URL = 'https://pokeapi.co/api/v2';
let allPokemonNames = [];
let currentLevel = 100; // Default to Level 100 (Singles standard)

// --- CONFIGURATION: TYPE ENHANCING ITEMS (1.2x) ---
const TYPE_BOOST_ITEMS = {
    'silk-scarf': 'normal',
    'charcoal': 'fire',
    'mystic-water': 'water',
    'magnet': 'electric',
    'miracle-seed': 'grass',
    'never-melt-ice': 'ice',
    'black-belt': 'fighting',
    'poison-barb': 'poison',
    'soft-sand': 'ground',
    'sharp-beak': 'flying',
    'twisted-spoon': 'psychic',
    'silver-powder': 'bug',
    'hard-stone': 'rock',
    'spell-tag': 'ghost',
    'dragon-fang': 'dragon',
    'black-glasses': 'dark',
    'metal-coat': 'steel',
    'fairy-feather': 'fairy'
};

// --- BATTLE STATE MANAGEMENT ---
let battleState = {
    attacker: {
        baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        name: "Attacker",
        types: [], // e.g. ['electric']
        moveListUrl: "" 
    },
    defender: {
        baseStats: { hp: 255, def: 230, spd: 230 }, // Default Boss Stats
        name: "Ultimate Tank",
    },
    move: {
        name: "Tackle",
        power: 40,
        type: "normal",
        damageClass: "physical"
    }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch Global Pokemon List for Autocomplete
    try {
        const res = await fetch(`${API_URL}/pokemon?limit=1300`);
        const data = await res.json();
        allPokemonNames = data.results.map(p => p.name);
    } catch(e) { console.error("Error fetching Pokemon list:", e); }

    // 2. Setup Event Listeners
    setupAutocomplete('attacker-search', 'attacker-suggestions', 'attacker');
    setupAutocomplete('defender-search', 'defender-suggestions', 'defender');
    setupMoveSearch();

    // 3. Sync Sliders with Number Inputs
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    stats.forEach(stat => {
        const slider = document.getElementById(`${stat}-ev`);
        const numInput = document.getElementById(`${stat}-ev-num`);
        
        if(!slider) return; 

        // Slider moves -> Update Number
        slider.addEventListener('input', (e) => {
            numInput.value = e.target.value;
            recalcAll();
        });
        
        // Number changes -> Update Slider (with validation)
        numInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if(isNaN(val)) val = 0;
            if(val > 252) val = 252; 
            if(val < 0) val = 0;
            slider.value = val;
            recalcAll();
        });
    });

    // 4. General Input Listeners (Selects, IVs, Friendship)
    document.querySelectorAll('select, input.iv-input, #friendship-val').forEach(el => {
        el.addEventListener('change', recalcAll);
        el.addEventListener('input', recalcAll);
    });

    // 5. Item Change Listener (For visual status badges)
    document.getElementById('attacker-item').addEventListener('change', updateStatusVisuals);

    // 6. Initial Calculation
    recalcAll();
});

// --- LEVEL CONTROL ---
function setLevel(lvl) {
    currentLevel = lvl;
    // Toggle active visual class
    document.getElementById('lvl-100-btn').classList.toggle('active', lvl===100);
    document.getElementById('lvl-50-btn').classList.toggle('active', lvl===50);
    recalcAll();
}

// --- API DATA LOADING ---

async function loadPokemon(name, side) {
    try {
        const cleanName = name.toLowerCase().replace(' ', '-');
        const res = await fetch(`${API_URL}/pokemon/${cleanName}`);
        if(!res.ok) throw new Error('Not found');
        const data = await res.json();

        // Extract Stats
        const stats = {};
        data.stats.forEach(s => stats[s.stat.name] = s.base_stat);

        if(side === 'attacker') {
            battleState.attacker.baseStats = stats;
            battleState.attacker.name = data.name;
            battleState.attacker.types = data.types.map(t => t.type.name);
            battleState.attacker.moveListUrl = `${API_URL}/pokemon/${data.id}`;

            // Update Attacker UI
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('attacker-img').src = sprite;
            document.getElementById('attacker-name-display').textContent = data.name;
            populateAbilities('attacker-ability', data.abilities);
            
            // Enable Move Search
            const moveInput = document.getElementById('move-search');
            moveInput.disabled = false;
            moveInput.placeholder = `Search ${data.name}'s moves...`;
            moveInput.value = '';

        } else {
            // Update Defender UI
            battleState.defender.baseStats = stats;
            battleState.defender.name = data.name;
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('defender-img').src = sprite;
            document.getElementById('defender-name-display').textContent = data.name;
        }
        recalcAll();

    } catch(e) { console.error(e); }
}

async function setupMoveSearch() {
    const input = document.getElementById('move-search');
    const list = document.getElementById('move-suggestions');

    // Simple Autocomplete for Moves
    input.addEventListener('change', async () => {
        if(input.value.length > 2) await loadMove(input.value);
    });
}

async function loadMove(name) {
    try {
        const cleanName = name.trim().toLowerCase().replace(' ', '-');
        const res = await fetch(`${API_URL}/move/${cleanName}`);
        if(!res.ok) throw new Error('Move not found');
        const data = await res.json();

        battleState.move = {
            name: data.name,
            power: data.power || 0,
            type: data.type.name,
            damageClass: data.damage_class.name
        };

        document.getElementById('move-info-display').textContent = `${data.name} (${data.damage_class.name})`;
        
        // Show Friendship input if move is Return/Frustration
        const isFriendshipMove = ['return', 'frustration'].includes(cleanName);
        document.getElementById('friendship-row').style.display = isFriendshipMove ? 'flex' : 'none';

        recalcAll();
    } catch(e) { 
        console.error(e); 
        document.getElementById('log-text').textContent = "Move not found in API.";
    }
}

// --- STAT CALCULATION ENGINE ---

function calcStat(base, iv, ev, level, natureMult, isHP) {
    if(!base) return 0;
    if(isHP) {
        if(base === 1) return 1; // Shedinja case
        return Math.floor( ((2*base + iv + Math.floor(ev/4)) * level)/100 ) + level + 10;
    } else {
        const core = Math.floor( ((2*base + iv + Math.floor(ev/4)) * level)/100 ) + 5;
        return Math.floor(core * natureMult);
    }
}

function updateStats() {
    // Helper functions to read DOM
    const getVal = (id) => parseInt(document.getElementById(id).value) || 0;
    const getEv = (id) => parseInt(document.getElementById(id).value) || 0;
    const getNature = (id) => parseFloat(document.getElementById(id).value) || 1.0;

    // 1. Calculate Attacker Real Stats
    const bases = battleState.attacker.baseStats;
    if(!bases.hp) return null; // Data not ready

    const atk = calcStat(bases.attack, getVal('atk-iv'), getEv('atk-ev'), currentLevel, getNature('atk-nature'), false);
    const spa = calcStat(bases['special-attack'], getVal('spa-iv'), getEv('spa-ev'), currentLevel, getNature('spa-nature'), false);
    
    // Update Totals on Screen
    document.getElementById('hp-total').textContent = calcStat(bases.hp, getVal('hp-iv'), getEv('hp-ev'), currentLevel, 1, true);
    document.getElementById('atk-total').textContent = atk;
    document.getElementById('def-total').textContent = calcStat(bases.defense, getVal('def-iv'), getEv('def-ev'), currentLevel, getNature('def-nature'), false);
    document.getElementById('spa-total').textContent = spa;
    document.getElementById('spd-total').textContent = calcStat(bases['special-defense'], getVal('spd-iv'), getEv('spd-ev'), currentLevel, getNature('spd-nature'), false);
    document.getElementById('spe-total').textContent = calcStat(bases.speed, getVal('spe-iv'), getEv('spe-ev'), currentLevel, getNature('spe-nature'), false);

    // 2. Calculate Defender Real Stats (Auto-Max Bulk)
    const defBases = battleState.defender.baseStats;
    // Assumption: 31 IV, 252 EV, Beneficial Nature (1.1)
    const dHp = calcStat(defBases.hp, 31, 252, currentLevel, 1, true);
    const dDef = calcStat(defBases.defense, 31, 252, currentLevel, 1.1, false);
    const dSpd = calcStat(defBases.spd || defBases['special-defense'], 31, 252, currentLevel, 1.1, false);

    // Update Defender Info Panel
    document.getElementById('def-hp-display').textContent = dHp;
    document.getElementById('def-def-display').textContent = dDef;
    document.getElementById('def-spd-display').textContent = dSpd;

    return { 
        atkObj: { atk, spa }, 
        defObj: { hp: dHp, def: dDef, spd: dSpd } 
    };
}

// --- DAMAGE CALCULATION (THE CORE) ---

function recalcAll() {
    updateStatusVisuals();
    const stats = updateStats();
    if(!stats) return;

    const move = battleState.move;
    const item = document.getElementById('attacker-item').value;
    const ability = document.getElementById('attacker-ability').value;
    const friendship = parseInt(document.getElementById('friendship-val').value) || 255;

    // --- STEP 1: BASE POWER ---
    let power = move.power;

    // Facade Logic: 70 -> 140 if status
    if(move.name === 'facade' && (item === 'flame-orb' || item === 'toxic-orb')) {
        power = 140; 
    }
    // Friendship Logic
    if(move.name === 'return') power = Math.max(1, Math.floor(friendship / 2.5));
    if(move.name === 'frustration') power = Math.max(1, Math.floor((255 - friendship) / 2.5));

    if(power === 0) {
        document.getElementById('log-text').textContent = "Status move selected (0 Damage).";
        document.getElementById('damage-percent').textContent = "0%";
        document.getElementById('hits-to-ko').textContent = "-";
        return;
    }

    // --- STEP 2: SELECT OFFENSIVE & DEFENSIVE STATS ---
    let A = (move.damageClass === 'physical') ? stats.atkObj.atk : stats.atkObj.spa;
    let D = (move.damageClass === 'physical') ? stats.defObj.def : stats.defObj.spd;

    // --- STEP 3: APPLY MODIFIERS TO STATS ---
    
    // Guts: 1.5x Attack if statused
    const hasStatus = (item === 'flame-orb' || item === 'toxic-orb');
    if(ability === 'guts' && hasStatus && move.damageClass === 'physical') {
        A = Math.floor(A * 1.5);
    }
    
    // Burn Drop: 0.5x Attack (Ignored by Guts and Facade)
    if(item === 'flame-orb' && ability !== 'guts' && move.name !== 'facade' && move.damageClass === 'physical') {
        A = Math.floor(A * 0.5); 
    }

    // Choice Items
    if(item === 'choice-band' && move.damageClass === 'physical') A = Math.floor(A * 1.5);
    if(item === 'choice-specs' && move.damageClass === 'special') A = Math.floor(A * 1.5);

    // --- STEP 4: DAMAGE FORMULA ---
    // ((2 * Level / 5 + 2) * Power * A / D) / 50 + 2
    let damage = Math.floor( Math.floor( Math.floor(2 * currentLevel / 5 + 2) * power * A / D ) / 50 ) + 2;

    // --- STEP 5: FINAL MULTIPLIERS ---

    // STAB (1.5x)
    let modifiersLog = [];
    if(battleState.attacker.types.includes(move.type)) {
        damage = Math.floor(damage * 1.5);
        modifiersLog.push("STAB");
    }

    // Type Enhancing Items (1.2x) e.g. Charcoal
    if(TYPE_BOOST_ITEMS[item] === move.type) {
        damage = Math.floor(damage * 1.2);
        modifiersLog.push(item);
    }

    // Life Orb (1.3x)
    if(item === 'life-orb') {
        damage = Math.floor(damage * 1.3);
        modifiersLog.push("Life Orb");
    }

    // --- STEP 6: RANGES (0.85 - 1.00) ---
    const minDmg = Math.floor(damage * 0.85);
    const maxDmg = damage;

    // --- STEP 7: UI UPDATE ---
    const hp = stats.defObj.hp;
    const minPct = ((minDmg / hp) * 100).toFixed(1);
    const maxPct = ((maxDmg / hp) * 100).toFixed(1);
    
    let minHits = (maxDmg > 0) ? Math.ceil(hp / maxDmg) : 0;
    let maxHits = (minDmg > 0) ? Math.ceil(hp / minDmg) : 0;
    if(minDmg === 0) { minHits=0; maxHits=0; }

    document.getElementById('damage-percent').textContent = `${minPct}% - ${maxPct}%`;
    document.getElementById('hits-to-ko').textContent = (minDmg > 0) ? `Hits to KO: ${minHits} - ${maxHits}` : "Hits to KO: -";

    const modString = modifiersLog.length ? `(${modifiersLog.join(', ')})` : "";
    
    document.getElementById('log-text').innerHTML = `
        <b>${move.name.toUpperCase()}</b> (${power} BP) <small>${modString}</small><br>
        Stats: ${A} (Atk/SpA) vs ${D} (Def/SpD)<br>
        Damage: ${minDmg} - ${maxDmg}
    `;
}

// --- VISUAL HELPERS ---

function updateStatusVisuals() {
    const item = document.getElementById('attacker-item').value;
    const badge = document.getElementById('attacker-status-badge');
    
    if(item === 'flame-orb') {
        badge.textContent = 'BRN';
        badge.className = 'status-badge status-burn';
    } else if (item === 'toxic-orb') {
        badge.textContent = 'PSN';
        badge.className = 'status-badge status-psn';
    } else {
        badge.className = 'hidden';
    }
}

function populateAbilities(id, abilities) {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">Standard</option>';
    abilities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.ability.name;
        opt.textContent = a.ability.name;
        sel.appendChild(opt);
    });
}

function setupAutocomplete(inputId, listId, side) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);
    
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        list.innerHTML = '';
        if(val.length < 2) { list.style.display = 'none'; return; }
        
        const matches = allPokemonNames.filter(n => n.startsWith(val)).slice(0,5);
        if(matches.length) {
            list.style.display = 'block';
            matches.forEach(name => {
                const d = document.createElement('div');
                d.textContent = name;
                d.onclick = () => {
                    input.value = name;
                    list.style.display = 'none';
                    loadPokemon(name, side);
                };
                list.appendChild(d);
            });
        } else { list.style.display = 'none'; }
    });
    
    // Hide list when clicking outside
    document.addEventListener('click', e => {
        if(e.target !== input) list.style.display = 'none';
    });
}

async function setDefenderPreset(name) {
    document.getElementById('defender-search').value = name;
    loadPokemon(name, 'defender');
}

function resetBoss() {
    battleState.defender.baseStats = { hp: 255, def: 230, spd: 230 };
    document.getElementById('defender-name-display').textContent = "BOSS";
    document.getElementById('defender-img').src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/213.png";
    recalcAll();
}
