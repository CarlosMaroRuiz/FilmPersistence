/**
 * Módulo de interfaz de usuario para la aplicación VideoFlix
 * Maneja elementos visuales, notificaciones, y eventos de UI
 */

// Referencias a elementos DOM
const videoPlayer = document.getElementById('video-player');
const connectionStatus = document.getElementById('connection-status');
const statusText = connectionStatus.querySelector('.status-text');
const loadingOverlay = document.getElementById('loading-overlay');
const currentVideoTitle = document.getElementById('current-video-title');

// Mostrar loading
function showLoading() {
    loadingOverlay.classList.add('active');
}

// Ocultar loading
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    const messageContainer = document.querySelector('.message-container');
    
    const notification = document.createElement('div');
    notification.className = `message ${type}`;
    
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    notification.innerHTML = `<i class="fas fa-${icon}"></i>${message}`;
    
    messageContainer.appendChild(notification);
    
    // Eliminar después de 5 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Verificar conexión a internet
function updateOnlineStatus() {
    if (navigator.onLine) {
        connectionStatus.className = 'connection-status online';
        statusText.textContent = 'En línea';
    } else {
        connectionStatus.className = 'connection-status offline';
        statusText.textContent = 'Fuera de línea (reproduciendo desde almacenamiento local)';
    }
    updateOfflineIndicators();
}

// Ocultar mensajes flash después de 5 segundos
function setupFlashMessages() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.remove();
            }, 300);
        }, 5000);
    });
}

// Actualizar indicadores visuales de videos disponibles offline
async function updateOfflineIndicators() {
    // Ahora utilizamos el generador de miniaturas para actualizar todos los thumbnails
    // y también los indicadores de disponibilidad offline
    await updateVideoThumbnails();
}

// Agregar botón para descargar todos los videos
function addDownloadAllButton() {
    // El botón ya está incluido en el HTML del nuevo layout
    const downloadButton = document.querySelector('.download-all-btn');
    if (downloadButton) {
        downloadButton.addEventListener('click', storeAllVideos);
    }
}

// Configurar eventos para las tarjetas de video
function setupVideoCardEvents() {
    const videoItems = document.querySelectorAll('.video-item');
    
    videoItems.forEach(item => {
        const videoUrl = item.getAttribute('data-src');
        const videoName = item.getAttribute('data-name');
        
        // Evento para reproducir al hacer clic
        item.addEventListener('click', function() {
            // Añadir clase 'active' al elemento seleccionado
            document.querySelectorAll('.video-item').forEach(el => {
                el.classList.remove('active');
            });
            this.classList.add('active');
            
            // Reproducir el video
            playVideo(videoUrl, videoName);
        });
        
        // Agregar menú contextual a cada tarjeta
        item.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            showVideoContextMenu(e, item, videoUrl, videoName);
        });
    });
}

// Mostrar menú contextual para opciones de video (para layout vertical)
function showVideoContextMenu(event, item, videoUrl, videoName) {
    // Eliminar cualquier menú existente
    const existingMenu = document.querySelector('.video-context-menu');
    if (existingMenu) existingMenu.remove();
    
    // Crear nuevo menú
    const menu = document.createElement('div');
    menu.className = 'video-context-menu';
    
    // Posicionar menú - ajustado para la lista vertical
    const rect = item.getBoundingClientRect();
    menu.style.left = `${rect.right + 5}px`;
    menu.style.top = `${rect.top}px`;
    
    // Función para cerrar el menú
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', handleOutsideClick);
    };
    
    // Cerrar menú al hacer clic fuera
    const handleOutsideClick = (e) => {
        if (!menu.contains(e.target)) {
            closeMenu();
        }
    };
    
    // Opciones del menú
    menu.innerHTML = `
        <div class="menu-item play-option">
            <i class="fas fa-play"></i> Reproducir
        </div>
        <div class="separator"></div>
        <div class="menu-item download-option">
            <i class="fas fa-download"></i> Descargar para uso offline
        </div>
        <div class="menu-item delete-option">
            <i class="fas fa-trash"></i> Eliminar del almacenamiento local
        </div>
    `;
    
    // Agregar eventos
    menu.querySelector('.play-option').addEventListener('click', () => {
        closeMenu();
        // Marcar como activo
        document.querySelectorAll('.video-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');
        playVideo(videoUrl, videoName);
    });
    
    menu.querySelector('.download-option').addEventListener('click', async () => {
        closeMenu();
        
        if (!navigator.onLine) {
            showNotification('No se puede descargar sin conexión', 'error');
            return;
        }
        
        const exists = await videoExistsInIndexedDB(videoUrl);
        if (exists) {
            showNotification(`"${videoName}" ya está disponible offline`, 'info');
        } else {
            await loadAndStoreVideo(videoUrl, videoName);
        }
    });
    
    menu.querySelector('.delete-option').addEventListener('click', async () => {
        closeMenu();
        
        try {
            const exists = await videoExistsInIndexedDB(videoUrl);
            if (!exists) {
                showNotification(`"${videoName}" no está almacenado localmente`, 'info');
                return;
            }
            
            await deleteVideoFromIndexedDB(videoUrl);
            showNotification(`"${videoName}" eliminado del almacenamiento local`, 'success');
            updateOfflineIndicators();
            
        } catch (error) {
            console.error('Error al eliminar video:', error);
            showNotification(`Error: ${error.message}`, 'error');
        }
    });
    
    // Agregar menú al DOM
    document.body.appendChild(menu);
    
    // Ajustar posición si está fuera de los límites
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        menu.style.left = `${rect.left - menuRect.width - 5}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = `${rect.bottom - menuRect.height}px`;
    }
    
    // Agregar evento para cerrar al hacer clic fuera
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 0);
}

// Agregar indicador de uso de almacenamiento
async function addStorageIndicator() {
    try {
        const estimate = await navigator.storage.estimate();
        const usedSpace = estimate.usage || 0;
        const totalSpace = estimate.quota || 0;
        const percentage = totalSpace > 0 ? (usedSpace / totalSpace) * 100 : 0;
        
        const usedMB = (usedSpace / (1024 * 1024)).toFixed(1);
        const totalMB = (totalSpace / (1024 * 1024)).toFixed(1);
        
        // Crear elemento para mostrar información de almacenamiento
        const storageInfo = document.createElement('div');
        storageInfo.className = 'storage-info';
        storageInfo.innerHTML = `
            <div class="storage-text">Almacenamiento:</div>
            <div class="storage-bar">
                <div class="storage-used" style="width: ${percentage}%;"></div>
            </div>
            <div class="storage-text">${usedMB} MB / ${totalMB} MB</div>
        `;
        
        // Buscar el lugar adecuado para colocar el indicador
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            // Agregar al final de la barra lateral en el nuevo layout
            sidebar.appendChild(storageInfo);
        } else {
            // Fallback para el layout antiguo
            const container = document.querySelector('.connection-status');
            if (container) {
                const parent = container.parentNode;
                parent.insertBefore(storageInfo, container.nextSibling);
            }
        }
    } catch (error) {
        console.error('Error al obtener información de almacenamiento:', error);
    }
}

// Agregar estilos adicionales para elementos seleccionados
function addAdditionalStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .video-item.active {
            border: 2px solid var(--netflix-red);
            background-color: rgba(229, 9, 20, 0.2);
        }
        
        .video-context-menu {
            z-index: 1001;
        }
    `;
    document.head.appendChild(style);
}

// Inicializar componentes de UI
function initUI() {
    addAdditionalStyles();
    setupFlashMessages();
}

// Ejecutar al inicio
document.addEventListener('DOMContentLoaded', initUI);