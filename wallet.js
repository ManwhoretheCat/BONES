class WalletManager {
    constructor() {
        this.connection = null;
        this.wallet = null;
        this.tokenAddress = new solanaWeb3.PublicKey('8Rym1XJMJuc3mkUUHtW9894DFo5GF9bZ8pdBEWS7moon');
        this.isConnected = false;
        this.isVerifying = false;
        this.connectionRetries = 0;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.init();
    }

    async init() {
        try {
            // Use Alchemy demo endpoint that was working before
            this.connection = new solanaWeb3.Connection(
                'https://solana-mainnet.g.alchemy.com/v2/demo',
                {
                    commitment: 'confirmed',
                    wsEndpoint: undefined
                }
            );

            // Setup wallet event listeners
            if (window.solana) {
                window.solana.on('connect', () => this.handleConnect());
                window.solana.on('disconnect', () => this.handleDisconnect());
                window.solana.on('accountChanged', () => this.handleAccountChanged());
            } else {
                this.showWalletError("Please install Phantom Wallet", 5000);
            }
            
            // Check if wallet was previously connected
            await this.checkStoredWallet();
        } catch (err) {
            console.error('Initialization error:', err);
            this.showWalletError('Failed to initialize wallet connection');
            this.updateUI();
        }
    }

    async checkStoredWallet() {
        const storedWallet = localStorage.getItem('walletConnected');
        if (storedWallet === 'true' && window.solana?.isPhantom) {
            try {
                this.updateStatus('Reconnecting wallet...');
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                if (resp) {
                    this.wallet = window.solana;
                    this.isConnected = true;
                    await this.verifyTokenOwnership();
                    this.updateUI();
                }
            } catch (err) {
                console.log('Silent connect failed:', err);
                localStorage.removeItem('walletConnected');
                this.handleDisconnect();
            }
        }
    }

    async connectWallet(silent = false) {
        if (this.isVerifying) {
            this.showWalletError('Please wait, verification in progress...');
            return;
        }

        try {
            if (!window.solana) {
                this.showWalletError("Please install Phantom wallet!");
                return;
            }

            this.updateStatus('Connecting wallet...');
            if (!silent) {
                await window.solana.connect();
            }
            
            // Wait for connection to be ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (!window.solana.isConnected) {
                throw new Error('Wallet connection failed');
            }
            
            this.wallet = window.solana;
            this.isConnected = true;
            localStorage.setItem('walletConnected', 'true');
            
            await this.verifyTokenOwnership();
            this.updateUI();
        } catch (err) {
            console.error("Error connecting wallet:", err);
            if (!silent) {
                this.showWalletError("Failed to connect wallet");
            }
            this.handleDisconnect();
        }
    }

    async verifyTokenOwnership() {
        if (!this.connection || !this.wallet?.publicKey) {
            console.log('Missing connection or wallet for token verification');
            return false;
        }

        try {
            console.log('Verifying token ownership for address:', this.wallet.publicKey.toString());
            
            // Get all token accounts held by the wallet
            const response = await this.connection.getParsedTokenAccountsByOwner(
                this.wallet.publicKey,
                {
                    programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                }
            );

            console.log('Found token accounts:', response.value.length);

            let totalAmount = 0;
            let decimals = 0;

            // Look for BONES token among all token accounts
            for (const account of response.value) {
                const parsedInfo = account.account.data.parsed.info;
                if (parsedInfo.mint === this.tokenAddress.toString()) {
                    const amount = Number(parsedInfo.tokenAmount.amount);
                    decimals = parsedInfo.tokenAmount.decimals;
                    totalAmount += amount;
                }
            }

            if (totalAmount > 0) {
                console.log('Found positive BONES token balance');
                const formattedAmount = totalAmount / Math.pow(10, decimals);
                console.log('Formatted amount:', formattedAmount);
                
                this.tokenBalance = formattedAmount;
                this.hasTokens = true;
                return true;
            }

            console.log('No BONES token balance found');
            this.tokenBalance = 0;
            this.hasTokens = false;
            return false;
        } catch (err) {
            console.error('Error verifying token ownership:', err);
            if (this.connectionRetries < this.maxRetries) {
                this.connectionRetries++;
                this.updateStatus(`Retrying verification (${this.connectionRetries}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.verifyTokenOwnership();
            }
            return false;
        }
    }

    handleConnect() {
        console.log('Wallet connected');
        this.wallet = window.solana;
        this.isConnected = true;
        localStorage.setItem('walletConnected', 'true');
        this.verifyTokenOwnership().then(() => this.updateUI());
    }

    handleDisconnect() {
        console.log('Wallet disconnected');
        this.wallet = null;
        this.isConnected = false;
        this.hasTokens = false;
        this.tokenBalance = 0;
        localStorage.removeItem('walletConnected');
        
        // Force UI update for disconnect
        this.updateUI();
    }

    handleAccountChanged() {
        console.log('Account changed');
        this.verifyTokenOwnership().then(() => this.updateUI());
    }

    disconnectWallet() {
        if (window.solana) {
            window.solana.disconnect();
        }
        this.handleDisconnect();
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
        const formattedBalance = this.tokenBalance ? `${this.tokenBalance.toLocaleString()} $BONES` : '0 $BONES';
        
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

        if (this.hasTokens && this.isConnected) {
            // Show content, hide paywall
            if (content) content.style.display = 'block';
            if (paywall) paywall.style.display = 'none';
            if (walletModal) walletModal.style.display = 'none';
            if (mainContent) {
                mainContent.classList.remove('blur-content');
                mainContent.style.pointerEvents = 'auto';
                mainContent.style.userSelect = 'auto';
            }
        } else {
            // Show paywall, hide content
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
        
        // Show/hide connect buttons based on token ownership and connection state
        const shouldShow = !this.hasTokens || !this.isConnected;
        
        connectButtons.forEach(button => {
            button.style.display = shouldShow ? 'block' : 'none';
        });
        
        if (modalToggle) {
            modalToggle.style.display = shouldShow ? 'block' : 'none';
        }
    }

    updateWalletPanel() {
        const walletPanel = document.querySelector('.wallet-panel');
        if (!walletPanel) return;

        if (this.hasTokens && this.isConnected) {
            // Show wallet panel with animation
            walletPanel.style.display = 'block';
            setTimeout(() => {
                walletPanel.classList.add('slide-in');
            }, 10);
        } else {
            // Hide wallet panel with animation
            walletPanel.classList.remove('slide-in');
            setTimeout(() => {
                walletPanel.style.display = 'none';
            }, 300);
        }
    }

    showContent() {
        const content = document.querySelector('.content');
        const paywall = document.querySelector('.paywall');
        if (content) content.style.display = 'block';
        if (paywall) paywall.style.display = 'none';
    }

    showPaywall() {
        const content = document.querySelector('.content');
        const paywall = document.querySelector('.paywall');
        if (content) content.style.display = 'none';
        if (paywall) paywall.style.display = 'block';
    }

    updateStatus(message, isError = false) {
        console.log(message);
    }

    showWalletError(message, duration = 3000) {
        console.error(message);
    }
}

// Initialize wallet manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
});
