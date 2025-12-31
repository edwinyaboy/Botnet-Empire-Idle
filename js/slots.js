class HackerSlots {
    constructor() {
        this.isActive = false;
        this.isSpinning = false;
        this.autoSpinCount = 0;
        this.autoSpinInterval = null;
        
        this.state = {
            bet: 10,
            winStreak: 0,
            lastWin: 0,
            totalWon: 0,
            totalSpins: 0,
            freeSpins: 0
        };
        
        this.symbols = [
            { id:'pc',   emoji:'🖥️', name:'PC',   weight:45, payout:[0,0,2,3,5] },
            { id:'bot',  emoji:'🤖', name:'Bot',  weight:30, payout:[0,0,3,5,10] },
            { id:'wifi', emoji:'🛜', name:'WiFi', weight:15, payout:[0,0,5,10,15] },
            { id:'disk', emoji:'💽', name:'Disk', weight:7,  payout:[0,0,10,10,10] },
            { id:'zero', emoji:'0️⃣', name:'Zero-Day', weight:3, payout:[0,0,0,0,0], wild:true }
        ];
        
        this.paylines = this.generatePaylines();
        this.reels = Array(5).fill().map(() => Array(3).fill(null));
        this.elements = {};
        
        this.createUI();
        this.bindEvents();
        this.loadState();
    }
    
    generatePaylines() {
        return [
            [[0,0],[1,0],[2,0],[3,0],[4,0]],
            [[0,1],[1,1],[2,1],[3,1],[4,1]],
            [[0,2],[1,2],[2,2],[3,2],[4,2]]
        ];
    }
    
    getRandomSymbol() {
        const totalWeight = this.symbols.reduce((sum, sym) => sum + sym.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const symbol of this.symbols) {
            if (random < symbol.weight) return symbol;
            random -= symbol.weight;
        }
        
        return this.symbols[0];
    }
    
    createUI() {
        this.elements.container = document.createElement('div');
        this.elements.container.className = 'slot-machine-page';
        this.elements.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(13, 17, 23, 0.98);
            backdrop-filter: blur(10px);
            z-index: 9999;
            display: none;
            overflow-y: auto;
            overflow-x: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        this.elements.closeBtn = document.createElement('button');
		this.elements.closeBtn.innerHTML = 'X';
		this.elements.closeBtn.className = 'slots-close-btn';
		this.elements.closeBtn.style.cssText = `
			position: fixed;
			top: 20px;
			right: 20px;
			background: #da3633;
			border: 2px solid #f85149;
			color: white;
			width: 40px;
			height: 40px;
			border-radius: 50%;
			cursor: pointer;
			font-size: 24px;
			z-index: 10000;
			transition: all 0.2s;
			line-height: 1;
			display: flex;
			align-items: center;
			justify-content: center;
		`;
        this.elements.closeBtn.onmouseover = () => this.elements.closeBtn.style.background = '#f85149';
        this.elements.closeBtn.onmouseout = () => this.elements.closeBtn.style.background = '#da3633';
		this.elements.closeBtn.className = 'close-btn';
        this.elements.closeBtn.onclick = () => this.exit();
        
        const slotContainer = document.createElement('div');
        slotContainer.style.cssText = `
            width: 90%;
            max-width: 900px;
            background: #161b22;
            border: 2px solid #30363d;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            margin: 80px auto 40px;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #30363d;
            flex-wrap: wrap;
            gap: 15px;
        `;
        
        const title = document.createElement('h2');
        title.innerHTML = '🎰 SLOTS';
        title.style.cssText = 'color: #58a6ff; margin: 0; font-size: clamp(18px, 4vw, 24px);';
        
        this.elements.stats = document.createElement('div');
        this.elements.stats.style.cssText = 'display: flex; gap: 12px; flex-wrap: wrap;';
        
        header.appendChild(title);
        header.appendChild(this.elements.stats);
        
        this.elements.reelsContainer = document.createElement('div');
        this.elements.reelsContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 8px;
            margin: 20px 0;
            background: #0d1117;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #30363d;
        `;
        
        this.elements.paylinesOverlay = document.createElement('div');
        this.elements.paylinesOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
            z-index: 10;
        `;
        
        const reelsWrapper = document.createElement('div');
        reelsWrapper.style.cssText = 'position: relative;';
        reelsWrapper.appendChild(this.elements.reelsContainer);
        reelsWrapper.appendChild(this.elements.paylinesOverlay);
        
        const betControls = document.createElement('div');
        betControls.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
        `;
        
        this.elements.betDownBtn = this.createIconButton('−', () => this.updateBet(-10));
        this.elements.betDisplay = document.createElement('div');
        this.elements.betDisplay.style.cssText = `
            font-size: clamp(16px, 3vw, 20px);
            min-width: 120px;
            text-align: center;
            color: #58a6ff;
            background: #0d1117;
            padding: 10px 20px;
            border-radius: 6px;
            border: 2px solid #30363d;
            font-weight: 600;
        `;
        this.elements.betUpBtn = this.createIconButton('+', () => this.updateBet(10));
        
        betControls.appendChild(this.elements.betDownBtn);
        betControls.appendChild(this.elements.betDisplay);
        betControls.appendChild(this.elements.betUpBtn);
        
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 10px;
            margin: 15px 0;
            flex-wrap: wrap;
        `;
        
        this.elements.spinBtn = this.createButton('SPIN', () => this.spin(), true);
        this.elements.betMaxBtn = this.createButton('Max Bet', () => this.setMaxBet());
        this.elements.clearBetBtn = this.createButton('Min Bet', () => this.setMinBet());
        
        controls.appendChild(this.elements.spinBtn);
        controls.appendChild(this.elements.betMaxBtn);
        controls.appendChild(this.elements.clearBetBtn);
        
        const autoSpinControls = document.createElement('div');
        autoSpinControls.style.cssText = `
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin: 15px 0;
            justify-content: center;
            align-items: center;
        `;
        
        const autoLabel = document.createElement('div');
        autoLabel.textContent = 'Auto-Spin:';
        autoLabel.style.cssText = 'color: #8b949e; font-size: 14px;';
        autoSpinControls.appendChild(autoLabel);
        
        [5, 10, 25, 50, 100].forEach(count => {
            const btn = this.createButton(`${count}×`, () => this.startAutoSpin(count));
            btn.style.minWidth = '60px';
            autoSpinControls.appendChild(btn);
        });
        
        this.elements.cancelAutoBtn = this.createButton('Cancel', () => this.stopAutoSpin());
        this.elements.cancelAutoBtn.style.cssText += 'background: #da3633; border-color: #f85149;';
        this.elements.cancelAutoBtn.onmouseover = () => {
            this.elements.cancelAutoBtn.style.background = '#f85149';
        };
        this.elements.cancelAutoBtn.onmouseout = () => {
            this.elements.cancelAutoBtn.style.background = '#da3633';
        };
        autoSpinControls.appendChild(this.elements.cancelAutoBtn);
        
        const infoPanel = document.createElement('div');
        infoPanel.style.cssText = `
            background: #0d1117;
            border: 1px solid #30363d;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
        `;
        
        const infoTitle = document.createElement('h3');
        infoTitle.textContent = 'Symbol Payouts (per payline)';
        infoTitle.style.cssText = 'color: #58a6ff; margin: 0 0 12px 0; font-size: 14px; border-bottom: 1px solid #30363d; padding-bottom: 8px;';
        
        const infoContent = document.createElement('div');
        infoContent.style.cssText = 'display: grid; gap: 8px;';
        
        const symbolInfos = [
            { emoji:'🖥️', text:'3 = 2x<br>4 = 3x<br>5 = 5x', color:'#6e7681' },
            { emoji:'🤖', text:'3 = 3x<br>4 = 5x<br>5 = 10x', color:'#58a6ff' },
            { emoji:'🛜', text:'3 = 5x<br>4 = 10x<br>5 = 15x', color:'#a371f7' },
            { emoji:'💽', text:'3+ = 10x', color:'#ffc107' },
            { emoji:'0️⃣', text:'5 = 3–10 Free Spins', color:'#f85149' }
        ];
        
        symbolInfos.forEach(info => {
            const div = document.createElement('div');
            div.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                background: #161b22;
                color: ${info.color};
                border: 1px solid ${info.color}40;
                font-size: 13px;
            `;
            div.innerHTML = `<span style="font-size: 20px;">${info.emoji}</span> ${info.text}`;
            infoContent.appendChild(div);
        });
        
        const footer = document.createElement('div');
        footer.style.cssText = 'margin-top: 12px; color: #8b949e; font-size: 12px;';
        
        infoPanel.appendChild(infoTitle);
        infoPanel.appendChild(infoContent);
        infoPanel.appendChild(footer);
        
        slotContainer.appendChild(header);
        slotContainer.appendChild(reelsWrapper);
        slotContainer.appendChild(betControls);
        slotContainer.appendChild(controls);
        slotContainer.appendChild(autoSpinControls);
        slotContainer.appendChild(infoPanel);
        
        this.elements.container.appendChild(this.elements.closeBtn);
        this.elements.container.appendChild(slotContainer);
        
        document.body.appendChild(this.elements.container);
        
        this.generateReels();
    }
    
    getSymbolColor(symbolId) {
        const colors = {
            pc: { bg: '#21262d', color: '#6e7681', border: '#6e7681' },
            bot: { bg: '#1c2d41', color: '#58a6ff', border: '#58a6ff' },
            wifi: { bg: '#2b2350', color: '#a371f7', border: '#a371f7' },
            disk: { bg: '#3d2f00', color: '#ffc107', border: '#ffc107' },
            zero: { bg: '#3d1e1c', color: '#f85149', border: '#f85149' }
        };
        return colors[symbolId] || { bg: '#21262d', color: '#c9d1d9', border: '#30363d' };
    }
    
    createIconButton(text, onClick) {
        const btn = document.createElement('button');
        btn.innerHTML = `<span>${text}</span>`;
        btn.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 6px;
            background: #21262d;
            border: 2px solid #30363d;
            color: #58a6ff;
            cursor: pointer;
            padding: 0;
            display: grid;
            place-items: center;
            transition: all 0.2s;
        `;

        const span = btn.firstChild;
        span.style.cssText = `
            display: block;
            font-size: 22px;
            font-weight: 700;
            line-height: 22px;
            height: 22px;
            width: 22px;
            text-align: center;
            font-family: monospace;
        `;

        btn.onclick = onClick;

        btn.onmouseover = () => {
            if (!btn.disabled) {
                btn.style.background = '#30363d';
                btn.style.borderColor = '#58a6ff';
            }
        };

        btn.onmouseout = () => {
            btn.style.background = '#21262d';
            btn.style.borderColor = '#30363d';
        };

        return btn;
    }
    
    createButton(text, onClick, primary = false) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            background: ${primary ? '#1f6feb' : '#21262d'};
            color: ${primary ? '#fff' : '#c9d1d9'};
            border: 2px solid ${primary ? '#58a6ff' : '#30363d'};
            padding: 12px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.2s;
            flex: 1;
            min-width: 100px;
        `;
        btn.onclick = onClick;
        btn.onmouseover = () => {
            if (!btn.disabled) {
                btn.style.background = primary ? '#388bfd' : '#30363d';
                btn.style.transform = 'translateY(-1px)';
            }
        };
        btn.onmouseout = () => {
            btn.style.background = primary ? '#1f6feb' : '#21262d';
            btn.style.transform = 'translateY(0)';
        };
        return btn;
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (!this.isActive) return;
            
            switch(e.code) {
                case 'Escape':
                    this.exit();
                    break;
                case 'Space':
                    if (!this.isSpinning) this.spin();
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    this.updateBet(10);
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.updateBet(-10);
                    e.preventDefault();
                    break;
            }
        });
    }
    
    enter() {
        if (this.isActive) return;
        
        this.isActive = true;
        window.slotsActive = true;
        this.elements.container.style.display = 'block';
        
        this.updateUI();
        this.updateStats();
    }
    
    exit() {
        if (!this.isActive) return;
        
        this.isActive = false;
        window.slotsActive = false;
        this.elements.container.style.display = 'none';
        this.stopAutoSpin();
        
        this.saveState();
        
        if (typeof window.render === 'function') {
            window.render();
        }
    }
    
    generateReels() {
        for (let reel = 0; reel < 5; reel++) {
            for (let row = 0; row < 3; row++) {
                this.reels[reel][row] = this.getRandomSymbol();
            }
        }
    }
    
    renderReels() {
        this.elements.reelsContainer.innerHTML = '';
        
        for (let reel = 0; reel < 5; reel++) {
            const reelDiv = document.createElement('div');
            reelDiv.style.cssText = `
                background: #0d1117;
                border: 2px solid #30363d;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            `;
            
            for (let row = 0; row < 3; row++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 8px;
                    border-bottom: 1px solid #21262d;
                    min-height: 60px;
                `;
                if (row === 2) cell.style.borderBottom = 'none';
                
                const symbol = this.reels[reel][row];
                if (symbol) {
                    const colors = this.getSymbolColor(symbol.id);
                    const symbolDiv = document.createElement('div');
                    symbolDiv.className = `symbol ${symbol.id}`;
                    symbolDiv.textContent = symbol.emoji;
                    symbolDiv.style.cssText = `
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        font-size: clamp(24px, 5vw, 32px);
                        background: ${colors.bg};
                        border: 2px solid ${colors.border};
                        transition: all 0.3s;
                    `;
                    cell.appendChild(symbolDiv);
                }
                
                reelDiv.appendChild(cell);
            }
            
            this.elements.reelsContainer.appendChild(reelDiv);
        }
    }
    
    updateUI() {
        this.renderReels();
        this.elements.betDisplay.textContent = `Bet: $${this.state.bet}`;
        this.updateStats();

        if (typeof window.game !== 'undefined') {
            const canSpin =
                !this.isSpinning &&
                this.state.bet >= 1 &&
                (this.state.freeSpins > 0 || window.game.money >= this.state.bet);

            this.elements.spinBtn.disabled = !canSpin;

            this.elements.spinBtn.style.opacity = canSpin ? '1' : '0.5';
            this.elements.spinBtn.style.cursor = canSpin ? 'pointer' : 'not-allowed';
            this.elements.spinBtn.style.pointerEvents = canSpin ? 'auto' : 'none';
        }
    }
    
    updateStats() {
        const totalBots = window.game?.bots ? 
            (window.game.bots.t1 || 0) + (window.game.bots.t2 || 0) + 
            (window.game.bots.t3 || 0) + (window.game.bots.mobile || 0) : 0;
        
        const statsHTML = `
            <div style="background: #0d1117; padding: 8px 12px; border-radius: 4px; border: 1px solid #30363d; color: #8b949e; font-size: 12px;">
                Bots: <span style="color: #58a6ff; font-weight: 600;">${Math.floor(totalBots).toLocaleString()}</span>
            </div>
            <div style="background: #0d1117; padding: 8px 12px; border-radius: 4px; border: 1px solid #30363d; color: #8b949e; font-size: 12px;">
                Credits: <span style="color: #58a6ff; font-weight: 600;">$${Math.floor(window.game?.money || 0).toLocaleString()}</span>
            </div>
            <div style="background: #0d1117; padding: 8px 12px; border-radius: 4px; border: 1px solid #30363d; color: #8b949e; font-size: 12px;">
                Streak: <span style="color: #58a6ff; font-weight: 600;">${this.state.winStreak}</span>
            </div>
            <div style="background: #0d1117; padding: 8px 12px; border-radius: 4px; border: 1px solid #30363d; color: #8b949e; font-size: 12px;">
                Won: <span style="color: #58a6ff; font-weight: 600;">$${this.state.totalWon}</span>
            </div>
            <div style="background:#0d1117;padding:8px 12px;border-radius:4px;border:1px solid #30363d;color:#8b949e;font-size:12px;">
                Free Spins: <span style="color:#f85149;font-weight:600;">${this.state.freeSpins || 0}</span>
            </div>
        `;
        this.elements.stats.innerHTML = statsHTML;
    }
    
    async spin() {
        if (this.isSpinning) return;
        if (typeof window.game === 'undefined') return;
        if (this.state.freeSpins === 0 && window.game.money < this.state.bet) return;

        this.isSpinning = true;
        this.state.totalSpins++;

        const isFreeSpin = this.state.freeSpins > 0;

        if (!isFreeSpin) {
            window.game.money -= this.state.bet;
        } else {
            this.state.freeSpins--;
        }

        this.showFreeSpinMode(isFreeSpin);

        await this.animateSpin();

        for (let reel = 0; reel < 5; reel++) {
            for (let row = 0; row < 3; row++) {
                this.reels[reel][row] = this.getRandomSymbol();
            }
        }

        const wins = this.checkWins();
        let totalWin = 0;
        let zeroTriggered = false;

        for (let i = 0; i < wins.length; i++) {
            const win = wins[i];
            if (win.symbol.id === 'zero' && win.count === 5 && !zeroTriggered && !isFreeSpin) {
                zeroTriggered = true;
                const freeSpins = Math.floor(Math.random() * 8) + 3;
                this.state.freeSpins += freeSpins;
                this.showFreeSpinsReward(freeSpins);
            } else if (win.symbol.id !== 'zero') {
                const winAmount = this.calculateWin(win);
                totalWin += winAmount;
                this.animateWin(win, winAmount);
            }
        }

        if (totalWin > 0) {
            window.game.money += totalWin;
            this.state.winStreak++;
            
            const totalBots =
                (window.game.bots.t1 || 0) +
                (window.game.bots.t2 || 0) +
                (window.game.bots.t3 || 0) +
                (window.game.bots.mobile || 0);

            if (totalBots > 0) {
                window.game.bots.t3 =
                    (window.game.bots.t3 || 0) + Math.floor(totalWin / 100);
            }

            this.state.totalWon += totalWin;
            this.state.lastWin = totalWin;
        } else {
            this.state.winStreak = 0;
            this.state.lastWin = 0;
        }

        this.isSpinning = false;

        this.updateUI();
        this.saveState();
        if (typeof window.saveGame === 'function') window.saveGame();

        if (this.autoSpinCount > 0) {
            this.autoSpinCount--;
            if (this.autoSpinCount > 0) {
                setTimeout(() => this.spin(), 900);
            } else {
                this.stopAutoSpin();
            }
        }
    }
    
    animateSpin() {
        return new Promise(resolve => {
            const reels = this.elements.reelsContainer.querySelectorAll('& > div');
            const spinDuration = 1000;
            const spinInterval = 100;
            
            let spins = 0;
            const maxSpins = spinDuration / spinInterval;
            
            const spinIntervalId = setInterval(() => {
                reels.forEach((reel, reelIndex) => {
                    const cells = reel.querySelectorAll('& > div');
                    cells.forEach(cell => {
                        const tempSymbol = this.getRandomSymbol();
                        const colors = this.getSymbolColor(tempSymbol.id);
                        const symbolDiv = document.createElement('div');
                        symbolDiv.textContent = tempSymbol.emoji;
                        symbolDiv.style.cssText = `
                            width: 100%;
                            height: 100%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 4px;
                            font-size: clamp(24px, 5vw, 32px);
                            background: ${colors.bg};
                            border: 2px solid ${colors.border};
                        `;
                        cell.innerHTML = '';
                        cell.appendChild(symbolDiv);
                    });
                    
                    if (spins >= maxSpins - (reelIndex * 2)) {
                        cells.forEach(cell => {
                            const symbol = cell.querySelector('div');
                            if (symbol) symbol.style.animation = 'none';
                        });
                    }
                });
                
                spins++;
                if (spins >= maxSpins) {
                    clearInterval(spinIntervalId);
                    setTimeout(resolve, 300);
                }
            }, spinInterval);
        });
    }
    
    checkWins() {
        const wins = [];
        
        for (const line of this.paylines) {
            const symbols = line.map(([reel, row]) => this.reels[reel][row]);
            const match = this.checkLine(symbols);
            
            if (match) {
                wins.push({
                    line,
                    symbol: match.symbol,
                    count: match.count
                });
            }
        }
        
        return wins;
    }
    
    checkLine(symbols) {
        let firstSymbol = symbols[0];
        let count = 1;
        
        if (firstSymbol.id === 'zero') {
            const nonWild = symbols.find(s => s.id !== 'zero');
            if (nonWild) firstSymbol = nonWild;
        }
        
        for (let i = 1; i < symbols.length; i++) {
            const symbol = symbols[i];
            if (symbol.id === firstSymbol.id || symbol.id === 'zero') {
                count++;
            } else {
                break;
            }
        }
        
        return count >= 3 ? { symbol: firstSymbol, count } : null;
    }
    
    calculateWin(win) {
        const payout = win.symbol.payout[win.count - 1];
        return this.state.bet * payout;
    }
    
    animateWin(win, amount) {
        this.highlightPayline(win.line);
        
        win.line.slice(0, win.count).forEach(([reel, row], index) => {
            setTimeout(() => {
                const reelDiv = this.elements.reelsContainer.children[reel];
                if (reelDiv) {
                    const cell = reelDiv.children[row];
                    if (cell) {
                        const symbol = cell.querySelector('div');
                        if (symbol) {
                            symbol.style.animation = `pulse 0.5s ease`;
                            
                            if (index === 0) {
                                this.createFloatingReward(amount, cell);
                            }
                            
                            setTimeout(() => {
                                symbol.style.animation = '';
                            }, 1000);
                        }
                    }
                }
            }, index * 150);
        });
    }
    
    showFreeSpinMode(active) {
        let el = document.getElementById('free-spin-mode');
        if (!el) {
            el = document.createElement('div');
            el.id = 'free-spin-mode';
            el.style.cssText = `
                position: fixed;
                top: 90px;
                right: 20px;
                background: #f85149;
                color: #fff;
                padding: 8px 14px;
                border-radius: 6px;
                font-weight: 700;
                z-index: 10000;
                display: none;
            `;
            document.body.appendChild(el);
        }

        if (active) {
            el.textContent = `FREE SPIN (${this.state.freeSpins + 1})`;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
    
    showFreeSpinsReward(count) {
        const div = document.createElement('div');
        div.textContent = `🎁 +${count} FREE SPINS`;
        div.style.cssText = `
            position: fixed;
            top: 20%;
            left: 50%;
            transform: translateX(-50%);
            background: #161b22;
            border: 2px solid #f85149;
            color: #f85149;
            padding: 15px 25px;
            font-size: 18px;
            font-weight: bold;
            border-radius: 8px;
            z-index: 10001;
        `;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }
    
    createFloatingReward(amount, element) {
        const reward = document.createElement('div');
        reward.textContent = `+$${amount}`;
        reward.style.cssText = `
            position: absolute;
            color: #58a6ff;
            font-size: clamp(16px, 3vw, 20px);
            font-weight: bold;
            pointer-events: none;
            z-index: 100;
            animation: floatUp 1s ease-out forwards;
            text-shadow: 0 0 10px rgba(88, 166, 255, 0.5);
        `;
        
        const rect = element.getBoundingClientRect();
        const containerRect = this.elements.container.getBoundingClientRect();
        
        reward.style.left = `${rect.left - containerRect.left + rect.width/2}px`;
        reward.style.top = `${rect.top - containerRect.top}px`;
        
        this.elements.container.appendChild(reward);
        
        setTimeout(() => reward.remove(), 1000);
    }
    
    highlightPayline(line) {
        const firstReel = this.elements.reelsContainer.children[line[0][0]];
        const lastReel = this.elements.reelsContainer.children[line[4][0]];
        
        if (firstReel && lastReel) {
            const firstRect = firstReel.getBoundingClientRect();
            const lastRect = lastReel.getBoundingClientRect();
            const containerRect = this.elements.reelsContainer.getBoundingClientRect();
            
            const highlight = document.createElement('div');
            highlight.style.cssText = `
                position: absolute;
                background: rgba(88, 166, 255, 0.1);
                border: 2px solid rgba(88, 166, 255, 0.5);
                border-radius: 4px;
                pointer-events: none;
                z-index: 5;
            `;
            
            highlight.style.left = `${firstRect.left - containerRect.left}px`;
            highlight.style.top = `${firstRect.top - containerRect.top}px`;
            highlight.style.width = `${lastRect.right - firstRect.left}px`;
            highlight.style.height = `${firstRect.height / 3}px`;
            highlight.style.transform = `translateY(${line[0][1] * (firstRect.height / 3)}px)`;
            
            this.elements.paylinesOverlay.appendChild(highlight);
            
            setTimeout(() => {
                highlight.style.opacity = '0';
                setTimeout(() => highlight.remove(), 300);
            }, 1000);
        }
    }
    
    updateBet(change) {
        const newBet = this.state.bet + change;
        if (newBet >= 10 && newBet <= 10000) {
            this.state.bet = newBet;
            this.updateUI();
        }
    }
    
    setMaxBet() {
        if (typeof window.game !== 'undefined') {
            const max = Math.floor(window.game.money);
            this.state.bet = Math.max(10, Math.min(10000, max));
            this.updateUI();
        }
    }
    
    setMinBet() {
        this.state.bet = 10;
        this.updateUI();
    }
    
    startAutoSpin(count) {
        if (this.isSpinning) return;
        
        this.autoSpinCount = count;
        this.spin();
    }
    
    stopAutoSpin() {
        this.autoSpinCount = 0;
        this.autoSpinInterval = null;
        this.isSpinning = false;
    }
    
    saveState() {
        if (typeof window.game !== 'undefined') {
            const slotData = {
                bet: this.state.bet,
                winStreak: this.state.winStreak,
                totalWon: this.state.totalWon,
                totalSpins: this.state.totalSpins,
                freeSpins: this.state.freeSpins
            };
            localStorage.setItem('hacker_slots', JSON.stringify(slotData));
        }
    }
    
    loadState() {
        try {
            const saved = localStorage.getItem('hacker_slots');
            if (saved) {
                const data = JSON.parse(saved);
                Object.assign(this.state, data);
            }
        } catch (e) {
            console.error('Failed to load slot data:', e);
        }
    }
}

let hackerSlotsInstance = null;

function enterSlots() {
    if (!hackerSlotsInstance) {
        hackerSlotsInstance = new HackerSlots();
    }
    hackerSlotsInstance.enter();
}

function exitSlots() {
    if (hackerSlotsInstance) {
        hackerSlotsInstance.exit();
    }
}

export { HackerSlots, enterSlots, exitSlots };

if (typeof window !== 'undefined') {
    window.HackerSlots = HackerSlots;
    window.enterSlots = enterSlots;
    window.exitSlots = exitSlots;
}