/**
 * Archivo principal de la aplicación VideoFlix
 * Inicializa y coordina todos los componentes
 */

// Inicializar la aplicación
async function init() {
    try {
        // Configurar manejadores de eventos para mensajes flash
        setupFlashMessages();
        
        // Inicializar IndexedDB
        await initDatabase();
        
        // Agregar botón para descargar todos
        addDownloadAllButton();
        
        // Agregar indicador de almacenamiento
        await addStorageIndicator();
        
        // Generar miniaturas personalizadas e indicadores de disponibilidad offline
        await updateVideoThumbnails();
        
        // Configurar eventos para las tarjetas de video
        setupVideoCardEvents();
        
        // Configurar eventos del reproductor
        setupPlayerEvents();
        
        // Inicializar estado de conexión
        updateOnlineStatus();
        
        // Añadir eventos para detectar cambios en la conexión
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        
        // Seleccionar el primer video automáticamente
        setTimeout(selectFirstVideoIfNeeded, 500);
        
        console.log('Aplicación inicializada correctamente');
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        showNotification('Error al inicializar la aplicación', 'error');
    }
}

/**
 * Seleccionar el primer video automáticamente si no hay ninguno reproduciéndose
 */
function selectFirstVideoIfNeeded() {
    // Si no hay video reproduciéndose, seleccionar el primero
    if (!currentVideoName) {
        const firstVideo = document.querySelector('.video-item');
        if (firstVideo) {
            const videoName = firstVideo.getAttribute('data-name');
            
            // Marcar como seleccionado pero no reproducir automáticamente
            firstVideo.classList.add('active');
            document.getElementById('current-video-title').textContent = videoName || 'Selecciona un video para reproducir';
        }
    }
}

/**
 * Verificar periódicamente el estado de almacenamiento
 * Esta función monitorea el uso del almacenamiento y notifica si está casi lleno
 */
async function monitorStorageUsage() {
    try {
        const estimate = await navigator.storage.estimate();
        const usedPercentage = (estimate.usage / estimate.quota) * 100;
        
        // Advertir si el almacenamiento está por encima del 90%
        if (usedPercentage > 90) {
            showNotification('El almacenamiento está casi lleno. Considera eliminar algunos videos.', 'info');
            
            // Intentar limpiar videos antiguos automáticamente
            await cleanupOldVideos();
        }
        
        // Programar la próxima verificación en 5 minutos
        setTimeout(monitorStorageUsage, 5 * 60 * 1000);
    } catch (error) {
        console.error('Error al monitorear almacenamiento:', error);
    }
}

/**
 * Iniciar la monitorización del almacenamiento después de 2 minutos
 * para evitar mostrar notificaciones al inicio de la aplicación
 */
function startStorageMonitoring() {
    setTimeout(monitorStorageUsage, 2 * 60 * 1000);
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    init();
    startStorageMonitoring();
});