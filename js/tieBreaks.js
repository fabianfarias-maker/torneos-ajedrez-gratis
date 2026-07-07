/**
 * Módulo para el cálculo de desempates de ajedrez según directrices FIDE.
 */

/**
 * Calcula la clasificación completa del torneo aplicando los desempates seleccionados.
 * @param {Object} torneo - El torneo actual.
 * @returns {Array} Array de jugadores ordenados por posición, con métricas de desempate añadidas.
 */
export function calcularClasificacion(torneo) {
  const { jugadores, rondas, desempates, modalidad } = torneo;
  const isTeamTorneo = modalidad === 'suizo_equipos';
  const isSuizoEquipos = modalidad === 'suizo_equipos';

  // 1. Inicializar la estructura de estadísticas para cada jugador/equipo
  const stats = {};
  jugadores.forEach(j => {
    stats[j.id] = {
      id: j.id,
      nombre: j.nombre,
      apellido: j.apellido,
      club: j.club,
      elo: j.elo,
      activo: j.activo,
      score: 0,
      boardPoints: 0,
      wins: 0,
      blackGames: 0,
      winBlacks: 0,
      partidasJugadas: 0,
      oponentesIds: [], // Orden cronológico de oponentes
      resultadosPorOponente: {}, // oponenteId -> puntos obtenidos (1, 0.5, 0 o 2, 1, 0)
      bpPorOponente: {},
      puntosRondaARonda: [] // Puntuación acumulada tras cada ronda
    };
  });

  // 2. Procesar las rondas jugadas
  rondas.forEach((ronda, index) => {
    jugadores.forEach(j => {
      stats[j.id].__preRondaScore = stats[j.id].score;
    });

    ronda.emparejamientos.forEach(emp => {
      const isDoubleRR = torneo.modalidad === 'round-robin' && torneo.rrTipo === 'double';
      const partidasAProcesar = (isDoubleRR && emp.partidas) ? emp.partidas : [emp];

      partidasAProcesar.forEach(p => {
        const blancasId = p.blancas ? p.blancas.id : null;
        const negrasId = p.negras ? p.negras.id : null;
        const res = p.resultado;

        // Si no hay resultado todavía, no sumamos nada para esta ronda
        if (!res) return;

        if (blancasId && negrasId) {
          stats[blancasId].oponentesIds.push(negrasId);
          stats[negrasId].oponentesIds.push(blancasId);
          stats[blancasId].partidasJugadas++;
          stats[negrasId].partidasJugadas++;

          if (isSuizoEquipos) {
            let bpA = 0;
            let bpB = 0;
            if (p.boardResults && p.boardResults.length > 0) {
              p.boardResults.forEach(br => {
                if (br.resultado === '1-0') bpA += 1;
                else if (br.resultado === '0-1') bpB += 1;
                else if (br.resultado === '0.5-0.5') { bpA += 0.5; bpB += 0.5; }
                else if (br.resultado === '1-0_F') bpA += 1;
                else if (br.resultado === '0-1_F') bpB += 1;
              });
            } else {
              if (res === '1-0') { bpA = torneo.teamBoards || 4; bpB = 0; }
              else if (res === '0-1') { bpA = 0; bpB = torneo.teamBoards || 4; }
              else if (res === '0.5-0.5') { bpA = (torneo.teamBoards || 4) / 2; bpB = (torneo.teamBoards || 4) / 2; }
            }

            stats[blancasId].boardPoints += bpA;
            stats[negrasId].boardPoints += bpB;
            stats[blancasId].bpPorOponente[negrasId] = (stats[blancasId].bpPorOponente[negrasId] || 0) + bpA;
            stats[negrasId].bpPorOponente[blancasId] = (stats[negrasId].bpPorOponente[blancasId] || 0) + bpB;

            if (res === '1-0' || res === '1-0_F') {
              stats[blancasId].score += 2;
              stats[blancasId].wins += 1;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 2;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 0;
            } else if (res === '0-1' || res === '0-1_F') {
              stats[negrasId].score += 2;
              stats[negrasId].wins += 1;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 2;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 0;
            } else if (res === '0.5-0.5') {
              stats[blancasId].score += 1;
              stats[negrasId].score += 1;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 1;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 1;
            }
          } else {
            stats[negrasId].blackGames = (stats[negrasId].blackGames || 0) + 1;
            if (res === '1-0' || res === '1-0_F') {
              stats[blancasId].score += 1;
              stats[blancasId].wins += 1;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 1;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 0;
            } else if (res === '0-1' || res === '0-1_F') {
              stats[negrasId].score += 1;
              stats[negrasId].wins += 1;
              stats[negrasId].winBlacks = (stats[negrasId].winBlacks || 0) + 1;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 1;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 0;
            } else if (res === '0.5-0.5') {
              stats[blancasId].score += 0.5;
              stats[negrasId].score += 0.5;
              stats[blancasId].resultadosPorOponente[negrasId] = (stats[blancasId].resultadosPorOponente[negrasId] || 0) + 0.5;
              stats[negrasId].resultadosPorOponente[blancasId] = (stats[negrasId].resultadosPorOponente[blancasId] || 0) + 0.5;
            }
          }
        } else if (blancasId && !negrasId) {
          if (isSuizoEquipos) {
            stats[blancasId].score += 1;
            stats[blancasId].wins += 1;
            stats[blancasId].boardPoints += (torneo.teamBoards || 4) / 2;
          } else {
            stats[blancasId].score += 1;
            stats[blancasId].wins += 1;
          }
        } else if (!blancasId && negrasId) {
          if (isSuizoEquipos) {
            stats[negrasId].score += 1;
            stats[negrasId].wins += 1;
            stats[negrasId].boardPoints += (torneo.teamBoards || 4) / 2;
          } else {
            stats[negrasId].score += 1;
            stats[negrasId].wins += 1;
          }
        }
      });
    });

    // Guardar la puntuación acumulada
    jugadores.forEach(j => {
      stats[j.id].puntosRondaARonda.push(stats[j.id].score);
    });
  });

  // 3. Calcular desempates
  const clasificacion = jugadores.map(j => {
    const playerStats = stats[j.id];

    const oponentesScores = playerStats.oponentesIds.map(id => stats[id].score);
    const oponentesElos = playerStats.oponentesIds.map(id => stats[id].elo);

    const bh = oponentesScores.reduce((sum, val) => sum + val, 0);

    let bhC1 = bh;
    if (oponentesScores.length > 0) {
      const minScore = Math.min(...oponentesScores);
      bhC1 = bh - minScore;
    }

    let bhM1 = bh;
    if (oponentesScores.length >= 2) {
      const minScore = Math.min(...oponentesScores);
      const maxScore = Math.max(...oponentesScores);
      bhM1 = bh - minScore - maxScore;
    } else if (oponentesScores.length === 1) {
      bhM1 = 0;
    }

    let sb = 0;
    playerStats.oponentesIds.forEach(opId => {
      const puntosOp = stats[opId].score;
      const resContraOp = playerStats.resultadosPorOponente[opId] || 0;
      sb += puntosOp * resContraOp;
    });

    let sbMp = 0;
    playerStats.oponentesIds.forEach(opId => {
      const mpOponente = stats[opId].score;
      const bpObtenidos = playerStats.bpPorOponente[opId] || 0;
      sbMp += mpOponente * bpObtenidos;
    });

    const prog = playerStats.puntosRondaARonda.reduce((sum, val) => sum + val, 0);

    const aro = oponentesElos.length > 0 
      ? Math.round(oponentesElos.reduce((sum, val) => sum + val, 0) / oponentesElos.length) 
      : j.elo;

    const isBPPrimary = isSuizoEquipos && desempates[0] === 'BP';

    return {
      ...j,
      score: isBPPrimary ? playerStats.boardPoints : playerStats.score,
      matchPoints: playerStats.score,
      boardPoints: playerStats.boardPoints,
      wins: playerStats.wins,
      oponentesIds: playerStats.oponentesIds,
      resultadosPorOponente: playerStats.resultadosPorOponente,
      bpPorOponente: playerStats.bpPorOponente,
      BH: bh,
      'BH-C1': bhC1,
      'BH-M1': bhM1,
      SB: sb,
      PROGRESSIVE: prog,
      ARO: aro,
      DE: 0,
      KOYA: 0,
      WIN: playerStats.wins,
      BLACKS: playerStats.blackGames || 0,
      WIN_BLACKS: playerStats.winBlacks || 0,
      BP: playerStats.boardPoints,
      'BH-MP': bh,
      'SB-MP': sbMp
    };
  });

  // Calcular desempates DE y KOYA dinámicamente
  clasificacion.forEach(p => {
    const tied = clasificacion.filter(other => other.id !== p.id && other.score === p.score);
    let deVal = 0;
    tied.forEach(t => {
      deVal += p.resultadosPorOponente[t.id] || 0;
    });
    p.DE = deVal;
  });

  const koyaThreshold = torneo.rondasTotales * (isTeamTorneo ? 1 : 0.5);
  clasificacion.forEach(p => {
    let koyaVal = 0;
    p.oponentesIds.forEach(opId => {
      const op = clasificacion.find(o => o.id === opId);
      if (op && op.score >= koyaThreshold) {
        koyaVal += p.resultadosPorOponente[opId] || 0;
      }
    });
    p.KOYA = koyaVal;
  });

  clasificacion.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    for (let criterio of desempates) {
      if (criterio === 'BH-C1') {
        if (a['BH-C1'] !== b['BH-C1']) return b['BH-C1'] - a['BH-C1'];
      } else if (criterio === 'BH-M1') {
        if (a['BH-M1'] !== b['BH-M1']) return b['BH-M1'] - a['BH-M1'];
      } else if (criterio === 'BH') {
        if (a.BH !== b.BH) return b.BH - a.BH;
      } else if (criterio === 'SB') {
        if (a.SB !== b.SB) return b.SB - a.SB;
      } else if (criterio === 'DE') {
        if (a.DE !== b.DE) return b.DE - a.DE;
      } else if (criterio === 'KOYA') {
        if (a.KOYA !== b.KOYA) return b.KOYA - a.KOYA;
      } else if (criterio === 'WIN') {
        if (a.WIN !== b.WIN) return b.WIN - a.WIN;
      } else if (criterio === 'BLACKS') {
        if (a.BLACKS !== b.BLACKS) return b.BLACKS - a.BLACKS;
      } else if (criterio === 'WIN_BLACKS') {
        if (a.WIN_BLACKS !== b.WIN_BLACKS) return b.WIN_BLACKS - a.WIN_BLACKS;
      } else if (criterio === 'BP') {
        if (a.BP !== b.BP) return b.BP - a.BP;
      } else if (criterio === 'MP') {
        if (a.matchPoints !== b.matchPoints) return b.matchPoints - a.matchPoints;
      } else if (criterio === 'BH-MP') {
        if (a['BH-MP'] !== b['BH-MP']) return b['BH-MP'] - a['BH-MP'];
      } else if (criterio === 'SB-MP') {
        if (a['SB-MP'] !== b['SB-MP']) return b['SB-MP'] - a['SB-MP'];
      }
    }

    if (a.elo !== b.elo) {
      return b.elo - a.elo;
    }

    const nameA = a.nombre.toLowerCase();
    const nameB = b.nombre.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    return 0;
  });

  let currentRank = 1;
  clasificacion.forEach((player, index) => {
    if (index > 0) {
      const prev = clasificacion[index - 1];
      let esEmpateAbsoluto = prev.score === player.score;
      if (esEmpateAbsoluto) {
        for (let criterio of desempates) {
          if (prev[criterio] !== player[criterio]) {
            esEmpateAbsoluto = false;
            break;
          }
        }
      }
      if (!esEmpateAbsoluto) {
        currentRank = index + 1;
      }
    }
    player.rank = currentRank;
  });

  return clasificacion;
}
