document.addEventListener('DOMContentLoaded', () => {
    const whatsappNumero = "5492346123456"; // Tu número de WhatsApp con código de país sin el +

    let currentDisplayDate = new Date(); // Variable para la fecha del día que se está mostrando
    let turnosSemanaData = {}; // Variable para almacenar los datos de los turnos del JSON

    // Referencias a los botones de navegación y al display del día
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const currentDayDisplaySpan = document.getElementById('currentDayDisplay');

    const diasNombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const mesesNombres = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Función para obtener la información de un día específico
    function getDiaInfo(date) {
        const nombreDia = diasNombres[date.getDay()];
        // Formato para mostrar: "Martes 9 de Julio de 2025"
        const fechaFormateada = `${diasNombres[date.getDay()].charAt(0).toUpperCase() + diasNombres[date.getDay()].slice(1)} ${date.getDate()} de ${mesesNombres[date.getMonth()]} de ${date.getFullYear()}`;
        
        // Formato YYYY-MM-DD para el mensaje de WhatsApp, si fuera necesario más preciso
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Meses son 0-11
        const day = date.getDate().toString().padStart(2, '0');
        const fechaIso = `${year}-${month}-${day}`;

        return {
            nombre: nombreDia, // Ej: 'lunes', 'martes' (para buscar en el JSON)
            display: fechaFormateada,
            fullDate: fechaIso
        };
    }

    // Función para crear un elemento de turno en la página
    function crearTurnoHTML(turno, diaInfo) {
        const turnoDiv = document.createElement('div');
        turnoDiv.classList.add('turno-item');
        if (!turno.disponible) {
            turnoDiv.classList.add('ocupado');
        }

        turnoDiv.innerHTML = `
            <span class="hora">${turno.hora}</span>
            <span class="precio">$${turno.precio}</span>
            <button class="reservar-btn" ${!turno.disponible ? 'disabled' : ''}>
                ${turno.disponible ? 'Reservar' : 'Ocupado'}
            </button>
        `;

        if (turno.disponible) {
            const botonReservar = turnoDiv.querySelector('.reservar-btn');
            botonReservar.addEventListener('click', () => {
                // Usamos diaInfo.display para el mensaje de WhatsApp, que ya incluye el nombre del día y la fecha
                const mensaje = `Hola! Quiero reservar el turno del ${diaInfo.display} a las ${turno.hora} para la cancha de pádel.`;
                const urlWhatsApp = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
                window.open(urlWhatsApp, '_blank');
            });
        }
        return turnoDiv;
    }

    // Función principal para cargar y mostrar los turnos del día actual
    async function cargarYMostrarTurnosDelDia() {
        // Si los datos del JSON no se han cargado, los cargamos una sola vez
        if (Object.keys(turnosSemanaData).length === 0) {
            try {
                const response = await fetch('turnos.json');
                turnosSemanaData = await response.json();
            } catch (error) {
                console.error('Error al cargar los turnos desde turnos.json:', error);
                alert('Hubo un error al cargar los turnos. Por favor, intentá de nuevo más tarde.');
                return;
            }
        }

        // Obtener la información del día que vamos a mostrar
        const diaActualInfo = getDiaInfo(currentDisplayDate);
        currentDayDisplaySpan.textContent = diaActualInfo.display; // Actualiza el texto en la navegación

        // Ocultar todas las secciones de días primero
        document.querySelectorAll('.turnos-dia').forEach(section => {
            section.classList.remove('active');
        });

        // Seleccionar la sección del día correspondiente al día actual (ej. 'lunes')
        const nombreDiaJson = diaActualInfo.nombre; // Esto nos dará 'lunes', 'martes', etc.
        const turnosGrid = document.querySelector(`#turnos-${nombreDiaJson} .turnos-grid`);
        const diaSection = document.getElementById(`turnos-${nombreDiaJson}`);

        // Asegurarse de que la sección del día exista y luego mostrarla
        if (diaSection) {
            diaSection.classList.add('active'); // Mostrar solo la sección del día activo
        } else {
            console.warn(`No se encontró la sección HTML para el día: ${nombreDiaJson}`);
            // Puedes añadir un mensaje al usuario si un día no tiene sección HTML
        }
        
        turnosGrid.innerHTML = ''; // Limpiar turnos anteriores

        // Obtener los turnos para el día actual del JSON (usando el nombre del día)
        const turnosDelDia = turnosSemanaData[nombreDiaJson];
        if (turnosDelDia && turnosDelDia.length > 0) {
            turnosDelDia.forEach(turno => {
                const turnoElement = crearTurnoHTML(turno, diaActualInfo);
                turnosGrid.appendChild(turnoElement);
            });
        } else {
            // Mensaje si no hay turnos definidos para ese día en el JSON o el array está vacío
            turnosGrid.innerHTML = '<p>No hay turnos definidos para este día.</p>';
        }
    }

    // Event Listeners para los botones de navegación de días
    prevDayBtn.addEventListener('click', () => {
        currentDisplayDate.setDate(currentDisplayDate.getDate() - 1); // Restar 1 día
        cargarYMostrarTurnosDelDia();
    });

    nextDayBtn.addEventListener('click', () => {
        currentDisplayDate.setDate(currentDisplayDate.getDate() + 1); // Sumar 1 día
        cargarYMostrarTurnosDelDia();
    });

    // Cargar los turnos del día inicial al cargar la página
    cargarYMostrarTurnosDelDia();
});
