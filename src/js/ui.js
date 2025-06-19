import { roleDisplayNames } from './state.js';

// --- DOM-Elemente sammeln und exportieren ---
export const DOM = {
    playerCountRadios: document.querySelectorAll('input[name="playerCount"]'),
    // playerRoleRow: document.getElementById('playerRoleRow'), // Veraltet
    playerDropzonesContainer: document.getElementById('player-dropzones'), // NEU
    playerForm: document.getElementById('playerForm'),
    outputSection: document.querySelector('.output-section'),
    outputTableBody: document.getElementById('outputTableBody'),
    outputTable: document.getElementById('outputTable'),
    errorMessageDiv: document.getElementById('errorMessage'),
    // gameValueRadios: document.querySelectorAll('input[name="gameValueRadio"]'), // Veraltet
    // customGameValueInput: document.getElementById('customGameValue'), // Veraltet
    currentDateDiv: document.getElementById('currentDate'),
    submitGameButton: document.getElementById('submitGameButton'),
    newGameDayButton: document.getElementById('newGameDayButton'),
    startgeldInput: document.getElementById('startgeldInput'),
    punktwertInput: document.getElementById('punktwertInput'),
    abrechnungOutputDiv: document.getElementById('abrechnungOutput'),
    abrechnungTable: document.getElementById('abrechnungTable'),
    chartSectionDiv: document.querySelector('.chart-section'),
    scoreChartCanvas: document.getElementById('scoreChart'),
    // triggerNewBockRoundCheckbox: document.getElementById('triggerNewBockRound') // Veraltet
};

// --- UI-Anzeigefunktionen ---

export function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDateDiv.textContent = now.toLocaleDateString('de-DE', options);
}

export function updateOutputTableHeader(playerNames) {
    let headRow = DOM.outputTable.querySelector('thead tr');
    if (!headRow) {
        const thead = DOM.outputTable.tHead || DOM.outputTable.createTHead();
        headRow = thead.insertRow();
        headRow.insertCell().textContent = 'Spiel #';
        headRow.insertCell().textContent = 'Spielwert';
        headRow.insertCell().textContent = 'Bock';
    }
    while (headRow.children.length > 3) {
        headRow.removeChild(headRow.lastChild);
    }

    playerNames.forEach(name => {
        const th = document.createElement('th');
        th.textContent = name;
        headRow.appendChild(th);
    });

    const aktionTh = document.createElement('th');
    aktionTh.textContent = 'Aktion';
    headRow.appendChild(aktionTh);
}

function addGameRowToTable(rowData, allPlayerNamesInHeaderOrder) {
    const { gameDisplayNum, allGamesDataIndex, displayedGameValueText, bockDisplayTextForCell, cumulativeScoresSnapshot, rosterForThisRow, gameDetails } = rowData;
    
    let newRow = DOM.outputTableBody.insertRow();
    newRow.dataset.allGamesDataIndex = allGamesDataIndex;
    if (gameDetails.triggeredBock) newRow.classList.add('bock-trigger-round');

    newRow.insertCell(0).textContent = gameDisplayNum;
    const spielwertCell = newRow.insertCell(1);
    const numericValue = parseFloat(displayedGameValueText);
    spielwertCell.innerHTML = `<span class="${numericValue < 0 ? 'negative-score' : ''}">${displayedGameValueText}</span>`;
    newRow.insertCell(2).textContent = bockDisplayTextForCell;

    allPlayerNamesInHeaderOrder.forEach(playerName => {
        const score = cumulativeScoresSnapshot[playerName] || 0;
        let cell = newRow.insertCell();
        let roleChar = '-';
        let classToAdd = '';

        const isActive = gameDetails.activePlayersInThisRow.includes(playerName);
        
        if (playerName === gameDetails.geberName) {
            roleChar = roleDisplayNames.geber;
            if (!isActive) classToAdd = 'out-of-round';
        }

        if (isActive) {
            const playerInfo = rosterForThisRow.find(p => p.name === playerName);
            const gameRole = playerInfo ? playerInfo.roleForDisplay : null;
            let roleDisplay = (playerName === gameDetails.geberName) ? `${roleDisplayNames.geber}/` : '';

            if (gameRole && roleDisplayNames[gameRole]) roleDisplay += roleDisplayNames[gameRole];
            else if (playerName !== gameDetails.geberName) roleDisplay = roleDisplayNames.kontra;
            else if (playerName === gameDetails.geberName && roleDisplay.endsWith('/')) roleDisplay += roleDisplayNames.kontra;
            roleChar = roleDisplay;

            if (gameDetails.type.includes('solo') && playerName === gameDetails.soloSpieler) classToAdd = 'solo-player';
            else if ((gameDetails.type === 'normal' || gameDetails.type === 'hochzeit_mit_partner') && gameDetails.rePartei?.includes(playerName)) classToAdd = 're-partei';
            else classToAdd = 'kontra-partei';

        } else if (!isActive) {
            if (!classToAdd) classToAdd = 'out-of-round';
            if (roleChar === '-') roleChar = '⌀';
        }

        let scoreDisp = score >= 0 ? `+${score}` : `${score}`;
        cell.innerHTML = `${roleChar} <span class="${score < 0 ? 'negative-score' : ''}">${scoreDisp}</span>`;
        if (classToAdd) cell.classList.add(classToAdd);
    });

    const actionCell = newRow.insertCell();
    const editBtn = document.createElement('button');
    editBtn.textContent = '✍️';
    editBtn.classList.add('edit-btn');
    editBtn.title = `Spiel ${gameDisplayNum} bearbeiten`;
    editBtn.onclick = () => {
        // Erzeuge ein "Custom Event", das in main.js gehört wird
        const event = new CustomEvent('editGame', { detail: { gameIndex: allGamesDataIndex } });
        document.dispatchEvent(event);
    };
    actionCell.appendChild(editBtn);
}


export function renderTable(tableRowsData, headerNames) {
    DOM.outputTableBody.innerHTML = '';
    updateOutputTableHeader(headerNames);
    tableRowsData.forEach(rowData => addGameRowToTable(rowData, headerNames));
    DOM.outputSection.style.display = tableRowsData.length > 0 ? 'block' : 'none';
}


/**
 * NEU: Erstellt die Spieler-Kacheln basierend auf der Spieleranzahl und Namen.
 * Ersetzt die alte createPlayerColumns Funktion.
 */
export function createPlayerTiles(count, playerNames = []) {
    DOM.playerDropzonesContainer.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const playerName = playerNames[i] || '';
        const tile = document.createElement('div');
        tile.className = 'player-dropzone';
        tile.dataset.playerId = i;

        tile.innerHTML = `
            <input type="text" class="player-name-input" placeholder="Spieler ${i + 1}" value="${playerName}" data-index="${i}">
            <div class="role-slot"></div>
            <div class="player-stats">
                <div class="stat-item">
                    <span class="label">Punkte:</span>
                    <span class="value player-score" data-score-for-player="${i}">0</span>
                </div>
                <div class="stat-item">
                    <span class="label">Zahlt:</span>
                    <span class="value player-payment" data-payment-for-player="${i}">0,00 €</span>
                </div>
            </div>
        `;
        DOM.playerDropzonesContainer.appendChild(tile);
    }
}

/**
 * NEU: Aktualisiert die Statistiken (Punkte, Zahlbetrag) in den Spieler-Kacheln.
 */
export function updatePlayerTileStats(finalScores, settings) {
    const startgeld = parseFloat(settings.startgeld) || 0;
    const punktwertVal = parseFloat(settings.punktwert) || 0;
    const nameInputs = Array.from(document.querySelectorAll('.player-name-input'));
    const allPlayerNames = nameInputs.map(input => input.value);
    
    if (allPlayerNames.length === 0) return;

    const scoresInCurrentOrder = allPlayerNames.map(name => finalScores[name] || 0);
    const maxScore = scoresInCurrentOrder.length > 0 ? Math.max(...scoresInCurrentOrder) : 0;

    allPlayerNames.forEach((name, index) => {
        const score = finalScores[name] || 0;
        
        // Punkte aktualisieren
        const scoreEl = document.querySelector(`[data-score-for-player="${index}"]`);
        if(scoreEl) {
            scoreEl.textContent = score;
            scoreEl.classList.remove('positive', 'negative');
            if (score > 0) {
                scoreEl.classList.add('positive');
            } else if (score < 0) {
                scoreEl.classList.add('negative');
            }
        }
        
        // Zahlbetrag berechnen und aktualisieren
        const paymentEl = document.querySelector(`[data-payment-for-player="${index}"]`);
        if(paymentEl) {
            let amount = score === maxScore && scoresInCurrentOrder.filter(s => s === maxScore).length === 1 ? -startgeld : -(((maxScore - score) * punktwertVal) + startgeld);
            paymentEl.textContent = `${Math.abs(amount).toFixed(2)} €`;
        }
    });
}


// --- Alte Funktionen (angepasst oder bald zu löschen) ---

export function manageGeberRoleInputs() {
    // Diese Funktion wird in der Drag-and-Drop Welt nicht mehr benötigt.
    // Vorerst leer lassen.
}

export function validateRolesAndGetError() {
    // Muss für Drag-and-Drop neu geschrieben werden.
    return null; // Vorläufig keine Fehler
}

export function displayError(message) {
    DOM.errorMessageDiv.textContent = message;
    DOM.errorMessageDiv.style.display = message ? 'block' : 'none';
}

export function getFormInputs() {
    // Muss für Drag-and-Drop neu geschrieben werden.
    // Gibt vorläufig Dummy-Daten zurück, um Fehler zu vermeiden.
    console.warn("getFormInputs() ist veraltet und liefert keine Daten.");
    return null; // Signalisiert, dass die Funktion noch nicht bereit ist.
}


export function resetForm(keepPlayerNames, playerCount) {
    // Muss für Drag-and-Drop angepasst werden. (z.B. Karten zurück in den Pool)
}

export function setSubmitButtonMode(mode) { // mode can be 'new' or 'edit'
    if (mode === 'edit') {
        DOM.submitGameButton.textContent = 'Änderungen speichern';
        DOM.submitGameButton.style.backgroundColor = '#ffc107';
    } else {
        DOM.submitGameButton.textContent = 'Spielrunde erfassen';
        DOM.submitGameButton.style.backgroundColor = '#007bff';
    }
}

export function populateFormForEdit(game, playerCount) {
     // Muss für Drag-and-Drop neu geschrieben werden.
    alert("Funktion 'Spiel bearbeiten' muss für die neue Oberfläche neu implementiert werden.");
}

export function displayAbrechnung(finalScores, settings) {
    if (!settings.startgeld || !settings.punktwert || !DOM.abrechnungTable) return;

    const startgeld = parseFloat(settings.startgeld) || 0;
    const punktwertVal = parseFloat(settings.punktwert) || 0;
    const playerNames = Object.keys(finalScores).filter(name => name).sort((a,b) => a.localeCompare(b));

    if (playerNames.length === 0) {
        DOM.abrechnungOutputDiv.style.display = 'none';
        return;
    }

    const maxScore = Math.max(...Object.values(finalScores).filter(s => typeof s === 'number'), 0);
    
    const thead = DOM.abrechnungTable.querySelector('thead');
    const tbody = DOM.abrechnungTable.querySelector('tbody');
    thead.innerHTML = '';
    tbody.innerHTML = '';

    const headRow = thead.insertRow();
    headRow.insertCell().textContent = 'Position';
    playerNames.forEach(name => headRow.insertCell().textContent = name);
    
    const pointsRow = tbody.insertRow();
    pointsRow.insertCell().textContent = 'Endpunkte';
    playerNames.forEach(name => pointsRow.insertCell().textContent = finalScores[name] || 0);
    
    const paymentRow = tbody.insertRow();
    paymentRow.insertCell().textContent = 'Zu Zahlen (€)';
    playerNames.forEach(name => {
        const score = finalScores[name] || 0;
        let amount = score === maxScore ? -startgeld : -(((maxScore - score) * punktwertVal) + startgeld);
        paymentRow.insertCell().textContent = Math.abs(amount).toFixed(2) + " €";
    });

    DOM.abrechnungOutputDiv.style.display = 'block';
}

export function updateSettingsInputs(settings) {
    DOM.startgeldInput.value = settings.startgeld;
    DOM.punktwertInput.value = settings.punktwert;
}