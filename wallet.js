class WalletManager {
    constructor() {
        this.wallet = null;
        this.connection = null;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.verifyInProgress = false;
        this.rpcEndpoints = [
            'https://acatnamedmanwhorecomsolana-proxy.acatnamedmanwhore.workers.dev'
        ];
        this.currentRpcIndex = 0;
        this.tokenBalance = 0;
        this.hasTokens = false;
        this.tokenAddress = new solanaWeb3.PublicKey('8Rym1XJMJuc3mkUUHtW9894DFo5GF9bZ8pdBEWS7moon');
        this.init();
    }

    async init() {
        try {
            console.log('Initializing wallet manager');
            await this.establishConnection();

            // Setup wallet event listeners
            if (window.solana) {
                window.solana.on('connect', () => this.handleConnect());
                window.solana.on('disconnect', () => this.handleDisconnect());
                window.solana.on('accountChanged', () => this.handleAccountChanged());
            } else {
                this.showWalletError("Please install Phantom Wallet", 5000);
            }

            // Check if already connected
            if (window.solana.isConnected) {
                console.log('Wallet already connected');
                this.wallet = window.solana;
                this.isConnected = true;
                await this.verifyTokenHoldings();
            }

            this.showPaywall();
            await this.checkStoredWallet();
        } catch (err) {
            console.error('Initialization error:', err);
            this.showWalletError('Failed to initialize wallet connection');
        }
    }

    async establishConnection() {
        for (const endpoint of this.rpcEndpoints) {
            try {
                console.log('Trying RPC endpoint:', endpoint);
                const connection = new solanaWeb3.Connection(endpoint, {
                    commitment: 'confirmed',
                    confirmTransactionInitialTimeout: 60000,
                    httpHeaders: {
                        'Origin': window.location.origin
                    }
                });
                
                // Test the connection
                const version = await connection.getVersion();
                console.log('Connected to Solana node version:', version);
                
                this.connection = connection;
                return true;
            } catch (err) {
                console.warn('Failed to connect to endpoint:', endpoint, err);
            }
        }

        throw new Error('Failed to connect to any RPC endpoint');
    }

    async retryWithFallback(operation) {
        for (let retry = 0; retry <= this.maxRetries; retry++) {
            try {
                return await operation();
            } catch (err) {
                console.error('Operation failed:', err);
                
                if (retry < this.maxRetries) {
                    const delay = this.retryDelay * Math.pow(2, retry);
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    
                    // Try next RPC endpoint
                    await this.establishConnection();
                } else {
                    throw err;
                }
            }
        }
    }

    async verifyTokenHoldings() {
        if (this.verifyInProgress) {
            console.log('Verification already in progress, skipping');
            return false;
        }

        if (!this.connection || !this.wallet?.publicKey) {
            console.log('Missing connection or wallet for token verification');
            return false;
        }

        this.verifyInProgress = true;
        this.connectionRetries = 0;
        this.tokenBalance = 0;
        this.hasTokens = false;

        try {
            return await this.retryWithFallback(async () => {
                console.log('Verifying token ownership for address:', this.wallet.publicKey.toString());
                
                try {
                    // Get token accounts directly
                    const response = await this.connection.getParsedTokenAccountsByOwner(
                        this.wallet.publicKey,
                        { mint: this.tokenAddress },
                        'confirmed'
                    );

                    console.log('Found token accounts:', response.value.length);

                    for (const account of response.value) {
                        const parsedInfo = account.account.data.parsed.info;
                        const amount = parsedInfo.tokenAmount.amount;
                        const decimals = parsedInfo.tokenAmount.decimals;
                        const balance = Number(amount) / Math.pow(10, decimals);
                        console.log('Token amount:', amount, 'decimals:', decimals, 'balance:', balance);
                        
                        if (balance > 0) {
                            console.log('Found positive BONES token balance:', balance);
                            this.tokenBalance = balance;
                            this.hasTokens = true;
                            window.dispatchEvent(new CustomEvent('tokensDetected', {
                                detail: {
                                    balance: this.tokenBalance
                                }
                            }));
                            return true;
                        }
                    }

                    console.log('No BONES token balance found');
                    return false;
                } catch (err) {
                    console.error('Error verifying tokens:', err);
                    // Don't treat mint not found as an error - just means no tokens
                    if (err.message.includes('could not find mint') || 
                        err.message.includes('Invalid param')) {
                        console.log('No token account found - this is normal for new wallets');
                        return false;
                    }
                    throw err;
                }
            });
        } catch (err) {
            console.error('All retries failed:', err);
            return false;
        } finally {
            this.verifyInProgress = false;
        }
    }

    async handleConnect() {
        if (this.verifyInProgress) {
            console.log('Connect event received but verification in progress, skipping');
            return;
        }

        console.log('Wallet connected');
        this.wallet = window.solana;
        this.isConnected = true;
        this.connectionRetries = 0;
        localStorage.setItem('walletConnected', 'true');
        
        this.updateUI();
        this.updateStatus('Connected, checking token...');
        
        const hasTokens = await this.verifyTokenHoldings();
        if (hasTokens) {
            this.hidePaywall();
            this.updateWalletInfo();
        } else {
            this.showPaywall();
        }
        
        this.updateUI();
    }

    async handleDisconnect() {
        console.log('Wallet disconnected');
        this.wallet = null;
        this.isConnected = false;
        this.verifyInProgress = false;
        localStorage.removeItem('walletConnected');
        this.updateUI();
        this.showPaywall();
    }

    async checkStoredWallet() {
        const storedWallet = localStorage.getItem('walletConnected');
        if (storedWallet === 'true' && window.solana?.isPhantom) {
            try {
                this.updateStatus('Reconnecting wallet...');
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                if (resp) {
                    await this.handleConnect();
                }
            } catch (err) {
                console.log('Silent connect failed:', err);
                localStorage.removeItem('walletConnected');
                this.handleDisconnect();
            }
        } else {
            this.handleDisconnect();
        }
    }

    async connectWallet(silent = false) {
        try {
            if (!window.solana || !window.solana.isPhantom) {
                window.open('https://phantom.app/', '_blank');
                return;
            }

            if (this.isConnected) {
                console.log('Wallet already connected');
                return;
            }

            console.log('Connecting wallet...');
            const resp = await window.solana.connect();
            this.wallet = window.solana;
            this.isConnected = true;
            
            console.log('Connected, checking token...');
            await this.verifyTokenHoldings();
            
            window.dispatchEvent(new CustomEvent('walletConnectionChanged', {
                detail: {
                    connected: true,
                    address: resp.publicKey.toString()
                }
            }));
        } catch (err) {
            console.error('Error connecting wallet:', err);
            this.showWalletError('Failed to connect wallet. Please try again.');
        }
    }

    async disconnectWallet() {
        console.log('Disconnecting wallet');
        try {
            if (this.wallet) {
                await this.wallet.disconnect();
            }
            this.wallet = null;
            this.isConnected = false;
            this.hasTokens = false;
            this.tokenBalance = 0;
            
            // Reset button state
            const connectButton = document.querySelector('.connect-toggle-button');
            if (connectButton) {
                connectButton.textContent = 'Connect Wallet';
                connectButton.onclick = () => this.connectWallet();
            }
            
            // Show paywall
            this.showPaywall();
            
            // Dispatch connection event
            window.dispatchEvent(new CustomEvent('walletConnectionChanged', {
                detail: {
                    connected: false,
                    address: null
                }
            }));
        } catch (err) {
            console.error('Error disconnecting wallet:', err);
            this.showWalletError('Error disconnecting wallet');
        }
    }

    handleAccountChanged() {
        console.log('Account changed');
        this.verifyTokenHoldings().then(() => this.updateUI());
    }

    // UI Update Methods
    updateUI() {
        this.updateWalletAddresses();
        this.updateBalanceDisplays();
        this.updatePaywallVisibility();
        this.updateWalletButtons();
        this.updateConnectButtons();
        this.updateWalletPanel();
    }

    updateWalletAddresses() {
        const address = this.wallet?.publicKey?.toString() || '';
        
        const walletAddress = document.getElementById('walletAddress');
        const panelWalletAddress = document.getElementById('panelWalletAddress');
        
        if (walletAddress) {
            walletAddress.textContent = address;
        }
        if (panelWalletAddress) {
            panelWalletAddress.textContent = address;
        }
    }

    updateBalanceDisplays() {
        let formattedBalance;
        if (!this.isConnected) {
            formattedBalance = '0 $BONES';
        } else if (this.tokenBalance) {
            formattedBalance = `${Number(this.tokenBalance).toLocaleString()} $BONES`;
        } else {
            formattedBalance = '0 $BONES';
        }
        
        const infoBonesBalance = document.getElementById('infoBonesBalance');
        const panelBonesBalance = document.getElementById('panelBonesBalance');
        
        if (infoBonesBalance) {
            infoBonesBalance.textContent = formattedBalance;
        }
        if (panelBonesBalance) {
            panelBonesBalance.textContent = formattedBalance;
        }

        if (this.hasTokens) {
            window.dispatchEvent(new CustomEvent('tokensDetected', {
                detail: { amount: this.tokenBalance }
            }));
        }
    }

    updatePaywallVisibility() {
        const content = document.querySelector('.content');
        const paywall = document.querySelector('.paywall');
        const walletModal = document.getElementById('walletModal');
        const mainContent = document.getElementById('mainContent');

        // Show content and hide paywall if connected AND has tokens
        if (this.isConnected && this.hasTokens) {
            if (content) content.style.display = 'block';
            if (paywall) paywall.style.display = 'none';
            if (walletModal) walletModal.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('blur-content');
                mainContent.style.pointerEvents = 'auto';
                mainContent.style.userSelect = 'auto';
            }
        } else {
            // Show paywall if not connected OR no tokens
            if (content) content.style.display = 'none';
            if (paywall) paywall.style.display = 'flex';
            if (walletModal) walletModal.style.display = this.isConnected ? 'none' : 'flex';
            if (mainContent) {
                mainContent.classList.add('blur-content');
                mainContent.style.pointerEvents = 'none';
                mainContent.style.userSelect = 'none';
            }
        }
    }

    updateWalletButtons() {
        const footerWallet = document.getElementById('footerWallet');
        if (footerWallet) {
            footerWallet.style.display = this.isConnected ? 'block' : 'none';
        }
    }

    updateConnectButtons() {
        const connectButtons = document.querySelectorAll('.connect-toggle-button');
        const modalToggle = document.getElementById('modalToggle');
        
        // Hide buttons if connected AND has tokens, show otherwise
        const shouldHide = this.isConnected && this.hasTokens;
        
        connectButtons.forEach(button => {
            button.style.display = shouldHide ? 'none' : 'block';
        });
        
        if (modalToggle) {
            modalToggle.style.display = shouldHide ? 'none' : 'block';
        }
    }

    updateWalletPanel() {
        const walletPanel = document.querySelector('.wallet-panel');
        if (!walletPanel) return;

        // Show panel if connected AND has tokens
        if (this.isConnected && this.hasTokens) {
            walletPanel.style.display = 'block';
            setTimeout(() => {
                walletPanel.classList.add('slide-in');
            }, 10);
        } else {
            walletPanel.classList.remove('slide-in');
            setTimeout(() => {
                walletPanel.style.display = 'none';
            }, 300);
        }
    }

    updateWalletInfo() {
        const walletAddress = this.wallet?.publicKey?.toString();
        if (walletAddress) {
            // Update address displays
            const addressDisplays = document.querySelectorAll('.wallet-address');
            addressDisplays.forEach(display => {
                display.textContent = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
            });

            // Update balance displays
            const balanceDisplays = document.querySelectorAll('.token-balance');
            balanceDisplays.forEach(display => {
                const balance = this.tokenBalance || 0;
                display.textContent = balance.toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                });
            });

            // Show connected state
            document.querySelectorAll('.connect-toggle-button').forEach(btn => {
                btn.textContent = 'Disconnect';
                btn.onclick = () => this.disconnectWallet();
            });
        }
    }

    showContent() {
        const content = document.querySelector('.content');
        const paywall = document.querySelector('.paywall');
        if (content) content.style.display = 'block';
        if (paywall) paywall.style.display = 'none';
    }

    hidePaywall() {
        console.log('Hiding paywall');
        const mainContent = document.getElementById('mainContent');
        const walletModal = document.getElementById('walletModal');
        const blurOverlay = document.querySelector('.blur-overlay');
        
        if (mainContent) {
            mainContent.classList.add('visible');
        }
        if (walletModal) {
            walletModal.classList.add('hidden');
        }
        if (blurOverlay) {
            blurOverlay.style.display = 'none';
        }
    }

    showPaywall() {
        console.log('Showing paywall');
        const mainContent = document.getElementById('mainContent');
        const walletModal = document.getElementById('walletModal');
        const blurOverlay = document.querySelector('.blur-overlay');
        const connectButton = document.querySelector('.connect-toggle-button');
        
        if (mainContent) {
            mainContent.classList.remove('visible');
        }
        if (walletModal) {
            walletModal.classList.remove('hidden');
        }
        if (blurOverlay) {
            blurOverlay.style.display = 'block';
        }
        if (connectButton) {
            connectButton.textContent = 'Connect Wallet';
            connectButton.onclick = () => this.connectWallet();
        }
    }

    updateStatus(message, isError = false) {
        console.log(message);
        const statusElement = document.getElementById('walletStatus');
        const errorElement = document.getElementById('walletError');
        
        if (statusElement && !isError) {
            statusElement.textContent = message;
            statusElement.style.display = 'block';
            if (errorElement) errorElement.style.display = 'none';
        }
        
        if (errorElement && isError) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            if (statusElement) statusElement.style.display = 'none';
        }
    }

    showWalletError(message, duration = 3000) {
        this.updateStatus(message, true);
        setTimeout(() => {
            const errorElement = document.getElementById('walletError');
            if (errorElement) {
                errorElement.style.display = 'none';
            }
        }, duration);
    }
}

// Initialize wallet manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
});
