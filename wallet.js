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

            // Show paywall by default
            this.showPaywall();

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
            this.showPaywall();
        }
    }

    async retryWithNextEndpoint() {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
        console.log('Switching to endpoint:', this.rpcEndpoints[this.currentEndpointIndex]);
        
        this.connection = new solanaWeb3.Connection(
            this.rpcEndpoints[this.currentEndpointIndex],
            {
                commitment: 'confirmed',
                wsEndpoint: undefined
            }
        );
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
                    this.updateWalletAddress();
                    this.showContent();
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
            const connectButton = document.getElementById('connectButton');
            if (connectButton) connectButton.disabled = true;

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
            
            this.updateStatus('Checking token ownership...');
            await this.checkAccess();
        } catch (err) {
            console.error("Error connecting wallet:", err);
            if (!silent) {
                this.showWalletError("Failed to connect wallet");
            }
            this.handleDisconnect();
        } finally {
            const connectButton = document.getElementById('connectButton');
            if (connectButton) connectButton.disabled = false;
        }
    }

    async checkAccess() {
        if (!this.isConnected || !this.wallet?.publicKey) {
            this.updateStatus('Wallet not connected', true);
            this.showPaywall();
            return false;
        }

        try {
            this.isVerifying = true;
            const walletAddress = this.wallet.publicKey.toString();
            this.updateStatus('Verifying token ownership...');

            const hasToken = await this.verifyTokenOwnership();
            
            if (!hasToken) {
                this.updateStatus('No BONES tokens found', true);
                this.showWalletError('$BONES token not found in wallet');
                this.showPaywall();
                return false;
            }

            this.updateStatus('Token verified ✓');
            this.showContent();
            return true;
        } catch (err) {
            console.error("Error checking token:", err);
            this.showWalletError('Failed to verify token. Please try again.');
            this.showPaywall();
            return false;
        } finally {
            this.isVerifying = false;
        }
    }

    async verifyTokenOwnership() {
        if (!this.connection || !this.wallet?.publicKey) {
            console.log('Missing connection or wallet for token verification');
            return false;
        }

        try {
            console.log('Verifying token ownership for address:', this.wallet.publicKey.toString());
            
            // Update wallet address display
            const walletAddressDisplay = document.getElementById('walletAddress');
            if (walletAddressDisplay) {
                walletAddressDisplay.textContent = this.wallet.publicKey.toString();
            }
            
            const response = await this.connection.getParsedTokenAccountsByOwner(
                this.wallet.publicKey,
                {
                    mint: this.tokenAddress
                }
            );

            console.log('Found token accounts:', response.value.length);

            for (const account of response.value) {
                const parsedInfo = account.account.data.parsed.info;
                const amount = Number(parsedInfo.tokenAmount.amount);
                const decimals = parsedInfo.tokenAmount.decimals;
                console.log('Token amount:', amount, 'decimals:', decimals);
                
                if (amount > 0) {
                    console.log('Found positive BONES token balance');
                    const formattedAmount = amount / Math.pow(10, decimals);
                    console.log('Formatted amount:', formattedAmount);
                    
                    // Update both balance displays
                    const panelBonesBalance = document.getElementById('panelBonesBalance');
                    const infoBonesBalance = document.getElementById('infoBonesBalance');
                    const formattedText = `${formattedAmount.toLocaleString()} $BONES`;
                    
                    if (panelBonesBalance) {
                        panelBonesBalance.textContent = formattedText;
                    }
                    if (infoBonesBalance) {
                        infoBonesBalance.textContent = formattedText;
                    }
                    return true;
                }
            }

            console.log('No BONES token balance found');
            // Update both balance displays to show zero
            const panelBonesBalance = document.getElementById('panelBonesBalance');
            const infoBonesBalance = document.getElementById('infoBonesBalance');
            if (panelBonesBalance) {
                panelBonesBalance.textContent = '0 $BONES';
            }
            if (infoBonesBalance) {
                infoBonesBalance.textContent = '0 $BONES';
            }
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

    updateUIForTokens() {
        // Hide connect toggle buttons and show wallet panel if tokens are found
        const connectButtons = document.querySelectorAll('.connect-toggle-button');
        const walletPanel = document.querySelector('.wallet-panel');
        const modalToggle = document.getElementById('modalToggle');
        
        if (this.hasTokens) {
            // Hide connect buttons and modal toggle
            connectButtons.forEach(button => button.style.display = 'none');
            if (modalToggle) modalToggle.style.display = 'none';
            
            // Show wallet panel
            if (walletPanel) {
                walletPanel.style.display = 'block';
                setTimeout(() => {
                    walletPanel.classList.add('slide-in');
                }, 10);
            }
            this.showContent();
        } else {
            // Show connect buttons
            connectButtons.forEach(button => button.style.display = 'block');
            if (modalToggle) modalToggle.style.display = 'block';
            
            // Hide wallet panel
            if (walletPanel) {
                walletPanel.classList.remove('slide-in');
                setTimeout(() => {
                    walletPanel.style.display = 'none';
                }, 300);
            }
        }
    }

    async handleAccountChanged() {
        console.log('Account changed');
        this.updateWalletAddress();
        this.verifyTokenOwnership();
    }

    handleConnect() {
        console.log('Wallet connected');
        this.wallet = window.solana;
        this.isConnected = true;
        localStorage.setItem('walletConnected', 'true');
        this.updateWalletAddress();
        this.verifyTokenOwnership();
    }

    handleDisconnect() {
        console.log('Wallet disconnected');
        this.wallet = null;
        this.isConnected = false;
        localStorage.removeItem('walletConnected');
        this.updateWalletAddress();
        this.showPaywall();
    }

    disconnectWallet() {
        if (window.solana) {
            window.solana.disconnect();
        }
        this.handleDisconnect();
    }

    updateWalletAddress() {
        const infoButton = document.querySelector('.wallet-info-button');
        const disconnectButton = document.querySelector('.disconnect-button');
        
        if (this.wallet?.publicKey) {
            if (infoButton) infoButton.style.display = 'block';
            if (disconnectButton) disconnectButton.style.display = 'block';
        } else {
            if (infoButton) infoButton.style.display = 'none';
            if (disconnectButton) disconnectButton.style.display = 'none';
        }
    }

    updateStatus(message, isError = false) {
        const statusEl = document.getElementById('walletStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = isError ? 'error-text' : 'status-text';
        }
    }

    showContent() {
        const mainContent = document.getElementById('mainContent');
        const walletModal = document.getElementById('walletModal');
        const footerWallet = document.getElementById('footerWallet');
        const walletPanel = document.getElementById('walletPanel');
        const paywall = document.getElementById('paywall');
        const modalToggles = document.querySelectorAll('.modal-toggle');
        
        // Remove blur and enable content
        if (mainContent) {
            mainContent.classList.remove('blur-content');
            mainContent.style.pointerEvents = 'auto';
            mainContent.style.userSelect = 'auto';
        }
        
        // Hide paywall and connect modal
        if (paywall) {
            paywall.style.display = 'none';
        }
        if (walletModal) {
            walletModal.style.display = 'none';
        }
        
        // Show wallet info
        if (footerWallet) {
            footerWallet.style.display = 'flex';
        }
        
        // Show wallet panel with animation
        if (walletPanel) {
            walletPanel.style.display = 'block';
            setTimeout(() => {
                walletPanel.classList.add('slide-in');
            }, 10);
        }

        // Hide toggle buttons
        modalToggles.forEach(toggle => {
            toggle.style.display = 'none';
        });
    }

    showPaywall() {
        console.log('Showing paywall...');
        const mainContent = document.getElementById('mainContent');
        const walletModal = document.getElementById('walletModal');
        const footerWallet = document.getElementById('footerWallet');
        const walletPanel = document.getElementById('walletPanel');
        const paywall = document.getElementById('paywall');
        const modalToggles = document.querySelectorAll('.modal-toggle');
        
        // Add blur and disable content
        if (mainContent) {
            mainContent.classList.add('blur-content');
            mainContent.style.pointerEvents = 'none';
            mainContent.style.userSelect = 'none';
        }
        
        // Show paywall and connect modal
        if (paywall) {
            paywall.style.display = 'flex';
        }
        if (walletModal) {
            walletModal.style.display = 'flex';
        }
        
        // Hide wallet info
        if (footerWallet) {
            footerWallet.style.display = 'none';
        }
        
        // Hide wallet panel with animation
        if (walletPanel) {
            walletPanel.classList.remove('slide-in');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                walletPanel.style.display = 'none';
            }, 500);
        }

        // Show toggle buttons
        modalToggles.forEach(toggle => {
            toggle.style.display = 'block';
        });
    }

    hideContent() {
        const mainContent = document.getElementById('mainContent');
        const walletModal = document.getElementById('walletModal');
        const footerWallet = document.getElementById('footerWallet');
        const walletPanel = document.getElementById('walletPanel');
        const paywall = document.getElementById('paywall');
        
        // Add blur and disable content
        if (mainContent) {
            mainContent.classList.add('blur-content');
            mainContent.style.pointerEvents = 'none';
            mainContent.style.userSelect = 'none';
        }
        
        // Show paywall and connect modal
        if (paywall) {
            paywall.style.display = 'flex';
        }
        if (walletModal) {
            walletModal.style.display = 'flex';
        }
        
        // Hide wallet info
        if (footerWallet) {
            footerWallet.style.display = 'none';
        }
        
        // Hide wallet panel with animation
        if (walletPanel) {
            walletPanel.classList.remove('slide-in');
            // Wait for animation to complete before hiding
            setTimeout(() => {
                walletPanel.style.display = 'none';
            }, 500);
        }
    }

    showWalletError(message, duration = 3000) {
        const errorEl = document.getElementById('walletError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
            setTimeout(() => {
                errorEl.style.display = 'none';
            }, duration);
        }
    }

    async updateWalletInfo() {
        const statusElement = document.getElementById('walletInfoStatus');
        const addressElement = document.getElementById('walletInfoAddress');
        const balanceElement = document.getElementById('walletInfoBalance');

        if (this.wallet?.publicKey) {
            statusElement.textContent = 'Connected';
            statusElement.style.color = '#4CAF50';
            addressElement.textContent = this.wallet.publicKey.toString();

            try {
                const balance = await this.getTokenBalance();
                balanceElement.textContent = balance !== null ? balance.toString() : '0';
            } catch (error) {
                console.error('Error fetching token balance:', error);
                balanceElement.textContent = 'Error';
            }
        } else {
            statusElement.textContent = 'Disconnected';
            statusElement.style.color = '#f44336';
            addressElement.textContent = 'Not Connected';
            balanceElement.textContent = '0';
        }
    }

    showWalletInfo() {
        const overlay = document.querySelector('.wallet-info-overlay');
        const modal = document.querySelector('.wallet-info-modal');
        
        this.updateWalletInfo();
        
        overlay.classList.add('active');
        modal.classList.add('active');
        
        // Add POW! effect
        const pow = document.createElement('div');
        pow.className = 'pow-text';
        pow.textContent = 'POW!';
        pow.style.left = Math.random() * (window.innerWidth - 100) + 'px';
        pow.style.top = Math.random() * (window.innerHeight - 100) + 'px';
        document.body.appendChild(pow);
        
        setTimeout(() => {
            pow.remove();
        }, 500);
    }

    hideWalletInfo() {
        const overlay = document.querySelector('.wallet-info-overlay');
        const modal = document.querySelector('.wallet-info-modal');
        
        overlay.classList.remove('active');
        modal.classList.remove('active');
        
        // Add ZOOM! effect
        const zoom = document.createElement('div');
        zoom.className = 'pow-text';
        zoom.textContent = 'ZOOM!';
        zoom.style.left = Math.random() * (window.innerWidth - 100) + 'px';
        zoom.style.top = Math.random() * (window.innerHeight - 100) + 'px';
        document.body.appendChild(zoom);
        
        setTimeout(() => {
            zoom.remove();
        }, 500);
    }
}

// Initialize wallet manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
});
