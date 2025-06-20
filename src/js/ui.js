import { roleDisplayNames } from './state.js';

let scoreChartInstance = null; // Globale Variable für die Chart-Instanz

export const DOM = {
    playerCountRadios: document.querySelectorAll('input[name="playerCount"]'),
    playerDropzonesContainer: document.getElementById('player-dropzones'),
    playerForm: document.getElementById('playerForm'),
    outputSection: document.querySelector('.output-section'),
    outputTableBody: document.getElementById('outputTableBody'),
    outputTable: document.getElementById('outputTable'),
    errorMessageDiv: document.getElementById('errorMessage'),
    currentDateDiv: document.getElementById('currentDate'),
    submitGameButton: document.getElementById('submitGameButton'),
    newGameDayButton: document.getElementById('newGameDayButton'),
    startgeldInput: document.getElementById('startgeldInput'),
    punktwertInput: document.getElementById('punktwertInput'),
    abrechnungOutputDiv: document.getElementById('abrechnungOutput'),
    abrechnungTable: document.getElementById('abrechnungTable'),
    chartSectionDiv: document.querySelector('.chart-section'),
    scoreChartCanvas: document.getElementById('scoreChart'),
};

export function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    DOM.currentDateDiv.textContent = now.toLocaleDateString('de-DE', options);
}

function updateOutputTableHeader(playerNames) {
    const thead = DOM.outputTable.tHead || DOM.outputTable.createTHead();
    let headRow = thead.rows[0];
    if (!headRow) {
        headRow = thead.insertRow();
    }
    headRow.innerHTML = '<th>Spiel #</th><th>Spielwert</th><th>Bock</th>'; // Reset

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

    newRow.insertCell().textContent = gameDisplayNum;
    const spielwertCell = newRow.insertCell();
    const numericValue = parseFloat(displayedGameValueText);
    spielwertCell.innerHTML = `<span class="${numericValue < 0 ? 'negative-score' : ''}">${displayedGameValueText}</span>`;
    newRow.insertCell().textContent = bockDisplayTextForCell;

    allPlayerNamesInHeaderOrder.forEach(playerName => {
        const score = cumulativeScoresSnapshot[playerName] !== undefined ? cumulativeScoresSnapshot[playerName] : (newRow.previousSibling?.cells[newRow.insertCell().cellIndex]?.querySelector('span')?.textContent || 0);
        let cell = newRow.insertCell();
        let roleChar = '-';
        let classToAdd = 'out-of-round';

        if (gameDetails.activePlayersInThisRow.includes(playerName)) {
            const playerInfo = rosterForThisRow.find(p => p.name === playerName);
            const gameRole = playerInfo ? playerInfo.roleForDisplay : 'kontra';
            
            roleChar = roleDisplayNames[gameRole] || 'K';
            if (gameDetails.geberName === playerName && !playerInfo.roleForDisplay) {
                roleChar += `/${roleDisplayNames.kontra}`;
            }

            if(gameRole === 're' || gameRole === 'hochzeit') classToAdd = 're-partei';
            else if (gameRole === 'solo') classToAdd = 'solo-player';
            else classToAdd = 'kontra-partei';
            
        } else {
             if (gameDetails.geberName === playerName) roleChar = roleDisplayNames.geber;
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
        const event = new CustomEvent('editGame', { detail: { gameIndex: allGamesDataIndex } });
        document.dispatchEvent(event);
    };
    actionCell.appendChild(editBtn);
}


export function renderTable(tableRowsData, headerNames) {
    DOM.outputTableBody.innerHTML = '';
    updateOutputTableHeader(headerNames);
    tableRowsData.forEach(rowData => addGameRowToTable(rowData, headerNames));
}


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
        
        const scoreEl = document.querySelector(`[data-score-for-player="${index}"]`);
        if(scoreEl) {
            scoreEl.textContent = score;
            scoreEl.classList.toggle('positive', score > 0);
            scoreEl.classList.toggle('negative', score < 0);
        }
        
        const paymentEl = document.querySelector(`[data-payment-for-player="${index}"]`);
        if(paymentEl) {
            let amount = score === maxScore && scoresInCurrentOrder.filter(s => s === maxScore).length === 1 ? startgeld : ((maxScore - score) * punktwertVal) + startgeld;
            paymentEl.textContent = `${amount.toFixed(2)} €`;
        }
    });
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
    
    const thead = DOM.abrechnungTable.tHead || DOM.abrechnungTable.createTHead();
    const tbody = DOM.abrechnungTable.tBodies[0] || DOM.abrechnungTable.createTBody();
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
        let amount = score === maxScore && playerNames.filter(p => finalScores[p] === maxScore).length === 1 ? startgeld : ((maxScore - score) * punktwertVal) + startgeld;
        paymentRow.insertCell().textContent = amount.toFixed(2);
    });

    DOM.abrechnungOutputDiv.style.display = 'block';
}

export function setSubmitButtonMode(mode) {
    if (mode === 'edit') {
        DOM.submitGameButton.textContent = 'Änderungen speichern';
        DOM.submitGameButton.style.backgroundColor = '#ffc107';
    } else {
        DOM.submitGameButton.textContent = 'Spielrunde erfassen';
        DOM.submitGameButton.style.backgroundColor = '#007bff';
    }
}

export function populateFormForEdit(gameEntry) {
    const gameToEdit = gameEntry.inputs;
    const rolePool = document.getElementById('role-pool');
    
    const allPlayerSlots = document.querySelectorAll('.role-slot');
    allPlayerSlots.forEach(slot => {
        const cards = slot.querySelectorAll('.role-card');
        cards.forEach(card => rolePool.appendChild(card));
    });

    document.getElementById('gameValueSelect').value = gameToEdit.gameValue;
    document.getElementById('bockTriggerSwitch').checked = gameToEdit.triggerNewBockRound;

    const playerTiles = Array.from(document.querySelectorAll('.player-dropzone'));
    gameToEdit.players.forEach(playerData => {
        const playerTile = playerTiles.find(tile => {
            const nameInput = tile.querySelector('.player-name-input');
            return nameInput && nameInput.value === playerData.name;
        });

        if (playerTile) {
            const roleSlot = playerTile.querySelector('.role-slot');
            playerData.roles.forEach(roleName => {
                const cardToMove = Array.from(rolePool.children).find(card => card.dataset.role === roleName && !card.parentElement.isSameNode(roleSlot));
                if (cardToMove) {
                    roleSlot.appendChild(cardToMove);
                }
            });
        }
    });
}

export function renderChart(tableRows, playerNames) {
    if (!playerNames || playerNames.length === 0 || tableRows.length === 0) {
        DOM.chartSectionDiv.style.display = 'none';
        return;
    }
    DOM.chartSectionDiv.style.display = 'block';

    const ctx = DOM.scoreChartCanvas.getContext('2d');
    const labels = ['Start'];
    tableRows.forEach(row => {
        let label = `Spiel ${row.gameDisplayNum}`;
        if (row.gameDetails.type.includes('hochzeit_phase1')) label += 'a';
        if (row.gameDetails.type.includes('hochzeit_mit_partner') || row.gameDetails.type.includes('hochzeit_solo')) label += 'b';
        labels.push(label);
    });

    const colors = ['#007bff', '#dc3545', '#ffc107', '#28a745', '#6f42c1'];
    const datasets = playerNames.map((name, index) => {
        const scores = [0];
        let lastKnownScore = 0;
        tableRows.forEach(row => {
            lastKnownScore = row.cumulativeScoresSnapshot[name] !== undefined ? row.cumulativeScoresSnapshot[name] : lastKnownScore;
            scores.push(lastKnownScore);
        });

        return {
            label: name,
            data: scores,
            borderColor: colors[index % colors.length],
            tension: 0.1,
            fill: false
        };
    });

    if (scoreChartInstance) {
        scoreChartInstance.destroy();
    }

    scoreChartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: true, text: 'Punkteverlauf der Spieler', font: { size: 18 } },
                legend: { position: 'top' }
            },
            scales: {
                x: { title: { display: true, text: 'Spielrunden' } },
                y: { title: { display: true, text: 'Punkte' }, beginAtZero: false }
            }
        }
    });
}

export function updateSettingsInputs(settings) {
    DOM.startgeldInput.value = settings.startgeld;
    DOM.punktwertInput.value = settings.punktwert;
}