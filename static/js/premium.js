/**
 * Módulo de características premium para VideoFlix
 * Añade funcionalidades avanzadas a la aplicación
 */

/**
 * Inicializa todas las características premium
 */
function initPremiumFeatures() {
    setupCinemaMode();
    setupCategoryFilters();
    setupSearchFilter();
    setupTooltips();
    setupKeyboardShortcuts();
    setupSkeletonLoaders();
    setupThumbnailHover();
    updateStorageStatsUI();
}

/**
 * Configura el modo cine para una experiencia inmersiva
 */
function setupCinemaMode() {
    // Añadir botón de modo cine
    const playerSection = document.querySelector('.player-section');
    if (!playerSection) return;

    const cinemaButton = document.createElement('button');
    cinemaButton.className = 'cinema-toggle';
    cinemaButton.innerHTML = '<i class="fas fa-expand"></i>';
    cinemaButton.setAttribute('data-tooltip', 'Modo cine');
    playerSection.appendChild(cinemaButton);

    // Evento de clic para alternar modo cine
    cinemaButton.addEventListener('click', () => {
        document.body.classList.toggle('cinema-mode');
        
        if (document.body.classList.contains('cinema-mode')) {
            cinemaButton.innerHTML = '<i class="fas fa-compress"></i>';
            cinemaButton.setAttribute('data-tooltip', 'Salir del modo cine');
            showNotification('Modo cine activado', 'info');
        } else {
            cinemaButton.innerHTML = '<i class="fas fa-expand"></i>';
            cinemaButton.setAttribute('data-tooltip', 'Modo cine');
            showNotification('Modo cine desactivado', 'info');
        }
    });
}

/**
 * Configura filtros por categorías
 */
function setupCategoryFilters() {
    // Obtener todos los nombres de archivos
    const videoItems = document.querySelectorAll('.video-item');
    const categories = new Set();
    
    // Extraer posibles categorías de los nombres de archivos
    videoItems.forEach(item => {
        const name = item.getAttribute('data-name');
        if (name) {
            // Intentar extraer categoría del nombre: [Categoría] Nombre o Categoría - Nombre
            let category = 'Sin categoría';
            
            if (name.includes('[') && name.includes(']')) {
                const match = name.match(/\[(.*?)\]/);
                if (match && match[1]) category = match[1];
            } else if (name.includes(' - ')) {
                category = name.split(' - ')[0];
            } else if (name.includes('_')) {
                category = name.split('_')[0];
            }
            
            categories.add(category);
            item.setAttribute('data-category', category);
        }
    });
    
    // Crear filtros si hay categorías
    if (categories.size > 1) {
        const sidebarHeader = document.querySelector('.sidebar-header');
        if (!sidebarHeader) return;
        
        const categoriesContainer = document.createElement('div');
        categoriesContainer.className = 'categories';
        
        // Añadir categoría "Todos"
        const allCategory = document.createElement('div');
        allCategory.className = 'category active';
        allCategory.textContent = 'Todos';
        allCategory.setAttribute('data-category', 'all');
        categoriesContainer.appendChild(allCategory);
        
        // Añadir otras categorías
        categories.forEach(cat => {
            const categoryEl = document.createElement('div');
            categoryEl.className = 'category';
            categoryEl.textContent = cat;
            categoryEl.setAttribute('data-category', cat);
            categoriesContainer.appendChild(categoryEl);
        });
        
        // Insertar después del encabezado
        sidebarHeader.insertAdjacentElement('afterend', categoriesContainer);
        
        // Eventos de clic para filtrado
        document.querySelectorAll('.category').forEach(cat => {
            cat.addEventListener('click', function() {
                // Quitar clase activa de todas las categorías
                document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
                
                // Activar categoría actual
                this.classList.add('active');
                
                const selectedCategory = this.getAttribute('data-category');
                
                // Filtrar videos
                videoItems.forEach(item => {
                    if (selectedCategory === 'all' || item.getAttribute('data-category') === selectedCategory) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
}

/**
 * Configura la búsqueda de videos
 */
function setupSearchFilter() {
    // Añadir barra de búsqueda
    const headerContent = document.querySelector('.header-content');
    if (!headerContent) return;
    
    const searchBar = document.createElement('div');
    searchBar.className = 'search-bar';
    searchBar.innerHTML = `
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Buscar videos..." id="search-input">
    `;
    
    // Insertar después del logo
    const logo = headerContent.querySelector('.logo');
    if (logo) {
        logo.insertAdjacentElement('afterend', searchBar);
    } else {
        headerContent.appendChild(searchBar);
    }
    
    // Evento de entrada para búsqueda
    const searchInput = document.getElementById('search-input');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const videoItems = document.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            const videoNameElement = item.querySelector('.video-name');
            if (videoNameElement) {
                const videoName = videoNameElement.textContent.toLowerCase();
                if (videoName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            }
        });
    });
    
    // Atajos de teclado para la búsqueda
    document.addEventListener('keydown', (e) => {
        if (!searchInput) return;
        
        // Ctrl/Cmd + F o solo / para búsqueda
        if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape para cancelar búsqueda
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    });
}

/**
 * Configura los tooltips para mejor experiencia de usuario
 */
function setupTooltips() {
    // Añadir tooltips a los elementos de la interfaz
    const tooltips = [
        { selector: '.download-all-btn', text: 'Descargar todos los videos para ver sin conexión' },
        { selector: '.offline-badge', text: 'Disponible sin conexión' },
        { selector: '.connection-status', text: 'Estado de la conexión' },
        { selector: '.user-avatar', text: 'Tu perfil' },
        { selector: '.logout-btn', text: 'Cerrar sesión' }
    ];
    
    tooltips.forEach(tip => {
        const elements = document.querySelectorAll(tip.selector);
        elements.forEach(el => {
            el.setAttribute('data-tooltip', tip.text);
        });
    });
}

/**
 * Configura atajos de teclado
 */
function setupKeyboardShortcuts() {
    const shortcuts = [
        { key: 'F', action: 'Búsqueda' },
        { key: 'C', action: 'Modo cine' },
        { key: 'Space', action: 'Reproducir/Pausar' },
        { key: '→', action: 'Avanzar 10s' },
        { key: '←', action: 'Retroceder 10s' },
        { key: 'M', action: 'Silenciar' }
    ];
    
    // Manejar atajos de teclado
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return; // Ignorar en campos de entrada

        const videoPlayer = document.getElementById('video-player');
        const cinemaToggle = document.querySelector('.cinema-toggle');

        switch (e.key.toLowerCase()) {
            case ' ':
                // Reproducir/Pausar
                e.preventDefault();
                if (videoPlayer && videoPlayer.paused) {
                    videoPlayer.play();
                } else if (videoPlayer) {
                    videoPlayer.pause();
                }
                break;
            case 'c':
                // Modo cine
                e.preventDefault();
                if (cinemaToggle) cinemaToggle.click();
                break;
            case 'arrowright':
                // Avanzar 10s
                e.preventDefault();
                if (videoPlayer && videoPlayer.currentTime) videoPlayer.currentTime += 10;
                break;
            case 'arrowleft':
                // Retroceder 10s
                e.preventDefault();
                if (videoPlayer && videoPlayer.currentTime) videoPlayer.currentTime -= 10;
                break;
            case 'm':
                // Silenciar
                e.preventDefault();
                if (videoPlayer) videoPlayer.muted = !videoPlayer.muted;
                break;
        }
    });
    
    // Mostrar guía de atajos al presionar "?"
    document.addEventListener('keydown', (e) => {
        if (e.key === '?') {
            e.preventDefault();
            let shortcutsHtml = '<div style="text-align:left;"><h3>Atajos de teclado</h3><ul style="padding-left:20px;">';
            shortcuts.forEach(sc => {
                shortcutsHtml += `<li><strong>${sc.key}</strong>: ${sc.action}</li>`;
            });
            shortcutsHtml += '</ul></div>';
            
            if (typeof showNotification === 'function') {
                showNotification(shortcutsHtml, 'info', 10000); // Mostrar por 10 segundos
            } else {
                console.log('Atajos de teclado:', shortcuts);
            }
        }
    });
}

/**
 * Configura skeleton loaders para las miniaturas
 */
function setupSkeletonLoaders() {
    // Aplicar efecto skeleton a las miniaturas mientras cargan
    const thumbnailContainers = document.querySelectorAll('.video-thumbnail');
    
    thumbnailContainers.forEach(container => {
        // Añadir clase skeleton
        container.classList.add('thumbnail-skeleton');
        
        // Eliminar clase cuando la miniatura esté cargada
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length) {
                    // AQUÍ ESTÁ LA CORRECCIÓN: Verificamos que node sea un elemento antes de usar querySelector
                    const svgAdded = Array.from(mutation.addedNodes).some(node => 
                        node.nodeName === 'svg' || (node.nodeType === 1 && node.querySelector && node.querySelector('svg'))
                    );
                    
                    if (svgAdded) {
                        setTimeout(() => {
                            container.classList.remove('thumbnail-skeleton');
                        }, 300); // Pequeño retardo para suavizar la transición
                    }
                }
            });
        });
        
        observer.observe(container, { childList: true, subtree: true });
    });
}

/**
 * Configura efectos hover para miniaturas
 */
function setupThumbnailHover() {
    const videoItems = document.querySelectorAll('.video-item');
    
    videoItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            // Añadir efecto de escala a la miniatura SVG
            const svg = item.querySelector('svg');
            if (svg) {
                svg.style.transform = 'scale(1.1)';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            // Restaurar escala normal
            const svg = item.querySelector('svg');
            if (svg) {
                svg.style.transform = 'scale(1)';
            }
        });
    });
}

/**
 * Actualiza la interfaz de estadísticas de almacenamiento
 */
async function updateStorageStatsUI() {
    try {
        if (!navigator.storage || !navigator.storage.estimate) {
            console.log('API Storage no soportada en este navegador');
            return;
        }
        
        const estimate = await navigator.storage.estimate();
        const usedSpace = estimate.usage || 0;
        const totalSpace = estimate.quota || 0;
        const percentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
        
        const usedGB = (usedSpace / (1024 * 1024 * 1024)).toFixed(2);
        const totalGB = (totalSpace / (1024 * 1024 * 1024)).toFixed(2);
        
        // Obtener o crear el contenedor de estadísticas
        let storageInfo = document.querySelector('.storage-info');
        
        if (!storageInfo) {
            storageInfo = document.createElement('div');
            storageInfo.className = 'storage-info';
            
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.appendChild(storageInfo);
            }
        }
        
        // Color dinámico basado en el porcentaje usado
        let statusColor = '#4CAF50'; // Verde
        if (percentage > 70) statusColor = '#FFC107'; // Amarillo
        if (percentage > 90) statusColor = '#F44336'; // Rojo
        
        // Actualizar contenido
        storageInfo.innerHTML = `
            <div class="storage-text">
                <span>Almacenamiento</span>
                <span>${percentage.toFixed(1)}% usado</span>
            </div>
            <div class="storage-bar">
                <div class="storage-used" style="width: ${percentage}%;"></div>
            </div>
            <div class="storage-text">
                <span>${usedGB} GB usados</span>
                <span>${totalGB} GB disponibles</span>
            </div>
        `;
    } catch (error) {
        console.error('Error al actualizar estadísticas de almacenamiento:', error);
    }
}

// Inicializar características premium cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initPremiumFeatures);