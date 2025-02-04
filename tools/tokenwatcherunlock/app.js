// Configuration
const config = {
    tokenAddress: '8Rym1XJMJuc3mkUUHtW9894DFo5GF9bZ8pdBEWS7moon',
    dexscreenerApiUrl: 'https://api.dexscreener.com/latest/dex/tokens',
    updateInterval: 10000, // 10 seconds
    milestones: [
        { threshold: 6000, id: 'section-6000' },
        { threshold: 6500, id: 'section-6500' },
        { threshold: 7000, id: 'section-7000' },
        { threshold: 8000, id: 'section-8000' },
        { threshold: 10000, id: 'section-10000' },
        { threshold: 15000, id: 'section-15000' },
        { threshold: 25000, id: 'section-25000' },
        { threshold: 50000, id: 'section-50000' },
        { threshold: 100000, id: 'section-100000' },
        { threshold: 250000, id: 'section-250000' },
        { threshold: 500000, id: 'section-500000' },
        { threshold: 1000000, id: 'section-1000000' },
        { threshold: 1500000, id: 'section-1500000' },
        { threshold: 2500000, id: 'section-2500000' },
        { threshold: 5000000, id: 'section-5000000' },
        { threshold: 10000000, id: 'section-10000000' },
        { threshold: 100000000, id: 'section-100000000' }
    ]
};

// State management
let currentMarketCap = 0;
let isDevMode = false;
let overrideMarketCap = null;

// DOM Elements
const devButton = document.getElementById('dev-button');
const devModal = document.getElementById('dev-modal');
const overrideInput = document.getElementById('override-market-cap');
const applyOverrideBtn = document.getElementById('apply-override');
const resetOverrideBtn = document.getElementById('reset-override');
const closeModalBtn = document.getElementById('close-modal');
const marketCapValue = document.getElementById('market-cap-value');
const priceValue = document.getElementById('price-value');
const volumeValue = document.getElementById('volume-value');
const sections = document.querySelectorAll('.section');

// Format currency with appropriate precision
function formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '$0.00';
    }

    // For very small numbers (less than 0.01)
    if (value < 0.01) {
        // Use scientific notation for extremely small numbers
        if (value < 0.000001) {
            return `$${value.toExponential(6)}`;
        }
        // Show more decimal places for small numbers
        return `$${value.toFixed(9)}`;
    }
    
    // For regular numbers
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    } else {
        return `$${value.toFixed(2)}`;
    }
}

// Fetch market data from Dexscreener
async function fetchMarketData() {
    try {
        console.log('Fetching market data...');
        const response = await fetch(`${config.dexscreenerApiUrl}/${config.tokenAddress}`);
        const data = await response.json();
        
        console.log('Received data:', data);
        
        if (data && data.pairs && data.pairs.length > 0) {
            // Get the pair with the highest liquidity
            const pair = data.pairs.reduce((max, current) => {
                const currentLiquidity = parseFloat(current.liquidity?.usd || 0);
                const maxLiquidity = parseFloat(max.liquidity?.usd || 0);
                return currentLiquidity > maxLiquidity ? current : max;
            }, data.pairs[0]);

            if (pair && pair.priceUsd) {
                const marketCap = parseFloat(pair.fdv || '0');
                const price = parseFloat(pair.priceUsd || '0');
                const volume = parseFloat(pair.volume?.h24 || '0');

                // Log the parsed values
                console.log('Parsed values:', {
                    price: price,
                    marketCap: marketCap,
                    volume: volume,
                    pairAddress: pair.pairAddress
                });

                if (isNaN(price)) {
                    console.error('Invalid price value:', pair.priceUsd);
                    return null;
                }

                // Update all values with proper formatting
                priceValue.textContent = formatCurrency(price);
                volumeValue.textContent = formatCurrency(volume);
                
                return marketCap;
            } else {
                console.error('No valid price data in pair:', pair);
                return null;
            }
        }
        console.error('Invalid data format from Dexscreener:', data);
        return null;
    } catch (error) {
        console.error('Error fetching market data:', error);
        return null;
    }
}

// Update dashboard sections based on market cap
function updateDashboard(marketCap) {
    const effectiveMarketCap = overrideMarketCap !== null ? overrideMarketCap : marketCap;
    
    marketCapValue.textContent = formatCurrency(effectiveMarketCap);
    
    config.milestones.forEach((milestone) => {
        const section = document.getElementById(milestone.id);
        if (effectiveMarketCap >= milestone.threshold) {
            section.classList.add('visible');
        } else {
            section.classList.remove('visible');
        }
    });
}

// Function to get the correct image URL based on milestone
function getMilestoneImageUrl(milestone) {
    const baseUrl = 'https://acatnamedmanwhore.com';
    
    // Define which milestones use PNG vs GIF
    const pngMilestones = [6000, 6500, 7000, 8000, 10000, 15000];
    const usesPng = pngMilestones.includes(milestone);
    
    const extension = usesPng ? 'png' : 'gif';
    return `${baseUrl}/tools/tokenwatcherunlock/MCMU/${milestone}/thumbnail.${extension}`;
}

// Generate share message
function generateShareMessage(milestone) {
    const currentPrice = document.getElementById('price-value').textContent;
    const marketCap = document.getElementById('market-cap-value').textContent;
    
    return {
        text: `🎉 Achievement Unlocked: $${milestone.toLocaleString()} Market Cap! 🚀\n` +
              `$BONES has reached ${marketCap}!\n` +
              `Current Price: ${currentPrice}\n` +
              `#BONES #Solana #SolanaNFT #memecoin`,
        image: getMilestoneImageUrl(milestone)
    };
}

// Share to Twitter
function shareToTwitter(milestone) {
    const shareData = generateShareMessage(milestone);
    
    // First open Twitter compose window
    const tweetText = `${shareData.text}\n\nℹ️ Save and attach the achievement image to make your tweet more engaging!`;
    const twitterWindow = window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, '_blank');
    
    // Then open image in new tab after a short delay
    setTimeout(() => {
        window.open(shareData.image, '_blank');
    }, 1000);
    
    // Make sure Twitter window gets focus
    if (twitterWindow) {
        twitterWindow.focus();
    }
}

// Share to Telegram
function shareToTelegram(milestone) {
    const shareData = generateShareMessage(milestone);
    // Format: message first, then image URL on new line
    const message = `${shareData.text}\n\n${shareData.image}`;
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/TwentyFiveBones')}&text=${encodeURIComponent(message)}`;
    window.open(telegramUrl, '_blank');
}

// Show toast notification
function showToast(title, message, previewContent) {
    const toastContainer = document.querySelector('.toast-container');
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-check-circle"></i>
            <div class="toast-title">${title}</div>
        </div>
        <div>${message}</div>
        <div class="toast-preview">${previewContent}</div>
    `;
    
    // Add toast to container
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove toast after 10 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toastContainer.removeChild(toast), 300);
    }, 10000);
}

// Copy to clipboard
function copyToClipboard(milestone) {
    const shareData = generateShareMessage(milestone);
    const message = `${shareData.text}\n\n${shareData.image}`;
    
    navigator.clipboard.writeText(message).then(() => {
        // Show toast with preview
        const previewContent = message.replace(/\n/g, '<br>');
        showToast(
            'Achievement Copied!', 
            'Your achievement has been copied to clipboard. You can now paste it anywhere!',
            previewContent
        );
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast(
            'Error', 
            'Could not copy achievement. Please try again.',
            ''
        );
    });
}

// Main update loop
async function updateLoop() {
    try {
        console.log('Update loop running...');
        if (!overrideMarketCap) {
            const marketCap = await fetchMarketData();
            if (marketCap !== null) {
                currentMarketCap = marketCap;
                updateDashboard(marketCap);
            } else {
                console.warn('Failed to fetch market cap, keeping previous value:', currentMarketCap);
            }
        }
    } catch (error) {
        console.error('Error in update loop:', error);
    }
}

// Developer modal controls
devButton.addEventListener('click', () => {
    devModal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
    devModal.style.display = 'none';
});

applyOverrideBtn.addEventListener('click', () => {
    const value = parseFloat(overrideInput.value);
    if (!isNaN(value) && value >= 0) {
        overrideMarketCap = value;
        updateDashboard(value);
    }
});

resetOverrideBtn.addEventListener('click', () => {
    overrideMarketCap = null;
    overrideInput.value = '';
    updateDashboard(currentMarketCap);
});

// Initialize and start updates
setInterval(updateLoop, config.updateInterval);
updateLoop(); // Initial update
