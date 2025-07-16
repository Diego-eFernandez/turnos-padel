document.addEventListener('DOMContentLoaded', () => {
    // Elementos del DOM
    const authSection = document.getElementById('auth-section');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authErrorMessage = document.getElementById('auth-error-message');
    const turnosAdminContainer = document.getElementById('turnos-admin-container');
    const saveChangesBtn = document.getElementById('save-changes-btn');

    // Acceso a Firebase (instancias y funciones hechas globales en admin.html)
    const auth = window.auth;
    const db = window.db;
    const { signInWithEmailAndPassword, signOut, onAuthStateChanged } = window.firebaseAuth;
    // Asegúrate de que updateDoc y doc estén importados
    const { collection, query, where, getDocs, doc, updateDoc } = window.firebaseFirestore;

    let currentAdminTurnos = []; // Almacenará los turnos cargados para la edición

    // --- Funciones de Autenticación (sin cambios) ---

    onAuthStateChanged(auth, (user) => {
        if (user) {
            authSection.style.display = 'none';
            adminContent.style.display = 'block';
            logoutBtn.style.display = 'inline-block';
            authErrorMessage.textContent = '';
            console.log("Usuario logueado:", user.email);
            cargarTurnosAdmin();
        } else {
            authSection.style.display = 'block';
            adminContent.style.display = 'none';
            logoutBtn.style.display = 'none';
            console.log("Usuario no logueado.");
            turnosAdminContainer.innerHTML = '';
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error al iniciar sesión:", error.code, error.message);
            let errorMessage = "Error al iniciar sesión. Intenta de nuevo.";
            if (error.code === 'auth/invalid-email' || error.code === 'auth/user-not-found') {
                errorMessage = 'Email no registrado o inválido.';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage = 'Contraseña incorrecta.';
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
            }
            authErrorMessage.textContent = errorMessage;
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión. Por favor, intenta de nuevo.");
        }
    });

    // --- Funciones de Gestión de Turnos (Admin) ---

    async function cargarTurnosAdmin() {
        try {
            turnosAdminContainer.innerHTML = '<p>Cargando turnos...</p>'; // Muestra mensaje de carga
            const turnosRef = collection(db, "turnos");
            const snapshot = await getDocs(turnosRef);
            currentAdminTurnos = [];

            snapshot.forEach(doc => {
                const turnoData = doc.data();
                turnoData.id = doc.id;
                currentAdminTurnos.push(turnoData);
            });

            // Ordenar por día y luego por hora para una mejor visualización
            currentAdminTurnos.sort((a, b) => {
                const diasOrden = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const diaA = diasOrden.indexOf(a.dia);
                const diaB = diasOrden.indexOf(b.dia);

                if (diaA !== diaB) {
                    return diaA - diaB;
                }
                const timeA = new Date(`2000/01/01 ${a.hora}`);
                const timeB = new Date(`2000/01/01 ${b.hora}`);
                return timeA - timeB;
            });

            displayAdminTurnos(currentAdminTurnos);

        } catch (error) {
            console.error("Error al cargar turnos para administración:", error);
            turnosAdminContainer.innerHTML = '<p>Error al cargar turnos para edición.</p>';
        }
    }

    function displayAdminTurnos(turnos) {
        turnosAdminContainer.innerHTML = ''; // Limpia el contenedor

        let currentDay = '';
        let currentDayDiv = null;

        turnos.forEach(turno => {
            // Si el día cambia, crear una nueva sección para el día
            if (turno.dia !== currentDay) {
                currentDay = turno.dia;
                const diaHeader = document.createElement('h3');
                diaHeader.textContent = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
                turnosAdminContainer.appendChild(diaHeader);

                currentDayDiv = document.createElement('div');
                currentDayDiv.classList.add('admin-turnos-grid'); // Clase para el grid de turnos
                turnosAdminContainer.appendChild(currentDayDiv);
            }

            const turnoDiv = document.createElement('div');
            turnoDiv.classList.add('admin-turno-item');
            turnoDiv.dataset.id = turno.id; // Guarda el ID del documento en el HTML

            // MODIFICACIÓN CRÍTICA AQUÍ: Añadir inputs para hora y precio
            turnoDiv.innerHTML = `
                <div class="turno-data-inputs">
                    <label for="hora-${turno.id}">Hora:</label>
                    <input type="time" id="hora-${turno.id}" data-id="${turno.id}" data-property="hora" value="${turno.hora}">
                </div>
                <div class="turno-data-inputs">
                    <label for="precio-${turno.id}">Precio:</label>
                    <input type="number" id="precio-${turno.id}" data-id="${turno.id}" data-property="precio" value="${turno.precio}" min="0">
                </div>
                <div class="turno-checkbox">
                    <label for="disponible-${turno.id}">
                        <input type="checkbox" id="disponible-${turno.id}" data-id="${turno.id}" data-property="disponible" ${turno.disponible ? 'checked' : ''}> Disponible
                    </label>
                </div>
            `;
            currentDayDiv.appendChild(turnoDiv);
        });

        // Añadir event listeners para actualizar el modelo localmente
        turnosAdminContainer.querySelectorAll('input[type="checkbox"], input[type="time"], input[type="number"]').forEach(input => {
            input.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const property = e.target.dataset.property;
                let value;

                // Determinar el valor basado en el tipo de input
                if (e.target.type === 'checkbox') {
                    value = e.target.checked;
                } else if (e.target.type === 'number') {
                    value = parseInt(e.target.value, 10);
                } else { // type === 'time'
                    value = e.target.value;
                }

                const turnoIndex = currentAdminTurnos.findIndex(t => t.id === id);
                if (turnoIndex > -1) {
                    currentAdminTurnos[turnoIndex][property] = value;
                    console.log(`Turno ${id} en caché actualizado: ${property} -> ${value}`);

                    // Opcional: añadir clase visual instantánea si lo deseas para disponibilidad
                    if (property === 'disponible') {
                        const turnoDiv = input.closest('.admin-turno-item');
                        if (value) {
                            turnoDiv.classList.remove('ocupado');
                        } else {
                            turnoDiv.classList.add('ocupado');
                        }
                    }
                }
            });
        });
    }

    // --- Guardar Cambios en Firestore ---
    saveChangesBtn.addEventListener('click', async () => {
        if (currentAdminTurnos.length === 0) {
            alert("No hay cambios para guardar o no se cargaron turnos.");
            return;
        }

        if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) {
            return; // Cancelar si el usuario no confirma
        }

        let updatesCount = 0;
        let errorsCount = 0;

        for (const turno of currentAdminTurnos) {
            try {
                const turnoDocRef = doc(db, "turnos", turno.id);
                // ACTUALIZACIÓN CRÍTICA AQUÍ: Incluir hora y precio en la actualización
                await updateDoc(turnoDocRef, {
                    disponible: turno.disponible,
                    hora: turno.hora, // Añadido
                    precio: turno.precio // Añadido
                });
                updatesCount++;
            } catch (error) {
                console.error(`Error al actualizar turno ${turno.id}:`, error);
                errorsCount++;
            }
        }

        alert(`Cambios guardados: ${updatesCount} turnos actualizados. Errores: ${errorsCount}.`);
        cargarTurnosAdmin(); // Recargar para asegurar que la UI muestre el estado actual de la DB
    });

}); // Cierre del DOMContentLoaded