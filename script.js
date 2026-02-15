
class ChargeGame {
    constructor() {
        this.mode = '1v1'; // '1v1', '1v1v1', '1v1v1v1'
        this.players = {};
        this.currentPlayer = null;
        this.playerOrder = [];
        this.gameActive = true;
        this.pendingAction = null;
        this.roundActions = [];
        this.logs = [];
        
        // Action definitions
        this.actions = {
            charge: { 
                name: 'Charge', 
                emoji: '⚡', 
                energyCost: 0,
                energyGain: 1, 
                damage: 0,
                targets: 0,
                beats: [], // What this action beats in direct confrontation
                message: 'charged up!'
            },
            gun: { 
                name: 'Gun', 
                emoji: '🔫', 
                energyCost: 1, 
                energyGain: 0, 
                damage: 1,
                targets: 1,
                beats: [], // Beats nothing by itself, depends on targets
                message: 'fired!'
            },
            doublegun: { 
                name: 'Double Gun', 
                emoji: '🔫🔫', 
                energyCost: 2, 
                energyGain: 0, 
                damage: 2,
                targets: 2,
                beats: ['gun'], // Double gun beats single gun in direct confrontation
                message: 'unleashed a double shot!'
            },
            shield: { 
                name: 'Shield', 
                emoji: '🛡️', 
                energyCost: 0, 
                energyGain: 0, 
                damage: 0,
                targets: 0,
                blocks: true,
                message: 'raised a shield!'
            },
            tornado: { 
                name: 'Tornado', 
                emoji: '🌪️', 
                energyCost: 6, 
                energyGain: 0, 
                damage: 999, // Instant kill
                targets: 1,
                ignoresShield: true,
                message: 'SUMMONED A TORNADO!'
            }
        };
        
        this.init();
    }
    
    init() {
        this.setupPlayers();
        this.updateGameBoard();
        this.nextTurn();
    }
    
    setupPlayers() {
        const playerCount = this.mode === '1v1' ? 2 : (this.mode === '1v1v1' ? 3 : 4);
        this.players = {};
        this.playerOrder = [];
        
        for (let i = 1; i <= playerCount; i++) {
            this.players[i] = {
                id: i,
                name: `Player ${i}`,
                energy: 0,
                alive: true,
                action: null,
                targets: []
            };
            this.playerOrder.push(i);
        }
        
        // Randomize turn order for first round
        this.shuffleArray(this.playerOrder);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    updateGameBoard() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        
        // Sort players by ID for consistent display
        const sortedPlayers = Object.values(this.players).sort((a, b) => a.id - b.id);
        
        sortedPlayers.forEach(player => {
            if (!player.alive) return;
            
            const playerCard = document.createElement('div');
            playerCard.className = `player-card alive ${this.currentPlayer === player.id ? 'current-turn' : ''}`;
            playerCard.id = `player-${player.id}`;
            
            playerCard.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-stats">
                    <div class="player-energy">${player.energy}</div>
                    <div class="player-energy-label">Energy</div>
                </div>
                <div class="player-actions" data-player="${player.id}">
                    <button class="action-btn charge" data-action="charge">
                        <span class="emoji">⚡</span>
                        <span class="action-name">Charge</span>
                    </button>
                    <button class="action-btn gun" data-action="gun">
                        <span class="emoji">🔫</span>
                        <span class="action-name">Gun</span>
                    </button>
                    <button class="action-btn doublegun" data-action="doublegun">
                        <span class="emoji">🔫🔫</span>
                        <span class="action-name">Double</span>
                    </button>
                    <button class="action-btn shield" data-action="shield">
                        <span class="emoji">🛡️</span>
                        <span class="action-name">Shield</span>
                    </button>
                    <button class="action-btn tornado" data-action="tornado">
                        <span class="emoji">🌪️</span>
                        <span class="action-name">Tornado (6)</span>
                    </button>
                </div>
            `;
            
            board.appendChild(playerCard);
        });
        
        this.updateButtonStates();
        this.addActionListeners();
    }
    
    addActionListeners() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.removeEventListener('click', this.actionHandler);
            this.actionHandler = (e) => {
                const playerCard = btn.closest('.player-card');
                if (!playerCard) return;
                
                const playerId = parseInt(playerCard.id.split('-')[1]);
                const action = btn.dataset.action;
                this.handleAction(playerId, action);
            };
            btn.addEventListener('click', this.actionHandler);
        });
    }
    
    handleAction(playerId, actionKey) {
        if (!this.gameActive) return;
        if (this.currentPlayer !== playerId) {
            this.log(`⛔ Not your turn! It's ${this.players[this.currentPlayer].name}'s turn`);
            return;
        }
        
        const player = this.players[playerId];
        const action = this.actions[actionKey];
        
        // Check energy
        if (action.energyCost > player.energy) {
            this.log(`❌ Not enough energy! Need ${action.energyCost} energy`);
            return;
        }
        
        // Handle targeting
        if (action.targets > 0) {
            this.showTargetModal(playerId, action);
        } else {
            // No targeting needed (charge or shield)
            this.submitAction(playerId, actionKey, []);
        }
    }
    
    showTargetModal(playerId, action) {
        const modal = document.getElementById('targetModal');
        const title = document.getElementById('targetModalTitle');
        const targetButtons = document.getElementById('targetButtons');
        
        title.textContent = `${action.name} - Choose ${action.targets} target${action.targets > 1 ? 's' : ''}`;
        targetButtons.innerHTML = '';
        
        // Get alive targets (excluding self)
        const targets = Object.values(this.players).filter(p => p.alive && p.id !== playerId);
        
        if (action.targets === 1) {
            // Single target - simple buttons
            targets.forEach(target => {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = target.name;
                btn.onclick = () => {
                    this.submitAction(playerId, action.name.toLowerCase(), [target.id]);
                    modal.style.display = 'none';
                };
                targetButtons.appendChild(btn);
            });
        } else {
            // Double gun - need to select two different targets
            const selectedTargets = [];
            
            targets.forEach(target => {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = target.name;
                btn.onclick = () => {
                    if (selectedTargets.includes(target.id)) {
                        // Deselect
                        const index = selectedTargets.indexOf(target.id);
                        selectedTargets.splice(index, 1);
                        btn.classList.remove('selected');
                    } else {
                        // Select
                        if (selectedTargets.length < 2) {
                            selectedTargets.push(target.id);
                            btn.classList.add('selected');
                        }
                    }
                    
                    // If we have 2 targets, submit
                    if (selectedTargets.length === 2) {
                        this.submitAction(playerId, action.name.toLowerCase(), selectedTargets);
                        modal.style.display = 'none';
                    }
                };
                targetButtons.appendChild(btn);
            });
        }
        
        document.getElementById('cancelTarget').onclick = () => {
            modal.style.display = 'none';
        };
        
        modal.style.display = 'flex';
    }
    
    submitAction(playerId, actionKey, targets) {
        const player = this.players[playerId];
        const action = this.actions[actionKey];
        
        // Deduct energy
        player.energy -= action.energyCost;
        player.energy += action.energyGain;
        
        // Store action
        player.action = actionKey;
        player.targets = targets;
        
        // Log
        let targetNames = targets.map(t => this.players[t].name).join(' and ');
        this.log(`${player.name} ${action.message} ${targetNames ? 'at ' + targetNames : ''}`);
        
        // Move to next player
        this.nextTurn();
    }
    
    nextTurn() {
        // Find next alive player
        const currentIndex = this.playerOrder.indexOf(this.currentPlayer);
        
        for (let i = 1; i <= this.playerOrder.length; i++) {
            const nextIndex = (currentIndex + i) % this.playerOrder.length;
            const nextPlayerId = this.playerOrder[nextIndex];
            
            if (this.players[nextPlayerId]?.alive) {
                // Check if this player has already acted
                if (!this.players[nextPlayerId].action) {
                    this.currentPlayer = nextPlayerId;
                    this.updateGameBoard();
                    this.log(`${this.players[nextPlayerId].name}'s turn`);
                    return;
                }
            }
        }
        
        // If we get here, all players have acted - resolve round
        this.resolveRound();
    }
    
    resolveRound() {
        this.log('=== ROUND RESOLUTION ===');
        
        // Process tornadoes first (they ignore everything)
        const tornadoUsers = Object.values(this.players).filter(p => p.alive && p.action === 'tornado');
        tornadoUsers.forEach(tornadoUser => {
            tornadoUser.targets.forEach(targetId => {
                if (this.players[targetId]?.alive) {
                    this.players[targetId].alive = false;
                    this.log(`🌪️ TORNADO KILLS ${this.players[targetId].name}! NO ESCAPE!`);
                }
            });
        });
        
        // Check for survivors
        const survivors = Object.values(this.players).filter(p => p.alive);
        if (survivors.length <= 1) {
            this.endGame(survivors[0]?.id || null);
            return;
        }
        
        // Process gun fights
        const gunUsers = Object.values(this.players).filter(p => p.alive && (p.action === 'gun' || p.action === 'doublegun'));
        
        // Create a map of who's shooting who
        const shotMap = {};
        gunUsers.forEach(shooter => {
            shooter.targets.forEach(targetId => {
                if (!this.players[targetId]?.alive) return; // Target already dead from tornado
                
                if (!shotMap[targetId]) shotMap[targetId] = [];
                shotMap[targetId].push({
                    shooter: shooter.id,
                    power: shooter.action === 'doublegun' ? 2 : 1
                });
            });
        });
        
        // Process each target
        Object.entries(shotMap).forEach(([targetId, attackers]) => {
            const target = this.players[parseInt(targetId)];
            if (!target?.alive) return;
            
            // Check if target used shield
            if (target.action === 'shield') {
                this.log(`🛡️ ${target.name} blocked all attacks!`);
                return;
            }
            
            // Check for mutual combat
            const mutualAttacks = attackers.filter(a => 
                this.players[a.shooter]?.targets?.includes(target.id)
            );
            
            // Double gun beats single gun
            const hasDoubleGun = attackers.some(a => a.power === 2);
            const hasSingleGun = attackers.some(a => a.power === 1);
            
            if (hasDoubleGun && hasSingleGun) {
                // Double gun wins
                const doubleGunners = attackers.filter(a => a.power === 2);
                const singleGunners = attackers.filter(a => a.power === 1);
                
                // Single gunners die
                singleGunners.forEach(gunner => {
                    if (this.players[gunner.shooter]?.alive) {
                        this.players[gunner.shooter].alive = false;
                        this.log(`💥 ${this.players[gunner.shooter].name} tried to single gun but got outgunned!`);
                    }
                });
                
                // Target dies to double gun
                target.alive = false;
                this.log(`💥 ${target.name} was killed by double gun!`);
                
            } else if (mutualAttacks.length === attackers.length && attackers.length > 1) {
                // Everyone shooting each other - cancel out
                this.log(`🤝 Mutual combat! Everyone attacking ${target.name} cancels out`);
                
            } else {
                // Normal hit
                const totalDamage = attackers.reduce((sum, a) => sum + a.power, 0);
                target.alive = false;
                this.log(`💥 ${target.name} was hit for ${totalDamage} damage!`);
            }
        });
        
        // Check for survivors again
        const finalSurvivors = Object.values(this.players).filter(p => p.alive);
        if (finalSurvivors.length <= 1) {
            this.endGame(finalSurvivors[0]?.id || null);
            return;
        }
        
        // Prepare for next round
        this.prepareNextRound();
    }
    
    prepareNextRound() {
        // Clear actions
        Object.values(this.players).forEach(player => {
            player.action = null;
            player.targets = [];
        });
        
        // Remove dead players from turn order
        this.playerOrder = this.playerOrder.filter(id => this.players[id]?.alive);
        
        // Randomize turn order for next round
        this.shuffleArray(this.playerOrder);
        
        // Set first player
        this.currentPlayer = this.playerOrder[0];
        
        // Update display
        this.updateGameBoard();
        this.log(`=== NEW ROUND ===\n${this.players[this.currentPlayer].name} starts!`);
    }
    
    endGame(winnerId) {
        this.gameActive = false;
        this.disableAllButtons();
        
        if (!winnerId) {
            this.log('💀 GAME OVER - EVERYONE DIED!');
            document.querySelector('.turn-indicator').textContent = 'GAME OVER - DRAW!';
        } else {
            this.log(`🎉 ${this.players[winnerId].name} WINS! 🎉`);
            document.querySelector('.turn-indicator').textContent = `${this.players[winnerId].name} WINS!`;
            
            // Highlight winner
            document.getElementById(`player-${winnerId}`).classList.add('winner-glow');
        }
    }
    
    updateButtonStates() {
        document.querySelectorAll('.player-card').forEach(card => {
            const playerId = parseInt(card.id.split('-')[1]);
            const player = this.players[playerId];
            const buttons = card.querySelectorAll('.action-btn');
            
            buttons.forEach(btn => {
                const action = this.actions[btn.dataset.action];
                btn.disabled = !this.gameActive || 
                              this.currentPlayer !== playerId || 
                              player.action !== null ||
                              action.energyCost > player.energy;
            });
        });
    }
    
    disableAllButtons() {
        document.querySelectorAll('.action-btn').forEach(btn => btn.disabled = true);
    }
    
    log(message) {
        this.logs.push(message);
        const logElement = document.getElementById('actionLog');
        const p = document.createElement('p');
        p.textContent = message;
        logElement.appendChild(p);
        logElement.scrollTop = logElement.scrollHeight;
        
        // Keep last 10 messages
        if (logElement.children.length > 10) {
            logElement.removeChild(logElement.children[0]);
        }
    }
    
    setMode(mode) {
        this.mode = mode;
        this.reset();
    }
    
    reset() {
        this.setupPlayers();
        this.gameActive = true;
        this.pendingAction = null;
        this.roundActions = [];
        this.logs = [];
        
        // Clear log
        document.getElementById('actionLog').innerHTML = '';
        
        this.updateGameBoard();
        this.nextTurn();
    }
}

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChargeGame();
    
    // Mode selector
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            game.setMode(btn.dataset.mode);
        });
    });
    
    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
        game.reset();
    });
    
    // Rules modal
    const modal = document.getElementById('rulesModal');
    const rulesBtn = document.getElementById('rulesBtn');
    const closeBtn = document.getElementById('closeModal');
    
    rulesBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Close target modal when clicking outside
    window.addEventListener('click', (e) => {
        const targetModal = document.getElementById('targetModal');
        if (e.target === targetModal) {
            targetModal.style.display = 'none';
        }
    });
});
