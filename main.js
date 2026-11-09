const URL_PRODUCCION = "https://bomberos-santiago.onrender.com";
let usuarioActual = null;
let idAccesoActual = null;

let credencialesUsuarios = {
    "Administrador General": { pass: "bomberos1", nombre: "Administrador General", rol: "Admin" },
    "mildreth olvera": { pass: "mildsjp", nombre: "Mildreth Ate Olvera Ruiz", rol: "Operativo" },
    "abi": { pass: "12345", nombre: "Abi", rol: "Operativo" },
    "PABLO": { pass: "12345", nombre: "Pablo", rol: "Operativo" },
    "santiago": { pass: "1234567", nombre: "Santiago", rol: "Operativo" }
};

document.addEventListener("DOMContentLoaded", () => {
    cargarUsuariosGuardados();
    const cont = document.getElementById('contenedorQR'), inp = document.getElementById('urlCompartir');
    if(cont && inp) { inp.value = URL_PRODUCCION; new QRCode(cont, {text: URL_PRODUCCION, width: 130, height: 130, correctLevel: QRCode.CorrectLevel.H}); }
    
    const submenu = document.getElementById('submenuServicios');
    if(submenu) {
        submenu.addEventListener('mouseenter', () => submenu.classList.add('show'));
        submenu.addEventListener('mouseleave', () => submenu.classList.remove('show'));
    }

    cargarEstadoLocal();
    cargarHistorialAccesos();
});

// Evento para registrar salida automática si cierran la pestaña o navegador con la X
window.addEventListener('beforeunload', function (e) {
    if (usuarioActual && idAccesoActual) {
        registrarAccesoSalida(idAccesoActual);
    }
});

function actualizarFechasActualizacion() {
    const ahora = new Date();
    const fechaHoraStr = ahora.toLocaleString();
    
    const lblLogin = document.getElementById('labelUltimaActualizacionLogin');
    if(lblLogin) lblLogin.textContent = fechaHoraStr;

    document.querySelectorAll('.labelUltimaActualizacionSistema').forEach(el => {
        el.textContent = fechaHoraStr;
    });
}

function toggleSubmenuServicios(e) {
    e.preventDefault();
    e.stopPropagation();
    const submenu = document.getElementById('submenuServicios');
    submenu.classList.toggle('show');
}

function cargarUsuariosGuardados() {
    try {
        const guardados = localStorage.getItem('bomberos_lista_usuarios');
        if(guardados) {
            credencialesUsuarios = JSON.parse(guardados);
        }
    } catch(e) {}
    actualizarSelectoresUsuarios();
}

function actualizarSelectoresUsuarios() {
    const selectLogin = document.getElementById('selectUsuarioLogin');
    const selectAdminMod = document.getElementById('selectAdminCambiarPass');
    if(!selectLogin) return;

    let htmlOpts = "";
    let htmlAdminOpts = "";
    for(let u in credencialesUsuarios) {
        htmlOpts += `<option value="${u}">${u}</option>`;
        htmlAdminOpts += `<option value="${u}">${u}</option>`;
    }
    selectLogin.innerHTML = htmlOpts;
    if(selectAdminMod) selectAdminMod.innerHTML = htmlAdminOpts;
}

function copiarEnlace() { const i = document.getElementById('urlCompartir'); i.select(); navigator.clipboard.writeText(i.value); const a = document.getElementById('copiadoAlerta'); a.classList.remove('d-none'); setTimeout(() => a.classList.add('d-none'), 2000); }
function togglePassword() { const i = document.getElementById('inputPassword'), b = document.getElementById('btnTogglePass'); i.type = i.type === "password" ? "text" : "password"; b.innerHTML = i.type === "password" ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>'; }

function registrarUsuarioDesdeLogin() {
    const nombre = document.getElementById('nuevoNombreLogin').value.trim();
    const pass = document.getElementById('nuevaPassLogin').value.trim();
    if(!nombre || !pass) {
        return;
    }
    credencialesUsuarios[nombre] = { pass: pass, nombre: nombre, rol: "Operativo" };
    localStorage.setItem('bomberos_lista_usuarios', JSON.stringify(credencialesUsuarios));
    actualizarSelectoresUsuarios();
    document.getElementById('selectUsuarioLogin').value = nombre;
    document.getElementById('nuevoNombreLogin').value = "";
    document.getElementById('nuevaPassLogin').value = "";
    bootstrap.Collapse.getInstance(document.getElementById('collapseRegistroRapido'))?.hide();
    actualizarFechasActualizacion();
}

function verificarPassword() { 
    const selUser = document.getElementById('selectUsuarioLogin').value;
    const p = document.getElementById('inputPassword');
    
    if(credencialesUsuarios[selUser] && credencialesUsuarios[selUser].pass === p.value) {
        usuarioActual = credencialesUsuarios[selUser];
        
        idAccesoActual = registrarAccesoEntrada(usuarioActual);

        document.getElementById('pantallaLogin').style.display = 'none'; 
        document.getElementById('contenidoSistema').style.display = 'block'; 
        document.getElementById('labelUsuarioActivo').textContent = usuarioActual.nombre;

        if(selUser === 'Administrador General') {
            document.getElementById('itemMenuRegistroAccesos').style.display = 'block';
            document.getElementById('panelAdminGestionExtra').classList.remove('d-none');
            document.getElementById('badgeRolGestionHeader').textContent = "Exclusivo Administrador";
            renderizarTablaAdminPersonal();
        } else {
            document.getElementById('itemMenuRegistroAccesos').style.display = 'none';
            document.getElementById('panelAdminGestionExtra').classList.add('d-none');
            document.getElementById('badgeRolGestionHeader').textContent = "Personal Operativo";
        }

        document.getElementById('infoUserNombre').textContent = usuarioActual.nombre;
        document.getElementById('infoUserRol').textContent = usuarioActual.rol;
        const fechaHoraActual = new Date().toLocaleString();
        document.getElementById('infoUserUltimoAcceso').textContent = fechaHoraActual;

        cargarHistorialAccesos();

    } else { 
        document.getElementById('errorLogin').classList.remove('d-none'); 
        p.value = '';
        p.focus();
    } 
}

function cerrarSesionSistema() {
    if(usuarioActual && idAccesoActual) {
        registrarAccesoSalida(idAccesoActual);
    }
    location.reload();
}

function obtenerRangoSemana(fechaObj) {
    let d = new Date(fechaObj);
    let day = d.getDay();
    let diff = d.getDate() - day + (day === 0 ? -6 : 1);
    let lunes = new Date(d.setDate(diff));
    let domingo = new Date(d.setDate(lunes.getDate() + 6));

    const opciones = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return `${lunes.toLocaleDateString('es-ES', opciones)} al ${domingo.toLocaleDateString('es-ES', opciones)}`;
}

function registrarAccesoEntrada(userObj) {
    let historial = [];
    try {
        const guardado = localStorage.getItem('bomberos_historial_accesos');
        if(guardado) historial = JSON.parse(guardado);
    } catch(e) {}

    const ahora = new Date();
    const idUnico = 'acc_' + Date.now();
    const fechaStr = ahora.toLocaleDateString('es-ES');
    const horaEntradaStr = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    const semanaRango = obtenerRangoSemana(ahora);

    const nuevoAcceso = {
        id: idUnico,
        semana: semanaRango,
        fecha: fechaStr,
        nombre: userObj.nombre,
        rol: userObj.rol,
        horaEntrada: horaEntradaStr,
        horaSalida: "En sesión...",
        estado: "Activo"
    };
    historial.unshift(nuevoAcceso);
    localStorage.setItem('bomberos_historial_accesos', JSON.stringify(historial));
    return idUnico;
}

function registrarAccesoSalida(idAcceso) {
    let historial = [];
    try {
        const guardado = localStorage.getItem('bomberos_historial_accesos');
        if(guardado) historial = JSON.parse(guardado);
    } catch(e) {}

    const ahora = new Date();
    const horaSalidaStr = ahora.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit', second:'2-digit'});

    historial.forEach(acc => {
        if(acc.id === idAcceso) {
            acc.horaSalida = horaSalidaStr;
            acc.estado = "Finalizado";
        }
    });
    localStorage.setItem('bomberos_historial_accesos', JSON.stringify(historial));
}

function cargarHistorialAccesos() {
    let historial = [];
    try {
        const guardado = localStorage.getItem('bomberos_historial_accesos');
        if(guardado) historial = JSON.parse(guardado);
    } catch(e) {}

    renderizarTablaAccesosAdmin(historial);
}

function renderizarTablaAccesosAdmin(historial) {
    const tbody = document.getElementById('cuerpoTablaAccesos');
    if(!tbody) return;
    tbody.innerHTML = "";
    historial.forEach(acc => {
        let badgeEstado = acc.estado === "Activo" ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Finalizado</span>';
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td>${acc.fecha}</td>
                <td><strong>${acc.nombre}</strong></td>
                <td><span class="text-success fw-bold">${acc.horaEntrada}</span></td>
                <td><span class="text-danger fw-bold">${acc.horaSalida}</span></td>
                <td class="text-center">${badgeEstado}</td>
            </tr>
        `);
    });
}

function renderizarTablaAdminPersonal() {
    const tbody = document.getElementById('cuerpoTablaAdminPersonal');
    if(!tbody) return;
    tbody.innerHTML = "";
    for(let u in credencialesUsuarios) {
        let usr = credencialesUsuarios[u];
        let esAdmin = u === 'Administrador General';
        let badgeRol = esAdmin ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-secondary">Operativo</span>';
        let accionBtn = esAdmin ? '<span class="text-muted small">Protegido</span>' : `<button class="btn btn-sm btn-outline-danger" onclick="adminEliminarUsuario('${u}')"><i class="bi bi-trash"></i></button>`;
        
        tbody.insertAdjacentHTML('beforeend', `
            <tr>
                <td><strong>${u}</strong></td>
                <td><span class="text-danger fw-bold" style="font-family: monospace;">${usr.pass}</span></td>
                <td class="text-center">${badgeRol}</td>
                <td class="text-center">${accionBtn}</td>
            </tr>
        `);
    }
}

function adminCrearUsuario() {
    const nombre = document.getElementById('inputAdminNuevoNombre').value.trim();
    const pass = document.getElementById('inputAdminNuevaPass').value.trim();
    if(!nombre || !pass) {
        return;
    }
    credencialesUsuarios[nombre] = { pass: pass, nombre: nombre, rol: "Operativo" };
    localStorage.setItem('bomberos_lista_usuarios', JSON.stringify(credencialesUsuarios));
    actualizarSelectoresUsuarios();
    renderizarTablaAdminPersonal();
    document.getElementById('inputAdminNuevoNombre').value = "";
    document.getElementById('inputAdminNuevaPass').value = "";
    actualizarFechasActualizacion();
}

function adminGuardarNuevaClave() {
    const selUser = document.getElementById('selectAdminCambiarPass').value;
    const nuevaClave = document.getElementById('inputAdminNuevaClaveMod').value.trim();
    if(!nuevaClave) {
        return;
    }
    if(credencialesUsuarios[selUser]) {
        credencialesUsuarios[selUser].pass = nuevaClave;
        localStorage.setItem('bomberos_lista_usuarios', JSON.stringify(credencialesUsuarios));
        renderizarTablaAdminPersonal();
        document.getElementById('inputAdminNuevaClaveMod').value = "";
        actualizarFechasActualizacion();
    }
}

function adminEliminarUsuario(nombreUsuario) {
    if(confirm(`¿Está seguro de eliminar al usuario ${nombreUsuario}?`)) {
        delete credencialesUsuarios[nombreUsuario];
        localStorage.setItem('bomberos_lista_usuarios', JSON.stringify(credencialesUsuarios));
        actualizarSelectoresUsuarios();
        renderizarTablaAdminPersonal();
        actualizarFechasActualizacion();
    }
}

function abrirPestana(id, e, nombreApartado) { 
    if(e) e.preventDefault(); 
    const bienvenida = document.getElementById('vistaBienvenida');
    if(bienvenida) bienvenida.style.display = 'none';

    document.querySelectorAll('.tab-pane').forEach(el => {
        el.classList.remove('show', 'active');
    });
    const target = document.getElementById(id);
    if(target) {
        target.classList.add('show', 'active');
    }
    const btnPrincipal = document.getElementById('btnApartadosPrincipal');
    if (btnPrincipal && nombreApartado) {
        btnPrincipal.innerHTML = `<i class="bi bi-folder2-open me-1"></i> ${nombreApartado.toUpperCase()}`;
    }
}

function solicitarAcceso56(e) { e.preventDefault(); new bootstrap.Modal(document.getElementById('modalPassword56')).show(); }
function validarPassword56() { 
    const p = document.getElementById('inputPass56');
    if(p.value === "12345") { 
        bootstrap.Modal.getInstance(document.getElementById('modalPassword56')).hide(); 
        p.value = ''; 
        document.getElementById('errorPass56').classList.add('d-none'); 
        abrirPestana('apartado-56', null, 'Control 56'); 
    } else { 
        document.getElementById('errorPass56').classList.remove('d-none'); 
        p.value = '';
        p.focus();
    } 
}

function agregarFilaServicio(id) { 
    const tabla = document.getElementById(id);
    if(tabla) {
        tabla.getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="number" class="form-control form-control-sm cant-serv" value="0" onchange="sincronizarInventarioTotal(); guardarEstadoLocal()"></td><td><textarea class="form-control form-control-sm mat-serv" rows="1" onchange="sincronizarInventarioTotal(); guardarEstadoLocal()"></textarea></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>');
        guardarEstadoLocal();
    }
}

function agregarFilaActualizacion() {
    const tabla = document.getElementById('tablaActualizaciones');
    if(tabla) {
        tabla.getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="form-control form-control-sm" placeholder="DD/MM/AAAA" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" placeholder="Versión / Módulo" oninput="guardarEstadoLocal()"></td><td><textarea class="form-control form-control-sm" rows="1" placeholder="Descripción..." oninput="guardarEstadoLocal()"></textarea></td><td><input type="text" class="form-control form-control-sm" placeholder="Responsable" oninput="guardarEstadoLocal()"></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>');
        guardarEstadoLocal();
    }
}

function agregarFila56() { 
    document.getElementById('tabla56').getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>'); 
    guardarEstadoLocal();
}
function agregarFilaVehicular() { 
    document.getElementById('tablaVehicular').getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>'); 
    guardarEstadoLocal();
}
function agregarFilaCombustible() { 
    document.getElementById('tablaCombustible').getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="date" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="number" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td><input type="text" class="form-control form-control-sm" oninput="guardarEstadoLocal()"></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>'); 
    guardarEstadoLocal();
}
function agregarFilaInventario() { 
    document.getElementById('tablaInventario').getElementsByTagName('tbody')[0].insertAdjacentHTML('beforeend', '<tr><td><input type="text" class="form-control form-control-sm material-nombre" oninput="guardarEstadoLocal()"></td><td><select class="form-select form-select-sm" onchange="actualizarEstadoInventario(this); guardarEstadoLocal()"><option value="pieza" selected>Pieza</option><option value="servicio">Servicio</option></select></td><td><input type="number" class="form-control form-control-sm cantidad-inv" value="0" oninput="actualizarEstadoInventario(this); guardarEstadoLocal()"></td><td class="text-center"><span class="badge rounded-pill px-3 py-2 indicador-estado" style="background:#ffc107;color:#000;">Amarillo</span></td><td class="text-center"><button class="btn btn-sm btn-outline-danger" onclick="eliminarFila(this)"><i class="bi bi-x-lg"></i></button></td></tr>'); 
    guardarEstadoLocal();
}
function eliminarFila(b) { b.closest('tr').remove(); sincronizarInventarioTotal(); guardarEstadoLocal(); }

function agregarSeccionNovedad(titulo = '', contenido = '') {
    const contenedor = document.getElementById('contenedorSeccionesNovedades');
    const idUnico = 'nov_sec_' + Date.now() + Math.random().toString(36).substr(2, 5);
    
    const htmlSeccion = `
        <div class="card border mb-3 seccion-novedad-item shadow-sm" id="${idUnico}">
            <div class="card-header bg-light d-flex justify-content-between align-items-center py-2">
                <input type="text" class="form-control form-control-sm fw-bold border-0 bg-transparent titulo-sec-nov" placeholder="Título del apartado (Ej. Novedades Nocturnas)" value="${titulo}" oninput="guardarEstadoLocal()" style="max-width: 80%;">
                <button class="btn btn-sm btn-outline-danger" onclick="document.getElementById('${idUnico}').remove(); guardarEstadoLocal();" title="Eliminar este apartado"><i class="bi bi-trash"></i></button>
            </div>
            <div class="card-body">
                <textarea class="form-control contenido-sec-nov" rows="4" placeholder="Escribe los detalles de este apartado..." oninput="guardarEstadoLocal()">${contenido}</textarea>
            </div>
        </div>
    `;
    contenedor.insertAdjacentHTML('beforeend', htmlSeccion);
    guardarEstadoLocal();
}

function borrarDatosApartado(id) {
    if(id.startsWith('tabla') || id === 'tablaActualizaciones') {
        const tablaObj = document.getElementById(id);
        if(tablaObj) tablaObj.querySelector('tbody').innerHTML = "";
    } else if(id === 'apartado-novedades') {
        document.getElementById('nov-guardia').value = "";
        document.getElementById('nov-cabinero').value = "";
        document.getElementById('nov-fecha').value = "";
        document.getElementById('nov-bitacora').value = "";
        document.getElementById('contenedorSeccionesNovedades').innerHTML = "";
    }
    guardarEstadoLocal();
}

function guardarEstadoLocal() {
    actualizarFechasActualizacion();
    const seccionesNovedades = [];
    document.querySelectorAll('.seccion-novedad-item').forEach(sec => {
        seccionesNovedades.push({
            titulo: sec.querySelector('.titulo-sec-nov').value,
            contenido: sec.querySelector('.contenido-sec-nov').value
        });
    });

    const estado = {
        meses: {},
        geminiApiKey: document.getElementById('geminiApiKey')?.value || '',
        novedades: {
            guardia: document.getElementById('nov-guardia')?.value || '',
            cabinero: document.getElementById('nov-cabinero')?.value || '',
            fecha: document.getElementById('nov-fecha')?.value || '',
            bitacora: document.getElementById('nov-bitacora')?.value || '',
            seccionesExtras: seccionesNovedades
        },
        tabla56: document.getElementById('tabla56')?.tBodies[0].innerHTML || '',
        tablaVehicular: document.getElementById('tablaVehicular')?.tBodies[0].innerHTML || '',
        tablaCombustible: document.getElementById('tablaCombustible')?.tBodies[0].innerHTML || '',
        tablaInventario: document.getElementById('tablaInventario')?.tBodies[0].innerHTML || '',
        tablaActualizaciones: document.getElementById('tablaActualizaciones')?.tBodies[0].innerHTML || ''
    };
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    meses.forEach(m => {
        const tb = document.querySelector(`#tab-${m} tbody`);
        if(tb) estado.meses[m] = tb.innerHTML;
    });
    localStorage.setItem('bomberos_santiago_estado', JSON.stringify(estado));
}

function cargarEstadoLocal() {
    const guardado = localStorage.getItem('bomberos_santiago_estado');
    if(!guardado) {
        actualizarFechasActualizacion();
        return;
    }
    try {
        const est = JSON.parse(guardado);
        if(est.geminiApiKey) document.getElementById('geminiApiKey').value = est.geminiApiKey;
        if(est.novedades) {
            document.getElementById('nov-guardia').value = est.novedades.guardia || '';
            document.getElementById('nov-cabinero').value = est.novedades.cabinero || '';
            document.getElementById('nov-fecha').value = est.novedades.fecha || '';
            document.getElementById('nov-bitacora').value = est.novedades.bitacora || '';
            
            if(est.novedades.seccionesExtras && Array.isArray(est.novedades.seccionesExtras)) {
                est.novedades.seccionesExtras.forEach(sec => {
                    agregarSeccionNovedad(sec.titulo, sec.contenido);
                });
            }
        }
        if(est.tabla56) document.querySelector('#tabla56 tbody').innerHTML = est.tabla56;
        if(est.tablaVehicular) document.querySelector('#tablaVehicular tbody').innerHTML = est.tablaVehicular;
        if(est.tablaCombustible) document.querySelector('#tablaCombustible tbody').innerHTML = est.tablaCombustible;
        if(est.tablaInventario) document.querySelector('#tablaInventario tbody').innerHTML = est.tablaInventario;
        if(est.tablaActualizaciones) document.querySelector('#tablaActualizaciones tbody').innerHTML = est.tablaActualizaciones;
        if(est.meses) {
            for(const m in est.meses) {
                const tb = document.querySelector(`#tab-${m} tbody`);
                if(tb) tb.innerHTML = est.meses[m];
            }
        }
        actualizarFechasActualizacion();
    } catch(e) { console.error(e); }
}

function actualizarEstadoInventario(el) {
    const f = el.closest('tr'), c = f.querySelector('select').value, n = parseInt(f.querySelector('.cantidad-inv').value) || 0, badge = f.querySelector('.indicador-estado');
    if(c === 'servicio' || n > 20) { badge.style.background = '#198754'; badge.style.color = '#fff'; badge.textContent = 'Verde'; }
    else if(n >= 10) { badge.style.background = '#ffc107'; badge.style.color = '#000'; badge.textContent = 'Amarillo'; }
    else { badge.style.background = '#dc3545'; badge.style.color = '#fff'; badge.textContent = 'Rojo'; }
}

function sincronizarInventarioTotal() {
    const filasInventario = document.querySelectorAll('#tablaInventario tbody tr');
    filasInventario.forEach(fila => {
        let inputCant = fila.querySelector('.cantidad-inv');
        if (inputCant && !fila.dataset.stockBase) {
            fila.dataset.stockBase = inputCant.value;
        }
    });
    let movimientosMateriales = {};
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    meses.forEach(mes => {
        const tablaMes = document.querySelector(`#tab-${mes}`);
        if(tablaMes) {
            tablaMes.querySelectorAll('tbody tr').forEach(filaServicio => {
                let matUsado = filaServicio.querySelector('.mat-serv')?.value.trim().toLowerCase();
                let cantUsada = parseInt(filaServicio.querySelector('.cant-serv')?.value) || 0;
                if(matUsado && cantUsada > 0) {
                    let lista = matUsado.split(/[\n,]+/);
                    lista.forEach(item => {
                        let limpio = item.trim();
                        if(limpio) {
                            movimientosMateriales[limpio] = (movimientosMateriales[limpio] || 0) + cantUsada;
                        }
                    });
                }
            });
        }
    });
    filasInventario.forEach(fila => {
        let nombreMat = fila.querySelector('.material-nombre')?.value.trim().toLowerCase();
        let selectTipo = fila.querySelector('select');
        let inputCant = fila.querySelector('.cantidad-inv');
        let stockBase = parseInt(fila.dataset.stockBase) || 0;
        if(nombreMat && inputCant && selectTipo) {
            let totalMovimiento = movimientosMateriales[nombreMat] || 0;
            let tipoMaterial = selectTipo.value;
            let stockFinal = stockBase;
            if (tipoMaterial === 'servicio') {
                stockFinal = stockBase + totalMovimiento;
            } else {
                stockFinal = Math.max(0, stockBase - totalMovimiento);
            }
            inputCant.value = stockFinal;
            actualizarEstadoInventario(inputCant);
        }
    });
}

function exportarExcel(idTabla, nombreArchivo) {
    const tabla = document.getElementById(idTabla);
    let datos = [];
    const filas = tabla.querySelectorAll('tr');
    filas.forEach((fila) => {
        let filaDatos = [];
        const celdas = fila.querySelectorAll('th, td');
        celdas.forEach((celda, index) => {
            if (index === celdas.length - 1) return;
            let input = celda.querySelector('input, textarea, select');
            if (input) {
                filaDatos.push(input.value);
            } else {
                filaDatos.push(celda.innerText);
            }
        });
        datos.push(filaDatos);
    });
    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registro");
    XLSX.writeFile(wb, nombreArchivo);
}

function importarExcel(e, idTabla) {
    const archivo = e.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(evt) {
        try {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, {type: 'array'});
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const json = XLSX.utils.sheet_to_json(ws, {header: 1});
            const tbody = document.querySelector(`#${idTabla} tbody`);
            if(!tbody) return;
            tbody.innerHTML = ""; 
            if(json.length === 0) return;
            let indices = { num: 0, fecha: 1, servicio: 2, unidad: 3, cant: 4, mat: 5, medida: 6, rep: 7 };
            let filaInicio = 0;
            let primeraFila = json[0].map(c => c ? c.toString().toLowerCase() : '');
            if(primeraFila.some(c => c.includes('num') || c.includes('servicio') || c.includes('fecha') || c.includes('material'))) {
                filaInicio = 1;
                primeraFila.forEach((col, idx) => {
                    if(col.includes('num')) indices.num = idx;
                    else if(col.includes('fech')) indices.fecha = idx;
                    else if(col.includes('servic')) indices.servicio = idx;
                    else if(col.includes('unid') && !col.includes('medid')) indices.unidad = idx;
                    else if(col.includes('cant')) indices.cant = idx;
                    else if(col.includes('mat') || col.includes('herram')) indices.mat = idx;
                    else if(col.includes('medid')) indices.medida = idx;
                    else if(col.includes('report') || col.includes('resp')) indices.rep = idx;
                });
            }
            for(let i = filaInicio; i < json.length; i++) {
                let fila = json[i];
                if (!fila || fila.length === 0) continue;
                agregarFilaServicio(idTabla);
                let trs = tbody.querySelectorAll('tr');
                let ultimaTr = trs[trs.length - 1];
                let inputs = ultimaTr.querySelectorAll('input, textarea, select');
                inputs[0].value = fila[indices.num] !== undefined ? fila[indices.num] : '';
                inputs[1].value = fila[indices.fecha] !== undefined ? fila[indices.fecha] : '';
                inputs[2].value = fila[indices.servicio] !== undefined ? fila[indices.servicio] : '';
                inputs[3].value = fila[indices.unidad] !== undefined ? fila[indices.unidad] : '';
                inputs[4].value = fila[indices.cant] !== undefined ? fila[indices.cant] : 0;
                inputs[5].value = fila[indices.mat] !== undefined ? fila[indices.mat] : '';
                inputs[6].value = fila[indices.medida] !== undefined ? fila[indices.medida] : '';
                inputs[7].value = fila[indices.rep] !== undefined ? fila[indices.rep] : '';
            }
            sincronizarInventarioTotal();
            guardarEstadoLocal();
        } catch (err) {
            console.error("Error al importar el archivo Excel.");
        }
    };
    lector.readAsArrayBuffer(archivo);
}

function toggleApiKey() {
    const input = document.getElementById('geminiApiKey');
    const icon = document.getElementById('iconEyeKey');
    if (input.type === "password") {
        input.type = "text";
        icon.className = "bi bi-eye-slash";
    } else {
        input.type = "password";
        icon.className = "bi bi-eye";
    }
}
