document.addEventListener('DOMContentLoaded', () => {
    const whatsappNumero = "5492346525248"; // Tu número de WhatsApp con código de país sin el +

    // Variables globales (¡importante que estén fuera de la función cargarYMostrarTurnosDelDia para que mantengan su estado!)
    let currentDisplayDate = new Date(); // Variable para la fecha del día que se está mostrando
    let turnosSemanaData = {}; // Variable para almacenar los datos de los turnos cargados de Firestore para el día actual

    // Referencias a los botones de navegación y al display del día
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const currentDayDisplaySpan = document.getElementById('currentDayDisplay');
    const turnosContainer = document.getElementById('turnosContainer'); // Asegúrate de que este ID exista en tu HTML


    const diasNombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const mesesNombres = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', // Cuidado, Mato debería ser Mayo
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Función para obtener la información de un día específico
    function getDiaInfo(date) {
        // Normaliza el nombre del día para que coincida con lo que guardarás en Firestore ('lunes', 'martes', etc.)
        const nombreDia = diasNombres[date.getDay()];
        // Formato para mostrar: "Martes 9 de Julio de 2025"
        const fechaFormateada = `${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)} ${date.getDate()} de ${mesesNombres[date.getMonth()]} de ${date.getFullYear()}`;
        
        // Formato YYYY-MM-DD para el mensaje de WhatsApp, si fuera necesario más preciso
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Meses son 0-11
        const day = date.getDate().toString().padStart(2, '0');
        const fechaIso = `${year}-${month}-${day}`;

        return {
            nombre: nombreDia, // Ej: 'lunes', 'martes' (para buscar en Firestore)
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
                const mensaje = `Hola! Quiero reservar el turno del ${diaInfo.display} a las ${turno.hora} para la cancha de pádel.`;
                const urlWhatsApp = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
                window.open(urlWhatsApp, '_blank');
            });
        }
        return turnoDiv;
    }

    // Función principal para cargar y mostrar los turnos del día actual
    async function cargarYMostrarTurnosDelDia() {
        // Accede a la instancia global de Firestore y sus funciones
        const db = window.db; 
        const { query, where, getDocs } = window.firebaseFirestore; 

        if (!db || !query || !where || !getDocs) {
            console.error("Firebase Firestore no está completamente inicializado o las funciones no están disponibles.");
            alert("Hubo un error al conectar con la base de datos. Por favor, intentá de nuevo más tarde.");
            return;
        }

        try {
            const turnosRef = db.collection("turnos"); // Referencia a tu colección 'turnos' en Firestore
            const diaActualInfo = getDiaInfo(currentDisplayDate); // Obtiene el nombre del día actual (ej. "lunes")

            // Consulta a Firestore: filtra por el día actual
            const q = query(turnosRef, where("dia", "==", diaActualInfo.nombre));

            const snapshot = await getDocs(q); // Ejecuta la consulta filtrada
            
            const loadedTurnos = [];
            snapshot.forEach(doc => {
                loadedTurnos.push(doc.data()); // Agrega cada turno al array
            });

            // Almacena los turnos cargados para el día actual
            turnosSemanaData.turnos = loadedTurnos;

            // Ordenar los turnos por hora
            turnosSemanaData.turnos.sort((a, b) => {
                const timeA = new Date(`2000/01/01 ${a.hora}`);
                const timeB = new Date(`2000/01/01 ${b.hora}`);
                return timeA - timeB;
            });

            // --- Lógica de ACTUALIZACIÓN DE LA INTERFAZ ---

            // Actualiza el texto del día en la navegación
            currentDayDisplaySpan.textContent = diaActualInfo.display;

            // Limpia el contenedor de turnos y recrea la estructura para el día
            turnosContainer.innerHTML = ''; 
            const diaSection = document.createElement('section');
            diaSection.classList.add('turnos-dia', 'active'); // Añadimos 'active' para que se muestre
            // ID de la sección basada en el día, si es que lo usas en el CSS para algo específico
            diaSection.id = `turnos-${diaActualInfo.nombre}`; 
            diaSection.innerHTML = `<h2>${diaActualInfo.display}</h2><div class="turnos-grid"></div>`;
            turnosContainer.appendChild(diaSection);
            
            const turnosGrid = diaSection.querySelector('.turnos-grid');

            // Mostrar los turnos cargados para el día
            if (turnosSemanaData.turnos && turnosSemanaData.turnos.length > 0) {
                turnosSemanaData.turnos.forEach(turno => {
                    const turnoElement = crearTurnoHTML(turno, diaActualInfo);
                    turnosGrid.appendChild(turnoElement);
                });
            } else {
                turnosGrid.innerHTML = '<p>No hay turnos disponibles para este día.</p>';
            }

        } catch (error) {
            console.error("Error al cargar turnos de Firestore:", error);
            alert("Hubo un error al cargar los turnos. Por favor, intentá de nuevo más tarde.");
            // Si hay un error, limpiar la vista de turnos
            turnosContainer.innerHTML = '<p>Error al cargar los turnos. Por favor, intentá de nuevo.</p>';
        }
    }

    // --- Event Listeners para los botones de navegación de días ---
    prevDayBtn.addEventListener('click', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación
        
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() - 1);
        newDate.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación
        
        // Solo permitir ir al día anterior si no es antes de hoy
        if (newDate.getTime() >= today.getTime()) {
            currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
            cargarYMostrarTurnosDelDia(); // Recarga los turnos para el nuevo día
        } else {
            alert('No puedes ver turnos de días pasados.');
        }
    });

    nextDayBtn.addEventListener('click', () => {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + 6); // Hoy + 6 días = 7 días en total
        limitDate.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación
        
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() + 1);
        newDate.setHours(0, 0, 0, 0); // Establecer a inicio del día para comparación
        
        // Solo permitir ir al día siguiente si no excede el límite de 7 días
        if (newDate.getTime() <= limitDate.getTime()) {
            currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
            cargarYMostrarTurnosDelDia(); // Recarga los turnos para el nuevo día
        } else {
            alert('Solo puedes ver los turnos para los próximos 7 días.');
        }
    });

    // Cargar los turnos del día inicial al cargar la página
    cargarYMostrarTurnosDelDia();
}); // Cierre del DOMContentLoaded