/**
 * Módulo de almacenamiento para la aplicación VideoFlix
 * Maneja todas las operaciones relacionadas con IndexedDB para almacenamiento offline
 */

// Configuración de IndexedDB
const DB_NAME = 'VideoFlixOfflineDB';
const DB_VERSION = 1;
const VIDEOS_STORE = 'videos';
let db;

// Inicializar la base de datos IndexedDB
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            showNotification('Error al inicializar el almacenamiento offline', 'error');
            reject(event.target.error);
        };
        
        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Base de datos inicializada correctamente');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(VIDEOS_STORE)) {
                const store = db.createObjectStore(VIDEOS_STORE, { keyPath: 'videoUrl' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                console.log('Almacén de videos creado');
            }
        };
    });
}

// Guardar video en IndexedDB
async function saveVideoToIndexedDB(videoUrl, videoName, blob) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Base de datos no inicializada'));
            return;
        }
        
        const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEOS_STORE);
        
        // Verificar el espacio disponible antes de guardar
        const video = {
            videoUrl: videoUrl,
            videoName: videoName,
            blob: blob,
            timestamp: Date.now()
        };
        
        const request = store.put(video);
        
        request.onsuccess = () => {
            console.log('Video guardado en IndexedDB:', videoName);
            showNotification(`Video "${videoName}" guardado para reproducción offline`, 'success');
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('Error al guardar video en IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Comprobar si un video existe en IndexedDB
async function videoExistsInIndexedDB(videoUrl) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Base de datos no inicializada'));
            return;
        }
        
        const transaction = db.transaction([VIDEOS_STORE], 'readonly');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.get(videoUrl);
        
        request.onsuccess = (event) => {
            resolve(!!event.target.result);
        };
        
        request.onerror = (event) => {
            console.error('Error al comprobar si existe el video:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Obtener un video de IndexedDB
async function getVideoFromIndexedDB(videoUrl) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Base de datos no inicializada'));
            return;
        }
        
        const transaction = db.transaction([VIDEOS_STORE], 'readonly');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.get(videoUrl);
        
        request.onsuccess = (event) => {
            const result = event.target.result;
            if (result) {
                resolve(result);
            } else {
                reject(new Error('Video no encontrado en almacenamiento local'));
            }
        };
        
        request.onerror = (event) => {
            console.error('Error al obtener video de IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Eliminar un video de IndexedDB
async function deleteVideoFromIndexedDB(videoUrl) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Base de datos no inicializada'));
            return;
        }
        
        const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
        const store = transaction.objectStore(VIDEOS_STORE);
        const request = store.delete(videoUrl);
        
        request.onsuccess = () => {
            resolve();
        };
        
        request.onerror = (event) => {
            console.error('Error al eliminar video:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Eliminar videos antiguos si el almacenamiento está llegando a su límite
async function cleanupOldVideos() {
    try {
        const estimate = await navigator.storage.estimate();
        const usedPercentage = (estimate.usage / estimate.quota) * 100;
        
        // Si estamos usando más del 80% del espacio disponible, eliminar videos antiguos
        if (usedPercentage > 80) {
            console.log(`Almacenamiento al ${usedPercentage.toFixed(2)}%, limpiando videos antiguos...`);
            
            const transaction = db.transaction([VIDEOS_STORE], 'readwrite');
            const store = transaction.objectStore(VIDEOS_STORE);
            const index = store.index('timestamp');
            
            // Obtener todos los videos ordenados por timestamp (los más antiguos primero)
            const request = index.openCursor();
            
            let deletedCount = 0;
            const MAX_DELETE = 3; // Máximo de videos a eliminar en una limpieza
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && deletedCount < MAX_DELETE) {
                    console.log(`Eliminando video antiguo: ${cursor.value.videoName}`);
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                }
            };
            
            request.onerror = (error) => {
                console.error('Error al limpiar videos antiguos:', error);
            };
            
            if (deletedCount > 0) {
                showNotification(`Se eliminaron ${deletedCount} videos antiguos para liberar espacio`, 'info');
            }
        }
    } catch (error) {
        console.error('Error al estimar almacenamiento:', error);
    }
}

// Función para cargar y almacenar video
async function loadAndStoreVideo(url, videoName) {
    try {
        showLoading();
        
        // Comprobar si ya está en IndexedDB
        const exists = await videoExistsInIndexedDB(url);
        if (exists) {
            console.log('Video ya almacenado localmente:', videoName);
            hideLoading();
            return true;
        }
        
        // Limpiar espacio si es necesario
        await cleanupOldVideos();
        
        console.log('Descargando video para uso offline:', videoName);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error al cargar el video: ${response.status}`);
        }
        
        const blob = await response.blob();
        
        // Guardar en IndexedDB
        await saveVideoToIndexedDB(url, videoName, blob);
        
        // Actualizar indicadores
        await updateOfflineIndicators();
        
        hideLoading();
        return true;
    } catch (error) {
        console.error('Error al descargar/almacenar video:', error);
        hideLoading();
        showNotification(`Error al guardar "${videoName}" para uso offline: ${error.message}`, 'error');
        return false;
    }
}

// Función para almacenar todos los videos disponibles
async function storeAllVideos() {
    if (!navigator.onLine) {
        showNotification('No se pueden descargar videos cuando estás sin conexión', 'error');
        return;
    }
    
    showNotification('Iniciando descarga de todos los videos para uso offline...', 'info');
    
    const videoCards = document.querySelectorAll('.video-card');
    for (const card of videoCards) {
        const videoUrl = card.getAttribute('data-src');
        const videoName = card.getAttribute('data-name');
        
        // Verificar si ya está almacenado
        const exists = await videoExistsInIndexedDB(videoUrl);
        if (!exists) {
            showNotification(`Descargando "${videoName}"...`, 'info');
            await loadAndStoreVideo(videoUrl, videoName);
        }
    }
    
    showNotification('Todos los videos disponibles ahora para uso offline', 'success');
    updateOfflineIndicators();
}