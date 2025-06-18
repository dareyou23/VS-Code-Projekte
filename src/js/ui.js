// src/js/ui.js

import { roleDisplayNames } from './state.js';

// --- DOM-Elemente sammeln und exportieren ---
export const DOM = {
    playerCountRadios: document.querySelectorAll('input[name="playerCount"]'),
    playerRoleRow: document.getElementById('playerRoleRow'),
    playerForm: document.getElementById('playerForm'),
    outputSection: document.querySelector('.output-section'),
    outputTableBody: document.getElementById('outputTableBody'),
    outputTable: document.getElementById('outputTable'),
    errorMessageDiv: document.getElementById('errorMessage'),
    gameValueRadios: document.querySelectorAll('input[name="gameValueRadio"]'),
    customGameValueInput: document.getElementById('customGameValue'),
    currentDateDiv: document.getElementById('currentDate'),
    submitGameButton: document.getElementById('submitGameButton'),
    newGameDayButton: document.getElementById('newGameDayButton'),
    startgeldInput: document.getElementById('startgeldInput'),
    punktwertInput: document.getElementById('punktwertInput'),
    abrechnungOutputDiv: document.getElementById('abrechnungOutput'),
    abrechnungTable: document.getElementById('abrechnungTable'),
    chartSectionDiv: document.querySelector('.chart-section'),
    scoreChartCanvas: document.getElementById('scoreChart'),
    triggerNewBockRoundCheckbox: document.getElementById('triggerNewBockRound')
};

let myScoreChart = null; // Chart-Instanz lokal im UI-Modul halten

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


export function createPlayerColumns(count, playerNames = [], dealerIndex = -1) {
    DOM.playerRoleRow.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const playerName = playerNames[i] || '';
        const playerColumn = document.createElement('div');
        playerColumn.classList.add('player-column');
        
        playerColumn.innerHTML = `
            <label for="player${i + 1}">Spieler ${i + 1}:</label>
            <input type="text" id="player${i + 1}" name="player${i + 1}" value="${playerName}" ${i < 4 ? 'required' : ''} data-index="${i}">
            <div class="role-radio-group">
                <div class="radio-option">
                    <input type="radio" id="geberPlayer${i + 1}" name="geberSelector" value="${i}" ${i === dealerIndex ? 'checked' : ''}>
                    <label for="geberPlayer${i + 1}">Ist Geber</label>
                </div>
            </div>
            <div class="role-radio-group" id="gameRoleGroup${i + 1}">
                <h4>Rolle im Spiel:</h4>
                <div class="radio-option"><input type="radio" id="role${i + 1}-re" name="rolePlayer${i + 1}" value="re"><label for="role${i + 1}-re">Re</label></div>
                <div class="radio-option"><input type="radio" id="role${i + 1}-hochzeit" name="rolePlayer${i + 1}" value="hochzeit"><label for="role${i + 1}-hochzeit">Hochzeit</label></div>
                <div class="radio-option"><input type="radio" id="role${i + 1}-solo" name="rolePlayer${i + 1}" value="solo"><label for="role${i + 1}-solo">Solo</label></div>
            </div>`;
        DOM.playerRoleRow.appendChild(playerColumn);
    }
    manageGeberRoleInputs();
}

export function manageGeberRoleInputs() {
    const playerCount = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    const geberIndex = geberRadio ? parseInt(geberRadio.value) : -1;

    for (let i = 0; i < 5; i++) {
        const gameRoleGroup = document.getElementById(`gameRoleGroup${i + 1}`);
        if (gameRoleGroup) {
            const radios = gameRoleGroup.querySelectorAll('input[type="radio"]');
            let shouldBeDisabled = (playerCount === 5 && i === geberIndex);
            radios.forEach(radio => { radio.disabled = shouldBeDisabled; });
            if (shouldBeDisabled) radios.forEach(r => r.checked = false);
        }
    }
}

export function validateRolesAndGetError() {
    const numPlayers = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const isFivePlayerGame = numPlayers === 5;

    const playerNames = [];
    for (let i = 1; i <= numPlayers; i++) {
        const nameInput = document.getElementById(`player${i}`);
        if ((!nameInput || !nameInput.value.trim()) && i <= 4) return `Bitte gib für Spieler ${i} einen Namen ein.`;
        playerNames.push(nameInput ? nameInput.value.trim() : "");
    }

    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    if (!geberRadio) return 'Bitte wähle einen Geber aus.';
    const geberIndex = parseInt(geberRadio.value);

    const activePlayers = isFivePlayerGame ? playerNames.filter((p, index) => index !== geberIndex) : [...playerNames];
    const roles = { re: [], hochzeit: [], solo: [] };

    playerNames.forEach((name, index) => {
        if (isFivePlayerGame && index === geberIndex) return;
        const roleRadio = document.querySelector(`input[name="rolePlayer${index + 1}"]:checked`);
        if (roleRadio) roles[roleRadio.value]?.push(name);
    });
    
    if (roles.solo.length > 1) return 'Es kann nur einen Solo-Spieler geben.';
    if (roles.solo.length > 0 && (roles.re.length > 0 || roles.hochzeit.length > 0)) return 'Bei einem Solo dürfen keine Re- oder Hochzeits-Spieler ausgewählt sein.';
    if (roles.hochzeit.length > 1) return 'Es kann nur einen Hochzeits-Spieler geben.';
    if (roles.hochzeit.length > 0 && roles.re.length > 1) return 'Bei einer Hochzeit kann maximal ein Re-Partner direkt ausgewählt werden.';
    if (roles.hochzeit.length > 0 && roles.re.length === 1 && roles.re[0] === roles.hochzeit[0]) return 'Der Hochzeits-Spieler kann nicht sein eigener Partner sein.';
    if (roles.solo.length === 0 && roles.hochzeit.length === 0 && roles.re.length !== 2) return 'Für ein normales Spiel müssen genau 2 "Re"-Spieler ausgewählt sein.';

    return null; // Kein Fehler
}

export function displayError(message) {
    DOM.errorMessageDiv.textContent = message;
    DOM.errorMessageDiv.style.display = message ? 'block' : 'none';
}

export function getFormInputs() {
    const playerCount = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    const geberIndex = geberRadio ? parseInt(geberRadio.value) : -1;
    const geberName = geberIndex !== -1 ? document.getElementById(`player${geberIndex + 1}`)?.value.trim() : null;

    const players = [];
    for (let i = 0; i < playerCount; i++) {
        const name = document.getElementById(`player${i + 1}`)?.value.trim() || '';
        const role = document.querySelector(`input[name="rolePlayer${i + 1}"]:checked`)?.value || null;
        players.push({ name, selectedRole: role });
    }

    let gameValue = document.querySelector('input[name="gameValueRadio"]:checked')?.value;
    if (!gameValue && DOM.customGameValueInput.value.trim()) {
        gameValue = DOM.customGameValueInput.value.trim();
    }
    if (gameValue === null || isNaN(parseInt(gameValue))) return null;

    return {
        playerCount,
        players,
        geberName,
        gameValue: parseInt(gameValue),
        triggerNewBockRound: DOM.triggerNewBockRoundCheckbox.checked
    };
}


export function resetForm(keepPlayerNames, playerCount) {
    DOM.customGameValueInput.value = '';
    DOM.gameValueRadios.forEach(radio => radio.checked = false);
    DOM.triggerNewBockRoundCheckbox.checked = false;

    for (let i = 1; i <= 5; i++) {
        document.querySelectorAll(`input[name="rolePlayer${i}"]`).forEach(r => r.checked = false);
        if (!keepPlayerNames) {
            const nameInput = document.getElementById(`player${i}`);
            if (nameInput) nameInput.value = '';
        }
    }
    setSubmitButtonMode('new');
}

export function setSubmitButtonMode(mode) { // mode can be 'new' or 'edit'
    if (mode === 'edit') {
        DOM.submitGameButton.textContent = 'Änderungen speichern';
        DOM.submitGameButton.style.backgroundColor = '#ffc107';
    } else {
        DOM.submitGameButton.textContent = 'Spielrunde erfassen & Teams bilden';
        DOM.submitGameButton.style.backgroundColor = '#007bff';
    }
}

export function populateFormForEdit(game, playerCount) {
    document.getElementById(`players${playerCount}`).checked = true;
    createPlayerColumns(playerCount, game.players.map(p => p.name));

    const geberIndex = game.players.findIndex(p => p.name === game.geberName);
    if (geberIndex !== -1) {
        document.getElementById(`geberPlayer${geberIndex + 1}`).checked = true;
    }

    game.players.forEach((p, i) => {
        if (p.selectedRole) {
            const roleRadio = document.getElementById(`role${i + 1}-${p.selectedRole}`);
            if (roleRadio) roleRadio.checked = true;
        }
    });

    const gameValueRadio = document.querySelector(`input[name="gameValueRadio"][value="${game.gameValue}"]`);
    if (gameValueRadio) gameValueRadio.checked = true;
    else DOM.customGameValueInput.value = game.gameValue;
    
    DOM.triggerNewBockRoundCheckbox.checked = game.triggerNewBockRound;
    setSubmitButtonMode('edit');
    manageGeberRoleInputs();
    document.querySelector('.input-section').scrollIntoView({ behavior: "smooth" });
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