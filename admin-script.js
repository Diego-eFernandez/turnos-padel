document.addEventListener('DOMContentLoaded', () => {
    // Obtenemos una copia de los datos de turnos del JSON
    // Esta será la versión "editable" en la que haremos cambios.
    let turnosDataEditable = {};

    // Referencias a los elementos del DOM
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const currentDayDisplaySpan = document.getElementById('currentDayDisplay');
    const saveChangesBtn = document.getElementById('saveChangesBtn');
    const resetChangesBtn = document.getElementById('resetChangesBtn');
    const adminTurnosContainer = document.getElementById('admin-turnos-container');

    // Fecha del día que se está mostrando en la administración
    let currentDisplayDate = new Date();

    const diasNombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const mesesNombres = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Función para obtener la información de un día específico (reutilizada)
    function getDiaInfo(date) {
        const nombreDia = diasNombres[date.getDay()];
        const fechaFormateada = `${diasNombres[date.getDay()].charAt(0).toUpperCase() + diasNombres[date.getDay()].slice(1)} ${date.getDate()} de ${mesesNombres[date.getMonth()]} de ${date.getFullYear()}`;
        return { nombre: nombreDia, display: fechaFormateada };
    }

    // Función para crear un elemento de turno HTML para la administración
    function crearTurnoHTMLAdmin(turno, diaNombre) {
        const turnoDiv = document.createElement('div');
        turnoDiv.classList.add('turno-item');
        turnoDiv.classList.add(turno.disponible ? 'disponible' : 'ocupado'); // Clases para estilos visuales
        turnoDiv.dataset.hora = turno.hora; // Guardamos la hora para identificar el turno
        turnoDiv.dataset.dia = diaNombre; // Guardamos el día para identificar el turno

        turnoDiv.innerHTML = `
            <span class="hora">${turno.hora}</span>
            <span class="precio">$${turno.precio}</span>
            <button class="reservar-btn" disabled>
                ${turno.disponible ? 'Disponible' : 'Ocupado'}
            </button>
        `;

        // Añadir el evento click para cambiar la disponibilidad
        turnoDiv.addEventListener('click', () => {
            const dia = turnoDiv.dataset.dia;
            const hora = turnoDiv.dataset.hora;

            // Encontrar el turno en los datos editables y cambiar su disponibilidad
            const turnosDelDia = turnosDataEditable[dia];
            if (turnosDelDia) {
                const turnoEncontrado = turnosDelDia.find(t => t.hora === hora);
                if (turnoEncontrado) {
                    turnoEncontrado.disponible = !turnoEncontrado.disponible; // Invertir disponibilidad

                    // Actualizar las clases y el texto del botón en la UI
                    turnoDiv.classList.toggle('disponible');
                    turnoDiv.classList.toggle('ocupado');
                    turnoDiv.querySelector('.reservar-btn').textContent = turnoEncontrado.disponible ? 'Disponible' : 'Ocupado';
                    turnoDiv.querySelector('.reservar-btn').style.backgroundColor = turnoEncontrado.disponible ? '#28a745' : '#dc3545';
                }
            }
        });
        return turnoDiv;
    }

    // Función principal para cargar y mostrar los turnos en la interfaz de administración
    async function cargarYMostrarTurnosAdmin() {
        // Cargar los turnos desde turnos.json si aún no se han cargado
        if (Object.keys(turnosDataEditable).length === 0) {
            try {
                const timestamp = new Date().getTime(); // Genera un número único basado en la hora actual
                const response = await fetch(`turnos.json?v=${timestamp}`); // Añade el timestamp como parámetro
                const originalData = await response.json();
                turnosDataEditable = JSON.parse(JSON.stringify(originalData)); // Hacemos una copia profunda
            } catch (error) {
                console.error('Error al cargar los turnos desde turnos.json:', error);
                alert('Hubo un error al cargar los turnos para la administración. Por favor, intentá de nuevo más tarde.');
                return;
            }
        }

        const diaActualInfo = getDiaInfo(currentDisplayDate);
        currentDayDisplaySpan.textContent = diaActualInfo.display;

        // Limpiar el contenedor antes de añadir el día actual
        adminTurnosContainer.innerHTML = '';

        // Crear la sección para el día actual
        const diaSection = document.createElement('section');
        diaSection.classList.add('turnos-dia', 'active'); // Añadimos 'active' para que se muestre
        diaSection.id = `turnos-${diaActualInfo.nombre}-admin`; // ID específico para admin
        diaSection.innerHTML = `<h2>${diaActualInfo.display}</h2><div class="turnos-grid"></div>`;
        adminTurnosContainer.appendChild(diaSection);

        const turnosGrid = diaSection.querySelector('.turnos-grid');

        // Obtener los turnos para el día actual del JSON editable
        const turnosDelDia = turnosDataEditable[diaActualInfo.nombre];
        if (turnosDelDia && turnosDelDia.length > 0) {
            turnosDelDia.forEach(turno => {
                const turnoElement = crearTurnoHTMLAdmin(turno, diaActualInfo.nombre);
                turnosGrid.appendChild(turnoElement);
            });
        } else {
            turnosGrid.innerHTML = '<p>No hay turnos definidos para este día en el archivo JSON.</p>';
        }
    }

    // Función para descargar el JSON modificado
    saveChangesBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(turnosDataEditable, null, 4); // Formato bonito con 4 espacios
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'turnos.json'; // Nombre del archivo a descargar
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('¡Archivo turnos.json descargado! Subí este archivo a GitHub para actualizar la página pública.');
    });

    // Función para descartar cambios (recarga los datos originales)
    resetChangesBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres descartar todos los cambios no guardados y recargar los datos originales?')) {
            turnosDataEditable = {}; // Vaciar los datos editables para forzar la recarga del original
            cargarYMostrarTurnosAdmin();
            alert('Cambios descartados. Se recargaron los turnos originales del archivo.');
        }
    });

    // Event Listeners para la navegación de días
    prevDayBtn.addEventListener('click', () => {
        currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
        cargarYMostrarTurnosAdmin();
    });

    nextDayBtn.addEventListener('click', () => {
        currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
        cargarYMostrarTurnosAdmin();
    });

    // Cargar los turnos iniciales al cargar la página de administración
    cargarYMostrarTurnosAdmin();
});
