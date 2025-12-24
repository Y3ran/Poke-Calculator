const API_URL = 'https://pokeapi.co/api/v2';
let allPokemonNames = []; // Aquí guardaremos la lista para el autocompletado

// --- 1. CONFIGURACIÓN INICIAL ---

// Estadísticas del "Jefe Final" (Frankenstein)
const ULTIMATE_TANK_STATS = {
    name: "Ultimate Tank",
    hp: 714,    // Max Blissey
    def: 614,   // Max Shuckle
    spDef: 614, // Max Shuckle
    sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/213.png" // Shuckle como icono
};

// Al cargar la página, obtenemos la lista de nombres para el autocompletado
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Pedimos 1000+ pokemon (ligero porque solo pedimos nombres y urls)
        const response = await fetch(`${API_URL}/pokemon?limit=1300`);
        const data = await response.json();
        allPokemonNames = data.results.map(p => p.name);
        console.log("Base de datos de nombres cargada.");
    } catch (e) {
        console.error("Error cargando lista de Pokémon:", e);
    }

    // Configurar eventos de autocompletado
    setupAutocomplete(document.getElementById('attackerInput'), document.getElementById('attacker-suggestions'));
    setupAutocomplete(document.getElementById('defenderInput'), document.getElementById('defender-suggestions'));
});

// --- 2. LÓGICA DE AUTOCOMPLETADO ---
function setupAutocomplete(input, listContainer) {
    input.addEventListener('input', function () {
        const val = this.value.toLowerCase();
        listContainer.innerHTML = '';

        if (!val) {
            listContainer.style.display = 'none';
            return;
        }

        // Filtramos coincidencias
        const matches = allPokemonNames.filter(name => name.startsWith(val)).slice(0, 5); // Max 5 sugerencias

        if (matches.length > 0) {
            listContainer.style.display = 'block';
            matches.forEach(name => {
                const item = document.createElement('div');
                item.textContent = name;
                item.addEventListener('click', () => {
                    input.value = name; // Poner nombre en el input
                    listContainer.style.display = 'none'; // Ocultar lista
                    // Opcional: Disparar una pre-carga de imagen aquí si quisieras
                });
                listContainer.appendChild(item);
            });
        } else {
            listContainer.style.display = 'none';
        }
    });

    // Ocultar si hacemos click fuera
    document.addEventListener('click', (e) => {
        if (e.target !== input) {
            listContainer.style.display = 'none';
        }
    });
}

// --- 3. FUNCIONES DE API Y CÁLCULO ---

async function getPokemonData(name) {
    const cleanName = name.trim().toLowerCase().replace(' ', '-');
    const response = await fetch(`${API_URL}/pokemon/${cleanName}`);
    if (!response.ok) throw new Error(`Pokémon "${name}" no encontrado`);
    return await response.json();
}

async function getMoveData(name) {
    const cleanName = name.trim().toLowerCase().replace(' ', '-');
    const response = await fetch(`${API_URL}/move/${cleanName}`);
    if (!response.ok) throw new Error(`Movimiento "${name}" no encontrado`);
    return await response.json();
}

// Función auxiliar para calcular stats al Nivel 100 con MAX bulk (IV 31, EV 252, Nature +)
function calculateMaxStat(base, isHP) {
    // Fórmula HP: floor((2*Base + 31 + 63) * 100 / 100) + 100 + 10
    // Fórmula Stat: floor(( (2*Base + 31 + 63) * 100 / 100 ) + 5) * 1.1
    // Simplificado para Nivel 100, IV 31, EV 252:
    if (isHP) {
        return (2 * base + 94) + 110;
    } else {
        return Math.floor(((2 * base + 94) + 5) * 1.1);
    }
}

function calculateDamage(attacker, move, defenderStats) {
    const level = 100;
    const power = move.power || 0;
    const attackClass = move.damage_class.name;

    if (attackClass === 'status' || power === 0) return { min: 0, max: 0, attackClass };

    // STATS ATACANTE (Max Offense)
    let attackStatBase = 0;
    if (attackClass === 'physical') {
        attackStatBase = attacker.stats.find(s => s.stat.name === 'attack').base_stat;
    } else {
        attackStatBase = attacker.stats.find(s => s.stat.name === 'special-attack').base_stat;
    }
    // Formula simplificada Atacante (Max Stats): (2*Base + 94 + 5) * 1.1
    const A = Math.floor(((2 * attackStatBase + 31 + 63) + 5) * 1.1);

    // STATS DEFENSOR
    const D = (attackClass === 'physical') ? defenderStats.def : defenderStats.spDef;

    // FÓRMULA DE DAÑO
    let damage = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * power * A / D) / 50) + 2;

    // STAB
    const isStab = attacker.types.some(t => t.type.name === move.type.name);
    if (isStab) damage = Math.floor(damage * 1.5);

    // Random (Roll bajo 0.85)
    const minDamage = Math.floor(damage * 0.85);
    const maxDamage = damage;

    return { min: minDamage, max: maxDamage, attackClass };
}

// --- 4. FUNCIÓN PRINCIPAL ---

async function calcularBatalla() {
    const atkName = document.getElementById('attackerInput').value;
    const moveName = document.getElementById('moveInput').value;
    const defName = document.getElementById('defenderInput').value; // Puede estar vacío

    const ui = {
        atkImg: document.getElementById('attacker-img'),
        atkLabel: document.getElementById('attacker-label'),
        defImg: document.getElementById('defender-img'),
        defLabel: document.getElementById('defender-label'),
        results: document.getElementById('results-text'),
        damageBadge: document.getElementById('damage-result')
    };

    if (!atkName || !moveName) {
        alert("Necesitas un Atacante y un Movimiento.");
        return;
    }

    ui.results.innerHTML = "Calculando...";
    ui.results.classList.remove('hidden');

    try {
        // 1. Cargar Atacante y Movimiento
        const attacker = await getPokemonData(atkName);
        const move = await getMoveData(moveName);

        // Actualizar UI Atacante
        ui.atkImg.src = attacker.sprites.front_default;
        ui.atkLabel.textContent = attacker.name;

        // 2. Determinar Defensor
        let defenderStats = { ...ULTIMATE_TANK_STATS }; // Copia por defecto

        if (defName.trim() !== "") {
            // El usuario eligió un tanque específico
            const defender = await getPokemonData(defName);

            // Calculamos sus stats máximos posibles (Max Bulk)
            const hpBase = defender.stats.find(s => s.stat.name === 'hp').base_stat;
            const defBase = defender.stats.find(s => s.stat.name === 'defense').base_stat;
            const spDefBase = defender.stats.find(s => s.stat.name === 'special-defense').base_stat;

            defenderStats = {
                name: defender.name,
                hp: calculateMaxStat(hpBase, true),
                def: calculateMaxStat(defBase, false),
                spDef: calculateMaxStat(spDefBase, false)
            };

            // Actualizar UI Defensor
            ui.defImg.src = defender.sprites.front_default;
            ui.defLabel.textContent = defender.name;
        } else {
            // Restaurar UI Jefe Final
            ui.defImg.src = ULTIMATE_TANK_STATS.sprite;
            ui.defLabel.textContent = "BOSS: ULTIMATE TANK";
        }

        // 3. Calcular
        const damage = calculateDamage(attacker, move, defenderStats);

        // 4. Mostrar Resultados
        const minPercent = ((damage.min / defenderStats.hp) * 100).toFixed(1);
        const maxPercent = ((damage.max / defenderStats.hp) * 100).toFixed(1);

        ui.damageBadge.textContent = `${maxPercent}%`;
        ui.damageBadge.classList.remove('hidden');

        // Lógica de golpes para KO
        const minHits = damage.max > 0 ? Math.ceil(defenderStats.hp / damage.max) : '∞';
        const maxHits = damage.min > 0 ? Math.ceil(defenderStats.hp / damage.min) : '∞';

        ui.results.innerHTML = `
            <h3>${attacker.name.toUpperCase()} vs ${defenderStats.name.toUpperCase()}</h3>
            <p><strong>Ataque:</strong> ${move.name} (${damage.attackClass}, Poder: ${move.power})</p>
            <p><strong>Daño:</strong> ${damage.min} - ${damage.max} HP (${minPercent}% - ${maxPercent}%)</p>
            <hr>
            <p class="big-result">
                Golpes para debilitar: <strong>${minHits} - ${maxHits}</strong>
            </p>
            <small>Defensor calculado con Max HP/Def (Naturaleza favorable, 252 EVs)</small>
        `;

    } catch (err) {
        console.error(err);
        ui.results.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
    }
}

// Botón para reiniciar al Jefe Final
function setUltimateTank() {
    document.getElementById('defenderInput').value = '';
    document.getElementById('defender-img').src = ULTIMATE_TANK_STATS.sprite;
    document.getElementById('defender-label').textContent = "Ultimate Tank";
    document.getElementById('results-text').classList.add('hidden');
    document.getElementById('damage-result').classList.add('hidden');
}

function limpiar() {
    document.getElementById('attackerInput').value = '';
    document.getElementById('moveInput').value = '';
    setUltimateTank();
    document.getElementById('attacker-img').src = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/eggs/1.png";
    document.getElementById('attacker-label').textContent = "Atacante";
}

// ... (código anterior igual) ...

// --- NUEVA FUNCIÓN PARA LOS BOTONES RÁPIDOS ---
function selectTank(name) {
    const defInput = document.getElementById('defenderInput');
    defInput.value = name;

    // Disparamos la búsqueda automáticamente para que el usuario vea el cambio al instante
    // Primero simulamos que cargó (para UX)
    document.getElementById('defender-label').textContent = "Cargando...";

    // Llamamos a la lógica principal (puedes reutilizar calcularBatalla o solo cargar la info)
    // Para simplificar, hacemos que cargue los datos del tanque visualmente sin calcular daño todavía
    // o calculamos todo si ya hay atacante.

    // Truco: Si ya hay atacante, calculamos batalla. Si no, solo cargamos la foto del tanque.
    const atkValue = document.getElementById('attackerInput').value;
    if (atkValue) {
        calcularBatalla();
    } else {
        // Solo cargar visualmente el tanque
        updateTankVisuals(name);
    }
}

async function updateTankVisuals(name) {
    try {
        const defender = await getPokemonData(name);
        document.getElementById('defender-img').src = defender.sprites.front_default;
        document.getElementById('defender-label').textContent = defender.name;
    } catch (e) {
        console.error(e);
    }
}

// ... (asegúrate de que calcularBatalla use el valor del input actualizado) ...