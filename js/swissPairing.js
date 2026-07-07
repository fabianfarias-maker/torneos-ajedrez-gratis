/**
 * Módulo para el emparejamiento del sistema suizo de ajedrez.
 * Implementa reglas FIDE de no-repetición de rivales, límites de color y asignación de Byes.
 */

/**
 * Genera los emparejamientos para la siguiente ronda de un torneo.
 * @param {Object} torneo - El objeto del torneo con su estado actual.
 * @returns {Array} Array de emparejamientos para la nueva ronda.
 */
export function generarEmparejamientos(torneo) {
  const { jugadores, rondas, rondaActual } = torneo;

  // 1. Filtrar jugadores activos
  const jugadoresActivos = jugadores.filter(j => j.activo);

  if (jugadoresActivos.length < 2) {
    throw new Error("Se necesitan al menos 2 jugadores activos para generar emparejamientos.");
  }

  // 2. Extraer historial del torneo por jugador
  // Necesitamos calcular para cada jugador:
  // - Puntos actuales
  // - Rivales anteriores (IDs)
  // - Historial de colores ('W', 'B', o null para Byes)
  // - Cantidad de Byes recibidos
  const historialJugadores = {};
  jugadores.forEach(j => {
    historialJugadores[j.id] = {
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      elo: j.elo,
      score: 0,
      oponentes: new Set(),
      colores: [], // 'W' o 'B'
      colorDiff: 0, // Blancas - Negras
      rachaColor: 0, // +3 (3 blancas seguidas), -3 (3 negras seguidas), etc.
      hasBye: false
    };
  });

  // Procesar rondas previas
  rondas.forEach(ronda => {
    ronda.emparejamientos.forEach(emp => {
      const blancasId = emp.blancas ? emp.blancas.id : null;
      const negrasId = emp.negras ? emp.negras.id : null;
      const resultado = emp.resultado;

      // Asignar puntos y registrar oponente/color
      if (blancasId && negrasId) {
        // Partida normal
        historialJugadores[blancasId].oponentes.add(negrasId);
        historialJugadores[blancasId].colores.push('W');
        historialJugadores[blancasId].colorDiff += 1;

        historialJugadores[negrasId].oponentes.add(blancasId);
        historialJugadores[negrasId].colores.push('B');
        historialJugadores[negrasId].colorDiff -= 1;

        // Sumar puntos
        if (resultado === '1-0' || resultado === '1-0_F') {
          historialJugadores[blancasId].score += 1;
        } else if (resultado === '0-1' || resultado === '0-1_F') {
          historialJugadores[negrasId].score += 1;
        } else if (resultado === '0.5-0.5') {
          historialJugadores[blancasId].score += 0.5;
          historialJugadores[negrasId].score += 0.5;
        }
      } else if (blancasId && !negrasId) {
        // blancasId recibió un Bye asignado por el emparejamiento (PAB)
        historialJugadores[blancasId].hasBye = true;
        historialJugadores[blancasId].score += 1;
        // El bye no afecta los colores ni la diferencia de color
      } else if (!blancasId && negrasId) {
        // En teoría no debería ocurrir, pero por si acaso
        historialJugadores[negrasId].hasBye = true;
        historialJugadores[negrasId].score += 1;
      }
    });
  });

  // Calcular la racha actual de colores para cada jugador
  Object.values(historialJugadores).forEach(h => {
    let racha = 0;
    // Recorremos los colores de atrás hacia adelante para ver la racha actual
    for (let i = h.colores.length - 1; i >= 0; i--) {
      const col = h.colores[i];
      if (i === h.colores.length - 1) {
        racha = col === 'W' ? 1 : -1;
      } else {
        if (col === 'W' && racha > 0) racha++;
        else if (col === 'B' && racha < 0) racha--;
        else break;
      }
    }
    h.rachaColor = racha;
  });

  // Lista de candidatos activos con sus historiales
  let listaEmparejar = jugadoresActivos.map(j => historialJugadores[j.id]);

  // 3. Gestionar Bye si la cantidad de jugadores es impar
  let byeJugador = null;
  if (listaEmparejar.length % 2 !== 0) {
    // Buscar el candidato al Bye:
    // FIDE: El jugador de menor puntuación que aún no haya recibido un Bye.
    // Desempate: Menor ELO (TPN más alto).
    const candidatosBye = listaEmparejar
      .filter(j => !j.hasBye)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score; // Menor score primero
        return a.elo - b.elo; // Menor ELO primero
      });

    if (candidatosBye.length > 0) {
      byeJugador = candidatosBye[0];
      // Remover al jugador del Bye de la lista a emparejar
      listaEmparejar = listaEmparejar.filter(j => j.id !== byeJugador.id);
    }
  }

  // 4. Algoritmo de Backtracking para emparejar
  // Ordenamos los jugadores por score (descendente) y luego por ELO (descendente) para priorizar los mejores tableros
  listaEmparejar.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.elo - a.elo;
  });

  const emparejamientosFinales = [];

  // Función interna de backtracking
  function resolver(list) {
    if (list.length === 0) return true;

    const p1 = list[0]; // Tomar el jugador con mayor puntuación restante
    const restantes = list.slice(1);

    // Buscar posibles rivales para p1
    // Prioridad:
    // 1. Diferencia de puntos mínima
    // 2. Ordenados por ELO para emparejamiento clásico
    const candidatos = restantes.map((p2, index) => {
      return {
        player: p2,
        index: index,
        scoreDiff: Math.abs(p1.score - p2.score)
      };
    });

    // Ordenamos candidatos por menor diferencia de puntos
    candidatos.sort((a, b) => {
      if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
      // FIDE Dutch: queremos emparejar cruzado o por ranking si los scores son iguales
      return b.player.elo - a.player.elo; // Mayor ELO primero
    });

    for (let c of candidatos) {
      const p2 = c.player;

      // Validar si ya jugaron antes
      if (p1.oponentes.has(p2.id)) continue;

      // Validar compatibilidad de color y decidir asignación
      const colorAsignado = obtenerColoresCompatibles(p1, p2);
      if (!colorAsignado) continue; // Incompatibilidad de colores

      // Si es compatible, hacemos el emparejamiento tentativo
      const nuevoEmp = {
        blancas: colorAsignado.blancas === p1.id ? p1 : p2,
        negras: colorAsignado.negras === p1.id ? p1 : p2
      };

      // Remover p1 y p2 de la lista y seguir resolviendo
      const listaSiguiente = restantes.filter(p => p.id !== p2.id);
      emparejamientosFinales.push(nuevoEmp);

      if (resolver(listaSiguiente)) {
        return true;
      }

      // Backtrack
      emparejamientosFinales.pop();
    }

    return false;
  }

  const exito = resolver(listaEmparejar);

  if (!exito && listaEmparejar.length > 0) {
    // Si falla el emparejamiento estricto, intentamos relajar las reglas de color (pero no la de no repetir partida)
    // Esto es un recurso de emergencia cuando el torneo tiene demasiadas rondas para pocos jugadores
    throw new Error("No se pudo generar un emparejamiento válido sin repetir partidas. El torneo podría haber alcanzado el límite práctico de rondas para este número de jugadores.");
  }

  // 5. Convertir a formato del torneo (con objetos de jugadores del torneo original)
  const mapeoJugadoresOriginales = {};
  jugadores.forEach(j => {
    mapeoJugadoresOriginales[j.id] = j;
  });

  const nuevosEmparejamientos = emparejamientosFinales.map((emp, index) => {
    return {
      id: `${rondaActual + 1}-${index + 1}`,
      blancas: mapeoJugadoresOriginales[emp.blancas.id],
      negras: mapeoJugadoresOriginales[emp.negras.id],
      resultado: null
    };
  });

  // Agregar el Bye si existe
  if (byeJugador) {
    nuevosEmparejamientos.push({
      id: `${rondaActual + 1}-bye`,
      blancas: mapeoJugadoresOriginales[byeJugador.id],
      negras: null, // null significa Bye
      resultado: '1-0' // Otorga punto completo automáticamente
    });
  }

  return nuevosEmparejamientos;
}

/**
 * Determina si dos jugadores son compatibles en color y asigna quién va con Blancas y quién con Negras.
 * @param {Object} p1 - Historial del jugador 1.
 * @param {Object} p2 - Historial del jugador 2.
 * @returns {Object|null} Objeto con `{ blancas: id, negras: id }` o null si no son compatibles.
 */
function obtenerColoresCompatibles(p1, p2) {
  // Reglas absolutas FIDE:
  // 1. Diferencia de color no puede exceder +2 o -2.
  //    Si p1 juega con Blancas, su nueva diferencia es p1.colorDiff + 1. Debe ser <= 2.
  //    Si p2 juega con Negras, su nueva diferencia es p2.colorDiff - 1. Debe ser >= -2.
  // 2. No se puede repetir el mismo color 3 veces seguidas.
  //    Si p1 tiene rachaColor = 2 (dos blancas seguidas), no puede jugar con Blancas.
  //    Si p2 tiene rachaColor = -2 (dos negras seguidas), no puede jugar con Negras.

  const p1PuedeBlancas = (p1.colorDiff + 1 <= 2) && (p1.rachaColor < 2);
  const p1PuedeNegras = (p1.colorDiff - 1 >= -2) && (p1.rachaColor > -2);

  const p2PuedeBlancas = (p2.colorDiff + 1 <= 2) && (p2.rachaColor < 2);
  const p2PuedeNegras = (p2.colorDiff - 1 >= -2) && (p2.rachaColor > -2);

  const opcion1Valida = p1PuedeBlancas && p2PuedeNegras; // p1 Blancas, p2 Negras
  const opcion2Valida = p2PuedeBlancas && p1PuedeNegras; // p2 Blancas, p1 Negras

  if (!opcion1Valida && !opcion2Valida) {
    return null; // Conflicto absoluto de color
  }

  if (opcion1Valida && !opcion2Valida) {
    return { blancas: p1.id, negras: p2.id };
  }

  if (opcion2Valida && !opcion1Valida) {
    return { blancas: p2.id, negras: p1.id };
  }

  // Ambas opciones son válidas. Evaluamos preferencias para elegir la mejor.
  const prefP1 = calcularPreferenciaColor(p1); // 'W', 'B', o null
  const prefP2 = calcularPreferenciaColor(p2); // 'W', 'B', o null

  // Si tienen preferencias opuestas, las concedemos
  if (prefP1 === 'W' && prefP2 === 'B') {
    return { blancas: p1.id, negras: p2.id };
  }
  if (prefP1 === 'B' && prefP2 === 'W') {
    return { blancas: p2.id, negras: p1.id };
  }

  // Si tienen la misma preferencia, decidimos por fuerza de preferencia
  const fuerza1 = calcularFuerzaPreferencia(p1);
  const fuerza2 = calcularFuerzaPreferencia(p2);

  if (fuerza1 !== fuerza2) {
    // El jugador con mayor fuerza de preferencia obtiene su color preferido
    if (fuerza1 > fuerza2) {
      // p1 gana su preferencia
      return prefP1 === 'W'
        ? { blancas: p1.id, negras: p2.id }
        : { blancas: p2.id, negras: p1.id };
    } else {
      // p2 gana su preferencia
      return prefP2 === 'W'
        ? { blancas: p2.id, negras: p1.id }
        : { blancas: p1.id, negras: p2.id };
    }
  }

  // Si las fuerzas son iguales, FIDE Dutch asigna color alternado según el último enfrentamiento
  // o según la posición del ranking (TPN).
  // Por defecto, le damos el color preferido al de mayor ELO (TPN superior)
  if (p1.elo >= p2.elo) {
    // p1 obtiene su preferencia si tiene una. Si prefiere W, él Blancas. Si prefiere B, él Negras.
    if (prefP1 === 'W') return { blancas: p1.id, negras: p2.id };
    if (prefP1 === 'B') return { blancas: p2.id, negras: p1.id };
    // Sin preferencias, sorteamos por alternación
    return p1.colores[p1.colores.length - 1] === 'W'
      ? { blancas: p2.id, negras: p1.id }
      : { blancas: p1.id, negras: p2.id };
  } else {
    if (prefP2 === 'W') return { blancas: p2.id, negras: p1.id };
    if (prefP2 === 'B') return { blancas: p1.id, negras: p2.id };
    return p2.colores[p2.colores.length - 1] === 'W'
      ? { blancas: p1.id, negras: p2.id }
      : { blancas: p2.id, negras: p1.id };
  }
}

/**
 * Calcula el color preferido de un jugador.
 */
function calcularPreferenciaColor(p) {
  if (p.colorDiff > 0) return 'B'; // Ha jugado más blancas, prefiere negras
  if (p.colorDiff < 0) return 'W'; // Ha jugado más negras, prefiere blancas

  // Si está equilibrado, prefiere alternar respecto a su última partida
  if (p.colores.length > 0) {
    return p.colores[p.colores.length - 1] === 'W' ? 'B' : 'W';
  }

  return null; // Sin preferencia (ej. Ronda 1)
}

/**
 * Mide cuantitativamente la fuerza de la preferencia.
 * Mayor valor = preferencia más fuerte.
 */
function calcularFuerzaPreferencia(p) {
  // Si tiene una racha de 2 del mismo color, es una preferencia absoluta (fuerza 3)
  if (Math.abs(p.rachaColor) >= 2) return 3;
  // Si la diferencia acumulada es >= 1, es una preferencia fuerte (fuerza 2)
  if (Math.abs(p.colorDiff) >= 1) return 2;
  // Alternar por equilibrio es preferencia leve (fuerza 1)
  if (p.colores.length > 0) return 1;
  return 0; // Sin preferencia
}

/**
 * Genera emparejamientos de sistema suizo para equipos sin considerar preferencias de color de FIDE.
 * @param {Object} torneo - El objeto del torneo con su estado.
 * @returns {Array} Array de emparejamientos.
 */
export function generarEmparejamientosEquipos(torneo) {
  const { jugadores, rondas, rondaActual } = torneo;
  const equiposActivos = jugadores.filter(t => t.activo);

  if (equiposActivos.length < 2) {
    throw new Error("Se necesitan al menos 2 equipos activos para generar emparejamientos.");
  }

  const historialEquipos = {};
  jugadores.forEach(t => {
    historialEquipos[t.id] = {
      id: t.id,
      nombre: t.nombre,
      elo: t.elo,
      score: 0, // Match Points
      oponentes: new Set(),
      hasBye: false
    };
  });

  rondas.forEach(ronda => {
    ronda.emparejamientos.forEach(emp => {
      const blancasId = emp.blancas ? emp.blancas.id : null;
      const negrasId = emp.negras ? emp.negras.id : null;
      const resultado = emp.resultado;

      if (blancasId && negrasId) {
        historialEquipos[blancasId].oponentes.add(negrasId);
        historialEquipos[negrasId].oponentes.add(blancasId);

        if (resultado === '1-0' || resultado === '1-0_F') {
          historialEquipos[blancasId].score += 2;
        } else if (resultado === '0-1' || resultado === '0-1_F') {
          historialEquipos[negrasId].score += 2;
        } else if (resultado === '0.5-0.5') {
          historialEquipos[blancasId].score += 1;
          historialEquipos[negrasId].score += 1;
        }
      } else if (blancasId && !negrasId) {
        historialEquipos[blancasId].hasBye = true;
        historialEquipos[blancasId].score += (torneo.modalidad === 'pasapiezas' ? 2 : 1);
      } else if (!blancasId && negrasId) {
        historialEquipos[negrasId].hasBye = true;
        historialEquipos[negrasId].score += (torneo.modalidad === 'pasapiezas' ? 2 : 1);
      }
    });
  });

  let listaEmparejar = equiposActivos.map(t => historialEquipos[t.id]);

  let byeEquipo = null;
  if (listaEmparejar.length % 2 !== 0) {
    const candidatosBye = listaEmparejar
      .filter(t => !t.hasBye)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.elo - b.elo;
      });

    if (candidatosBye.length > 0) {
      byeEquipo = candidatosBye[0];
      listaEmparejar = listaEmparejar.filter(t => t.id !== byeEquipo.id);
    }
  }

  listaEmparejar.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return b.elo - a.elo;
  });

  const emparejamientosFinales = [];

  function resolver(list) {
    if (list.length === 0) return true;

    const p1 = list[0];
    const restantes = list.slice(1);

    const candidatos = restantes.map((p2, index) => {
      return {
        player: p2,
        index: index,
        scoreDiff: Math.abs(p1.score - p2.score)
      };
    });

    candidatos.sort((a, b) => {
      if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
      return b.player.elo - a.player.elo;
    });

    for (let c of candidatos) {
      const p2 = c.player;

      if (p1.oponentes.has(p2.id)) continue;

      const nuevoEmp = {
        blancas: p1,
        negras: p2
      };

      const listaSiguiente = restantes.filter(p => p.id !== p2.id);
      emparejamientosFinales.push(nuevoEmp);

      if (resolver(listaSiguiente)) {
        return true;
      }

      emparejamientosFinales.pop();
    }

    return false;
  }

  const exito = resolver(listaEmparejar);

  if (!exito && listaEmparejar.length > 0) {
    throw new Error("No se pudo generar un emparejamiento válido de equipos sin repetir matches. El torneo podría haber alcanzado el límite de rondas.");
  }

  const mapeoEquiposOriginales = {};
  jugadores.forEach(t => {
    mapeoEquiposOriginales[t.id] = t;
  });

  const nuevosEmparejamientos = emparejamientosFinales.map((emp, index) => {
    return {
      id: `${rondaActual + 1}-${index + 1}`,
      blancas: mapeoEquiposOriginales[emp.blancas.id],
      negras: mapeoEquiposOriginales[emp.negras.id],
      resultado: null,
      boardResults: []
    };
  });

  if (byeEquipo) {
    nuevosEmparejamientos.push({
      id: `${rondaActual + 1}-bye`,
      blancas: mapeoEquiposOriginales[byeEquipo.id],
      negras: null,
      resultado: '1-0',
      boardResults: []
    });
  }

  return nuevosEmparejamientos;
}
