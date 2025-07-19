// script.js

// Importa las funciones necesarias directamente al principio del módulo
// No necesitamos importar getFirestore aquí si lo recibimos por parámetro en initBabsonPadelApp
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Variable para almacenar la instancia de la base de datos una vez que se inicialice
let db; 
let firebaseAppInstance; // Opcional, si necesitas la instancia de la app

// *** FUNCIÓN DE INICIALIZACIÓN GLOBAL ***
// El script de index.html la llamará cuando Firebase esté listo.
window.initBabsonPadelApp = (appInstance, firestoreDbInstance) => {
    firebaseAppInstance = appInstance; // Guarda la instancia de la app si la necesitas
    db = firestoreDbInstance;          // Asigna la instancia de db

    // Verificación de depuración - Asegura que db no sea undefined
    if (!db) {
        console.error("ERROR: Firestore (db) no fue pasado correctamente a initBabsonPadelApp.");
        alert("Hubo un problema al cargar la base de datos. Por favor, intentá de nuevo más tarde.");
        return;
    }
    console.log("Firestore (db) está inicializado y disponible en script.js.");

    // Ahora que 'db' está garantizado, podemos ejecutar el resto del código
    // que depende de Firebase.
    initializePageLogic();
};


// Mueve todo el código de DOMContentLoaded a una nueva función
// que se llamará una vez que Firebase esté listo.
function initializePageLogic() {
    const whatsappNumero = "5492346658995";

    // Variables globales
    let currentDisplayDate = new Date();
    let turnosSemanaData = {}; 

    // Referencias a elementos del DOM
    const prevDayBtn = document.getElementById('prevDayBtn');
    const nextDayBtn = document.getElementById('nextDayBtn');
    const currentDayDisplaySpan = document.getElementById('currentDayDisplay');
    const turnosContainer = document.getElementById('turnosContainer'); 

    const diasNombres = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const mesesNombres = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    // Función para obtener la información de un día específico
    function getDiaInfo(date) {
        const nombreDia = diasNombres[date.getDay()];
        const fechaFormateada = `${nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1)} ${date.getDate()} de ${mesesNombres[date.getMonth()]} de ${date.getFullYear()}`;
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const fechaIso = `${year}-${month}-${day}`;

        return {
            nombre: nombreDia,
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
        try {
            const turnosRef = collection(db, "turnos"); 
            const diaActualInfo = getDiaInfo(currentDisplayDate);

            const q = query(turnosRef, where("dia", "==", diaActualInfo.nombre));

            const snapshot = await getDocs(q); 
            
            const loadedTurnos = [];
            snapshot.forEach(doc => {
                loadedTurnos.push(doc.data()); 
            });

            turnosSemanaData.turnos = loadedTurnos;

            turnosSemanaData.turnos.sort((a, b) => {
                const timeA = new Date(`2000/01/01 ${a.hora}`);
                const timeB = new Date(`2000/01/01 ${b.hora}`);
                return timeA - timeB;
            });

            currentDayDisplaySpan.textContent = diaActualInfo.display;
            turnosContainer.innerHTML = ''; 
            const diaSection = document.createElement('section');
            diaSection.classList.add('turnos-dia', 'active'); 
            diaSection.id = `turnos-${diaActualInfo.nombre}`; 
            diaSection.innerHTML = `<h2>${diaActualInfo.display}</h2><div class="turnos-grid"></div>`;
            turnosContainer.appendChild(diaSection);
            
            const turnosGrid = diaSection.querySelector('.turnos-grid');

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
            turnosContainer.innerHTML = '<p>Error al cargar los turnos. Por favor, intentá de nuevo.</p>';
        }
    }

    // --- Event Listeners para los botones de navegación de días ---
    prevDayBtn.addEventListener('click', () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() - 1);
        newDate.setHours(0, 0, 0, 0); 
        
        if (newDate.getTime() >= today.getTime()) {
            currentDisplayDate.setDate(currentDisplayDate.getDate() - 1);
            cargarYMostrarTurnosDelDia(); 
        } else {
            alert('No puedes ver turnos de días pasados.');
        }
    });

    nextDayBtn.addEventListener('click', () => {
        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + 6);
        limitDate.setHours(0, 0, 0, 0); 
        
        const newDate = new Date(currentDisplayDate);
        newDate.setDate(newDate.getDate() + 1);
        newDate.setHours(0, 0, 0, 0); 
        
        if (newDate.getTime() <= limitDate.getTime()) {
            currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
            cargarYMostrarTurnosDelDia(); 
        } else {
            alert('Solo puedes ver los turnos para los próximos 7 días.');
        }
    });

    // Cargar los turnos del día inicial al cargar la página
    cargarYMostrarTurnosDelDia();
    
    //addInitialTurnosToFirestore()

    async function addInitialTurnosToFirestore() {
        try {
            if (!db) {
                console.error("ERROR: 'db' no está disponible en addInitialTurnosToFirestore.");
                return;
            }
            console.log("--- Iniciando addInitialTurnosToFirestore ---");

            const turnosRef = collection(db, "turnos");
            const q = query(turnosRef, where("dia", "==", "lunes"));
            const querySnapshot = await getDocs(q);

            console.log(`Verificando si existen turnos para "lunes". querySnapshot.empty: ${querySnapshot.empty}`);
            console.log(`Número de documentos encontrados para "lunes": ${querySnapshot.size}`);

            if (!querySnapshot.empty) {
                console.warn("Ya existen turnos en Firestore (se encontró al menos un 'lunes'). No se subirán los datos iniciales para evitar duplicados.");
                alert("Ya existen turnos en Firestore. Si necesitas resubir, ELIMINA TODOS los documentos de la colección 'turnos' en la Consola de Firebase y recarga la página.");
                return;
            }

            console.log("No se encontraron turnos para 'lunes'. Iniciando la subida de datos iniciales a Firestore...");
            
            // *** ESTE ES EL CAMBIO: El objeto turnosData se declara aquí ***
            const turnosData = {
                "lunes": [
                    { "hora": "09:00", "precio": 1500, "disponible": true },
                    { "hora": "10:30", "precio": 1500, "disponible": true },
                    { "hora": "12:00", "precio": 1500, "disponible": true },
                    { "hora": "13:30", "precio": 1500, "disponible": true },
                    { "hora": "15:00", "precio": 1500, "disponible": true },
                    { "hora": "16:30", "precio": 1500, "disponible": true },
                    { "hora": "18:00", "precio": 2000, "disponible": true }, // Precios de tarde/noche más altos
                    { "hora": "19:30", "precio": 2000, "disponible": true },
                    { "hora": "21:00", "precio": 2000, "disponible": true },
                    { "hora": "22:30", "precio": 2000, "disponible": true }
                ],
                "martes": [
                    { "hora": "09:00", "precio": 1500, "disponible": true },
                    { "hora": "10:30", "precio": 1500, "disponible": true },
                    { "hora": "12:00", "precio": 1500, "disponible": true },
                    { "hora": "13:30", "precio": 1500, "disponible": true },
                    { "hora": "15:00", "precio": 1500, "disponible": true },
                    { "hora": "16:30", "precio": 1500, "disponible": true },
                    { "hora": "18:00", "precio": 2000, "disponible": true },
                    { "hora": "19:30", "precio": 2000, "disponible": true },
                    { "hora": "21:00", "precio": 2000, "disponible": true },
                    { "hora": "22:30", "precio": 2000, "disponible": true }
                ],
                "miercoles": [
                    { "hora": "09:00", "precio": 1500, "disponible": true },
                    { "hora": "10:30", "precio": 1500, "disponible": true },
                    { "hora": "12:00", "precio": 1500, "disponible": true },
                    { "hora": "13:30", "precio": 1500, "disponible": true },
                    { "hora": "15:00", "precio": 1500, "disponible": true },
                    { "hora": "16:30", "precio": 1500, "disponible": true },
                    { "hora": "18:00", "precio": 2000, "disponible": true },
                    { "hora": "19:30", "precio": 2000, "disponible": true },
                    { "hora": "21:00", "precio": 2000, "disponible": true },
                    { "hora": "22:30", "precio": 2000, "disponible": true }
                ],
                "jueves": [
                    { "hora": "09:00", "precio": 1500, "disponible": true },
                    { "hora": "10:30", "precio": 1500, "disponible": true },
                    { "hora": "12:00", "precio": 1500, "disponible": true },
                    { "hora": "13:30", "precio": 1500, "disponible": true },
                    { "hora": "15:00", "precio": 1500, "disponible": true },
                    { "hora": "16:30", "precio": 1500, "disponible": true },
                    { "hora": "18:00", "precio": 2000, "disponible": true },
                    { "hora": "19:30", "precio": 2000, "disponible": true },
                    { "hora": "21:00", "precio": 2000, "disponible": true },
                    { "hora": "22:30", "precio": 2000, "disponible": true }
                ],
                "viernes": [
                    { "hora": "09:00", "precio": 1500, "disponible": true },
                    { "hora": "10:30", "precio": 1500, "disponible": true },
                    { "hora": "12:00", "precio": 1500, "disponible": true },
                    { "hora": "13:30", "precio": 1500, "disponible": true },
                    { "hora": "15:00", "precio": 1500, "disponible": true },
                    { "hora": "16:30", "precio": 1500, "disponible": true },
                    { "hora": "18:00", "precio": 2000, "disponible": true },
                    { "hora": "19:30", "precio": 2000, "disponible": true },
                    { "hora": "21:00", "precio": 2000, "disponible": true },
                    { "hora": "22:30", "precio": 2000, "disponible": true }
                ],
                "sabado": [
                    { "hora": "09:00", "precio": 2000, "disponible": true }, // Precios de fin de semana más altos
                    { "hora": "10:30", "precio": 2000, "disponible": true },
                    { "hora": "12:00", "precio": 2000, "disponible": true },
                    { "hora": "13:30", "precio": 2000, "disponible": true },
                    { "hora": "15:00", "precio": 2000, "disponible": true },
                    { "hora": "16:30", "precio": 2000, "disponible": true },
                    { "hora": "18:00", "precio": 2500, "disponible": true },
                    { "hora": "19:30", "precio": 2500, "disponible": true },
                    { "hora": "21:00", "precio": 2500, "disponible": true },
                    { "hora": "22:30", "precio": 2500, "disponible": true }
                ],
                "domingo": [
                    { "hora": "09:00", "precio": 2000, "disponible": true },
                    { "hora": "10:30", "precio": 2000, "disponible": true },
                    { "hora": "12:00", "precio": 2000, "disponible": true },
                    { "hora": "13:30", "precio": 2000, "disponible": true },
                    { "hora": "15:00", "precio": 2000, "disponible": true },
                    { "hora": "16:30", "precio": 2000, "disponible": true },
                    { "hora": "18:00", "precio": 2500, "disponible": true },
                    { "hora": "19:30", "precio": 2500, "disponible": true },
                    { "hora": "21:00", "precio": 2500, "disponible": true },
                    { "hora": "22:30", "precio": 2500, "disponible": true }
                ]
            };
                
            // *** Y aquí es donde el console.log debe ir, DESPUÉS de la declaración ***
            console.log("Contenido de turnosData antes de la subida:", turnosData); 


            for (const dia in turnosData) {
                if (turnosData.hasOwnProperty(dia)) {
                    console.log(`Procesando día: ${dia}`); 
                    for (const turno of turnosData[dia]) {
                        await addDoc(collection(db, "turnos"), {
                            dia: dia,
                            hora: turno.hora,
                            precio: turno.precio,
                            disponible: turno.disponible
                        });
                        console.log(`Turno ${dia} ${turno.hora} añadido.`);
                    }
                }
            }
            console.log("--- ¡Todos los turnos iniciales han sido añadidos a Firestore! ---");
            alert("¡Los turnos iniciales han sido subidos a Firestore! Ahora, por favor, ve a la Consola de Firebase para verificar. Luego, DEBES QUITAR este código de script.js.");

        } catch (e) {
            console.error("Error al subir los turnos iniciales:", e);
            alert("Hubo un error al subir los turnos iniciales. Revisa la consola para más detalles.");
        }
    }
}