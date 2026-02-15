class ChargeGame {
    constructor() {
        this.mode = '1v1';
        this.players = {};
        this.currentPlayer = null;
        this.playerOrder = [];
        this.gameActive = true;
        this.waitingForTargets = false;
        this.pendingAction = null;
        
        this.actions = {
            charge: { name: 'Charge', emoji: '⚡', cost: 0, gain: 1, targets: 0, desc: 'charged up!' },
            gun: { name: 'Gun', emoji: '🔫', cost: 1, gain: 0, targets: 1, desc: 'shot at' },
            doublegun: { name: 'Double Gun', emoji: '🔫🔫', cost: 2, gain: 0, targets: 2, desc: 'double shot at' },
            shield: { name: 'Shield', emoji: '🛡️', cost: 0, gain: 0, targets: 0, desc: 'raised a shield!' },
            tornado: { name: 'Tornado', emoji: '🌪️', cost: 6, gain: 0, targets: 1, desc: 'SUMMONED A TORNADO at' }
        };
        
        this.init();
    }
    
    init() {
        this.setupPlayers();
        this.renderGame();
        this.nextTurn();
    }
    
    setupPlayers() {
        const count = this.mode === '1v1' ? 2 : (this.mode === '1v1v1' ? 3 : 4);
        this.players = {};
        this.playerOrder = [];
        
        for (let i = 1; i <= count; i++) {
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
        
        // Randomize turn order
        this.shuffleArray(this.playerOrder);
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    renderGame() {
        const board = document.getElementById('gameBoard');
        board.innerHTML = '';
        
        Object.values(this.players).forEach(player => {
            if (!player.alive) return;
            
            const card = document.createElement('div');
            card.className = `player-card ${this.currentPlayer === player.id ? 'current-turn' : ''}`;
            card.id = `player-${player.id}`;
            
            let buttons = '';
            Object.entries(this.actions).forEach(([key, action]) => {
                const disabled = !this.gameActive || 
                               this.currentPlayer !== player.id || 
                               player.action !== null ||
                               action.cost > player.energy;
                
                buttons += `<button class="action-btn ${key}" data-player="${player.id}" data-action="${key}" ${disabled ? 'disabled' : ''}>
                    ${action.emoji} ${action.name} (${action.cost})
                </button>`;
            });
            
            card.innerHTML = `
                <div class="player-name">${player.name}</div>
                <div class="player-energy">${player.energy}</div>
                <div class="energy-label">Energy</div>
                <div class="action-buttons">
                    ${buttons}
                </div>
            `;
            
            board.appendChild(card);
        });
        
        this.addEventListeners();
    }
    
    addEventListeners() {
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const playerId = parseInt(btn.dataset.player);
                const action = btn.dataset.action;
                this.handleAction(playerId, action);
            });
        });
    }
    
    handleAction(playerId, actionKey) {
        if (!this.gameActive) return;
        if (this.currentPlayer !== playerId) {
            this.log(`Not ${this.players[playerId].name}'s turn!`);
            return;
        }
        
        const player = this.players[playerId];
        const action = this.actions[actionKey];
        
        if (action.cost > player.energy) {
            this.log(`Not enough energy! Need ${action.cost}`);
            return;
        }
        
        if (action.targets > 0) {
            // Show target selection
            this.pendingAction = { playerId, actionKey };
            this.showTargetModal(playerId, action);
        } else {
            // No targeting needed
            this.submitAction(playerId, actionKey, []);
        }
    }
    
    showTargetModal(playerId, action) {
        const modal = document.getElementById('targetModal');
        const title = document.getElementById('targetModalTitle');
        const buttons = document.getElementById('targetButtons');
        const selected = [];
        
        title.textContent = `${action.name} - Choose ${action.targets} target(s)`;
        buttons.innerHTML = '';
        
        // Get alive targets (exclude self)
        const targets = Object.values(this.players).filter(p => p.alive && p.id !== playerId);
        
        if (action.targets === 1) {
            // Single target
            targets.forEach(target => {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = target.name;
                btn.onclick = () => {
                    this.submitAction(playerId, action.name.toLowerCase().replace(' ', ''), [target.id]);
                    modal.style.display = 'none';
                };
                buttons.appendChild(btn);
            });
        } else {
            // Two targets
            targets.forEach(target => {
                const btn = document.createElement('button');
                btn.className = 'target-btn';
                btn.textContent = target.name;
                btn.onclick = () => {
                    const index = selected.indexOf(target.id);
                    if (index === -1) {
                        if (selected.length < 2) {
                            selected.push(target.id);
                            btn.classList.add('selected');
                        }
                    } else {
                        selected.splice(index, 1);
                        btn.classList.remove('selected');
                    }
                    
                    if (selected.length === 2) {
                        this.submitAction(playerId, action.name.toLowerCase().replace(' ', ''), selected);
                        modal.style.display = 'none';
                    }
                };
                buttons.appendChild(btn);
            });
        }
        
        document.getElementById('cancelTarget').onclick = () => {
            modal.style.display = 'none';
            this.pendingAction = null;
        };
        
        modal.style.display = 'flex';
    }
    
    submitAction(playerId, actionKey, targets) {
        const player = this.players[playerId];
        const action = this.actions[actionKey];
        
        // Apply energy changes
        player.energy -= action.cost;
        player.energy += action.gain;
        
        // Store action
        player.action = actionKey;
        player.targets = targets;
        
        // Log
        let targetNames = targets.map(t => this.players[t]?.name).join(' and ');
        this.log(`${player.name} ${action.desc} ${targetNames || ''}`);
        
        // Move to next player
        this.nextTurn();
    }
    
    nextTurn() {
        // Find next player who hasn't acted yet
        const currentIndex = this.playerOrder.indexOf(this.currentPlayer);
        
        for (let i = 1; i <= this.playerOrder.length; i++) {
            const nextIndex = (currentIndex + i) % this.playerOrder.length;
            const nextId = this.playerOrder[nextIndex];
            
            if (this.players[nextId]?.alive && !this.players[nextId].action) {
                this.currentPlayer = nextId;
                this.renderGame();
                this.log(`${this.players[nextId].name}'s turn`);
                return;
            }
        }
        
        // Everyone has acted - resolve round
        this.resolveRound();
    }
    
    resolveRound() {
        this.log('=== ROUND RESOLUTION ===');
        
        // Process tornadoes first (ignore everything)
        Object.values(this.players).forEach(player => {
            if (player.alive && player.action === 'tornado') {
                player.targets.forEach(targetId => {
                    if (this.players[targetId]?.alive) {
                        this.players[targetId].alive = false;
                        this.log(`🌪️ TORNADO KILLED ${this.players[targetId].name}!`);
                    }
                });
            }
        });
        
        // Process gun fights
        Object.values(this.players).forEach(target => {
            if (!target.alive) return;
            
            // Find who's shooting at this target
            const shooters = Object.values(this.players).filter(shooter => 
                shooter.alive && 
                shooter.targets?.includes(target.id) &&
                (shooter.action === 'gun' || shooter.action === 'doublegun')
            );
            
            if (shooters.length === 0) return;
            
            // Check if target used shield
            if (target.action === 'shield') {
                this.log(`🛡️ ${target.name} blocked all attacks!`);
                return;
            }
            
            // Check for double gun vs single gun
            const hasDouble = shooters.some(s => s.action === 'doublegun');
            const hasSingle = shooters.some(s => s.action === 'gun');
            
            if (hasDouble && hasSingle) {
                // Double gunners survive, single gunners die
                shooters.forEach(shooter => {
                    if (shooter.action === 'gun') {
                        shooter.alive = false;
                        this.log(`💥 ${shooter.name} tried to single gun but got outgunned!`);
                    }
                });
                target.alive = false;
                this.log(`💥 ${target.name} was killed by double gun!`);
            } 
            else if (shooters.length > 1 && shooters.every(s => s.targets?.includes(target.id))) {
                // Mutual combat - everyone dies
                shooters.forEach(shooter => {
                    shooter.alive = false;
                });
                target.alive = false;
                this.log(`💥 MASSACRE! Everyone involved died!`);
            }
            else {
                // Normal hit
                target.alive = false;
                this.log(`💥 ${target.name} was killed!`);
            }
        });
        
        // Check for winner
        const survivors = Object.values(this.players).filter(p => p.alive);
        
        if (survivors.length <= 1) {
            this.endGame(survivors[0]?.id || null);
        } else {
            // Next round
            this.prepareNextRound();
        }
    }
    
    prepareNextRound() {
        // Reset actions
        Object.values(this.players).forEach(player => {
            player.action = null;
            player.targets = [];
        });
        
        // Remove dead players
        this.playerOrder = this.playerOrder.filter(id => this.players[id]?.alive);
        
        // Shuffle order for next round
        this.shuffleArray(this.playerOrder);
        
        // Start next round
        this.currentPlayer = this.playerOrder[0];
        this.renderGame();
        this.log(`=== NEW ROUND ===\n${this.players[this.currentPlayer].name} starts!`);
    }
    
    endGame(winnerId) {
        this.gameActive = false;
        
        if (!winnerId) {
            this.log('💀 GAME OVER - EVERYONE DIED!');
            document.getElementById('turnIndicator').textContent = 'GAME OVER - DRAW!';
        } else {
            this.log(`🎉 ${this.players[winnerId].name} WINS! 🎉`);
            document.getElementById('turnIndicator').textContent = `${this.players[winnerId].name} WINS!`;
        }
        
        this.renderGame();
    }
    
    log(message) {
        const log = document.getElementById('actionLog');
        log.innerHTML = message + '<br>' + log.innerHTML;
        if (log.children.length > 5) {
            log.removeChild(log.lastChild);
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
        document.getElementById('actionLog').innerHTML = 'Game started!';
        this.renderGame();
        this.nextTurn();
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChargeGame();
    
    // Mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
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
    const rulesModal = document.getElementById('rulesModal');
    document.getElementById('rulesBtn').addEventListener('click', () => {
        rulesModal.style.display = 'flex';
    });
    
    document.getElementById('closeModal').addEventListener('click', () => {
        rulesModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === rulesModal) {
            rulesModal.style.display = 'none';
        }
    });
    
    // Target modal close on outside click
    const targetModal = document.getElementById('targetModal');
    window.addEventListener('click', (e) => {
        if (e.target === targetModal) {
            targetModal.style.display = 'none';
            game.pendingAction = null;
        }
    });
});
