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
    const { collection, query, where, getDocs, doc, updateDoc } = window.firebaseFirestore;

    let currentAdminTurnos = []; // Almacenará los turnos cargados para la edición

    // --- Funciones de Autenticación ---

    // Función para manejar el estado de autenticación
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Usuario logueado
            authSection.style.display = 'none'; // Oculta el formulario de login
            adminContent.style.display = 'block'; // Muestra el contenido de administración
            logoutBtn.style.display = 'inline-block'; // Muestra el botón de logout
            authErrorMessage.textContent = ''; // Limpia mensajes de error
            console.log("Usuario logueado:", user.email);
            cargarTurnosAdmin(); // Carga los turnos para la edición
        } else {
            // Usuario no logueado
            authSection.style.display = 'block'; // Muestra el formulario de login
            adminContent.style.display = 'none'; // Oculta el contenido de administración
            logoutBtn.style.display = 'none'; // Oculta el botón de logout
            console.log("Usuario no logueado.");
            turnosAdminContainer.innerHTML = ''; // Limpia turnos si el usuario se desloguea
        }
    });

    // Manejar el login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // La función onAuthStateChanged manejará la UI
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

    // Manejar el logout
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // La función onAuthStateChanged manejará la UI
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
            alert("Error al cerrar sesión. Por favor, intenta de nuevo.");
        }
    });

    // --- Funciones de Gestión de Turnos (Admin) ---

    async function cargarTurnosAdmin() {
        // Este es un ejemplo para cargar todos los turnos.
        // Más adelante podemos añadir filtros por día si es necesario.
        try {
            const turnosRef = collection(db, "turnos");
            const snapshot = await getDocs(turnosRef);
            currentAdminTurnos = []; // Limpiar turnos anteriores
            turnosAdminContainer.innerHTML = ''; // Limpiar el contenedor HTML

            snapshot.forEach(doc => {
                const turnoData = doc.data();
                turnoData.id = doc.id; // Guarda el ID del documento para futuras actualizaciones
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

            turnoDiv.innerHTML = `
                <span>${turno.hora}</span> - $${turno.precio}
                <label>
                    <input type="checkbox" ${turno.disponible ? 'checked' : ''} data-id="${turno.id}" data-property="disponible"> Disponible
                </label>
            `;
            currentDayDiv.appendChild(turnoDiv);
        });

        // Añadir event listeners a los checkboxes para actualizar el modelo
        turnosAdminContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                const isAvailable = e.target.checked;
                const turnoIndex = currentAdminTurnos.findIndex(t => t.id === id);
                if (turnoIndex > -1) {
                    currentAdminTurnos[turnoIndex].disponible = isAvailable;
                    // Opcional: añadir clase visual instantánea si lo deseas
                    const turnoDiv = checkbox.closest('.admin-turno-item');
                    if (isAvailable) {
                        turnoDiv.classList.remove('ocupado');
                    } else {
                        turnoDiv.classList.add('ocupado');
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
                // Referencia al documento específico en Firestore
                const turnoDocRef = doc(db, "turnos", turno.id);
                // Actualiza solo el campo 'disponible'
                await updateDoc(turnoDocRef, {
                    disponible: turno.disponible
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
