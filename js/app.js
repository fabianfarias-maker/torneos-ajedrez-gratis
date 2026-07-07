/**
 * CONTROLADOR PRINCIPAL - PLATAFORMA DE AJEDREZ SUIZO
 * Orquesta el estado, navegación de la SPA, eventos del DOM y rendering.
 */

import { generarEmparejamientos } from './swissPairing.js';
import { calcularClasificacion } from './tieBreaks.js';
import { JUGADORES_DEMO } from './demoData.js';

// --- ESTADO GLOBAL ---
let state = {
  torneo: null
};

// Criterios de desempate disponibles
const DESEMPATES_OPCIONES = [
  { id: 'DE', nombre: 'Encuentro Directo' },
  { id: 'BH-C1', nombre: 'Buchholz-C1' },
  { id: 'BH-M1', nombre: 'Buchholz Medio' },
  { id: 'BH', nombre: 'Buchholz Completo' },
  { id: 'SB', nombre: 'Sistema Sonneborn-Berger' },
  { id: 'KOYA', nombre: 'Sistema Koya' },
  { id: 'WIN', nombre: 'Mayor número de victorias' }
];

// Orden por defecto para un nuevo torneo
let desempatesOrden = ['DE', 'BH-C1', 'BH-M1', 'BH'];

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
  inicializarEventos();
  cargarEstadoLocalStorage();
  renderizarDesempatesForm();
  renderizarVistas();
});

// --- PERSISTENCIA LOCAL STORAGE ---
function guardarEstadoLocalStorage() {
  if (state.torneo) {
    localStorage.setItem('swiss_master_torneo', JSON.stringify(state.torneo));
  } else {
    localStorage.removeItem('swiss_master_torneo');
  }
}

function cargarEstadoLocalStorage() {
  const guardado = localStorage.getItem('swiss_master_torneo');
  if (guardado) {
    try {
      state.torneo = JSON.parse(guardado);
    } catch (e) {
      console.error("Error cargando torneo de localStorage", e);
      state.torneo = null;
    }
  }
}

// --- SISTEMA DE TOASTS ---
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-message');
  
  toast.className = `toast ${type} show`;
  toastMsg.textContent = message;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// --- ROUTER DE PESTAÑAS Y VISTAS ---
function renderizarVistas() {
  const welcomeView = document.getElementById('welcome-view');
  const createView = document.getElementById('create-view');
  const activeView = document.getElementById('active-tournament-view');
  const indicator = document.getElementById('header-tournament-indicator');
  const indicatorName = document.getElementById('header-tournament-name');

  if (state.torneo) {
    // Hay un torneo activo
    welcomeView.style.display = 'none';
    createView.style.display = 'none';
    activeView.style.display = 'block';
    
    // Header
    indicator.style.display = 'flex';
    indicatorName.textContent = `${state.torneo.nombre} (Ronda ${state.torneo.rondaActual}/${state.torneo.rondasTotales})`;

    // Rellenar ficha técnica en pestaña detalles
    document.getElementById('detail-name').textContent = state.torneo.nombre;
    document.getElementById('detail-place').textContent = state.torneo.lugar;
    document.getElementById('detail-datetime').textContent = `${state.torneo.fecha} ${state.torneo.horario}`;
    document.getElementById('detail-referee').textContent = state.torneo.arbitro;
    document.getElementById('detail-value').textContent = state.torneo.valor > 0 ? `$${state.torneo.valor}` : "Gratuito";
    document.getElementById('detail-rounds').textContent = state.torneo.rondasTotales;
    
    const listTiebreaks = document.getElementById('detail-tiebreaks-list');
    listTiebreaks.innerHTML = '';
    state.torneo.desempates.forEach(d => {
      const opt = DESEMPATES_OPCIONES.find(o => o.id === d);
      const li = document.createElement('li');
      li.textContent = opt ? opt.nombre : d;
      listTiebreaks.appendChild(li);
    });

    // Cambiar a la pestaña correspondiente
    if (state.torneo.estado === 'registro') {
      irAPestana('tab-players');
      // Deshabilitar pestañas de emparejamientos y clasificación
      document.getElementById('tab-btn-pairings').style.opacity = '0.5';
      document.getElementById('tab-btn-pairings').style.pointerEvents = 'none';
      document.getElementById('tab-btn-standings').style.opacity = '0.5';
      document.getElementById('tab-btn-standings').style.pointerEvents = 'none';
    } else {
      document.getElementById('tab-btn-pairings').style.opacity = '1';
      document.getElementById('tab-btn-pairings').style.pointerEvents = 'auto';
      document.getElementById('tab-btn-standings').style.opacity = '1';
      document.getElementById('tab-btn-standings').style.pointerEvents = 'auto';
      
      // Si ya está en progreso, ir a pairings por defecto
      if (document.querySelector('.tab-btn.active').dataset.tab === 'tab-players') {
        irAPestana('tab-pairings');
      }
    }

    renderizarJugadores();
    renderizarPairings();
    renderizarStandings();
  } else {
    // No hay torneo
    welcomeView.style.display = 'block';
    createView.style.display = 'none';
    activeView.style.display = 'none';
    indicator.style.display = 'none';
  }
}

function irAPestana(pestanaId) {
  // Desactivar botones de pestañas
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === pestanaId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Ocultar contenidos de pestañas
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    if (content.id === pestanaId) {
      content.style.display = 'block';
    } else {
      content.style.display = 'none';
    }
  });
}

// --- EVENTOS DEL SISTEMA ---
function inicializarEventos() {
  // Ir al Formulario de Creación
  document.getElementById('start-tournament-btn').addEventListener('click', () => {
    document.getElementById('welcome-view').style.display = 'none';
    document.getElementById('create-view').style.display = 'block';
  });

  // Cancelar Creación
  document.getElementById('cancel-create-btn').addEventListener('click', () => {
    renderizarVistas();
  });

  // Logo / Home
  document.getElementById('logo-btn').addEventListener('click', (e) => {
    e.preventDefault();
    renderizarVistas();
  });

  // Reset del Formulario Torneo
  document.getElementById('form-reset-btn').addEventListener('click', () => {
    document.getElementById('create-tournament-form').reset();
    desempatesOrden = ['DE', 'BH-C1', 'BH-M1', 'BH'];
    renderizarDesempatesForm();
  });

  // Submit Creación Torneo
  document.getElementById('create-tournament-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nombre = document.getElementById('t-name').value;
    const fecha = document.getElementById('t-date').value;
    const horario = document.getElementById('t-time').value;
    const lugar = document.getElementById('t-place').value;
    const arbitro = document.getElementById('t-referee').value;
    const valor = parseFloat(document.getElementById('t-value').value);
    const rondasTotales = parseInt(document.getElementById('t-rounds').value);

    state.torneo = {
      id: `torneo-${Date.now()}`,
      nombre,
      fecha,
      horario,
      lugar,
      arbitro,
      valor,
      rondasTotales,
      desempates: [...desempatesOrden],
      jugadores: [],
      rondaActual: 0,
      rondas: [],
      estado: 'registro'
    };

    guardarEstadoLocalStorage();
    renderizarVistas();
    showToast("Torneo inicializado. Registra los jugadores.", "success");
  });

  // Navegación por pestañas
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      irAPestana(btn.dataset.tab);
    });
  });

  // Registro de un Jugador
  document.getElementById('add-player-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!state.torneo) return;

    const nombre = document.getElementById('p-name').value.trim();
    const apellido = document.getElementById('p-lastname').value.trim();
    const club = document.getElementById('p-club').value.trim();
    const elo = parseInt(document.getElementById('p-elo').value);

    // Evitar duplicados exactos
    const existe = state.torneo.jugadores.some(j => j.nombre.toLowerCase() === nombre.toLowerCase() && j.apellido.toLowerCase() === apellido.toLowerCase());
    if (existe) {
      showToast(`El jugador ${nombre} ${apellido} ya está inscrito.`, "error");
      return;
    }

    const nuevoJugador = {
      id: `j-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nombre,
      apellido,
      club,
      elo,
      activo: true
    };

    state.torneo.jugadores.push(nuevoJugador);
    document.getElementById('add-player-form').reset();
    document.getElementById('p-elo').value = 1500; // Valor default

    guardarEstadoLocalStorage();
    renderizarJugadores();
    showToast(`Jugador ${nombre} ${apellido} registrado.`, "success");
  });

  // Carga de GMs de demostración
  document.getElementById('load-demo-players-btn').addEventListener('click', () => {
    if (!state.torneo) return;

    // Agregar solo los que no están repetidos
    let count = 0;
    JUGADORES_DEMO.forEach(demo => {
      const existe = state.torneo.jugadores.some(j => j.nombre.toLowerCase() === demo.nombre.toLowerCase() && j.apellido.toLowerCase() === demo.apellido.toLowerCase());
      if (!existe) {
        state.torneo.jugadores.push({
          id: `j-demo-${Math.random().toString(36).substr(2, 9)}`,
          nombre: demo.nombre,
          apellido: demo.apellido,
          club: demo.club,
          elo: demo.elo,
          activo: true
        });
        count++;
      }
    });

    guardarEstadoLocalStorage();
    renderizarJugadores();
    showToast(`Se cargaron ${count} jugadores de prueba.`, "success");
  });

  // Limpiar todos los jugadores
  document.getElementById('clear-all-players-btn').addEventListener('click', () => {
    if (!state.torneo) return;
    if (confirm("¿Estás seguro de que quieres eliminar a todos los jugadores?")) {
      state.torneo.jugadores = [];
      guardarEstadoLocalStorage();
      renderizarJugadores();
      showToast("Todos los jugadores han sido removidos.", "info");
    }
  });

  // Iniciar Primera Ronda
  document.getElementById('start-first-round-btn').addEventListener('click', () => {
    iniciarPrimeraRonda();
  });

  // Botón Generar Siguiente Ronda
  document.getElementById('btn-next-round').addEventListener('click', () => {
    generarSiguienteRonda();
  });

  // Botón Re-emparejar Ronda actual
  document.getElementById('btn-re-pair').addEventListener('click', () => {
    if (!state.torneo) return;
    if (confirm("¿Quieres volver a generar los emparejamientos de esta ronda? Se borrarán los resultados cargados en la ronda actual.")) {
      reemparejarRondaActual();
    }
  });

  // Selector de ronda en pairings
  document.getElementById('round-select-dropdown').addEventListener('change', (e) => {
    const rNum = parseInt(e.target.value);
    renderizarPairings(rNum);
  });

  // Exportar a CSV
  document.getElementById('export-csv-btn').addEventListener('click', () => {
    exportarClasificacionCSV();
  });

  // Finalizar / Borrar Torneo
  document.getElementById('btn-terminate-tournament').addEventListener('click', () => {
    if (confirm("¿Estás seguro de que deseas terminar y eliminar este torneo? Se borrarán todos los datos permanentemente.")) {
      state.torneo = null;
      guardarEstadoLocalStorage();
      renderizarVistas();
      showToast("El torneo ha sido eliminado.", "info");
    }
  });
}

// --- RENDERIZACIÓN DE DESEMPATES FORMULARIO (ORDEN DRAG-AND-DROP SIMULADO) ---
function renderizarDesempatesForm() {
  const container = document.getElementById('tiebreak-order-container');
  if (!container) return;
  container.innerHTML = '';

  const modalityEl = document.getElementById('t-modality');
  const modality = modalityEl ? modalityEl.value : 'suizo';
  const options = modality === 'round-robin' 
    ? [
        { id: 'DE', nombre: 'Encuentro Directo' },
        { id: 'SB', nombre: 'Sistema Sonneborn-Berger' },
        { id: 'KOYA', nombre: 'Sistema Koya' },
        { id: 'WIN', nombre: 'Mayor número de victorias' }
      ]
    : [
        { id: 'DE', nombre: 'Encuentro Directo' },
        { id: 'BH-C1', nombre: 'Buchholz-C1' },
        { id: 'BH-M1', nombre: 'Buchholz Medio' },
        { id: 'BH', nombre: 'Buchholz Completo' }
      ];

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(220px, 1fr))';
  grid.style.gap = '1rem';

  for (let i = 0; i < 4; i++) {
    const selectedId = desempatesOrden[i] || options[i]?.id || options[0].id;
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';
    formGroup.style.marginBottom = '0';

    const label = document.createElement('label');
    label.className = 'form-label';
    label.style.fontSize = '0.85rem';
    label.style.marginBottom = '0.25rem';
    label.textContent = `${i + 1}° Criterio de Desempate`;

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0.5rem';

    const select = document.createElement('select');
    select.className = 'form-control';
    select.id = `tiebreak-select-${i + 1}`;
    select.style.flex = '1';

    options.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.id;
      option.textContent = opt.nombre;
      if (opt.id === selectedId) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', () => {
      desempatesOrden[i] = select.value;
    });

    const infoBtn = document.createElement('button');
    infoBtn.type = 'button';
    infoBtn.className = 'btn btn-secondary btn-sm';
    infoBtn.style.padding = '0.35rem 0.6rem';
    infoBtn.textContent = 'Info';
    infoBtn.title = 'Ver de qué se trata este criterio';

    infoBtn.addEventListener('click', () => {
      if (typeof playSound === 'function') playSound('click');
      const currentId = select.value;
      const currentOpt = options.find(o => o.id === currentId);
      
      let definition = '';
      if (currentId === 'DE') definition = 'Si los jugadores empatados se enfrentaron entre sí, se define por los puntos acumulados en sus partidas individuales.';
      else if (currentId === 'BH-C1') definition = 'Suma de la puntuación de todos los rivales, excluyendo la de menor valor.';
      else if (currentId === 'BH-M1') definition = 'Suma de la puntuación de todos los rivales, excluyendo la del oponente con mayor puntuación y la del oponente con menor puntuación.';
      else if (currentId === 'BH') definition = 'Suma de la puntuación final de todos los rivales enfrentados.';
      else if (currentId === 'SB') definition = 'Suma de la puntuación de los rivales a los que derrotó más la mitad de la puntuación de los rivales con los que entabló.';
      else if (currentId === 'KOYA') definition = 'Suma de los puntos obtenidos contra rivales que terminaron con el 50% o más de la puntuación máxima disponible en el torneo.';
      else if (currentId === 'WIN') definition = 'Se clasifica por delante al jugador con mayor número de victorias.';
      
      alert(`${currentOpt.nombre}:\n\n${definition}`);
    });

    wrapper.appendChild(select);
    wrapper.appendChild(infoBtn);
    formGroup.appendChild(label);
    formGroup.appendChild(wrapper);
    grid.appendChild(formGroup);
  }

  container.appendChild(grid);
}

// --- PESTAÑA JUGADORES: LOGICA Y RENDERING ---
function renderizarJugadores() {
  const playersTableBody = document.getElementById('players-table-body');
  const countSpan = document.getElementById('tab-count-players');
  const roundsRecommendation = document.getElementById('rounds-recommendation');
  const startBtn = document.getElementById('start-first-round-btn');
  
  if (!state.torneo) return;

  const jugadores = state.torneo.jugadores;
  countSpan.textContent = jugadores.length;

  // Actualizar recomendación de rondas
  const n = jugadores.length;
  let recRondas = 0;
  if (n >= 2) {
    recRondas = Math.ceil(Math.log2(n)) + 1;
    roundsRecommendation.textContent = `Recomendado FIDE: ${recRondas} Rondas`;
  } else {
    roundsRecommendation.textContent = "Recomendado FIDE: 0 Rondas";
  }

  // Habilitar botón de iniciar primera ronda si hay al menos 2 jugadores
  if (n >= 2 && state.torneo.estado === 'registro') {
    startBtn.disabled = false;
  } else {
    startBtn.disabled = true;
  }

  if (jugadores.length === 0) {
    playersTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem; white-space: normal !important;">
          No hay jugadores inscritos en este momento. Agrega algunos o carga la demo.
        </td>
      </tr>
    `;
    return;
  }

  // Ordenar por ELO para calcular siembra inicial provisional (TPN)
  const jugadoresSembrados = [...jugadores].sort((a, b) => b.elo - a.elo);

  playersTableBody.innerHTML = '';
  jugadoresSembrados.forEach((j, index) => {
    const tr = document.createElement('tr');
    
    // Si el torneo ya empezó, las opciones de edición o remoción están restringidas
    const esSoloLectura = state.torneo.estado !== 'registro';
    
    tr.innerHTML = `
      <td>
        <span class="rank-badge">${index + 1}</span>
      </td>
      <td style="font-weight: 600; color: white;">
        ${j.apellido}, ${j.nombre}
      </td>
      <td>${j.club}</td>
      <td><span class="player-elo">${j.elo}</span></td>
      <td>
        <label class="switch">
          <input type="checkbox" class="player-active-toggle" data-id="${j.id}" ${j.activo ? 'checked' : ''} ${state.torneo.estado === 'finalizado' ? 'disabled' : ''}>
          <span class="slider"></span>
        </label>
        <span style="font-size: 0.75rem; margin-left: 0.25rem; color: ${j.activo ? 'var(--success)' : 'var(--danger)'}">
          ${j.activo ? 'Activo' : 'Retirado'}
        </span>
      </td>
      <td>
        <button class="btn btn-danger btn-sm btn-delete-player" data-id="${j.id}" ${esSoloLectura ? 'disabled' : ''}>
          Eliminar
        </button>
      </td>
    `;

    playersTableBody.appendChild(tr);
  });

  // Evento toggle Activo/Retirado (Permitido editar en cualquier ronda)
  playersTableBody.querySelectorAll('.player-active-toggle').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      const act = e.target.checked;
      const jug = state.torneo.jugadores.find(j => j.id === id);
      if (jug) {
        jug.activo = act;
        guardarEstadoLocalStorage();
        renderizarJugadores();
        
        // Si el torneo está en progreso, actualizar emparejamientos y tablas
        if (state.torneo.estado === 'en_progreso') {
          renderizarPairings();
          renderizarStandings();
        }

        const msg = act 
          ? `${jug.nombre} ${jug.apellido} ha regresado al torneo.` 
          : `${jug.nombre} ${jug.apellido} ha sido marcado como retirado y no se emparejará en siguientes rondas.`;
        showToast(msg, act ? "success" : "warning");
      }
    });
  });

  // Evento Eliminar jugador
  playersTableBody.querySelectorAll('.btn-delete-player').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      const jug = state.torneo.jugadores.find(j => j.id === id);
      if (jug) {
        state.torneo.jugadores = state.torneo.jugadores.filter(j => j.id !== id);
        guardarEstadoLocalStorage();
        renderizarJugadores();
        showToast(`Jugador ${jug.nombre} ${jug.apellido} eliminado.`, "info");
      }
    });
  });
}

// --- INICIAR PRIMERA RONDA ---
function iniciarPrimeraRonda() {
  if (!state.torneo) return;
  const n = state.torneo.jugadores.filter(j => j.activo).length;
  
  if (n < 2) {
    showToast("Se necesitan al menos 2 jugadores activos para iniciar.", "error");
    return;
  }

  // Establecer rondas si es menor que lo recomendado y no fue ajustado
  const recRondas = Math.ceil(Math.log2(n)) + 1;
  if (state.torneo.rondasTotales === 5 && recRondas !== 5) {
    if (confirm(`Para ${n} jugadores se recomiendan ${recRondas} rondas. ¿Deseas ajustar las rondas del torneo a ${recRondas}?`)) {
      state.torneo.rondasTotales = recRondas;
    }
  }

  try {
    state.torneo.estado = 'en_progreso';
    state.torneo.rondaActual = 0; // Se incrementará al emparejar
    
    // Generar primera ronda
    emparejarRonda(1);
    
    guardarEstadoLocalStorage();
    renderizarVistas();
    
    // Ir a pestaña de emparejamientos
    irAPestana('tab-pairings');
    showToast("¡Torneo iniciado! Ronda 1 emparejada.", "success");
  } catch (e) {
    showToast(e.message, "error");
    state.torneo.estado = 'registro';
    guardarEstadoLocalStorage();
  }
}

// --- EMPAREJAR UNA RONDA ---
function emparejarRonda(numeroRonda) {
  if (!state.torneo) return;

  // El algoritmo de emparejamiento necesita leer el estado del torneo actual
  const emparejamientos = generarEmparejamientos(state.torneo);

  state.torneo.rondas.push({
    numero: numeroRonda,
    emparejamientos,
    completada: false
  });
  
  state.torneo.rondaActual = numeroRonda;
}

// --- PESTAÑA EMPAREJAMIENTOS: LOGICA Y RENDERING ---
function renderizarPairings(rNum = null) {
  const container = document.getElementById('pairings-list-container');
  const pairingsTitle = document.getElementById('pairings-title');
  const dropdown = document.getElementById('round-select-dropdown');
  const nextBtn = document.getElementById('btn-next-round');
  const rePairBtn = document.getElementById('btn-re-pair');
  const byeBanner = document.getElementById('bye-notification-banner');

  if (!state.torneo || state.torneo.estado === 'registro') {
    container.innerHTML = `<p style="color: var(--text-muted);">El torneo aún no ha comenzado.</p>`;
    return;
  }

  // Cargar lista de rondas en el selector
  dropdown.innerHTML = '';
  for (let i = 1; i <= state.torneo.rondas.length; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `Ver Ronda ${i}`;
    if (rNum === null && i === state.torneo.rondaActual) {
      opt.selected = true;
    } else if (rNum !== null && i === rNum) {
      opt.selected = true;
    }
    dropdown.appendChild(opt);
  }

  const rondaVisualizarNum = rNum || state.torneo.rondaActual;
  const ronda = state.torneo.rondas.find(r => r.numero === rondaVisualizarNum);
  
  if (!ronda) return;

  pairingsTitle.textContent = `Ronda ${ronda.numero}`;
  
  // Mostrar re-emparejar solo en la ronda actual si está activa
  if (rondaVisualizarNum === state.torneo.rondaActual && state.torneo.estado === 'en_progreso') {
    rePairBtn.style.display = 'inline-flex';
  } else {
    rePairBtn.style.display = 'none';
  }

  // Verificar si hay algún Bye en los emparejamientos
  const tieneBye = ronda.emparejamientos.some(emp => !emp.blancas || !emp.negras);
  byeBanner.style.display = tieneBye ? 'flex' : 'none';

  if (ronda.emparejamientos.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No hay emparejamientos para esta ronda.</p>`;
    return;
  }

  container.innerHTML = '';
  ronda.emparejamientos.forEach((emp, index) => {
    const div = document.createElement('div');
    div.className = 'pairing-card';

    const bName = emp.blancas ? `${emp.blancas.apellido}, ${emp.blancas.nombre}` : "BYE";
    const nName = emp.negras ? `${emp.negras.apellido}, ${emp.negras.nombre}` : "BYE";

    const bElo = emp.blancas ? `ELO ${emp.blancas.elo}` : "";
    const nElo = emp.negras ? `ELO ${emp.negras.elo}` : "";

    const bClub = emp.blancas ? emp.blancas.club : "";
    const nClub = emp.negras ? emp.negras.club : "";

    const isBye = !emp.blancas || !emp.negras;
    const esRondaEditable = state.torneo.estado === 'en_progreso' && 
      (state.torneo.modalidad === 'round-robin' || rondaVisualizarNum === state.torneo.rondaActual);

    // Determinar qué botones están seleccionados
    const res = emp.resultado;
    
    div.innerHTML = `
      <div class="board-num">Tablero ${index + 1}</div>
      <div class="matchup">
        
        <!-- Blancas -->
        <div class="player-side white">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="color-dot white"></span>
            <span class="player-name" title="${bName}">${bName}</span>
          </div>
          <span class="player-club" title="${bClub}">${bClub}</span>
          ${emp.blancas ? `<span class="player-elo">${bElo}</span>` : ''}
        </div>

        <div class="vs-divider">VS</div>

        <!-- Negras -->
        <div class="player-side black">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-direction: row-reverse;">
            <span class="color-dot black"></span>
            <span class="player-name" title="${nName}">${nName}</span>
          </div>
          <span class="player-club" title="${nClub}">${nClub}</span>
          ${emp.negras ? `<span class="player-elo">${nElo}</span>` : ''}
        </div>

      </div>

      <!-- Controles de Resultado -->
      ${!isBye ? `
        <div class="result-selector">
          <button class="result-btn white-win ${res === '1-0' ? 'selected' : ''}" data-res="1-0" ${!esRondaEditable ? 'disabled' : ''}>
            1 - 0
          </button>
          <button class="result-btn draw ${res === '0.5-0.5' ? 'selected' : ''}" data-res="0.5-0.5" ${!esRondaEditable ? 'disabled' : ''}>
            ½ - ½
          </button>
          <button class="result-btn black-win ${res === '0-1' ? 'selected' : ''}" data-res="0-1" ${!esRondaEditable ? 'disabled' : ''}>
            0 - 1
          </button>
        </div>
        <div class="forfeit-options">
          <label class="forfeit-checkbox">
            <input type="radio" name="res-type-${emp.id}" class="res-type-radio" data-type="normal" ${(!res || (!res.includes('_F'))) ? 'checked' : ''} ${!esRondaEditable ? 'disabled' : ''}>
            Normal
          </label>
          <label class="forfeit-checkbox">
            <input type="radio" name="res-type-${emp.id}" class="res-type-radio" data-type="forfeit-w" ${res === '1-0_F' ? 'checked' : ''} ${!esRondaEditable ? 'disabled' : ''}>
            + - - (F. W)
          </label>
          <label class="forfeit-checkbox">
            <input type="radio" name="res-type-${emp.id}" class="res-type-radio" data-type="forfeit-b" ${res === '0-1_F' ? 'checked' : ''} ${!esRondaEditable ? 'disabled' : ''}>
            - - + (F. B)
          </label>
        </div>
      ` : `
        <div style="text-align: center; font-size: 0.85rem; padding: 0.5rem; background: rgba(16,185,129,0.1); border-radius: var(--radius-sm); border: 1px dashed rgba(16,185,129,0.3); color: #6ee7b7; font-weight: 600;">
          Punto Directo por Bye (1.0)
        </div>
      `}
    `;

    container.appendChild(div);

    // Eventos de selección de resultado
    if (!isBye && esRondaEditable) {
      const btns = div.querySelectorAll('.result-btn');
      const radios = div.querySelectorAll('.res-type-radio');

      const registrarCambio = (nuevoResultado) => {
        emp.resultado = nuevoResultado;
        guardarEstadoLocalStorage();
        verificarRondaCompletada();
        renderizarStandings();
      };

      btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          btns.forEach(b => b.classList.remove('selected'));
          
          const val = e.target.dataset.res;
          
          // Leer tipo actual (forfeit o normal)
          let tipo = 'normal';
          radios.forEach(r => {
            if (r.checked) tipo = r.dataset.type;
          });

          let resultadoFinal = val;
          if (tipo === 'forfeit-w' && val === '1-0') resultadoFinal = '1-0_F';
          if (tipo === 'forfeit-b' && val === '0-1') resultadoFinal = '0-1_F';

          e.target.classList.add('selected');
          registrarCambio(resultadoFinal);
        });
      });

      radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
          const type = e.target.dataset.type;
          let baseRes = null;
          
          btns.forEach(b => {
            if (b.classList.contains('selected')) baseRes = b.dataset.res;
          });

          if (!baseRes) return; // Si no hay resultado elegido, no hacer nada

          let resultadoFinal = baseRes;
          if (type === 'forfeit-w') {
            // Fuerza victoria blanca por forfeit
            btns.forEach(b => {
              b.classList.remove('selected');
              if (b.dataset.res === '1-0') b.classList.add('selected');
            });
            resultadoFinal = '1-0_F';
          } else if (type === 'forfeit-b') {
            // Fuerza victoria negra por forfeit
            btns.forEach(b => {
              b.classList.remove('selected');
              if (b.dataset.res === '0-1') b.classList.add('selected');
            });
            resultadoFinal = '0-1_F';
          } else {
            // Convierte a normal
            if (baseRes === '1-0') resultadoFinal = '1-0';
            if (baseRes === '0-1') resultadoFinal = '0-1';
          }

          registrarCambio(resultadoFinal);
        });
      });
    }
  });

  // Verificar e inicializar el estado del botón siguiente ronda
  verificarRondaCompletada();
}

function verificarRondaCompletada() {
  const nextBtn = document.getElementById('btn-next-round');
  if (!state.torneo) return;

  // Actualizar el estado 'completada' de cada ronda en el torneo
  state.torneo.rondas.forEach(r => {
    r.completada = r.emparejamientos.every(emp => emp.resultado !== null);
  });
  
  guardarEstadoLocalStorage();

  if (state.torneo.estado !== 'en_progreso') {
    nextBtn.style.display = 'none';
    return;
  } else {
    nextBtn.style.display = 'inline-flex';
  }

  if (state.torneo.modalidad === 'round-robin') {
    // En Round Robin, se puede finalizar el torneo cuando TODAS las rondas están completas
    const todasRondasCompletas = state.torneo.rondas.every(r => r.completada);
    nextBtn.textContent = "Finalizar Torneo y Ver Posiciones";
    if (todasRondasCompletas) {
      nextBtn.disabled = false;
      nextBtn.className = "btn btn-success";
    } else {
      nextBtn.disabled = true;
      nextBtn.className = "btn btn-primary";
      nextBtn.textContent = "Finalizar Torneo (Faltan Resultados)";
    }
  } else {
    // En Sistema Suizo, seguimos el flujo lineal por ronda actual
    const rondaActualObj = state.torneo.rondas.find(r => r.numero === state.torneo.rondaActual);
    if (!rondaActualObj) return;

    if (rondaActualObj.completada) {
      nextBtn.disabled = false;
      if (state.torneo.rondaActual === state.torneo.rondasTotales) {
        nextBtn.textContent = "Finalizar Torneo y Ver Posiciones";
        nextBtn.className = "btn btn-success";
      } else {
        nextBtn.textContent = "Generar Siguiente Ronda";
        nextBtn.className = "btn btn-primary";
      }
    } else {
      nextBtn.disabled = true;
      nextBtn.textContent = state.torneo.rondaActual === state.torneo.rondasTotales ? "Última Ronda en Juego" : "Generar Siguiente Ronda";
      nextBtn.className = "btn btn-primary";
    }
  }
}

function reemparejarRondaActual() {
  if (!state.torneo) return;
  const num = state.torneo.rondaActual;
  
  // Eliminar la ronda actual del array y volver a generarla
  state.torneo.rondas = state.torneo.rondas.filter(r => r.numero !== num);
  
  try {
    emparejarRonda(num);
    guardarEstadoLocalStorage();
    renderizarPairings();
    renderizarStandings();
    showToast(`Ronda ${num} re-emparejada con éxito.`, "success");
  } catch (e) {
    // Si falla, restaurar una ronda vacía o dar opción de volver
    showToast(e.message, "error");
    renderizarVistas();
  }
}

function generarSiguienteRonda() {
  if (!state.torneo) return;

  if (state.torneo.modalidad === 'round-robin') {
    state.torneo.estado = 'finalizado';
    guardarEstadoLocalStorage();
    renderizarVistas();
    irAPestana('tab-standings');
    showToast("¡El torneo ha finalizado! Clasificación oficial generada.", "success");
    return;
  }

  if (state.torneo.rondaActual === state.torneo.rondasTotales) {
    // Finalizar Torneo
    state.torneo.estado = 'finalizado';
    guardarEstadoLocalStorage();
    renderizarVistas();
    irAPestana('tab-standings');
    showToast("¡El torneo ha finalizado! Clasificación oficial generada.", "success");
    return;
  }

  const proximaRonda = state.torneo.rondaActual + 1;
  try {
    emparejarRonda(proximaRonda);
    guardarEstadoLocalStorage();
    renderizarVistas();
    irAPestana('tab-pairings');
    showToast(`Ronda ${proximaRonda} emparejada de forma correcta.`, "success");
  } catch (e) {
    showToast(e.message, "error");
  }
}

// --- PESTAÑA CLASIFICACIÓN: LOGICA Y RENDERING ---
function renderizarStandings() {
  const tbody = document.getElementById('standings-table-body');
  const headersRow = document.getElementById('standings-headers');

  if (!state.torneo) return;

  const desempates = state.torneo.desempates;

  // 1. Dinamizar Cabeceras de Desempate
  // Siempre se muestra: Puesto, TPN, Jugador, Club, ELO, Puntos
  let htmlHeaders = `
    <th style="width: 70px;">Puesto</th>
    <th style="width: 60px; text-align: center;">TPN</th>
    <th>Jugador</th>
    <th>Club</th>
    <th>ELO</th>
    <th style="font-weight: 700; color: white; text-align: center;">Puntos</th>
  `;

  // Añadir columnas para desempates activos
  desempates.forEach(d => {
    let label = d;
    if (d === 'PROGRESSIVE') label = 'ACUM';
    htmlHeaders += `<th style="text-align: center;" title="${DESEMPATES_OPCIONES.find(o => o.id === d)?.nombre}">${label}</th>`;
  });

  htmlHeaders += `<th>Colores</th>`;
  headersRow.innerHTML = htmlHeaders;

  // 2. Calcular Clasificación
  const clasificacion = calcularClasificacion(state.torneo);

  if (clasificacion.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${7 + desempates.length}" style="text-align: center; color: var(--text-muted); padding: 2rem; white-space: normal !important;">
          Inscribe jugadores y comienza el torneo para ver la clasificación.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';
  clasificacion.forEach(p => {
    const tr = document.createElement('tr');
    
    // Badge de rango
    let rankBadge = `<span class="rank-badge">${p.rank}</span>`;
    if (p.rank === 1) rankBadge = `<span class="rank-badge rank-1">1</span>`;
    if (p.rank === 2) rankBadge = `<span class="rank-badge rank-2">2</span>`;
    if (p.rank === 3) rankBadge = `<span class="rank-badge rank-3">3</span>`;

    // Buscar TPN (Ranking inicial basado en ELO original)
    // El TPN es el índice + 1 de la lista ordenada por ELO original
    const listOriginal = [...state.torneo.jugadores].sort((a, b) => b.elo - a.elo);
    const tpn = listOriginal.findIndex(j => j.id === p.id) + 1;

    let htmlRow = `
      <td>${rankBadge}</td>
      <td style="text-align: center; color: var(--text-muted);">${tpn}</td>
      <td style="font-weight: 600; color: white;">
        ${p.apellido}, ${p.nombre} ${!p.activo ? '<span style="color: var(--danger); font-size: 0.75rem;">(Retirado)</span>' : ''}
      </td>
      <td>${p.club}</td>
      <td><span class="player-elo">${p.elo}</span></td>
      <td style="font-weight: 700; color: #a5b4fc; text-align: center; font-size: 1rem;">${p.score}</td>
    `;

    // Añadir columnas de desempate
    desempates.forEach(d => {
      let val = p[d];
      if (typeof val === 'number' && !Number.isInteger(val)) {
        val = val.toFixed(1); // ej. SB 12.5
      }
      htmlRow += `<td style="text-align: center; font-weight: 500;">${val}</td>`;
    });

    // Dibujar historial de colores (rachas)
    // Buscamos los colores que ha jugado de manera cronológica en las rondas del torneo
    const colorHistoryHtml = renderizarHistorialColoresJugador(p.id);
    htmlRow += `<td>${colorHistoryHtml}</td>`;

    tr.innerHTML = htmlRow;
    tbody.appendChild(tr);
  });
}

function renderizarHistorialColoresJugador(jugadorId) {
  let html = `<div class="color-streak-container">`;
  
  state.torneo.rondas.forEach(ronda => {
    // Buscar si jugó en esta ronda
    const emp = ronda.emparejamientos.find(e => (e.blancas && e.blancas.id === jugadorId) || (e.negras && e.negras.id === jugadorId));
    
    if (emp) {
      if (emp.blancas && emp.blancas.id === jugadorId) {
        if (!emp.negras) {
          // Fue un Bye (PAB)
          html += `<span class="color-streak-dot bye" title="Ronda ${ronda.numero}: Bye (+1.0)"></span>`;
        } else {
          html += `<span class="color-streak-dot w" title="Ronda ${ronda.numero}: Blancas contra ${emp.negras.apellido}"></span>`;
        }
      } else {
        html += `<span class="color-streak-dot b" title="Ronda ${ronda.numero}: Negras contra ${emp.blancas.apellido}"></span>`;
      }
    }
  });

  html += `</div>`;
  return html;
}

// --- EXPORTAR CLASIFICACIÓN A CSV ---
function exportarClasificacionCSV() {
  if (!state.torneo) return;

  const desempates = state.torneo.desempates;
  const clasificacion = calcularClasificacion(state.torneo);

  if (clasificacion.length === 0) {
    showToast("No hay datos para exportar.", "error");
    return;
  }

  // 1. Construir cabeceras
  let csvContent = "Posicion,TPN,Apellido,Nombre,Club,ELO,Puntos";
  desempates.forEach(d => {
    csvContent += `,${d}`;
  });
  csvContent += ",Historial Colores,Estado\n";

  // 2. Construir filas
  clasificacion.forEach(p => {
    // Calcular TPN
    const listOriginal = [...state.torneo.jugadores].sort((a, b) => b.elo - a.elo);
    const tpn = listOriginal.findIndex(j => j.id === p.id) + 1;

    // Calcular historial de colores legible
    let colorHistory = [];
    state.torneo.rondas.forEach(ronda => {
      const emp = ronda.emparejamientos.find(e => (e.blancas && e.blancas.id === p.id) || (e.negras && e.negras.id === p.id));
      if (emp) {
        if (emp.blancas && emp.blancas.id === p.id) {
          colorHistory.push(emp.negras ? "W" : "BYE");
        } else {
          colorHistory.push("B");
        }
      }
    });

    const colorHistoryStr = colorHistory.join("-");
    const estado = p.activo ? "Activo" : "Retirado";

    // Escape de strings por si tienen comas
    const escape = (text) => `"${String(text).replace(/"/g, '""')}"`;

    let row = `${p.rank},${tpn},${escape(p.apellido)},${escape(p.nombre)},${escape(p.club)},${p.elo},${p.score}`;
    
    desempates.forEach(d => {
      let val = p[d];
      if (typeof val === 'number' && !Number.isInteger(val)) val = val.toFixed(1);
      row += `,${val}`;
    });

    row += `,${colorHistoryStr},${estado}\n`;
    csvContent += row;
  });

  // 3. Crear descarga del archivo
  // UTF-8 BOM para que MS Excel lea caracteres especiales como tildes correctamente
  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  // Limpiar caracteres extraños en el nombre del archivo
  const safeTitle = state.torneo.nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute("href", url);
  link.setAttribute("download", `resultados_${safeTitle}_ronda_${state.torneo.rondaActual}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast("Clasificación descargada correctamente en formato CSV.", "success");
}
