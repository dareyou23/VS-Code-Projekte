const playerCountRadios = document.querySelectorAll('input[name="playerCount"]');
const playerRoleRow = document.getElementById('playerRoleRow');
const playerForm = document.getElementById('playerForm');
const outputSection = document.querySelector('.output-section');
const outputTableBody = document.getElementById('outputTableBody');
const errorMessageDiv = document.getElementById('errorMessage');
const gameValueRadios = document.querySelectorAll('input[name="gameValueRadio"]');
const customGameValueInput = document.getElementById('customGameValue');
const outputTable = document.getElementById('outputTable');
const currentDateDiv = document.getElementById('currentDate');
const submitGameButton = document.getElementById('submitGameButton');
const newGameDayButton = document.getElementById('newGameDayButton');
const startgeldInput = document.getElementById('startgeldInput');
const punktwertInput = document.getElementById('punktwertInput');
const abrechnungOutputDiv = document.getElementById('abrechnungOutput');
const abrechnungTable = document.getElementById('abrechnungTable');
const chartSectionDiv = document.querySelector('.chart-section');
const scoreChartCanvas = document.getElementById('scoreChart');

let totalScores = {};
let currentPlayerNamesOrder = [];
let currentDealerIndex = -1;
let bockRoundsActive = 0;
let bockGamesPlayedInCurrentStreak = 0;
let totalBockGamesInCurrentStreak = 0;
let allGamesData = [];
let editingGameIndex = -1;
let myScoreChart = null;

const DOKO_STORAGE_KEY = 'doppelkopfAuswertungSession_vFinalCompletePlus_v7';

const roleDisplayNames = {
    re: 'R', kontra: 'K', hochzeit: 'H', solo: 'S', geber: 'G'
};

function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateDiv.textContent = now.toLocaleDateString('de-DE', options);
}

function manageGeberRoleInputs() {
    const playerCount = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    const geberIndex = geberRadio ? parseInt(geberRadio.value) : -1;

    for (let i = 0; i < 5; i++) {
        const gameRoleGroup = document.getElementById(`gameRoleGroup${i + 1}`);
        if (gameRoleGroup) {
            const radios = gameRoleGroup.querySelectorAll('input[type="radio"]');
            let shouldBeDisabled = (playerCount === 5 && i === geberIndex);
            
            radios.forEach(radio => {
                radio.disabled = shouldBeDisabled;
            });

            if (shouldBeDisabled) {
                radios.forEach(r => r.checked = false);
            }
        }
    }
}


function createPlayerColumns(count, playerNamesFromGameToEdit = null) {
    const existingPlayerNamesMap = new Map();
    if (playerNamesFromGameToEdit) {
        playerNamesFromGameToEdit.forEach((player, index) => {
            if (player.name) existingPlayerNamesMap.set(`player${index + 1}`, player.name);
        });
    } else {
        for (let i = 0; i < Math.max(currentPlayerNamesOrder.length, 5); i++) {
            const inputField = document.getElementById(`player${i + 1}`);
            if (inputField && inputField.value.trim() !== '') {
                existingPlayerNamesMap.set(`player${i + 1}`, inputField.value.trim());
            } else if (i < currentPlayerNamesOrder.length && currentPlayerNamesOrder[i] && currentPlayerNamesOrder[i].trim() !== '') {
                existingPlayerNamesMap.set(`player${i + 1}`, currentPlayerNamesOrder[i].trim());
            }
        }
    }

    playerRoleRow.innerHTML = '';
    const newPlayerNamesForCurrentOrder = [];
    for (let i = 0; i < count; i++) {
        let fieldPlayerName = '';
        if (playerNamesFromGameToEdit && i < playerNamesFromGameToEdit.length) {
            fieldPlayerName = playerNamesFromGameToEdit[i].name || '';
        } else {
             fieldPlayerName = existingPlayerNamesMap.get(`player${i + 1}`) ||
                               (i < currentPlayerNamesOrder.length ? currentPlayerNamesOrder[i] : '') ||
                               '';
        }
        newPlayerNamesForCurrentOrder.push(fieldPlayerName);

        const playerColumn = document.createElement('div');
        playerColumn.classList.add('player-column');
        
        playerColumn.innerHTML = `
            <label for="player${i + 1}">Spieler ${i + 1}:</label>
            <input type="text" id="player${i + 1}" name="player${i + 1}" value="${fieldPlayerName}" ${i < Math.min(count, 4) ? 'required' : ''}>
            
            <div class="role-radio-group">
                <div class="radio-option">
                    <input type="radio" id="geberPlayer${i + 1}" name="geberSelector" value="${i}">
                    <label for="geberPlayer${i + 1}">Ist Geber</label>
                </div>
            </div>

            <div class="role-radio-group" id="gameRoleGroup${i + 1}">
                <h4>Rolle im Spiel:</h4>
                <div class="radio-option"><input type="radio" id="role${i + 1}-re" name="rolePlayer${i + 1}" value="re"><label for="role${i + 1}-re">Re</label></div>
                <div class="radio-option"><input type="radio" id="role${i + 1}-hochzeit" name="rolePlayer${i + 1}" value="hochzeit"><label for="role${i + 1}-hochzeit">Hochzeit</label></div>
                <div class="radio-option"><input type="radio" id="role${i + 1}-solo" name="rolePlayer${i + 1}" value="solo"><label for="role${i + 1}-solo">Solo</label></div>
            </div>`;
        playerRoleRow.appendChild(playerColumn);
    }

    if (!playerNamesFromGameToEdit) {
         currentPlayerNamesOrder = newPlayerNamesForCurrentOrder.slice(0, count);
    }

    document.querySelectorAll('input[name="geberSelector"]').forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.checked) {
                const newDealerIndex = parseInt(event.target.value);
                if (currentDealerIndex !== newDealerIndex) {
                    currentDealerIndex = newDealerIndex;
                }
                manageGeberRoleInputs();
                validateRoles();
            }
        });
    });


    playerRoleRow.querySelectorAll('input[type="radio"][name^="rolePlayer"]').forEach(radio => {
        radio.addEventListener('change', validateRoles);
    });

    playerRoleRow.querySelectorAll('input[type="text"][name^="player"]').forEach((input, index) => {
        input.addEventListener('input', (event) => {
            try {
                const newName = event.target.value.trim();
                const oldName = (index < currentPlayerNamesOrder.length) ? currentPlayerNamesOrder[index] : "";

                if (index < count) {
                    while(currentPlayerNamesOrder.length <= index || currentPlayerNamesOrder.length < count) {
                        currentPlayerNamesOrder.push("");
                    }
                    currentPlayerNamesOrder = currentPlayerNamesOrder.slice(0, count);
                    currentPlayerNamesOrder[index] = newName;
                } else {
                    console.error("Input-Event für einen Index außerhalb der erwarteten Spieleranzahl:", index, count);
                    return;
                }

                if (oldName === newName) return;

                if (editingGameIndex === -1) {
                    if (oldName && oldName.trim() !== '' && totalScores.hasOwnProperty(oldName)) {
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

                updateOutputTableHeader();
                validateRoles();

                const geberRadioChecked = document.querySelector('input[name="geberSelector"]:checked');
                if (geberRadioChecked) {
                    currentDealerIndex = parseInt(geberRadioChecked.value);
                } else {
                    currentDealerIndex = -1;
                }
            } catch (e) {
                console.error("Fehler im Namens-Input-Event-Listener:", e);
            }
        });
    });

    if (editingGameIndex === -1 ) {
        currentPlayerNamesOrder.forEach(name => {
            if (name && name.trim() && !totalScores.hasOwnProperty(name.trim())) {
                totalScores[name.trim()] = 0;
            }
        });
    }


    if (editingGameIndex === -1 && !playerNamesFromGameToEdit) {
        setNextDealerAutomatically();
    }
    updateOutputTableHeader();
    manageGeberRoleInputs();
}

function updateOutputTableHeader() {
    let headRow = outputTable.querySelector('thead tr');
    if (!headRow) {
        const thead = outputTable.tHead || outputTable.createTHead();
        headRow = thead.insertRow();
        headRow.insertCell().textContent = 'Spiel #';
        headRow.insertCell().textContent = 'Spielwert';
        headRow.insertCell().textContent = 'Bock';
    }
    while (headRow.children.length > 3) {
        headRow.removeChild(headRow.lastChild);
    }

    let namesForHeader = currentPlayerNamesOrder.filter(name => name && name.trim());
    if(namesForHeader.length === 0){
        const numPlayersInForm = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
        for (let i = 0; i < numPlayersInForm; i++) {
            const playerInput = document.getElementById(`player${i + 1}`);
            if (playerInput && playerInput.value.trim()) {
                namesForHeader.push(playerInput.value.trim());
            }
        }
    }


    namesForHeader.forEach(name => {
        const th = document.createElement('th');
        th.textContent = name;
        headRow.appendChild(th);
    });

    const aktionTh = document.createElement('th');
    aktionTh.textContent = 'Aktion';
    headRow.appendChild(aktionTh);
}


function setNextDealerAutomatically(lastDealerNameFromGame = null) {
    const numPlayers = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const activePlayerNamesInDOM = [];
    for (let i = 0; i < numPlayers; i++) {
        const playerInput = document.getElementById(`player${i + 1}`);
        if (playerInput && playerInput.value.trim()) {
            activePlayerNamesInDOM.push(playerInput.value.trim());
        }
    }

    document.querySelectorAll('input[name="geberSelector"]').forEach(radio => radio.checked = false);

    if (activePlayerNamesInDOM.length === 0) {
        currentDealerIndex = -1;
        validateRoles();
        return;
    }

    let lastDealerIdxInActiveList = -1;

    if (lastDealerNameFromGame) {
        lastDealerIdxInActiveList = activePlayerNamesInDOM.indexOf(lastDealerNameFromGame);
    } else if (currentDealerIndex !== -1 && currentDealerIndex < currentPlayerNamesOrder.length && currentPlayerNamesOrder[currentDealerIndex]) {
        const dealerNameToFind = currentPlayerNamesOrder[currentDealerIndex];
        lastDealerIdxInActiveList = activePlayerNamesInDOM.indexOf(dealerNameToFind);
    }


    let nextDealerIdxInActiveList;
    if (lastDealerIdxInActiveList === -1 || lastDealerIdxInActiveList >= activePlayerNamesInDOM.length) {
        nextDealerIdxInActiveList = 0;
    } else {
        nextDealerIdxInActiveList = (lastDealerIdxInActiveList + 1) % activePlayerNamesInDOM.length;
    }

    const nextDealerName = activePlayerNamesInDOM[nextDealerIdxInActiveList];
    currentDealerIndex = -1;

    for (let i = 0; i < numPlayers; i++) {
        const playerInput = document.getElementById(`player${i + 1}`);
        if (playerInput && playerInput.value.trim() === nextDealerName) {
            currentDealerIndex = i;
            const dealerRadio = document.getElementById(`geberPlayer${i + 1}`);
            if (dealerRadio) dealerRadio.checked = true;
            break;
        }
    }
    manageGeberRoleInputs();
    validateRoles();
}

function validateRoles() {
    errorMessageDiv.style.display = 'none';
    errorMessageDiv.textContent = '';

    const numPlayers = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const isFivePlayerGame = numPlayers === 5;

    // 1. Check Player Names & Geber
    const playerNames = [];
    for (let i = 1; i <= numPlayers; i++) {
        const nameInput = document.getElementById(`player${i}`);
        if ((!nameInput || !nameInput.value.trim()) && i <= 4) {
            errorMessageDiv.textContent = `Bitte gib für Spieler ${i} einen Namen ein.`;
            errorMessageDiv.style.display = 'block';
            return false;
        }
        playerNames.push(nameInput ? nameInput.value.trim() : "");
    }

    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    if (!geberRadio) {
        errorMessageDiv.textContent = 'Bitte wähle einen Geber aus.';
        errorMessageDiv.style.display = 'block';
        return false;
    }
    const geberIndex = parseInt(geberRadio.value);

    // 2. Determine active players and roles
    const activePlayers = isFivePlayerGame ? playerNames.filter((p, index) => index !== geberIndex) : [...playerNames];
    const roles = { re: [], hochzeit: [], solo: [] };

    playerNames.forEach((name, index) => {
        if (isFivePlayerGame && index === geberIndex) return;

        const roleRadio = document.querySelector(`input[name="rolePlayer${index + 1}"]:checked`);
        if (roleRadio) {
            const role = roleRadio.value;
            if (roles[role] !== undefined) {
                roles[role].push(name);
            }
        }
    });
    
    // 3. Validate Game-Specific Rules
    if (roles.solo.length > 0) {
        if (roles.solo.length > 1) { 
            errorMessageDiv.textContent = 'Es kann nur einen Solo-Spieler geben.';
            errorMessageDiv.style.display = 'block';
            return false; 
        }
        if (roles.re.length > 0 || roles.hochzeit.length > 0) { 
            errorMessageDiv.textContent = 'Bei einem Solo dürfen keine Re- oder Hochzeits-Spieler ausgewählt sein.';
            errorMessageDiv.style.display = 'block';
            return false; 
        }
    } else if (roles.hochzeit.length > 0) {
        if (roles.hochzeit.length > 1) { 
            errorMessageDiv.textContent = 'Es kann nur einen Hochzeits-Spieler geben.';
            errorMessageDiv.style.display = 'block';
            return false; 
        }
        if (roles.re.length > 1) { 
            errorMessageDiv.textContent = 'Bei einer Hochzeit kann maximal ein Re-Partner direkt ausgewählt werden.';
            errorMessageDiv.style.display = 'block';
            return false; 
        }
        if (roles.re.length === 1 && roles.re[0] === roles.hochzeit[0]) { 
            errorMessageDiv.textContent = 'Der Hochzeits-Spieler kann nicht sein eigener Partner sein.';
            errorMessageDiv.style.display = 'block';
            return false; 
        }
    } else { // Normal Game
        if (roles.re.length !== 2) { 
            errorMessageDiv.textContent = 'Für ein normales Spiel müssen genau 2 "Re"-Spieler ausgewählt sein.';
            errorMessageDiv.style.display = 'block';
            return false;
        }
    }

    const allRolePlayers = [...roles.re, ...roles.hochzeit, ...roles.solo];
    for (const player of allRolePlayers) {
        if (!activePlayers.includes(player)) {
             errorMessageDiv.textContent = `Spieler "${player}" hat eine Rolle, ist aber nicht im aktiven Spiel (kann der Geber bei 5 Spielern sein).`;
             errorMessageDiv.style.display = 'block';
             return false;
        }
    }

    return true;
}


function calculateSoloScores(soloPlayerName, activePlayers, effectiveValue) {
    const scores = {}; activePlayers.forEach(p => scores[p] = 0);
    if (activePlayers.includes(soloPlayerName)) {
        const kontraPlayers = activePlayers.filter(p => p !== soloPlayerName);
        scores[soloPlayerName] = effectiveValue * kontraPlayers.length;
        kontraPlayers.forEach(player => scores[player] = -effectiveValue);
    } return scores;
}

function calculateReKontraScores(rePlayerNames, activePlayers, effectiveValue) {
    const scores = {}; activePlayers.forEach(p => scores[p] = 0);
    const actualRePlayersInRound = rePlayerNames.filter(p => activePlayers.includes(p));
    const kontraPlayersInRound = activePlayers.filter(p => !actualRePlayersInRound.includes(p));
    actualRePlayersInRound.forEach(player => scores[player] = effectiveValue);
    kontraPlayersInRound.forEach(player => scores[player] = -effectiveValue);
    return scores;
}

function addGameRowToTable(gameDisplayNum, gameAllGamesDataIndex, displayedGameValueText, bockDisplayTextForCell,
                         allPlayerNamesInHeaderOrder, rosterForThisRow,
                         cumulativeScoresSnapshot, gameDetails) {
    let newRow = outputTableBody.insertRow();
    newRow.dataset.allGamesDataIndex = gameAllGamesDataIndex;
    
    const editData = {
        ...gameDetails,
        rosterForThisRow,
        cumulativeTotalScores: { ...cumulativeScoresSnapshot }
    };
    delete editData.activePlayersInThisRow; 
    newRow.dataset.displayData = JSON.stringify(editData);


    if (gameDetails.triggeredBock) {
        newRow.classList.add('bock-trigger-round');
    }

    newRow.insertCell(0).textContent = gameDisplayNum;
    const spielwertCell = newRow.insertCell(1);
    const numericPartOfSpielwert = parseFloat(displayedGameValueText);
    spielwertCell.innerHTML = `<span class="${!isNaN(numericPartOfSpielwert) && numericPartOfSpielwert < 0 ? 'negative-score' : ''}">${displayedGameValueText}</span>`;
    newRow.insertCell(2).textContent = bockDisplayTextForCell;

    allPlayerNamesInHeaderOrder.forEach(playerName => {
        const currentCumulativeScoreToShow = cumulativeScoresSnapshot[playerName] || 0;
        let cell = newRow.insertCell(); let roleChar = '-'; let classToAdd = '';
        const playerInfo = rosterForThisRow.find(p => p.name === playerName);
        
        const isActive = gameDetails.activePlayersInThisRow.includes(playerName);

        if (playerName === gameDetails.geberName) {
            roleChar = roleDisplayNames.geber;
            if (!isActive) { // Aussetzender Geber bei 5 Spielern
                classToAdd = 'out-of-round';
            }
        }

        if (isActive) {
            const gameRole = playerInfo ? playerInfo.roleForDisplay : null;
            let roleDisplay = (playerName === gameDetails.geberName) ? `${roleDisplayNames.geber}/` : '';

            if (gameRole && roleDisplayNames[gameRole]) {
                roleDisplay += roleDisplayNames[gameRole];
            } else if (gameRole) {
                roleDisplay += '?';
            } else if (playerName !== gameDetails.geberName) {
                 roleDisplay = roleDisplayNames.kontra;
            } else if (playerName === gameDetails.geberName && roleDisplay.endsWith('/')) {
                roleDisplay += roleDisplayNames.kontra;
            }
            
            roleChar = roleDisplay;

            if ((gameDetails.type === 'solo' && playerName === gameDetails.soloSpieler) ||
                (gameDetails.type.startsWith('hochzeit') && gameDetails.soloSpieler && playerName === gameDetails.soloSpieler) ||
                (gameDetails.type === 'hochzeit_phase1' && playerName === gameDetails.soloSpieler) ) {
                classToAdd = 'solo-player';
            } else if (((gameDetails.type === 'normal' || gameDetails.type === 'hochzeit_mit_partner') &&
                        gameDetails.rePartei && gameDetails.rePartei.includes(playerName))) {
                classToAdd = 're-partei';
            } else {
                classToAdd = 'kontra-partei';
            }
        } else if (!gameDetails.activePlayersInThisRow.includes(playerName)) {
            if (!classToAdd) classToAdd = 'out-of-round';
            if (roleChar === '-') roleChar = '⌀';
        }


        let scoreDisp = currentCumulativeScoreToShow >= 0 ? `+${currentCumulativeScoreToShow}` : `${currentCumulativeScoreToShow}`;
        if (cumulativeScoresSnapshot[playerName] === undefined) {
            cell.innerHTML = `${roleChar} <span>0</span>`;
        } else {
            cell.innerHTML = `${roleChar} <span class="${currentCumulativeScoreToShow < 0 ? 'negative-score' : ''}">${scoreDisp}</span>`;
        }
        if (classToAdd) cell.classList.add(classToAdd);
    });
    const actionCell = newRow.insertCell(); const editBtn = document.createElement('button');
    editBtn.textContent = '✍️'; editBtn.classList.add('edit-btn'); editBtn.title = `Spiel ${gameDisplayNum} bearbeiten`;
    editBtn.onclick = () => startEditGame(gameAllGamesDataIndex); actionCell.appendChild(editBtn);
}

function resetFormAndPrepareForNewGame(keepPlayerNames = false) {
    customGameValueInput.value = '';
    gameValueRadios.forEach(radio => radio.checked = false);
    document.getElementById('triggerNewBockRound').checked = false;
    const numPlayersCurrent = parseInt(document.querySelector('input[name="playerCount"]:checked').value);

    for (let i = 1; i <= 5; i++) {
        const roleRadios = document.querySelectorAll(`input[name="rolePlayer${i}"]`);
        roleRadios.forEach(radio => radio.checked = false);

        if (!keepPlayerNames) {
            const nameInput = document.getElementById(`player${i}`);
            if (nameInput) nameInput.value = '';
        }
    }
    if (!keepPlayerNames) {
        currentPlayerNamesOrder = Array(numPlayersCurrent).fill("");
        updateOutputTableHeader();
        totalScores = {};
    }
    editingGameIndex = -1;
    submitGameButton.textContent = 'Spielrunde erfassen & Teams bilden';
    submitGameButton.style.backgroundColor = '#007bff';
    if(!keepPlayerNames) {
        setNextDealerAutomatically();
    }
    validateRoles();
}

function gatherInputsFromForm() {
    const selCount = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    
    const geberRadio = document.querySelector('input[name="geberSelector"]:checked');
    const geberIndex = geberRadio ? parseInt(geberRadio.value, 10) : -1;
    const geberName = geberIndex !== -1 ? (document.getElementById(`player${geberIndex + 1}`)?.value.trim() || null) : null;
    
    const playersData = [];
    for (let i = 0; i < selCount; i++) {
        const nameIn = document.getElementById(`player${i + 1}`);
        const playerName = nameIn ? nameIn.value.trim() : '';
        
        const roleRad = document.querySelector(`input[name="rolePlayer${i + 1}"]:checked`);
        const role = roleRad ? roleRad.value : null;

        playersData.push({ name: playerName, selectedRole: role });
    }

    let valIn = null; const selValRad = document.querySelector('input[name="gameValueRadio"]:checked');
    if (selValRad) valIn = selValRad.value;
    else if (customGameValueInput.value.trim() !== '') valIn = customGameValueInput.value.trim();

    if (valIn === null || valIn.trim() === '') {
        errorMessageDiv.textContent = 'Spielwert fehlt oder ist ungültig.'; errorMessageDiv.style.display = 'block'; return null;
    }
    const numVal = parseInt(valIn);
    if (isNaN(numVal)) { errorMessageDiv.textContent = 'Ungültiger Spielwert.'; errorMessageDiv.style.display = 'block'; return null; }
    
    return {
        id: editingGameIndex !== -1 ? allGamesData[editingGameIndex].id : Date.now() + Math.random(),
        playerCount: selCount,
        players: playersData,
        geberName: geberName,
        gameValue: numVal,
        triggerNewBockRound: document.getElementById('triggerNewBockRound').checked
    };
}

playerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!validateRoles()) return;
    const gameInputs = gatherInputsFromForm();
    if (!gameInputs) return;

    const currentNumPlayers = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const namesFromForm = [];
    for (let i = 0; i < currentNumPlayers; i++) {
        const playerInput = document.getElementById(`player${i + 1}`);
        namesFromForm.push(playerInput ? playerInput.value.trim() : "");
    }
     currentPlayerNamesOrder = namesFromForm.slice(0, currentNumPlayers);


    if (editingGameIndex !== -1) {
        allGamesData[editingGameIndex].inputs = gameInputs;
    } else {
        allGamesData.push({ id: gameInputs.id, inputs: gameInputs });
    }
    outputSection.style.display = 'block';
    recalculateAndRedrawTable();
    resetFormAndPrepareForNewGame(true);
    setNextDealerBasedOnLastGame();
    saveSessionToLocalStorage();
});

function recalculateAndRedrawTable() {
    outputTableBody.innerHTML = '';

    let tempBockActive = 0;
    let tempBockPlayedInStreak = 0;
    let tempBockTotalInStreak = 0;

    let currentCumulativeScores = {};
    const allPlayerNamesInSession = new Set();
    
    allGamesData.forEach(gameEntry => {
        gameEntry.inputs.players.forEach(playerInput => {
            if (playerInput.name && playerInput.name.trim()) {
                allPlayerNamesInSession.add(playerInput.name.trim());
            }
        });
         if (gameEntry.inputs.geberName) {
             allPlayerNamesInSession.add(gameEntry.inputs.geberName);
         }
    });

    allPlayerNamesInSession.forEach(name => {
        currentCumulativeScores[name] = 0;
    });

    updateOutputTableHeader();

    const plyNamesHead = Array.from(outputTable.querySelectorAll('thead tr th')).slice(3, -1).map(th => th.textContent);

    for (let i = 0; i < allGamesData.length; i++) {
        const gameEntry = allGamesData[i]; 
        const inputs = gameEntry.inputs; 
        const gameDispNum = i + 1;
        const gamePlyCount = inputs.playerCount; 
        const is5Ply = gamePlyCount === 5;
        
        const roles = { re: [], h: null, solo: null };
        const plyNamesConfThisGame = [];
        const geberForRound = inputs.geberName;

        inputs.players.forEach(pIn => {
            if (pIn.name && pIn.name.trim()) {
                plyNamesConfThisGame.push(pIn.name.trim());
                 if (pIn.selectedRole === 're') roles.re.push(pIn.name.trim());
                else if (pIn.selectedRole === 'hochzeit') roles.h = pIn.name.trim();
                else if (pIn.selectedRole === 'solo') roles.solo = pIn.name.trim();
            }
        });
        
        const activePlyInThisGame = plyNamesConfThisGame.filter(name => !(is5Ply && name === geberForRound));
        activePlyInThisGame.forEach(ap => { if (currentCumulativeScores[ap] === undefined) currentCumulativeScores[ap] = 0; });
        if (is5Ply && geberForRound && currentCumulativeScores[geberForRound] === undefined) {
            currentCumulativeScores[geberForRound] = 0;
        }

        let gType = 'normal'; if (roles.solo && roles.solo.trim()) gType = 'solo'; else if (roles.h && roles.h.trim()) gType = 'hochzeit';
        const origVal = parseInt(inputs.gameValue);
        const isBockRoundCurrentGame = tempBockActive > 0;
        
        let bockDisp = "0/0";
        if (isBockRoundCurrentGame) {
            bockDisp = `${tempBockPlayedInStreak + 1}/${tempBockTotalInStreak}`;
        }
        
        if (gType === 'hochzeit') {
             const hPly = roles.h; const hPart = roles.re.length === 1 ? roles.re[0] : null; const valP1 = 1;
             const effP1 = valP1 * (isBockRoundCurrentGame ? 2 : 1);
             const scP1 = calculateSoloScores(hPly, activePlyInThisGame, effP1);
             activePlyInThisGame.forEach(p => currentCumulativeScores[p] = (currentCumulativeScores[p] || 0) + (scP1[p] || 0));
             const scoresSnapshotAfterPhase1 = { ...currentCumulativeScores };
             
             let rostP1 = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === hPly) ? 'hochzeit' : 'kontra' }));
             addGameRowToTable(gameDispNum, i, `${effP1} (H Suche)`, bockDisp, plyNamesHead, rostP1, scoresSnapshotAfterPhase1,
                 { type: 'hochzeit_phase1', soloSpieler: hPly, geberName: geberForRound, isFivePlayerGame: is5Ply, activePlayersInThisRow: activePlyInThisGame, rePartei: null, triggeredBock: inputs.triggerNewBockRound });

             const effP2 = origVal * (isBockRoundCurrentGame ? 2 : 1); let scP2 = {}; let rostP2Act = [];
             let detP2 = { geberName: geberForRound, isFivePlayerGame: is5Ply, activePlayersInThisRow: activePlyInThisGame, triggeredBock: inputs.triggerNewBockRound };
             if (hPart) {
                 scP2 = calculateReKontraScores([hPly, hPart], activePlyInThisGame, effP2); detP2.type = 'hochzeit_mit_partner'; detP2.rePartei = [hPly, hPart];
                 rostP2Act = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === hPly) ? 'hochzeit' : (pn === hPart ? 're' : 'kontra') }));
             } else {
                 scP2 = calculateSoloScores(hPly, activePlyInThisGame, effP2); detP2.type = 'hochzeit_solo'; detP2.soloSpieler = hPly;
                 rostP2Act = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: (pn === hPly) ? 'hochzeit' : 'kontra' }));
             }
             activePlyInThisGame.forEach(p => currentCumulativeScores[p] = (currentCumulativeScores[p] || 0) + (scP2[p] || 0));
             const scoresSnapshotAfterPhase2 = { ...currentCumulativeScores };
             addGameRowToTable(gameDispNum, i, `${effP2} (H ${hPart ? 'm.P.' : 'Solo'})`, bockDisp, plyNamesHead, rostP2Act, scoresSnapshotAfterPhase2, detP2);
        } else {
             const effVal = origVal * (isBockRoundCurrentGame ? 2 : 1);
             let rScores = {}; 
             let dets = { geberName: geberForRound, isFivePlayerGame: is5Ply, activePlayersInThisRow: activePlyInThisGame, triggeredBock: inputs.triggerNewBockRound };
             let rostAct = [];
             if (gType === 'solo') {
                 rScores = calculateSoloScores(roles.solo, activePlyInThisGame, effVal); dets.type = 'solo'; dets.soloSpieler = roles.solo;
                 rostAct = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: pn === roles.solo ? 'solo' : 'kontra' }));
             } else {
                 rScores = calculateReKontraScores(roles.re, activePlyInThisGame, effVal); dets.type = 'normal'; dets.rePartei = roles.re;
                 rostAct = activePlyInThisGame.map(pn => ({ name: pn, roleForDisplay: roles.re.includes(pn) ? 're' : 'kontra' }));
             }
             activePlyInThisGame.forEach(p => currentCumulativeScores[p] = (currentCumulativeScores[p] || 0) + (rScores[p] || 0));
             const scoresSnapshotAfterRound = { ...currentCumulativeScores };
             addGameRowToTable(gameDispNum, i, effVal.toString(), bockDisp, plyNamesHead, rostAct, scoresSnapshotAfterRound, dets);
        }

        if (isBockRoundCurrentGame) {
            tempBockActive--;
            tempBockPlayedInStreak++;
        }
        
        const manTrigBock = inputs.triggerNewBockRound;
        const gamesForTrig = plyNamesConfThisGame.length;
        
        let newBocks = 0;
        if (manTrigBock) newBocks += gamesForTrig;

        if (newBocks > 0) {
            if (tempBockActive === 0) {
                tempBockPlayedInStreak = 0;
                tempBockTotalInStreak = newBocks;
            } else {
                tempBockTotalInStreak += newBocks;
            }
            tempBockActive += newBocks;
        }
        if (tempBockActive === 0 && tempBockPlayedInStreak >= tempBockTotalInStreak && tempBockTotalInStreak > 0) {
            tempBockPlayedInStreak = 0; tempBockTotalInStreak = 0;
        }
         gameEntry.stateAfterProcessing = {
             cumulativeTotalScores: { ...currentCumulativeScores },
             bockState: { active: tempBockActive, playedInStreak: tempBockPlayedInStreak, totalInStreak: tempBockTotalInStreak }
         };
    }

    if (allGamesData.length > 0) {
        const lastState = allGamesData[allGamesData.length - 1].stateAfterProcessing;
        totalScores = { ...lastState.cumulativeTotalScores };
        bockRoundsActive = lastState.bockState.active;
        bockGamesPlayedInCurrentStreak = lastState.bockState.playedInStreak;
        totalBockGamesInCurrentStreak = lastState.bockState.totalInStreak;
    } else {
        totalScores = {};
        allPlayerNamesInSession.forEach(name => {
            totalScores[name] = currentCumulativeScores[name] || 0;
        });
        bockRoundsActive = 0; bockGamesPlayedInCurrentStreak = 0; totalBockGamesInCurrentStreak = 0;
    }

    if (outputTableBody.rows.length > 0) {
        outputSection.style.display = 'block';
    } else {
        outputSection.style.display = 'none';
    }

    displayAbrechnung();
    // Chart Update ist hier bewusst auskommentiert, da es noch fehlerhaft ist. Fokus auf Kernlogik.
    // updateScoreChart(chartLabels, chartPlayerScoresData);
}


function startEditGame(gameIdx) {
    editingGameIndex = gameIdx;
    const gameToEdit = allGamesData[gameIdx].inputs;

    const pCountRad = document.getElementById(`players${gameToEdit.playerCount}`);
    if (pCountRad) pCountRad.checked = true;
    
    const playerNamesForEditForm = gameToEdit.players.map(p => ({name: p.name}));
    createPlayerColumns(gameToEdit.playerCount, playerNamesForEditForm);

    let geberIndexInForm = -1;
    if (gameToEdit.geberName) {
        for (let i = 0; i < gameToEdit.playerCount; i++) {
            const nameField = document.getElementById(`player${i + 1}`);
            if (nameField && nameField.value.trim() === gameToEdit.geberName) {
                geberIndexInForm = i;
                break;
            }
        }
        if (geberIndexInForm !== -1) {
            const geberRadioToSelect = document.getElementById(`geberPlayer${geberIndexInForm + 1}`);
            if (geberRadioToSelect) {
                geberRadioToSelect.checked = true;
                currentDealerIndex = geberIndexInForm;
            }
        }
    }
    
    gameToEdit.players.forEach((pData, playerArrIndex) => {
        const domPlayerIndex = playerArrIndex + 1;
        if (pData.selectedRole) {
            const roleRadSel = document.getElementById(`role${domPlayerIndex}-${pData.selectedRole}`);
            if (roleRadSel) roleRadSel.checked = true;
        } else {
            document.querySelectorAll(`input[name="rolePlayer${domPlayerIndex}"]`).forEach(r => r.checked = false);
        }
    });
    currentPlayerNamesOrder = gameToEdit.players.map(p => p.name ? p.name.trim() : "").slice(0, gameToEdit.playerCount);

    gameValueRadios.forEach(r => r.checked = false);
    customGameValueInput.value = '';
    const valStr = gameToEdit.gameValue.toString();
    const valRad = document.querySelector(`input[name="gameValueRadio"][value="${valStr}"]`);
    if (valRad) valRad.checked = true;
    else customGameValueInput.value = valStr;

    document.getElementById('triggerNewBockRound').checked = gameToEdit.triggerNewBockRound;

    submitGameButton.textContent = 'Änderungen speichern';
    submitGameButton.style.backgroundColor = '#ffc107';
    document.querySelector('.input-section').scrollIntoView({ behavior: "smooth" });
    updateOutputTableHeader();
    manageGeberRoleInputs();
    validateRoles();
}

function saveSessionToLocalStorage() {
    const currentNumPlayers = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
    const namesFromFormForSave = [];
    for (let i = 0; i < currentNumPlayers; i++) {
        const playerInput = document.getElementById(`player${i + 1}`);
        namesFromFormForSave.push(playerInput ? playerInput.value.trim() : "");
    }
    currentPlayerNamesOrder = namesFromFormForSave.slice(0, currentNumPlayers);


    const sessionData = {
        allGamesData,
        currentPlayerNamesOrder: currentPlayerNamesOrder,
        currentDealerIndex,
        selectedPlayerCount: currentNumPlayers,
        startgeld: startgeldInput.value,
        punktwert: punktwertInput.value
    };
    localStorage.setItem(DOKO_STORAGE_KEY, JSON.stringify(sessionData));
}

function loadSessionFromLocalStorage() {
    const stored = localStorage.getItem(DOKO_STORAGE_KEY);
    if (stored) {
        const data = JSON.parse(stored);
        allGamesData = data.allGamesData || [];
        currentPlayerNamesOrder = data.currentPlayerNamesOrder || Array(data.selectedPlayerCount || 5).fill("");
        currentDealerIndex = data.currentDealerIndex !== undefined ? data.currentDealerIndex : -1;
        startgeldInput.value = data.startgeld !== undefined ? data.startgeld : "10.00";
        punktwertInput.value = data.punktwert !== undefined ? data.punktwert : "0.05";

        const pCountSet = data.selectedPlayerCount || 5;
        const pCountRadSet = document.getElementById(`players${pCountSet}`);
        if (pCountRadSet) pCountRadSet.checked = true;

        createPlayerColumns(pCountSet, null);


        if (allGamesData.length > 0) {
            recalculateAndRedrawTable();
             outputSection.style.display = 'block';
        } else {
            updateOutputTableHeader();
            totalScores = {};
            currentPlayerNamesOrder.forEach(n => { if (n && n.trim()) totalScores[n.trim()] = 0; });
            bockRoundsActive = 0; bockGamesPlayedInCurrentStreak = 0; totalBockGamesInCurrentStreak = 0;
            displayAbrechnung();
            updateScoreChart([], {});

            outputSection.style.display = 'none';
        }
        if (allGamesData.length > 0) {
            setNextDealerBasedOnLastGame();
        } else if (currentDealerIndex !== -1 && currentDealerIndex < currentPlayerNamesOrder.length && currentPlayerNamesOrder[currentDealerIndex]) {
            const geberRadioToSelect = document.getElementById(`geberPlayer${currentDealerIndex + 1}`);
            if(geberRadioToSelect && document.getElementById(`player${currentDealerIndex+1}`).value === currentPlayerNamesOrder[currentDealerIndex]) {
                 geberRadioToSelect.checked = true;
            } else {
                 setNextDealerAutomatically();
            }
        } else {
            setNextDealerAutomatically();
        }

        manageGeberRoleInputs();

    } else {
        const initPlyCount = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
        createPlayerColumns(initPlyCount);
        updateOutputTableHeader();
        validateRoles();
    }
}

function setNextDealerBasedOnLastGame() {
    if (allGamesData.length > 0 && allGamesData[allGamesData.length - 1].inputs) {
        const lastInputs = allGamesData[allGamesData.length - 1].inputs;
        const lastDealerName = lastInputs.geberName;
        if (lastDealerName) {
            setNextDealerAutomatically(lastDealerName);
        } else {
            setNextDealerAutomatically();
        }
    } else {
         if (currentDealerIndex !== -1 && currentDealerIndex < currentPlayerNamesOrder.length && currentPlayerNamesOrder[currentDealerIndex] && currentPlayerNamesOrder[currentDealerIndex].trim() !== '') {
             const dealerNameFromOrder = currentPlayerNamesOrder[currentDealerIndex];
             let nameInDom = false;
             const numPlayersInForm = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
             for(let i=0; i<numPlayersInForm; i++){
                 const inputField = document.getElementById(`player${i+1}`);
                 if(inputField && inputField.value.trim() === dealerNameFromOrder){
                     nameInDom = true;
                     currentDealerIndex = i;
                     const dealerRadio = document.getElementById(`geberPlayer${currentDealerIndex + 1}`);
                     if (dealerRadio) dealerRadio.checked = true;
                     break;
                 }
             }
             if(!nameInDom) setNextDealerAutomatically();
        } else {
            setNextDealerAutomatically();
        }
    }
}

function startNewGameDay() {
    const conf = confirm("Möchten Sie wirklich alle Daten löschen und einen neuen Spieltag beginnen?\nDieser Vorgang kann nicht rückgängig gemacht werden.");
    if (conf) { 
        localStorage.removeItem(DOKO_STORAGE_KEY); 
        location.reload(); 
    }
}

function displayAbrechnung() {
    if (!startgeldInput || !punktwertInput || !abrechnungTable || !abrechnungOutputDiv) return;
    const startgeld = parseFloat(startgeldInput.value) || 0;
    const punktwertVal = parseFloat(punktwertInput.value) || 0;

    let activePlyNamesForAbrechnung = Object.keys(totalScores).filter(name => name && name.trim() !== "");

    if(activePlyNamesForAbrechnung.length === 0) {
        const numPlyInForm = parseInt(document.querySelector('input[name="playerCount"]:checked').value);
         for (let i=0; i < numPlyInForm; i++) {
             const playerInput = document.getElementById(`player${i+1}`);
             if (playerInput && playerInput.value.trim()) {
                 activePlyNamesForAbrechnung.push(playerInput.value.trim());
             }
         }
    }
    
    activePlyNamesForAbrechnung.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    if (activePlyNamesForAbrechnung.length === 0) {
        abrechnungOutputDiv.style.display = 'none'; return;
    }

    let maxScr = -Infinity;
    activePlyNamesForAbrechnung.forEach(n => {
        const score = totalScores[n] || 0;
        if (score > maxScr) maxScr = score;
    });
     if (maxScr === -Infinity) maxScr = 0;


    const tblHead = abrechnungTable.querySelector('thead');
    const tblBody = abrechnungTable.querySelector('tbody');
    tblHead.innerHTML = ''; tblBody.innerHTML = '';

    const headRw = tblHead.insertRow();
    const thBez = document.createElement('th');
    thBez.textContent = 'Position';
    thBez.style.textAlign = 'left';
    headRw.appendChild(thBez);

    activePlyNamesForAbrechnung.forEach(n => {
        const th = document.createElement('th');
        th.textContent = n;
        th.style.textAlign = 'right';
        headRw.appendChild(th);
    });

    const pkteRw = tblBody.insertRow();
    pkteRw.insertCell().textContent = 'Endpunkte';
    activePlyNamesForAbrechnung.forEach(n => {
        const c = pkteRw.insertCell();
        c.textContent = totalScores[n] !== undefined ? totalScores[n].toString() : '0';
        c.style.textAlign = 'right';
    });

    const zuZahlRw = tblBody.insertRow();
    zuZahlRw.insertCell().textContent = 'Zu Zahlen (€)';
    activePlyNamesForAbrechnung.forEach(n => {
        const c = zuZahlRw.insertCell();
        const curScr = totalScores[n] !== undefined ? totalScores[n] : 0;
        let betrag = 0;

        if (curScr === maxScr) {
            betrag = -startgeld;
        } else {
            betrag = -(((maxScr - curScr) * punktwertVal) + startgeld);
        }

        c.textContent = Math.abs(betrag).toFixed(2) + " €";
        c.style.textAlign = 'right';
    });
    abrechnungOutputDiv.style.display = 'block';
}


function updateScoreChart(chartLabels, chartPlayerScoresData) {
    if (!scoreChartCanvas) return; 
    const ctx = scoreChartCanvas.getContext('2d');
    if (myScoreChart) myScoreChart.destroy(); 
    myScoreChart = null;

    const playerColors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#2E8B57', '#DAA520']; 
    let cIdx = 0;
    const datasets = [];

    const activePlyForChart = Object.keys(chartPlayerScoresData).filter(key => key.trim() !== "");
    
    activePlyForChart.forEach(pN => {
        if (chartPlayerScoresData[pN] && chartPlayerScoresData[pN].length > 0) {
            datasets.push({ 
                label: pN, 
                data: chartPlayerScoresData[pN], 
                borderColor: playerColors[cIdx % playerColors.length], 
                backgroundColor: playerColors[cIdx % playerColors.length], 
                fill: false, 
                tension: 0.1, 
                pointRadius: 3, 
                pointHoverRadius: 5 
            });
            cIdx++;
        }
    });

    if (datasets.length === 0) {
        if(ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if(chartSectionDiv) chartSectionDiv.style.display = 'none';
        return;
    }

    if(chartSectionDiv) chartSectionDiv.style.display = 'block';
    myScoreChart = new Chart(ctx, {
        type: 'line', 
        data: { labels: chartLabels, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' }, title: { display: true, text: 'Kumulativer Punkteverlauf' }},
            scales: {
                x: {
                    title: { display: true, text: 'Spiel/Phase' },
                    ticks: { autoSkip: true, maxRotation: 45, minRotation: 0, maxTicksLimit: 20 }
                },
                y: {
                    title: { display: true, text: 'Kumulierte Punkte' },
                    beginAtZero: false
                }
            }
        }
    });
}

playerCountRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        const newCount = parseInt(event.target.value);
        createPlayerColumns(newCount); 
        validateRoles();
    });
});


document.addEventListener('DOMContentLoaded', () => {
    // Initialisierungslogik
    loadSessionFromLocalStorage();

    // Event Listeners
    if (newGameDayButton) newGameDayButton.addEventListener('click', startNewGameDay);
    if (startgeldInput) {
        startgeldInput.addEventListener('input', () => { displayAbrechnung(); saveSessionToLocalStorage(); });
    }
    if (punktwertInput) {
        punktwertInput.addEventListener('input', () => { displayAbrechnung(); saveSessionToLocalStorage(); });
    }
});