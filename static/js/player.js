/**
 * Módulo del reproductor de video para la aplicación VideoFlix
 * Maneja la reproducción de videos y el seguimiento del progreso
 */

// Variables para el seguimiento de progreso
let currentVideoUrl = '';
let currentVideoName = '';
let isUpdatingProgress = false;

// Función para reproducir un video desde la URL o la base de datos local
async function playVideo(url, videoName) {
    currentVideoUrl = url;
    currentVideoName = videoName;
    currentVideoTitle.textContent = videoName;
    
    // Scroll hasta el reproductor
    document.getElementById('player-section').scrollIntoView({ behavior: 'smooth' });
    
    showLoading();
    
    try {
        let videoSrc;
        
        if (navigator.onLine) {
            // Si estamos en línea, intentar reproducir y almacenar para uso offline
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Error al cargar el video: ${response.status}`);
            }
            
            const blob = await response.blob();
            videoSrc = URL.createObjectURL(blob);
            
            // Almacenar para uso offline en segundo plano
            saveVideoToIndexedDB(url, videoName, blob)
                .then(() => updateOfflineIndicators())
                .catch(error => console.error('Error al guardar video para uso offline:', error));
            
        } else {
            // Si estamos offline, intentar reproducir desde IndexedDB
            try {
                const storedVideo = await getVideoFromIndexedDB(url);
                videoSrc = URL.createObjectURL(storedVideo.blob);
            } catch (error) {
                hideLoading();
                showNotification('Video no disponible sin conexión', 'error');
                return;
            }
        }
        
        // Configurar la fuente del video
        videoPlayer.src = videoSrc;
        
        // Buscar el progreso guardado para este video
        const progressElement = document.querySelector(`.video-card[data-name="${videoName}"] .progress`);
        if (progressElement) {
            const progressWidth = progressElement.style.width;
            if (progressWidth) {
                const progress = parseFloat(progressWidth) / 100;
                if (progress > 0 && progress < 0.95) {  // No saltamos si está casi al final
                    videoPlayer.addEventListener('loadedmetadata', function onLoaded() {
                        const seekTime = progress * videoPlayer.duration;
                        videoPlayer.currentTime = seekTime;
                        videoPlayer.removeEventListener('loadedmetadata', onLoaded);
                        hideLoading();
                    });
                } else {
                    hideLoading();
                }
            } else {
                hideLoading();
            }
        } else {
            hideLoading();
        }
        
        // Iniciar reproducción
        videoPlayer.play().catch(e => {
            console.error('Error reproduciendo video:', e);
            hideLoading();
        });
        
    } catch (error) {
        console.error('Error al reproducir video:', error);
        hideLoading();
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Actualizar progreso de visualización
async function updateProgress() {
    if (!currentVideoName || !videoPlayer.duration || isUpdatingProgress) return;
    
    const progress = videoPlayer.currentTime / videoPlayer.duration;
    if (isNaN(progress)) return;
    
    // Actualizar barra de progreso en la UI
    const progressElement = document.querySelector(`.video-card[data-name="${currentVideoName}"] .progress`);
    if (progressElement) {
        progressElement.style.width = `${progress * 100}%`;
    }
    
    // Si estamos en línea, enviar progreso al servidor
    if (navigator.onLine && progress > 0) {
        try {
            isUpdatingProgress = true;
            const response = await fetch('/api/update_progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_name: currentVideoName,
                    progress: progress
                })
            });
            
            if (!response.ok) {
                throw new Error(`Error al actualizar progreso: ${response.status}`);
            }
        } catch (error) {
            console.error('Error guardando progreso:', error);
        } finally {
            isUpdatingProgress = false;
        }
    }
}

// Configurar eventos del reproductor
function setupPlayerEvents() {
    const videoPlayer = document.getElementById('video-player');
    
    // Actualizar progreso periódicamente
    setInterval(updateProgress, 5000);  // Cada 5 segundos
    
    // También actualizar al pausar el video
    videoPlayer.addEventListener('pause', updateProgress);
    
    // Y al terminar el video
    videoPlayer.addEventListener('ended', function() {
        // Marcar como 100% completado
        const progressElement = document.querySelector(`.video-card[data-name="${currentVideoName}"] .progress`);
        if (progressElement) {
            progressElement.style.width = '100%';
        }
        updateProgress();
        showNotification('Reproducción completada', 'success');
    });
    
    // Eventos de carga del video
    videoPlayer.addEventListener('waiting', showLoading);
    videoPlayer.addEventListener('playing', hideLoading);
}