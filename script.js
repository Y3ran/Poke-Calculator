const API_URL = 'https://pokeapi.co/api/v2';
let allPokemonNames = [];
let currentLevel = 100;

// --- CONFIGURATION: TYPE ENHANCING ITEMS (1.2x) ---
const TYPE_BOOST_ITEMS = {
    'silk-scarf': 'normal', 'charcoal': 'fire', 'mystic-water': 'water', 'magnet': 'electric',
    'miracle-seed': 'grass', 'never-melt-ice': 'ice', 'black-belt': 'fighting', 'poison-barb': 'poison',
    'soft-sand': 'ground', 'sharp-beak': 'flying', 'twisted-spoon': 'psychic', 'silver-powder': 'bug',
    'hard-stone': 'rock', 'spell-tag': 'ghost', 'dragon-fang': 'dragon', 'black-glasses': 'dark',
    'metal-coat': 'steel', 'fairy-feather': 'fairy'
};

// --- BATTLE STATE MANAGEMENT ---
let battleState = {
    attacker: {
        baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        name: "Attacker",
        types: [],
        availableMoves: [] // Lista de movimientos del atacante actual
    },
    defender: {
        // CORREGIDO: Usamos las claves oficiales de la API para evitar el error de Def: 0
        baseStats: { hp: 255, defense: 230, 'special-defense': 230 }, 
        name: "Ultimate Tank",
    },
    move: {
        name: "Tackle", power: 40, type: "normal", damageClass: "physical"
    }
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Cargar lista global de nombres
    try {
        const res = await fetch(`${API_URL}/pokemon?limit=1300`);
        const data = await res.json();
        allPokemonNames = data.results.map(p => p.name);
    } catch(e) { console.error("Error fetching Pokemon list:", e); }

    // 2. Configurar Autocompletados
    setupAutocomplete('attacker-search', 'attacker-suggestions', 'attacker');
    setupAutocomplete('defender-search', 'defender-suggestions', 'defender');
    setupMoveSearch(); // Ahora sí tiene la lógica completa

    // 3. Sincronizar Sliders
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    stats.forEach(stat => {
        const slider = document.getElementById(`${stat}-ev`);
        const numInput = document.getElementById(`${stat}-ev-num`);
        if(!slider) return; 

        slider.addEventListener('input', (e) => {
            numInput.value = e.target.value;
            recalcAll();
        });
        numInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if(isNaN(val)) val = 0; if(val > 252) val = 252; if(val < 0) val = 0;
            slider.value = val;
            recalcAll();
        });
    });

    // 4. Listeners generales
    document.querySelectorAll('select, input.iv-input, #friendship-val').forEach(el => {
        el.addEventListener('change', recalcAll);
        el.addEventListener('input', recalcAll);
    });

    document.getElementById('attacker-item').addEventListener('change', updateStatusVisuals);

    // 5. Carga inicial
    recalcAll();
});

// --- LEVEL CONTROL ---
function setLevel(lvl) {
    currentLevel = lvl;
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

        const stats = {};
        data.stats.forEach(s => stats[s.stat.name] = s.base_stat);

        if(side === 'attacker') {
            battleState.attacker.baseStats = stats;
            battleState.attacker.name = data.name;
            battleState.attacker.types = data.types.map(t => t.type.name);
            
            // GUARDAR MOVIMIENTOS PARA EL AUTOCOMPLETADO
            battleState.attacker.availableMoves = data.moves.map(m => m.move.name);

            // Actualizar UI
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('attacker-img').src = sprite;
            document.getElementById('attacker-name-display').textContent = data.name;
            populateAbilities('attacker-ability', data.abilities);
            
            // Habilitar búsqueda de movimientos
            const moveInput = document.getElementById('move-search');
            moveInput.disabled = false;
            moveInput.placeholder = `Search ${data.name}'s moves...`;
            moveInput.value = '';

        } else {
            battleState.defender.baseStats = stats;
            battleState.defender.name = data.name;
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('defender-img').src = sprite;
            document.getElementById('defender-name-display').textContent = data.name;
        }
        
        recalcAll();

    } catch(e) { console.error(e); }
}

// --- MOVE SEARCH ENGINE (CORREGIDO) ---
function setupMoveSearch() {
    const input = document.getElementById('move-search');
    const list = document.getElementById('move-suggestions');

    // 1. Listener para mostrar sugerencias mientras escribes
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        list.innerHTML = '';
        
        // Si no hay texto o no hay pokemon cargado, ocultar
        if(val.length < 2 || !battleState.attacker.availableMoves.length) {
            list.style.display = 'none';
            return;
        }

        // Filtrar movimientos del Pokemon actual
        const matches = battleState.attacker.availableMoves
            .filter(m => m.includes(val))
            .slice(0, 10); // Limitar a 10 resultados

        if(matches.length > 0) {
            list.style.display = 'block';
            matches.forEach(moveName => {
                const div = document.createElement('div');
                div.textContent = moveName.replace('-', ' ');
                div.onclick = () => {
                    input.value = moveName;
                    list.style.display = 'none';
                    loadMove(moveName); // Cargar datos del movimiento seleccionado
                };
                list.appendChild(div);
            });
        } else {
            list.style.display = 'none';
        }
    });

    // 2. Listener para cargar si presionas Enter o cambias el foco
    input.addEventListener('change', async () => {
        // Solo cargar si no se ha cargado ya vía click
        if(input.value.length > 2 && battleState.move.name !== input.value) {
            await loadMove(input.value);
        }
    });
    
    // Ocultar al hacer click fuera
    document.addEventListener('click', e => {
        if(e.target !== input) list.style.display = 'none';
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
        
        // Mostrar input de Amistad si es necesario
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
        if(base === 1) return 1;
        return Math.floor( ((2*base + iv + Math.floor(ev/4)) * level)/100 ) + level + 10;
    } else {
        const core = Math.floor( ((2*base + iv + Math.floor(ev/4)) * level)/100 ) + 5;
        return Math.floor(core * natureMult);
    }
}

function updateStats() {
    const getVal = (id) => parseInt(document.getElementById(id).value) || 0;
    const getEv = (id) => parseInt(document.getElementById(id).value) || 0;
    const getNature = (id) => parseFloat(document.getElementById(id).value) || 1.0;

    const bases = battleState.attacker.baseStats;
    if(!bases.hp) return null; 

    // Attacker Stats
    const atk = calcStat(bases.attack, getVal('atk-iv'), getEv('atk-ev'), currentLevel, getNature('atk-nature'), false);
    const spa = calcStat(bases['special-attack'], getVal('spa-iv'), getEv('spa-ev'), currentLevel, getNature('spa-nature'), false);
    
    document.getElementById('hp-total').textContent = calcStat(bases.hp, getVal('hp-iv'), getEv('hp-ev'), currentLevel, 1, true);
    document.getElementById('atk-total').textContent = atk;
    document.getElementById('def-total').textContent = calcStat(bases.defense, getVal('def-iv'), getEv('def-ev'), currentLevel, getNature('def-nature'), false);
    document.getElementById('spa-total').textContent = spa;
    document.getElementById('spd-total').textContent = calcStat(bases['special-defense'], getVal('spd-iv'), getEv('spd-ev'), currentLevel, getNature('spd-nature'), false);
    document.getElementById('spe-total').textContent = calcStat(bases.speed, getVal('spe-iv'), getEv('spe-ev'), currentLevel, getNature('spe-nature'), false);

    // Defender Stats (CORREGIDO PARA USAR CLAVES CORRECTAS)
    const defBases = battleState.defender.baseStats;
    // Buscamos 'defense' o 'def' por seguridad
    const baseDef = defBases.defense || defBases.def || 0; 
    const baseSpd = defBases['special-defense'] || defBases.spd || 0;
    const baseHp = defBases.hp || 0;

    const dHp = calcStat(baseHp, 31, 252, currentLevel, 1, true);
    const dDef = calcStat(baseDef, 31, 252, currentLevel, 1.1, false);
    const dSpd = calcStat(baseSpd, 31, 252, currentLevel, 1.1, false);

    document.getElementById('def-hp-display').textContent = dHp;
    document.getElementById('def-def-display').textContent = dDef;
    document.getElementById('def-spd-display').textContent = dSpd;

    return { atkObj: { atk, spa }, defObj: { hp: dHp, def: dDef, spd: dSpd } };
}

// --- DAMAGE CALCULATION ---
function recalcAll() {
    updateStatusVisuals();
    const stats = updateStats();
    
    if(!stats) {
         document.getElementById('log-text').textContent = "Waiting for attacker data...";
         return;
    }

    const move = battleState.move;
    const item = document.getElementById('attacker-item').value;
    const ability = document.getElementById('attacker-ability').value;
    const friendship = parseInt(document.getElementById('friendship-val').value) || 255;

    let power = move.power;
    if(move.name === 'facade' && (item === 'flame-orb' || item === 'toxic-orb')) power = 140; 
    if(move.name === 'return') power = Math.max(1, Math.floor(friendship / 2.5));
    if(move.name === 'frustration') power = Math.max(1, Math.floor((255 - friendship) / 2.5));

    if(power === 0) {
        document.getElementById('log-text').textContent = "Status move selected (0 Damage).";
        document.getElementById('damage-percent').textContent = "0%";
        document.getElementById('hits-to-ko').textContent = "-";
        return;
    }

    let A = (move.damageClass === 'physical') ? stats.atkObj.atk : stats.atkObj.spa;
    // Si la defensa es 0 (por error de datos), evita división por cero usando 1
    let D = (move.damageClass === 'physical') ? (stats.defObj.def || 1) : (stats.defObj.spd || 1);

    const hasStatus = (item === 'flame-orb' || item === 'toxic-orb');
    if(ability === 'guts' && hasStatus && move.damageClass === 'physical') A = Math.floor(A * 1.5);
    if(item === 'flame-orb' && ability !== 'guts' && move.name !== 'facade' && move.damageClass === 'physical') A = Math.floor(A * 0.5); 

    if(item === 'choice-band' && move.damageClass === 'physical') A = Math.floor(A * 1.5);
    if(item === 'choice-specs' && move.damageClass === 'special') A = Math.floor(A * 1.5);

    let damage = Math.floor( Math.floor( Math.floor(2 * currentLevel / 5 + 2) * power * A / D ) / 50 ) + 2;

    let modifiersLog = [];
    if(battleState.attacker.types.includes(move.type)) {
        damage = Math.floor(damage * 1.5);
        modifiersLog.push("STAB");
    }
    if(TYPE_BOOST_ITEMS[item] === move.type) {
        damage = Math.floor(damage * 1.2);
        modifiersLog.push(item);
    }
    if(item === 'life-orb') {
        damage = Math.floor(damage * 1.3);
        modifiersLog.push("Life Orb");
    }

    const minDmg = Math.floor(damage * 0.85);
    const maxDmg = damage;

    const hp = stats.defObj.hp || 1; // Evitar division por cero
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
        badge.textContent = 'BRN'; badge.className = 'status-badge status-burn';
    } else if (item === 'toxic-orb') {
        badge.textContent = 'PSN'; badge.className = 'status-badge status-psn';
    } else {
        badge.className = 'hidden';
    }
}

function populateAbilities(id, abilities) {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">Standard</option>';
    abilities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.ability.name; opt.textContent = a.ability.name; sel.appendChild(opt);
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
                    input.value = name; list.style.display = 'none'; loadPokemon(name, side);
                };
                list.appendChild(d);
            });
        } else { list.style.display = 'none'; }
    });
    
    document.addEventListener('click', e => {
        if(e.target !== input) list.style.display = 'none';
    });
}

async function setDefenderPreset(name) {
    document.getElementById('defender-search').value = name;
    loadPokemon(name, 'defender');
}

function resetBoss() {
    // CORREGIDO: Usamos claves estandar para evitar bug de Def: 0
    battleState.defender.baseStats = { hp: 255, defense: 230, 'special-defense': 230 };
    document.getElementById('defender-name-display').textContent = "BOSS";
    document.getElementById('defender-img').src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/213.png";
    recalcAll();
}
