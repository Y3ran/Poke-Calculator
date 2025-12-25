const API_URL = 'https://pokeapi.co/api/v2';
let allPokemonNames = [];

// --- STATE MANAGEMENT ---
let battleState = {
    attacker: {
        baseStats: { atk: 100, spa: 100, spe: 100 },
        name: "Attacker",
        types: [] // Stores 'fire', 'flying', etc.
    },
    defender: {
        baseStats: { hp: 255, def: 230, spd: 230 }, // Default Boss
        name: "Ultimate Tank",
        types: []
    },
    move: {
        power: 0,
        type: 'normal',
        damageClass: 'physical',
        name: 'Tackle'
    }
};

const BOSS_STATS = { hp: 255, def: 230, spd: 230 }; 

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Load Name List for Autocomplete
    try {
        const res = await fetch(`${API_URL}/pokemon?limit=1300`);
        const data = await res.json();
        allPokemonNames = data.results.map(p => p.name);
    } catch (e) { console.error("API Error", e); }

    // 2. Setup Listeners
    setupAutocomplete(document.getElementById('attacker-search'), document.getElementById('attacker-suggestions'), 'attacker');
    setupAutocomplete(document.getElementById('defender-search'), document.getElementById('defender-suggestions'), 'defender');
    
    document.getElementById('move-search').addEventListener('change', async (e) => {
        if(e.target.value) await loadMove(e.target.value);
    });

    // 3. Attach Live Calculation to Attacker inputs
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            updateStatsAndCalc(); 
        });
    });

    // 4. Initial Load
    updateStatsAndCalc();
});

// --- CORE FUNCTIONS ---

async function loadPokemon(name, side) {
    try {
        const cleanName = name.toLowerCase().replace(' ', '-');
        const res = await fetch(`${API_URL}/pokemon/${cleanName}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();

        const stats = {};
        data.stats.forEach(s => stats[s.stat.name] = s.base_stat);
        const types = data.types.map(t => t.type.name);

        if (side === 'attacker') {
            battleState.attacker.baseStats = { 
                atk: stats['attack'], 
                spa: stats['special-attack'], 
                spe: stats['speed'] 
            };
            battleState.attacker.name = data.name;
            battleState.attacker.types = types;
            
            // Visuals
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('attacker-img').src = sprite;
            document.getElementById('attacker-name-display').textContent = data.name;
            
            // Render Types Badge
            const typeContainer = document.getElementById('attacker-types');
            typeContainer.innerHTML = '';
            types.forEach(t => {
                const span = document.createElement('span');
                span.className = 'type-span';
                span.textContent = t;
                typeContainer.appendChild(span);
            });

            populateAbilities('attacker-ability', data.abilities);
            
        } else {
            // Defender Side
            battleState.defender.baseStats = { 
                hp: stats['hp'], 
                def: stats['defense'], 
                spd: stats['special-defense'] 
            };
            battleState.defender.name = data.name;
            battleState.defender.types = types;
            
            const sprite = data.sprites.other.home.front_default || data.sprites.front_default;
            document.getElementById('defender-img').src = sprite;
            document.getElementById('defender-name-display').textContent = data.name;
            
            populateAbilities('defender-ability', data.abilities);
        }

        updateStatsAndCalc();

    } catch (err) { console.error(err); }
}

async function loadMove(name) {
    try {
        const cleanName = name.trim().toLowerCase().replace(' ', '-');
        const res = await fetch(`${API_URL}/move/${cleanName}`);
        if (!res.ok) throw new Error('Move not found');
        const data = await res.json();

        battleState.move = {
            name: data.name,
            power: data.power || 0,
            type: data.type.name,
            damageClass: data.damage_class.name
        };

        document.getElementById('move-info-display').textContent = 
            `${data.name} (${data.type.name.toUpperCase()} / ${data.damage_class.name})`;
        
        updateStatsAndCalc();

    } catch (err) { console.error(err); }
}

function populateAbilities(selectId, abilities) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Standard</option>';
    abilities.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.ability.name;
        opt.textContent = a.ability.name.replace('-', ' ');
        select.appendChild(opt);
    });
}

// --- MATH ENGINE ---

function calcStat(base, iv, ev, level, natureMult, isHP) {
    if (isHP) {
        if (base === 1) return 1; 
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    } else {
        const core = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
        return Math.floor(core * natureMult);
    }
}

function updateStatsAndCalc() {
    // 1. Calculate Attacker Stats (From Sliders)
    const getVal = (id) => parseInt(document.getElementById(id).value) || 0;
    const getFloat = (id) => parseFloat(document.getElementById(id).value) || 1.0;

    const atkTotal = calcStat(battleState.attacker.baseStats.atk, getVal('atk-iv'), getVal('atk-ev'), 100, getFloat('atk-nature'), false);
    const spaTotal = calcStat(battleState.attacker.baseStats.spa, getVal('spa-iv'), getVal('spa-ev'), 100, getFloat('spa-nature'), false);
    
    document.getElementById('atk-total').textContent = atkTotal;
    document.getElementById('spa-total').textContent = spaTotal;

    // 2. Calculate Defender Stats (AUTO MAX)
    // We assume: Lvl 100, IV 31, EV 252, Nature 1.1 (Beneficial) for Defenses
    const defHp = calcStat(battleState.defender.baseStats.hp, 31, 252, 100, 1, true);
    const defDef = calcStat(battleState.defender.baseStats.def, 31, 252, 100, 1.1, false);
    const defSpd = calcStat(battleState.defender.baseStats.spd, 31, 252, 100, 1.1, false);

    // Update Read-Only Display
    document.getElementById('def-hp-display').textContent = defHp;
    document.getElementById('def-def-display').textContent = defDef;
    document.getElementById('def-spd-display').textContent = defSpd;

    // 3. Run Battle Calc
    calculateDamage({ atkTotal, spaTotal }, { hp: defHp, def: defDef, spd: defSpd });
}

function calculateDamage(attackerStats, defenderStats) {
    const move = battleState.move;
    
    if (move.power === 0) {
        document.getElementById('log-text').textContent = "Status move or no power selected.";
        document.getElementById('damage-percent').textContent = "0%";
        document.getElementById('hits-to-ko').textContent = "Hits to KO: -";
        return;
    }

    // A. Stats
    let A = (move.damageClass === 'physical') ? attackerStats.atkTotal : attackerStats.spaTotal;
    let D = (move.damageClass === 'physical') ? defenderStats.def : defenderStats.spd;
    
    // B. Abilities
    const atkAbility = document.getElementById('attacker-ability').value;
    const defAbility = document.getElementById('defender-ability').value;

    if (atkAbility === 'huge-power' || atkAbility === 'pure-power') A *= 2;
    if (defAbility === 'fur-coat' && move.damageClass === 'physical') D *= 2;
    if (defAbility === 'ice-scales' && move.damageClass === 'special') D *= 2;

    // C. Base Damage
    const level = 100;
    let damage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * move.power * A / D) / 50) + 2;

    // D. Modifiers
    
    // 1. STAB (Same Type Attack Bonus)
    let stabText = "";
    if (battleState.attacker.types.includes(move.type)) {
        damage = Math.floor(damage * 1.5);
        stabText = "(STAB)";
    }

    // 2. Ability Defense
    if ((defAbility === 'multiscale' || defAbility === 'shadow-shield') && defenderStats.hp > 0) {
        damage = Math.floor(damage * 0.5);
    }

    // E. Ranges
    const minDmg = Math.floor(damage * 0.85);
    const maxDmg = damage;

    // F. Results
    const minPct = ((minDmg / defenderStats.hp) * 100).toFixed(1);
    const maxPct = ((maxDmg / defenderStats.hp) * 100).toFixed(1);
    
    const minHits = Math.ceil(defenderStats.hp / maxDmg);
    const maxHits = Math.ceil(defenderStats.hp / minDmg);

    // Update UI
    document.getElementById('damage-percent').textContent = `${minPct}% - ${maxPct}%`;
    document.getElementById('hits-to-ko').textContent = `Hits to KO: ${minHits} - ${maxHits}`;
    document.getElementById('log-text').innerHTML = `
        Dealt <b>${minDmg} - ${maxDmg}</b> damage ${stabText} to <b>${defenderStats.hp} HP</b>. <br>
        <small>(Atk Stat: ${A} vs Def Stat: ${D})</small>
    `;
}

// --- UTILS ---

function setupAutocomplete(input, list, side) {
    input.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        list.innerHTML = '';
        if (!val) { list.style.display = 'none'; return; }
        
        const matches = allPokemonNames.filter(n => n.startsWith(val)).slice(0, 5);
        if (matches.length > 0) {
            list.style.display = 'block';
            matches.forEach(name => {
                const div = document.createElement('div');
                div.textContent = name;
                div.onclick = () => {
                    input.value = name;
                    list.style.display = 'none';
                    loadPokemon(name, side);
                };
                list.appendChild(div);
            });
        } else { list.style.display = 'none'; }
    });

    document.addEventListener('click', e => {
        if (e.target !== input) list.style.display = 'none';
    });
}

async function setDefenderPreset(name) {
    document.getElementById('defender-search').value = name;
    await loadPokemon(name, 'defender');
}

function resetBoss() {
    battleState.defender.baseStats = { ...BOSS_STATS };
    battleState.defender.name = "Ultimate Tank";
    battleState.defender.types = ['bug', 'rock']; 
    
    document.getElementById('defender-search').value = "";
    document.getElementById('defender-name-display').textContent = "BOSS: ULTIMATE TANK";
    document.getElementById('defender-img').src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/213.png";
    document.getElementById('defender-ability').innerHTML = '<option value="">Standard</option>';
    
    updateStatsAndCalc();
}
