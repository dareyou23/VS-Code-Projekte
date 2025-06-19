// --- Private Modul-Variablen (State) ---
let allGamesData = [];
let totalScores = {};
let currentPlayerNamesOrder = [];
let currentDealerIndex = -1;
let bockRoundsActive = 0;
let bockGamesPlayedInCurrentStreak = 0;
let totalBockGamesInCurrentStreak = 0;
let editingGameIndex = -1;
let appSettings = {
    startgeld: "10.00",
    punktwert: "0.05",
    playerCount: 5
};

const DOKO_STORAGE_KEY = 'doppelkopfAuswertungSession_vFinalComplete_v8_modular';

// --- Private Hilfsfunktionen ---

function calculateSoloScores(soloPlayerName, activePlayers, effectiveValue) {
    const scores = {};
    activePlayers.forEach(p => scores[p] = 0);
    if (activePlayers.includes(soloPlayerName)) {
        const kontraPlayers = activePlayers.filter(p => p !== soloPlayerName);
        scores[soloPlayerName] = effectiveValue * kontraPlayers.length;
        kontraPlayers.forEach(player => scores[player] = -effectiveValue);
    }
    return scores;
}

function calculateReKontraScores(rePlayerNames, activePlayers, effectiveValue) {
    const scores = {};
    activePlayers.forEach(p => scores[p] = 0);
    const actualRePlayersInRound = rePlayerNames.filter(p => activePlayers.includes(p));
    const kontraPlayersInRound = activePlayers.filter(p => !actualRePlayersInRound.includes(p));
    actualRePlayersInRound.forEach(player => scores[player] = effectiveValue);
    kontraPlayersInRound.forEach(player => scores[player] = -effectiveValue);
    return scores;
}


// --- Exportierte Funktionen (Public API des Moduls) ---

export const roleDisplayNames = {
    re: 'R', kontra: 'K', hochzeit: 'H', solo: 'S', geber: 'G'
};

export function getGameState() {
    return {
        allGamesData: [...allGamesData], // Kopien zurückgeben, um direkte Mutation zu verhindern
        totalScores: { ...totalScores },
        currentPlayerNamesOrder: [...currentPlayerNamesOrder],
        currentDealerIndex,
        bockRoundsActive,
        editingGameIndex,
        appSettings: { ...appSettings }
    };
}

export function setEditingGameIndex(index) {
    editingGameIndex = index;
}

export function addOrUpdateGame(gameInputs) {
    if (editingGameIndex !== -1) {
        allGamesData[editingGameIndex] = { id: allGamesData[editingGameIndex].id, inputs: gameInputs };
    } else {
        allGamesData.push({ id: Date.now() + Math.random(), inputs: gameInputs });
    }
    // Nach dem Hinzufügen/Ändern wird der Bearbeitungsmodus beendet.
    editingGameIndex = -1;
}

export function processAllGames() {
    let tempBockActive = 0;
    let tempBockPlayedInStreak = 0;
    let tempBockTotalInStreak = 0;
    let currentCumulativeScores = {};
    const allPlayerNamesInSession = new Set();
    
    // 1. Alle Spielernamen der gesamten Session sammeln
    allGamesData.forEach(gameEntry => {
        gameEntry.inputs.players.forEach(p => { if (p.name) allPlayerNamesInSession.add(p.name); });
        if (gameEntry.inputs.geberName) allPlayerNamesInSession.add(gameEntry.inputs.geberName);
    });

    currentPlayerNamesOrder.forEach(name => { if(name) allPlayerNamesInSession.add(name) });

    allPlayerNamesInSession.forEach(name => { currentCumulativeScores[name] = 0; });
    const headerNames = currentPlayerNamesOrder.filter(name => name && name.trim());

    // 2. Alle Spiele durchlaufen und die Daten für die UI-Tabelle generieren
    const tableRowsData = [];

    for (let i = 0; i < allGamesData.length; i++) {
        const gameEntry = allGamesData[i];
        const inputs = gameEntry.inputs;
        const gameDispNum = i + 1;
        
        const roles = { re: [], h: null, solo: null };
        inputs.players.forEach(pIn => {
            if (pIn.name && pIn.selectedRole === 're') roles.re.push(pIn.name);
            else if (pIn.name && pIn.selectedRole === 'hochzeit') roles.h = pIn.name;
            else if (pIn.name && pIn.selectedRole === 'solo') roles.solo = pIn.name;
        });

        const activePlyInThisGame = inputs.players
            .map(p => p.name)
            .filter(name => name && !(inputs.playerCount === 5 && name === inputs.geberName));
        
        activePlyInThisGame.forEach(ap => { if (currentCumulativeScores[ap] === undefined) currentCumulativeScores[ap] = 0; });
        if (inputs.playerCount === 5 && inputs.geberName && currentCumulativeScores[inputs.geberName] === undefined) {
            currentCumulativeScores[inputs.geberName] = 0;
        }

        let gType = roles.solo ? 'solo' : (roles.h ? 'hochzeit' : 'normal');
        const origVal = inputs.gameValue;
        const isBockRoundCurrentGame = tempBockActive > 0;
        const bockDisp = isBockRoundCurrentGame ? `${tempBockPlayedInStreak + 1}/${tempBockTotalInStreak}` : "0/0";

        const processAndAddRow = (value, valueText, type, rePartei, soloSpieler, roster) => {
            let roundScores = {};
            if (type === 'solo' || type === 'hochzeit_solo' || type === 'hochzeit_phase1') {
                roundScores = calculateSoloScores(soloSpieler, activePlyInThisGame, value);
            } else {
                roundScores = calculateReKontraScores(rePartei, activePlyInThisGame, value);
            }

            activePlyInThisGame.forEach(p => currentCumulativeScores[p] = (currentCumulativeScores[p] || 0) + (roundScores[p] || 0));
            
            tableRowsData.push({
                gameDisplayNum: gameDispNum,
                allGamesDataIndex: i,
                displayedGameValueText: valueText,
                bockDisplayTextForCell: bockDisp,
                cumulativeScoresSnapshot: { ...currentCumulativeScores },
                rosterForThisRow: roster,
                gameDetails: {
                    type,
                    soloSpieler,
                    rePartei,
                    geberName: inputs.geberName,
                    activePlayersInThisRow: activePlyInThisGame,
                    triggeredBock: inputs.triggerNewBockRound
                }
            });
        };

        if (gType === 'hochzeit') {
            const effP1 = 1 * (isBockRoundCurrentGame ? 2 : 1);
            const rosterP1 = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === roles.h) ? 'hochzeit' : 'kontra' }));
            processAndAddRow(effP1, `${effP1} (H Suche)`, 'hochzeit_phase1', null, roles.h, rosterP1);

            const effP2 = origVal * (isBockRoundCurrentGame ? 2 : 1);
            const hPartner = roles.re.length === 1 ? roles.re[0] : null;
            if (hPartner) {
                const rePartei = [roles.h, hPartner];
                const rosterP2 = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === roles.h) ? 'hochzeit' : (pn === hPartner ? 're' : 'kontra') }));
                processAndAddRow(effP2, `${effP2} (H m.P.)`, 'hochzeit_mit_partner', rePartei, null, rosterP2);
            } else {
                const rosterP2 = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === roles.h) ? 'hochzeit' : 'kontra' }));
                processAndAddRow(effP2, `${effP2} (H Solo)`, 'hochzeit_solo', null, roles.h, rosterP2);
            }
        } else {
            const effVal = origVal * (isBockRoundCurrentGame ? 2 : 1);
            if (gType === 'solo') {
                const roster = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: pn === roles.solo ? 'solo' : 'kontra' }));
                processAndAddRow(effVal, effVal.toString(), 'solo', null, roles.solo, roster);
            } else { // Normal
                const roster = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: roles.re.includes(pn) ? 're' : 'kontra' }));
                processAndAddRow(effVal, effVal.toString(), 'normal', roles.re, null, roster);
            }
        }

        // Bockrunden-Logik nach dem Spiel aktualisieren
        if (isBockRoundCurrentGame) {
            tempBockActive--;
            tempBockPlayedInStreak++;
        }
        if (inputs.triggerNewBockRound) {
            const newBocks = inputs.playerCount;
            if (tempBockActive === 0) {
                tempBockPlayedInStreak = 0;
                tempBockTotalInStreak = newBocks;
            } else {
                tempBockTotalInStreak += newBocks;
            }
            tempBockActive += newBocks;
        }
        if (tempBockActive === 0 && tempBockPlayedInStreak >= tempBockTotalInStreak && tempBockTotalInStreak > 0) {
            tempBockPlayedInStreak = 0;
            tempBockTotalInStreak = 0;
        }
    }

    // 3. Finalen State nach allen Berechnungen setzen
    totalScores = { ...currentCumulativeScores };
    bockRoundsActive = tempBockActive;
    bockGamesPlayedInCurrentStreak = tempBockPlayedInStreak;
    totalBockGamesInCurrentStreak = tempBockTotalInStreak;

    // 4. Ein umfassendes Objekt mit allen für die UI benötigten Daten zurückgeben
    return {
        tableRows: tableRowsData,
        headerNames: headerNames,
        finalScores: { ...totalScores },
        hasGames: allGamesData.length > 0,
        appSettings
    };
}

export function saveSession() {
    const sessionData = {
        allGamesData,
        currentPlayerNamesOrder,
        currentDealerIndex,
        appSettings
    };
    localStorage.setItem(DOKO_STORAGE_KEY, JSON.stringify(sessionData));
}

export function loadSession() {
    const stored = localStorage.getItem(DOKO_STORAGE_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        allGamesData = data.allGamesData || [];
        currentPlayerNamesOrder = data.currentPlayerNamesOrder || Array(data.appSettings?.playerCount || 5).fill("");
        currentDealerIndex = data.currentDealerIndex !== undefined ? data.currentDealerIndex : -1;
        appSettings = data.appSettings || { startgeld: "10.00", punktwert: "0.05", playerCount: 5 };
        return true; // Signalisiert, dass Daten geladen wurden
    }
    return false; // Signalisiert, dass keine Daten da waren
}

export function clearSession() {
    localStorage.removeItem(DOKO_STORAGE_KEY);
    allGamesData = [];
    totalScores = {};
    currentPlayerNamesOrder = [];
    currentDealerIndex = -1;
    bockRoundsActive = 0;
    bockGamesPlayedInCurrentStreak = 0;
    totalBockGamesInCurrentStreak = 0;
    editingGameIndex = -1;
    appSettings = { startgeld: "10.00", punktwert: "0.05", playerCount: 5 };
}

export function updatePlayerName(index, newName, count) {
    // Sicherstellen, dass das Array die richtige Länge hat
    while (currentPlayerNamesOrder.length < count) {
        currentPlayerNamesOrder.push("");
    }
    currentPlayerNamesOrder = currentPlayerNamesOrder.slice(0, count);

    const oldName = (index < currentPlayerNamesOrder.length) ? currentPlayerNamesOrder[index] : "";
    
    if (index < count) {
        currentPlayerNamesOrder[index] = newName;
    }

    if (editingGameIndex === -1 && oldName !== newName) {
         if (oldName && totalScores.hasOwnProperty(oldName)) {
            if (newName && !totalScores.hasOwnProperty(newName)) {
                totalScores[newName] = totalScores[oldName];
            }
            if (oldName.toLowerCase() !== newName.toLowerCase() || !newName) {
                delete totalScores[oldName];
            }
        }
        if (newName && !totalScores.hasOwnProperty(newName)) {
            totalScores[newName] = 0;
        }
    }
}

export function updateCurrentPlayerNamesOrder(names) {
    currentPlayerNamesOrder = names;
}

export function setDealer(index) {
    currentDealerIndex = index;
}

export function setNextDealer(lastDealerName = null) {
    const numPlayers = appSettings.playerCount;
    const activePlayerNames = currentPlayerNamesOrder.filter(n => n && n.trim());
    
    if (activePlayerNames.length === 0) {
        currentDealerIndex = -1;
        return;
    }

    let lastDealerIdxInActiveList = -1;
    const dealerNameToFind = lastDealerName || (currentDealerIndex !== -1 && currentPlayerNamesOrder[currentDealerIndex]);
    
    if (dealerNameToFind) {
        lastDealerIdxInActiveList = activePlayerNames.indexOf(dealerNameToFind);
    }
    
    const nextDealerIdxInActiveList = (lastDealerIdxInActiveList + 1) % activePlayerNames.length;
    const nextDealerName = activePlayerNames[nextDealerIdxInActiveList];
    
    currentDealerIndex = currentPlayerNamesOrder.indexOf(nextDealerName);
}

export function updateSettings(settings) {
    appSettings = { ...appSettings, ...settings };
}