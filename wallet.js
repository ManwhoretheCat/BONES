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
            // Use Quicknode RPC endpoint with better reliability
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

            // Show paywall initially
            this.showPaywall();
            
            // Check if wallet was previously connected
            await this.checkStoredWallet();
        } catch (err) {
            console.error('Initialization error:', err);
            this.showWalletError('Failed to initialize wallet connection');
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
                    await this.checkAccess();
                }
            } catch (err) {
                console.log('Silent connect failed:', err);
                localStorage.removeItem('walletConnected');
                this.handleDisconnect();
            }
        }
    }

    updateStatus(message, isError = false) {
        const statusEl = document.getElementById('walletStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = isError ? 'error-text' : 'status-text';
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
            document.getElementById('connectButton').disabled = true;

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
            document.getElementById('connectButton').disabled = false;
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
                    return true;
                }
            }

            console.log('No BONES token balance found');
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

    async handleAccountChanged() {
        this.updateStatus('Wallet account changed, reverifying...');
        await this.checkAccess();
    }

    handleConnect() {
        this.isConnected = true;
        this.connectionRetries = 0;
        this.updateStatus('Connected, checking token...');
        this.updateWalletAddress();
        this.checkAccess();
    }

    handleDisconnect() {
        this.isConnected = false;
        this.wallet = null;
        this.connectionRetries = 0;
        localStorage.removeItem('walletConnected');
        this.updateStatus('Disconnected');
        document.getElementById('connectButton').textContent = 'Connect Wallet';
        document.getElementById('connectButton').disabled = false;
        this.showPaywall();
    }

    disconnectWallet() {
        if (window.solana) {
            window.solana.disconnect();
        }
        this.handleDisconnect();
    }

    updateWalletAddress() {
        if (this.wallet?.publicKey) {
            const address = this.wallet.publicKey.toString();
            const shortAddress = address.slice(0, 4) + '...' + address.slice(-4);
            document.getElementById('walletAddress').textContent = shortAddress;
        } else {
            document.getElementById('walletAddress').textContent = '';
        }
    }

    showContent() {
        document.getElementById('walletModal').style.display = 'none';
        document.getElementById('mainContent').classList.remove('blur-content');
        document.getElementById('footerWallet').style.display = 'block';
        this.updateWalletAddress();
    }

    showPaywall() {
        document.getElementById('walletModal').style.display = 'flex';
        document.getElementById('mainContent').classList.add('blur-content');
        document.getElementById('footerWallet').style.display = 'none';
    }

    showWalletError(message, duration = 3000) {
        const errorDiv = document.getElementById('walletError');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, duration);
    }
}

// Initialize wallet manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.walletManager = new WalletManager();
});
