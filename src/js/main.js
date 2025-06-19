import * as state from './state.js';
import * as ui from './ui.js';

// --- Zentrale Update-Funktion ---
function refreshUI() {
    const processedData = state.processAllGames();
    const { headerNames, tableRows, finalScores, hasGames, appSettings } = processedData;

    // Aktualisiert die herkömmliche Ausgabetabelle
    ui.updateOutputTableHeader(headerNames);
    ui.renderTable(tableRows, headerNames);
    ui.displayAbrechnung(finalScores, appSettings);

    // NEU: Aktualisiert die Statistiken in den neuen Spieler-Kacheln
    ui.updatePlayerTileStats(finalScores, appSettings);
    
    ui.DOM.outputSection.style.display = hasGames ? 'block' : 'none';
}

// --- Event-Handler ---

function handleFormSubmit(event) {
    event.preventDefault();
    alert("Speichern noch nicht implementiert für die neue Oberfläche!");
    return; // Temporär deaktiviert

    // Die folgende Logik muss an die neue UI angepasst werden (nächste Schritte)
    const error = ui.validateRolesAndGetError();
    ui.displayError(error);
    if (error) return;

    const gameInputs = ui.getFormInputs();
    if (!gameInputs) {
        ui.displayError('Spielwert fehlt oder ist ungültig.');
        return;
    }
    
    const namesFromForm = gameInputs.players.map(p => p.name);
    state.updateCurrentPlayerNamesOrder(namesFromForm);

    state.addOrUpdateGame(gameInputs);
    
    refreshUI();
    
    // ... restliche Logik muss ebenfalls angepasst werden ...
    
    state.saveSession();
}

function handlePlayerCountChange(event) {
    const newCount = parseInt(event.target.value);
    state.updateSettings({ playerCount: newCount });
    
    const { currentPlayerNamesOrder } = state.getGameState();
    // Erstellt die Kacheln neu, behält aber die Namen, wenn möglich
    const namesForNewCount = Array.from({ length: newCount }, (_, i) => currentPlayerNamesOrder[i] || '');
    state.updateCurrentPlayerNamesOrder(namesForNewCount);

    ui.createPlayerTiles(newCount, namesForNewCount);
    refreshUI();
}

function handlePlayerNameInput(event) {
    const index = parseInt(event.target.dataset.index);
    const newName = event.target.value; // trim() erst bei Speicherung
    const { playerCount } = state.getGameState().appSettings;
    state.updatePlayerName(index, newName, playerCount);
    refreshUI();
}

function handleNewGameDay() {
    const confirmed = confirm("Möchten Sie wirklich alle Daten löschen und einen neuen Spieltag beginnen?\nDieser Vorgang kann nicht rückgängig gemacht werden.");
    if (confirmed) {
        state.clearSession();
        location.reload(); // Einfachste Methode für einen kompletten Reset
    }
}

function handleEditGame(event) {
    const { gameIndex } = event.detail;
    state.setEditingGameIndex(gameIndex);
    const { allGamesData } = state.getGameState();
    const gameToEdit = allGamesData[gameIndex].inputs;
    
    ui.populateFormForEdit(gameToEdit, gameToEdit.playerCount);
}

function handleSettingsChange() {
    state.updateSettings({
        startgeld: ui.DOM.startgeldInput.value,
        punktwert: ui.DOM.punktwertInput.value
    });
    const { finalScores, appSettings } = state.processAllGames();
    ui.displayAbrechnung(finalScores, appSettings);
    // NEU: Auch die Kacheln bei Einstellungs-Änderung aktualisieren
    refreshUI();
    state.saveSession();
}

// --- Initialisierung ---

document.addEventListener('DOMContentLoaded', () => {
    ui.displayCurrentDate();

    // Event-Listener registrieren
    ui.DOM.playerForm.addEventListener('submit', handleFormSubmit);
    ui.DOM.newGameDayButton.addEventListener('click', handleNewGameDay);
    
    ui.DOM.playerCountRadios.forEach(radio => {
        radio.addEventListener('change', handlePlayerCountChange);
    });

    // Event Delegation für die neuen, dynamischen Felder
    ui.DOM.playerForm.addEventListener('input', (event) => {
        if (event.target.classList.contains('player-name-input')) {
            handlePlayerNameInput(event);
        }
    });
     ui.DOM.playerForm.addEventListener('blur', (event) => {
        if (event.target.classList.contains('player-name-input')) {
            // Namen trimmen und speichern, wenn das Feld verlassen wird
            event.target.value = event.target.value.trim();
            handlePlayerNameInput(event); // Nochmal aufrufen mit getrimmtem Wert
            state.saveSession();
        }
    }, true); // Use capture phase to ensure it runs before other blurs

    document.addEventListener('editGame', handleEditGame);

    ui.DOM.startgeldInput.addEventListener('input', handleSettingsChange);
    ui.DOM.punktwertInput.addEventListener('input', handleSettingsChange);


    // Anwendung laden
    const sessionLoaded = state.loadSession();
    let { appSettings, currentPlayerNamesOrder } = state.getGameState();
    
    // UI initialisieren
    document.getElementById(`players${appSettings.playerCount}`).checked = true;
    ui.updateSettingsInputs(appSettings);
    
    // Stellt sicher, dass das Namensarray zur Spielerzahl passt
    while(currentPlayerNamesOrder.length < appSettings.playerCount) currentPlayerNamesOrder.push('');
    currentPlayerNamesOrder = currentPlayerNamesOrder.slice(0, appSettings.playerCount);
    state.updateCurrentPlayerNamesOrder(currentPlayerNamesOrder);
    
    ui.createPlayerTiles(appSettings.playerCount, currentPlayerNamesOrder);
    
    if (sessionLoaded) {
        refreshUI();
    }
});