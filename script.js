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
    document.
