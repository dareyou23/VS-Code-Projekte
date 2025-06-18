// src/js/main.js

import * as state from './state.js';
import * as ui from './ui.js';

// --- Zentrale Update-Funktion ---
// Diese Funktion wird immer aufgerufen, wenn sich Daten ändern und die UI neu gezeichnet werden muss.
function refreshUI() {
    const processedData = state.processAllGames();
    const { headerNames, tableRows, finalScores, hasGames, appSettings } = processedData;

    ui.updateOutputTableHeader(headerNames);
    ui.renderTable(tableRows, headerNames);
    ui.displayAbrechnung(finalScores, appSettings);
    
    // UI-Zustände anpassen
    ui.DOM.outputSection.style.display = hasGames ? 'block' : 'none';
}

// --- Event-Handler ---

function handleFormSubmit(event) {
    event.preventDefault();
    const error = ui.validateRolesAndGetError();
    ui.displayError(error);
    if (error) return;

    const gameInputs = ui.getFormInputs();
    if (!gameInputs) {
        ui.displayError('Spielwert fehlt oder ist ungültig.');
        return;
    }
    
    // Player-Namen im State aktualisieren, bevor das Spiel gespeichert wird
    const namesFromForm = gameInputs.players.map(p => p.name);
    state.updateCurrentPlayerNamesOrder(namesFromForm);

    state.addOrUpdateGame(gameInputs);
    
    refreshUI();
    
    const { playerCount } = state.getGameState().appSettings;
    ui.resetForm(true, playerCount); // Namen behalten
    state.setNextDealer(gameInputs.geberName); // Nächsten Geber basierend auf dem letzten Spiel setzen
    const { currentDealerIndex } = state.getGameState();
    ui.createPlayerColumns(playerCount, namesFromForm, currentDealerIndex); // Form neu zeichnen mit neuem Geber
    
    state.saveSession();
}

function handlePlayerCountChange(event) {
    const newCount = parseInt(event.target.value);
    state.updateSettings({ playerCount: newCount });
    // Leere Namens-Arrays für die neue Spieleranzahl
    const newPlayerNames = Array(newCount).fill('');
    state.updateCurrentPlayerNamesOrder(newPlayerNames);
    ui.createPlayerColumns(newCount, newPlayerNames, -1);
    refreshUI(); // Header neu zeichnen
}

function handlePlayerNameInput(event) {
    const index = parseInt(event.target.dataset.index);
    const newName = event.target.value.trim();
    const { playerCount } = state.getGameState().appSettings;
    state.updatePlayerName(index, newName, playerCount);
    refreshUI(); // Header live aktualisieren
    // Kein Save hier, um nicht bei jedem Tastendruck zu speichern
}

function handleRoleOrGeberChange() {
    ui.manageGeberRoleInputs();
    const error = ui.validateRolesAndGetError();
    ui.displayError(error);

    // Den aktuell ausgewählten Geber im State speichern
    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    if (geberRadio) {
        state.setDealer(parseInt(geberRadio.value));
    }
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

    // Event-Listener für dynamisch erstellte Elemente (Delegation)
    ui.DOM.playerRoleRow.addEventListener('change', (event) => {
        if (event.target.name.startsWith('rolePlayer') || event.target.name === 'geberSelector') {
            handleRoleOrGeberChange();
        }
    });
    ui.DOM.playerRoleRow.addEventListener('input', (event) => {
        if (event.target.type === 'text' && event.target.name.startsWith('player')) {
            handlePlayerNameInput(event);
        }
    });
    ui.DOM.playerRoleRow.addEventListener('blur', (event) => {
        if (event.target.type === 'text' && event.target.name.startsWith('player')) {
            // Erst beim Verlassen des Feldes speichern
            state.saveSession();
        }
    });

    // Listener für "Spiel bearbeiten"-Events
    document.addEventListener('editGame', handleEditGame);

    // Listener für Abrechnungseinstellungen
    ui.DOM.startgeldInput.addEventListener('input', handleSettingsChange);
    ui.DOM.punktwertInput.addEventListener('input', handleSettingsChange);


    // Anwendung laden
    const sessionLoaded = state.loadSession();
    const { appSettings, currentPlayerNamesOrder, currentDealerIndex } = state.getGameState();
    
    // UI initialisieren
    document.getElementById(`players${appSettings.playerCount}`).checked = true;
    ui.updateSettingsInputs(appSettings);
    ui.createPlayerColumns(appSettings.playerCount, currentPlayerNamesOrder, currentDealerIndex);
    
    if (sessionLoaded) {
        refreshUI();
        if(state.getGameState().allGamesData.length > 0) {
            const lastGame = state.getGameState().allGamesData.slice(-1)[0].inputs;
            state.setNextDealer(lastGame.geberName);
        } else {
            state.setNextDealer();
        }
        const updatedState = state.getGameState();
        ui.createPlayerColumns(updatedState.appSettings.playerCount, updatedState.currentPlayerNamesOrder, updatedState.currentDealerIndex);
    } else {
        // Frischer Start
        state.setNextDealer();
        const updatedState = state.getGameState();
        ui.createPlayerColumns(updatedState.appSettings.playerCount, updatedState.currentPlayerNamesOrder, updatedState.currentDealerIndex);
    }
    handleRoleOrGeberChange(); // Initial-Validierung durchführen
});