document.addEventListener('DOMContentLoaded', function() {
  // Add click handlers to all division titles
  const divisionTitles = document.querySelectorAll('.division-title');
  
  divisionTitles.forEach(title => {
    title.addEventListener('click', (e) => {
      const effect = document.createElement('div');
      effect.className = 'comic-effect';
      effect.style.position = 'absolute';
      effect.style.left = `${e.clientX - 20}px`;
      effect.style.top = `${e.clientY - 20}px`;
      effect.style.fontSize = '24px';
      effect.style.fontWeight = 'bold';
      effect.style.color = '#ff4757';
      effect.style.textShadow = '2px 2px 0 #2f3542';
      effect.style.pointerEvents = 'none';
      effect.style.zIndex = '1000';
      effect.textContent = 'BANG!';
      document.body.appendChild(effect);
      
      effect.animate([
        { transform: 'scale(0.5)', opacity: 1 },
        { transform: 'scale(1.5)', opacity: 0 }
      ], {
        duration: 500,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
      }).onfinish = () => effect.remove();
      
      // Original division toggle logic
      const division = title.parentElement;
      const arrow = title.querySelector('span');
      division.classList.toggle('active');
      arrow.textContent = division.classList.contains('active') ? '▼' : '▶';
    });
  });

  // Create popup menu
  const popupMenu = document.createElement('div');
  popupMenu.className = 'popup-menu';
  document.body.appendChild(popupMenu);

  // Split identifiers into clickable spans
  const identifiers = document.querySelectorAll('.structure .identifier');
  identifiers.forEach(identifier => {
    const text = identifier.textContent;
    const parts = text.split('-');
    identifier.innerHTML = parts.map((part, index) => {
      return `<span data-part="${index}">${part}${index < parts.length - 1 ? '-' : ''}</span>`;
    }).join('');
  });

  // Add click handlers to identifier parts
  document.querySelectorAll('.structure .identifier span').forEach(span => {
    span.addEventListener('click', (e) => {
      const part = span.textContent.replace('-', '');
      
      // Remove all highlights
      document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
      
      // Find and highlight matching references
      document.querySelectorAll('.identifiers .identifier').forEach(ref => {
        if (ref.textContent.includes(part)) {
          ref.classList.add('highlight');
          
          // Find and expand the parent division
          const parentDivision = ref.closest('.division');
          if (parentDivision) {
            // Collapse all divisions first
            document.querySelectorAll('.identifiers .division').forEach(div => {
              div.classList.remove('active');
              div.querySelector('.division-title span').textContent = '▶';
            });
            
            // Expand this division
            parentDivision.classList.add('active');
            parentDivision.querySelector('.division-title span').textContent = '▼';
          }
        }
      });

      // Show popup menu for number parts or ###
      if (/^\d+$/.test(part) || part === '###') {
        const rect = span.getBoundingClientRect();
        const menuData = part === '001' ? {
          title: 'LAST $25 BONES',
          image: 'https://acatnamedmanwhore.com/25bonesMoonshotBanner.png',
          description: 'Meet BONES - The Audacious Undaunted Skeletal Maverick',
          links: [
            { text: 'DEX', url: 'https://dexscreener.com/solana/8rym1xjmjuc3mkuuhtw9894dfo5gf9bz8pdbews7moon' },
            { text: 'SITE', url: 'https://acatnamedmanwhore.com/' }
          ]
        } : generatePlaceholderData(part);
        
        showPopupMenu(rect, menuData);
      } else {
        hidePopupMenu();
      }

      e.stopPropagation();
    });
  });

  // Hide popup when clicking outside
  document.addEventListener('click', () => {
    hidePopupMenu();
  });

  function generatePlaceholderData(identifier) {
    const randomId = Math.floor(Math.random() * 1000);
    return {
      title: `Project ${identifier}`,
      image: `https://placeholder.pics/${randomId}/500x200`,
      description: `Future project details for identifier ${identifier}`,
      links: [
        { text: 'PREVIEW', url: `https://preview.project${randomId}.com` },
        { text: 'INFO', url: `https://info.project${randomId}.com` }
      ]
    };
  }

  function showPopupMenu(rect, data) {
    popupMenu.innerHTML = `
      <div class="title">${data.title}</div>
      ${data.image ? `<img src="${data.image}" alt="${data.title}">` : ''}
      <div class="description">${data.description}</div>
      ${data.links.length ? `
        <div class="links">
          ${data.links.map(link => `
            <a href="${link.url}" target="_blank">${link.text}</a>
          `).join('')}
        </div>
      ` : ''}
    `;
    
    popupMenu.style.display = 'block';
    
    // Position the popup
    const top = rect.bottom + window.scrollY + 5;
    const left = rect.left + window.scrollX;
    
    popupMenu.style.top = `${top}px`;
    popupMenu.style.left = `${left}px`;
  }

  function hidePopupMenu() {
    popupMenu.style.display = 'none';
  }

  // Add menu button functionality
  const menuButton = document.createElement('div');
  menuButton.className = 'menu-button';
  menuButton.innerHTML = `
    <div class="comic-burst">POW!</div>
  `;
  document.body.appendChild(menuButton);

  const floatingMenu = document.createElement('div');
  floatingMenu.className = 'floating-menu';
  floatingMenu.innerHTML = `
    <a href="https://acatnamedmanwhore.com/">
      Secret Lair
    </a>
    <a href="https://dexscreener.com/solana/8rym1xjmjuc3mkuuhtw9894dfo5gf9bz8pdbews7moon">
      Power Stats
    </a>
  `;
  document.body.appendChild(floatingMenu);

  menuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    menuButton.classList.toggle('active');
    floatingMenu.classList.toggle('active');
    
    const burstText = menuButton.querySelector('.comic-burst');
    if (menuButton.classList.contains('active')) {
      burstText.textContent = 'BAM!';
      burstText.style.transform = 'rotate(180deg)';
    } else {
      burstText.textContent = 'POW!';
      burstText.style.transform = 'rotate(0deg)';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuButton.contains(e.target) && !floatingMenu.contains(e.target)) {
      menuButton.classList.remove('active');
      floatingMenu.classList.remove('active');
    }
  });
});