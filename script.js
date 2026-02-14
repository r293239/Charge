class ChargeGame {
    constructor() {
        this.player = {
            ammo: 3,
            lives: 3
        };
        this.computer = {
            ammo: 3,
            lives: 3
        };
        this.gameActive = true;
        this.playerTurn = true;
        this.gameLog = [];
        
        // Action definitions
        this.actions = {
            charge: { name: 'Charge', emoji: '⚡', ammoCost: 0, ammoGain: 1, damage: 0 },
            gun: { name: 'Gun', emoji: '🔫', ammoCost: 1, ammoGain: 0, damage: 1 },
            doublegun: { name: 'Double Gun', emoji: '🔫🔫', ammoCost: 2, ammoGain: 0, damage: 2 },
            shield: { name: 'Shield', emoji: '🛡️', ammoCost: 0, ammoGain: 0, damage: 0, blocks: true }
        };
        
        this.init();
    }
    
    init() {
        this.updateDisplay();
        this.addToLog('Game started! Your turn.');
    }
    
    playerAction(action) {
        if (!this.gameActive || !this.playerTurn) return;
        
        const playerChoice = this.actions[action];
        
        // Check if player has enough ammo
        if (playerChoice.ammoCost > this.player.ammo) {
            this.addToLog('❌ Not enough ammo! You misfired and lost a life!');
            this.player.lives--;
            this.playerTurn = false;
            this.checkGameOver();
            this.computerTurn();
            return;
        }
        
        // Get computer's action
        const computerChoice = this.getComputerAction();
        
        // Process the turn
        this.processTurn(playerChoice, computerChoice);
        
        // Switch turns
        this.playerTurn = false;
        
        // Computer's turn
        setTimeout(() => {
            if (this.gameActive) {
                this.computerTurn();
            }
        }, 1000);
    }
    
    computerTurn() {
        if (!this.gameActive) return;
        
        const computerChoice = this.getComputerAction();
        const playerChoice = this.getRandomAction(); // Computer assumes player does something
        
        this.processTurn(computerChoice, playerChoice, true);
        this.playerTurn = true;
        
        // Update turn indicator
        document.getElementById('turnIndicator').textContent = 'Your Turn';
    }
    
    getComputerAction() {
        // Simple AI: Random choice with some logic
        const actions = ['charge', 'gun', 'doublegun', 'shield'];
        const weights = [0.3, 0.3, 0.2, 0.2]; // Bias towards certain actions
        
        // Adjust based on ammo
        if (this.computer.ammo === 0) {
            return this.actions.charge;
        } else if (this.computer.ammo === 1) {
            // Can't use double gun
            const availableActions = ['charge', 'gun', 'shield'];
            return this.actions[availableActions[Math.floor(Math.random() * availableActions.length)]];
        }
        
        const random = Math.random();
        if (random < 0.3) return this.actions.charge;
        if (random < 0.6) return this.actions.gun;
        if (random < 0.8) return this.actions.doublegun;
        return this.actions.shield;
    }
    
    getRandomAction() {
        const actions = Object.values(this.actions);
        return actions[Math.floor(Math.random() * actions.length)];
    }
    
    processTurn(action1, action2, isComputerTurn = false) {
        const attacker = isComputerTurn ? this.computer : this.player;
        const defender = isComputerTurn ? this.player : this.computer;
        const attackerChoice = action1;
        const defenderChoice = action2;
        
        // Update display for computer's choice
        if (isComputerTurn) {
            this.showComputerChoice(attackerChoice);
        }
        
        // Apply ammo changes
        if (attackerChoice.ammoGain > 0) {
            attacker.ammo += attackerChoice.ammoGain;
            this.addToLog(`${isComputerTurn ? 'Computer' : 'You'} gained ${attackerChoice.ammoGain} ammo!`);
        }
        
        // Check if attack hits
        if (attackerChoice.damage > 0 && attacker.ammo >= attackerChoice.ammoCost) {
            attacker.ammo -= attackerChoice.ammoCost;
            
            // Check if defender shields
            if (defenderChoice.blocks) {
                this.addToLog(`🛡️ ${isComputerTurn ? 'You' : 'Computer'} blocked the attack!`);
            } else {
                defender.lives -= attackerChoice.damage;
                this.addToLog(`${isComputerTurn ? 'Computer' : 'You'} dealt ${attackerChoice.damage} damage!`);
            }
        }
        
        // Check for misfire
        if (attackerChoice.damage > 0 && attacker.ammo < attackerChoice.ammoCost) {
            this.addToLog(`❌ ${isComputerTurn ? 'Computer' : 'You'} misfired!`);
            attacker.lives--;
        }
        
        this.checkGameOver();
        this.updateDisplay();
    }
    
    showComputerChoice(choice) {
        const choiceDisplay = document.getElementById('computerChoice');
        choiceDisplay.innerHTML = `
            <span class="choice-emoji">${choice.emoji}</span>
            <span class="choice-text">${choice.name}</span>
        `;
    }
    
    checkGameOver() {
        if (this.player.lives <= 0) {
            this.gameActive = false;
            this.addToLog('💀 Game Over! Computer wins!');
            document.getElementById('turnIndicator').textContent = 'Game Over';
            this.disableButtons();
        } else if (this.computer.lives <= 0) {
            this.gameActive = false;
            this.addToLog('🎉 Congratulations! You win!');
            document.getElementById('turnIndicator').textContent = 'Victory!';
            this.disableButtons();
        }
    }
    
    updateDisplay() {
        document.getElementById('playerAmmo').textContent = this.player.ammo;
        document.getElementById('playerLives').textContent = this.player.lives;
        document.getElementById('computerAmmo').textContent = this.computer.ammo;
        document.getElementById('computerLives').textContent = this.computer.lives;
    }
    
    addToLog(message) {
        this.gameLog.push(message);
        const logElement = document.getElementById('gameLog');
        logElement.innerHTML = `<p>${message}</p>`;
        
        // Keep log from getting too long
        if (this.gameLog.length > 5) {
            this.gameLog.shift();
        }
    }
    
    disableButtons() {
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => btn.disabled = true);
    }
    
    enableButtons() {
        const buttons = document.querySelectorAll('.action-btn');
        buttons.forEach(btn => btn.disabled = false);
    }
    
    reset() {
        this.player = { ammo: 3, lives: 3 };
        this.computer = { ammo: 3, lives: 3 };
        this.gameActive = true;
        this.playerTurn = true;
        this.gameLog = [];
        
        this.updateDisplay();
        this.addToLog('Game reset! Your turn.');
        document.getElementById('turnIndicator').textContent = 'Your Turn';
        document.getElementById('computerChoice').innerHTML = `
            <span class="choice-emoji">❓</span>
            <span class="choice-text">Waiting...</span>
        `;
        this.enableButtons();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    const game = new ChargeGame();
    
    // Add event listeners to action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            game.playerAction(btn.dataset.action);
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
});
