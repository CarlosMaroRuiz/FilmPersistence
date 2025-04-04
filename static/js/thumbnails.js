/**
 * Módulo para generar miniaturas personalizadas para los videos
 */

// Colores para generar fondos de miniaturas variados
const THUMBNAIL_COLORS = [
    { main: '#E50914', secondary: '#831010' }, // Rojo Netflix
    { main: '#0077B5', secondary: '#004569' }, // Azul
    { main: '#6B21A8', secondary: '#3B1464' }, // Púrpura
    { main: '#087E8B', secondary: '#045E6B' }, // Turquesa
    { main: '#FF8A00', secondary: '#B36100' }, // Naranja
    { main: '#508D69', secondary: '#2C5E3F' }  // Verde
];

/**
 * Formatea el nombre del archivo de video para mostrarlo como título
 * @param {string} filename - Nombre del archivo
 * @returns {string} - Nombre formateado
 */
function formatVideoName(filename) {
    // Eliminar extensión del archivo
    const nameWithoutExtension = filename.replace(/\.[^.]+$/, '');
    
    // Reemplazar guiones y subrayados por espacios
    let formatted = nameWithoutExtension.replace(/[_-]/g, ' ');
    
    // Convertir a formato título (primera letra de cada palabra en mayúscula)
    formatted = formatted.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    
    return formatted;
}

/**
 * Genera un thumbnail SVG para un video
 * @param {string} videoName - Nombre del video
 * @param {boolean} isAvailableOffline - Indica si el video está disponible sin conexión
 * @returns {string} - Código HTML del thumbnail SVG
 */
function generateVideoThumbnail(videoName, isAvailableOffline = false) {
    // Generar un índice basado en el nombre del video para elegir un color consistente
    const hashCode = videoName.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    
    const colorIndex = Math.abs(hashCode) % THUMBNAIL_COLORS.length;
    const colorScheme = THUMBNAIL_COLORS[colorIndex];
    
    // Formatear el nombre del video para mostrar como título
    const displayName = formatVideoName(videoName);
    
    // Crear SVG optimizado para el layout vertical (más compacto)
    const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 135" width="100%" height="100%">
        <defs>
            <linearGradient id="bg-gradient-${hashCode}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="${colorScheme.main}" />
                <stop offset="100%" stop-color="${colorScheme.secondary}" />
            </linearGradient>
        </defs>
        
        <!-- Fondo principal -->
        <rect width="240" height="135" fill="url(#bg-gradient-${hashCode})" />
        
        <!-- Patrón de diseño de fondo -->
        <g opacity="0.1">
            <path d="M0,0 L240,135" stroke="#ffffff" stroke-width="1" />
            <path d="M240,0 L0,135" stroke="#ffffff" stroke-width="1" />
        </g>
        
        <!-- Logo VideoFlix pequeño -->
        <g transform="translate(60, 35)" text-anchor="middle">
            <text font-family="Arial, sans-serif" font-weight="800" font-size="16" fill="#ffffff">
                VIDEO<tspan fill="#000000">FLIX</tspan>
            </text>
        </g>
        
        <!-- Botón de reproducción -->
        <g transform="translate(60, 70)">
            <circle cx="0" cy="0" r="25" fill="rgba(255, 255, 255, 0.8)" />
            <polygon points="8,0 -6,-10 -6,10" fill="${colorScheme.main}" transform="translate(3,0)" />
        </g>
        
        ${isAvailableOffline ? `
        <!-- Indicador de disponibilidad offline -->
        <g transform="translate(215, 25)">
            <circle cx="0" cy="0" r="15" fill="#ffffff" />
            <path d="M-7,0 L0,7 L7,-4" stroke="${colorScheme.main}" stroke-width="2" fill="none" />
        </g>` : ''}
        
        <!-- Clasificación HD -->
        <g transform="translate(215, 115)">
            <rect x="-15" y="-10" width="30" height="20" rx="3" fill="rgba(255,255,255,0.2)" />
            <text font-family="Arial, sans-serif" font-weight="600" font-size="10" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">HD</text>
        </g>
    </svg>`;
    
    return svgContent;
}

/**
 * Actualiza todas las miniaturas de videos en la página
 * Optimizado para el layout vertical
 */
async function updateVideoThumbnails() {
    // Buscar los elementos de video
    const videoItems = document.querySelectorAll('.video-item');
    
    if (!videoItems || videoItems.length === 0) {
        console.log('No se encontraron elementos de video para actualizar miniaturas');
        return;
    }
    
    console.log(`Actualizando miniaturas para ${videoItems.length} videos`);
    
    for (const item of videoItems) {
        const videoUrl = item.getAttribute('data-src');
        const videoName = item.getAttribute('data-name');
        
        if (!videoUrl || !videoName) {
            console.warn('Elemento de video sin atributos data-src o data-name:', item);
            continue;
        }
        
        // Comprobar si el video está disponible offline
        let isAvailableOffline = false;
        try {
            isAvailableOffline = await videoExistsInIndexedDB(videoUrl);
        } catch (error) {
            console.error('Error al verificar disponibilidad offline:', error);
        }
        
        // Generar miniatura
        const thumbnail = generateVideoThumbnail(videoName, isAvailableOffline);
        
        // Actualizar el HTML del thumbnail
        const thumbnailContainer = item.querySelector('.video-thumbnail');
        if (thumbnailContainer) {
            thumbnailContainer.innerHTML = thumbnail;
            
            // Agregar badge de offline si es necesario (sin reemplazar la miniatura SVG)
            if (isAvailableOffline && !item.querySelector('.offline-badge')) {
                const badge = document.createElement('div');
                badge.className = 'offline-badge';
                badge.innerHTML = '<i class="fas fa-cloud-download-alt"></i>';
                thumbnailContainer.appendChild(badge);
            } else if (!isAvailableOffline) {
                const badge = item.querySelector('.offline-badge');
                if (badge) badge.remove();
            }
        } else {
            console.warn(`No se encontró el contenedor de miniatura para el video: ${videoName}`);
        }
    }
}