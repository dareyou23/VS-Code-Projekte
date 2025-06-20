import * as state from './state.js';
import * as ui from './ui.js';

/**
 * Initialisiert die Drag-and-Drop-Funktionalität.
 */
function initializeDragAndDrop() {
    const rolePool = document.getElementById('role-pool');
    const playerDropzones = document.querySelectorAll('.player-dropzone');

    new Sortable(rolePool, {
        group: 'doko-roles',
        animation: 150,
        ghostClass: 'sortable-ghost'
    });

    playerDropzones.forEach(tile => {
        const zone = tile.querySelector('.role-slot');
        new Sortable(zone, {
            group: 'doko-roles',
            animation: 150,
            ghostClass: 'sortable-ghost'
        });
    });
}

/**
 * Liest die Eingabedaten aus der Drag-and-Drop-Oberfläche aus.
 */
function getNewFormInputs() {
    const { playerCount } = state.getGameState().appSettings;
    const playerTiles = ui.DOM.playerDropzonesContainer.children;
    const players = [];
    let geberName = null;
    let geberCount = 0;

    for (const tile of playerTiles) {
        const nameInput = tile.querySelector('.player-name-input');
        const roleSlot = tile.querySelector('.role-slot');
        const roleCards = roleSlot ? roleSlot.querySelectorAll('.role-card') : [];
        const rolesOnTile = Array.from(roleCards).map(card => card.dataset.role);
        
        const playerName = nameInput ? nameInput.value.trim() : '';
        if (playerName) {
            players.push({ name: playerName, roles: rolesOnTile });
        }

        if (rolesOnTile.includes('geber')) {
            geberName = playerName;
            geberCount++;
        }
    }

    const gameValue = parseInt(document.getElementById('gameValueSelect').value, 10);
    const triggerNewBockRound = document.getElementById('bockTriggerSwitch').checked;

    return {
        playerCount,
        players,
        geberName,
        geberCount,
        gameValue,
        triggerNewBockRound,
    };
}


/**
 * Setzt die Eingabemaske für die nächste Runde zurück.
 */
function resetUIForNextRound() {
    const rolePool = document.getElementById('role-pool');
    const allPlayerSlots = document.querySelectorAll('.role-slot');
    const geberCard = document.querySelector('.role-card[data-role="geber"]');

    allPlayerSlots.forEach(slot => {
        const cards = slot.querySelectorAll('.role-card');
        cards.forEach(card => {
             if (card !== geberCard) {
                rolePool.appendChild(card);
            }
        });
    });

    const { currentDealerIndex } = state.getGameState();
    const newDealerSlot = document.querySelector(`.player-dropzone[data-player-id="${currentDealerIndex}"] .role-slot`);

    if (geberCard && newDealerSlot) {
        newDealerSlot.appendChild(geberCard);
    }
    
    document.getElementById('gameValueSelect').value = '1';
    document.getElementById('bockTriggerSwitch').checked = false;
}

/**
 * Aktualisiert die gesamte Benutzeroberfläche basierend auf dem aktuellen State.
 */
function refreshUI() {
    const processedData = state.processAllGames();
    const { headerNames, tableRows, finalScores, hasGames, appSettings } = processedData;

    ui.renderTable(tableRows, headerNames);
    ui.displayAbrechnung(finalScores, appSettings);
    ui.updatePlayerTileStats(finalScores, appSettings);
    ui.renderChart(tableRows, headerNames);

    if (ui.DOM.outputSection) {
        ui.DOM.outputSection.style.display = hasGames ? 'block' : 'none';
    }
}

/**
 * Verarbeitet das Absenden des Formulars für eine neue Spielrunde.
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    let gameInputs = getNewFormInputs();
    const { playerCount, players, geberName, geberCount } = gameInputs;

    if (players.length < playerCount) {
        alert(`Fehler: Bitte geben Sie Namen für alle ${playerCount} Spieler ein.`);
        return;
    }
    const isSoloGame = players.some(p => p.roles.includes('solo'));
    const isHochzeitGame = players.some(p => p.roles.includes('hochzeit'));

    if (isSoloGame && isHochzeitGame) {
        alert("Fehler: Ein Solo und eine Hochzeit können nicht gleichzeitig gespielt werden.");
        return;
    }
    if (geberCount > 1) {
        alert("Fehler: Es kann nur eine 'Geber'-Karte im Spiel sein.");
        return;
    }

    if (isSoloGame) {
        if (players.some(p => p.roles.includes('re'))) {
            alert("Fehler: Bei einem Solo dürfen keine 'Re'-Karten verteilt werden.");
            return;
        }
    } else if (isHochzeitGame) {
        // Keine weitere Validierung
    } else { // Normales Spiel
        const reCount = players.filter(p => p.roles.includes('re')).length;
        if (playerCount === 5) {
            if (geberCount !== 1 || reCount !== 2) {
                alert("Fehler: Für ein normales 5-Spieler-Spiel müssen ein Geber (setzt aus) und zwei Re-Spieler festgelegt werden.");
                return;
            }
        } else { // 4-Spieler-Spiel
            if (geberCount !== 1) {
                alert("Fehler: Für ein normales 4-Spieler-Spiel muss ein Geber festgelegt werden.");
                return;
            }
            if (reCount < 1 || reCount > 2) {
                alert("Fehler: Für ein normales 4-Spieler-Spiel müssen ein oder zwei Re-Spieler festgelegt werden.");
                return;
            }
            if (reCount === 1) {
                const rePlayer = players.find(p => p.roles.includes('re'));
                if (rePlayer.name === geberName) {
                    alert("Fehler: Bei nur einer 'Re'-Karte muss diese einem Nicht-Geber zugewiesen werden. Der Geber wird automatisch zum zweiten 'Re'-Spieler.");
                    return;
                }
            }
        }
    }

    let finalGeberName = geberName;
    if (geberCount === 0 && (isSoloGame || isHochzeitGame)) {
        const specialPlayer = isSoloGame 
            ? players.find(p => p.roles.includes('solo'))
            : players.find(p => p.roles.includes('hochzeit'));
        if (specialPlayer) {
            finalGeberName = specialPlayer.name;
            gameInputs.geberName = finalGeberName;
            if (!specialPlayer.roles.includes('geber')) {
                specialPlayer.roles.push('geber');
            }
        }
    }
    
    const namesFromForm = players.map(p => p.name);
    state.updateCurrentPlayerNamesOrder(namesFromForm);
    state.addOrUpdateGame(gameInputs);
    
    refreshUI();
    state.setNextDealer(finalGeberName);
    resetUIForNextRound(); 
    state.saveSession();

    if (state.getGameState().editingGameIndex !== -1) {
        state.setEditingGameIndex(-1);
        ui.setSubmitButtonMode('new');
        alert("Änderungen gespeichert!");
    } else {
        alert("Spielrunde erfasst! Die Geber-Karte wurde zum nächsten Spieler verschoben.");
    }
}

/**
 * Handler für das Ändern der Spieleranzahl.
 */
function handlePlayerCountChange(event) {
    const newCount = parseInt(event.target.value);
    state.updateSettings({ playerCount: newCount });
    const { currentPlayerNamesOrder } = state.getGameState();
    const namesForNewCount = Array.from({ length: newCount }, (_, i) => currentPlayerNamesOrder[i] || '');
    state.updateCurrentPlayerNamesOrder(namesForNewCount);
    ui.createPlayerTiles(newCount, namesForNewCount);
    initializeDragAndDrop();
    refreshUI();
}

/**
 * Handler für die Eingabe von Spielernamen.
 */
function handlePlayerNameInput(event) {
    const index = parseInt(event.target.dataset.index);
    const newName = event.target.value;
    const { playerCount } = state.getGameState().appSettings;
    state.updatePlayerName(index, newName, playerCount);
}

/**
 * Handler für das Starten eines neuen Spieltags.
 */
function handleNewGameDay() {
    const confirmed = confirm("Möchten Sie wirklich alle Daten löschen und einen neuen Spieltag beginnen?\nDieser Vorgang kann nicht rückgängig gemacht werden.");
    if (confirmed) {
        state.clearSession();
        location.reload();
    }
}

/**
 * Handler für das Bearbeiten eines Spiels.
 */
function handleEditGame(event) {
    const gameIndex = event.detail.gameIndex;
    const { allGamesData } = state.getGameState();
    if (gameIndex >= 0 && gameIndex < allGamesData.length) {
        state.setEditingGameIndex(gameIndex);
        ui.populateFormForEdit(allGamesData[gameIndex]);
        ui.setSubmitButtonMode('edit');
        window.scrollTo(0, 0);
    }
}

/**
 * Handler für das Ändern der Abrechnungseinstellungen.
 */
function handleSettingsChange() {
    state.updateSettings({
        startgeld: ui.DOM.startgeldInput.value,
        punktwert: ui.DOM.punktwertInput.value
    });
    refreshUI();
    state.saveSession();
}

/**
 * Initialisiert die Anwendung nach dem Laden der Seite.
 */
document.addEventListener('DOMContentLoaded', () => {
    ui.displayCurrentDate();
    ui.DOM.playerForm.addEventListener('submit', handleFormSubmit);
    ui.DOM.newGameDayButton.addEventListener('click', handleNewGameDay);
    ui.DOM.playerCountRadios.forEach(radio => {
        radio.addEventListener('change', handlePlayerCountChange);
    });
    ui.DOM.playerForm.addEventListener('input', (event) => {
        if (event.target.classList.contains('player-name-input')) {
            handlePlayerNameInput(event);
        }
    });
    ui.DOM.playerForm.addEventListener('blur', (event) => {
        if (event.target.classList.contains('player-name-input')) {
            event.target.value = event.target.value.trim();
            handlePlayerNameInput(event);
            refreshUI();
            state.saveSession();
        }
    }, true);
    document.addEventListener('editGame', handleEditGame);
    ui.DOM.startgeldInput.addEventListener('input', handleSettingsChange);
    ui.DOM.punktwertInput.addEventListener('input', handleSettingsChange);
    
    const sessionLoaded = state.loadSession();
    let { appSettings, currentPlayerNamesOrder } = state.getGameState();
    document.getElementById(`players${appSettings.playerCount}`).checked = true;
    ui.updateSettingsInputs(appSettings);
    
    while(currentPlayerNamesOrder.length < appSettings.playerCount) {
        currentPlayerNamesOrder.push('');
    }
    currentPlayerNamesOrder = currentPlayerNamesOrder.slice(0, appSettings.playerCount);
    state.updateCurrentPlayerNamesOrder(currentPlayerNamesOrder);
    
    ui.createPlayerTiles(appSettings.playerCount, currentPlayerNamesOrder);
    initializeDragAndDrop();
    
    if (sessionLoaded) {
        refreshUI();
    }
});