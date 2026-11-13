'use strict';

/* ============================================================
   1. CONFIGURACIÓN GENERAL
   ============================================================ */
const CONFIG = {
  prefijo: 'mecanix.v1.',          
  locale: 'es-CR',
  moneda: 'CRC',
  horaApertura: '08:00',
  horaCierre: '17:00',
  intervaloMinutos: 30,
  kilometrajeMaximo: 2000000,
  anioMinimo: 1950,
  notasMaximo: 300
};

const ESTADOS = ['Pendiente', 'En proceso', 'Completado', 'Cancelado'];

const ESTADO_INFO = {
  'Pendiente':  { clase: 'pendiente',  icono: 'bi-hourglass-split' },
  'En proceso': { clase: 'proceso',    icono: 'bi-arrow-repeat' },
  'Completado': { clase: 'completado', icono: 'bi-check2-circle' },
  'Cancelado':  { clase: 'cancelado',  icono: 'bi-x-circle' }
};

let SERVICIOS = [];

function cargarServiciosDesdeDOM() {
  const tarjetas = document.querySelectorAll('#gridServicios .service-card');
  SERVICIOS = Array.from(tarjetas).map(tarjeta => {
    const titulo = tarjeta.querySelector('h3');
    const texto = tarjeta.querySelector('p');
    return {
      id: tarjeta.dataset.servicio,
      nombre: titulo ? titulo.textContent.trim() : '',
      descripcion: texto ? texto.textContent.trim() : '',
      precio: Number(tarjeta.dataset.precio) || 0,
      duracion: tarjeta.dataset.duracion || '',
      icono: tarjeta.dataset.icono || 'bi-wrench'
    };
  }).filter(servicio => servicio.id);
}

/* ============================================================
   2. ALMACENAMIENTO (localStorage con respaldo en memoria)
   ============================================================ */
const memoria = new Map();

const Store = {
  clave(nombre) { return CONFIG.prefijo + nombre; },

  obtener(nombre, porDefecto = null) {
    try {
      const crudo = window.localStorage.getItem(this.clave(nombre));
      if (crudo === null) return memoria.has(nombre) ? memoria.get(nombre) : porDefecto;
      return JSON.parse(crudo);
    } catch (error) {
      return memoria.has(nombre) ? memoria.get(nombre) : porDefecto;
    }
  },

  guardar(nombre, valor) {
    memoria.set(nombre, valor);
    try {
      window.localStorage.setItem(this.clave(nombre), JSON.stringify(valor));
    } catch (error) {
      console.warn('No se pudo escribir en localStorage; se usará memoria temporal.', error);
    }
  },

  borrar(nombre) {
    memoria.delete(nombre);
    try {
      window.localStorage.removeItem(this.clave(nombre));
    } catch (error) {
      console.warn('No se pudo borrar la clave', nombre, error);
    }
  }
};

/* ============================================================
   3. UTILIDADES
   ============================================================ */
function uid(prefijo = 'id') {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function hashPassword(password) {
  const texto = 'mecanix::' + String(password);
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return 'h' + (hash >>> 0).toString(16);
}

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function escapeHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearMoneda(valor) {
  try {
    return new Intl.NumberFormat(CONFIG.locale, {
      style: 'currency',
      currency: CONFIG.moneda,
      maximumFractionDigits: 0
    }).format(Number(valor) || 0);
  } catch (error) {
    return '₡' + Number(valor || 0).toLocaleString('es-CR');
  }
}

function parseFechaHora(fecha, hora) {
  const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
  const [hh, mm] = String(hora || '00:00').split(':').map(Number);
  return new Date(anio || 0, (mes || 1) - 1, dia || 1, hh || 0, mm || 0);
}

function formatearFechaCorta(fecha) {
  const valor = parseFechaHora(fecha, '00:00');
  if (isNaN(valor.getTime()) || !fecha) return '—';
  return new Intl.DateTimeFormat(CONFIG.locale, {
    day: '2-digit', month: 'short', year: 'numeric'
  }).format(valor);
}

function formatearFechaHora(fecha, hora) {
  const valor = parseFechaHora(fecha, hora);
  if (isNaN(valor.getTime()) || !fecha) return '—';
  const dia = new Intl.DateTimeFormat(CONFIG.locale, {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  }).format(valor);
  return `${dia} · ${hora || ''}`.trim();
}

function formatearFechaISO(iso) {
  if (!iso) return '—';
  const valor = new Date(iso);
  if (isNaN(valor.getTime())) return '—';
  return new Intl.DateTimeFormat(CONFIG.locale, {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(valor);
}

function isoLocal(fecha = new Date()) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function sumarDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return isoLocal(fecha);
}

function iniciales(nombre = '', apellido = '') {
  const a = String(nombre).trim().charAt(0);
  const b = String(apellido).trim().charAt(0);
  return (a + b || 'MX').toUpperCase();
}

function nombreCompleto(usuario) {
  if (!usuario) return 'Cliente no disponible';
  return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || 'Cliente';
}

function buscarServicio(id) {
  return SERVICIOS.find(s => s.id === id) || null;
}

function esEmailValido(valor) {
  return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(String(valor || '').trim());
}

function soloDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

/* Notificaciones tipo "toast" (Bootstrap) */
function notificar(mensaje, tipo = 'success') {
  const contenedor = document.getElementById('toastContainer');
  if (!contenedor) return;

  const iconos = {
    success: 'bi-check2-circle',
    error: 'bi-exclamation-octagon',
    info: 'bi-info-circle'
  };

  const elemento = document.createElement('div');
  elemento.className = `toast align-items-center ${tipo}`;
  elemento.setAttribute('role', 'alert');
  elemento.setAttribute('aria-live', 'assertive');
  elemento.setAttribute('aria-atomic', 'true');
  elemento.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <span class="toast-icon"><i class="bi ${iconos[tipo] || iconos.info}"></i></span>
        <span>${escapeHtml(mensaje)}</span>
      </div>
      <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>`;

  contenedor.appendChild(elemento);
  const instancia = new bootstrap.Toast(elemento, { delay: 4200 });
  instancia.show();
  elemento.addEventListener('hidden.bs.toast', () => elemento.remove());
}

/* ============================================================
   4. DATOS SEMILLA (primera ejecución)
   ============================================================ */
function inicializarDatos() {
  let usuarios = Store.obtener('usuarios', null);

  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    const ahora = new Date().toISOString();

    usuarios = [
      {
        id: 'usr_admin',
        nombre: 'Carlos',
        apellido: 'Jiménez',
        email: 'admin@mecanix.cr',
        telefono: '2222-3344',
        password: hashPassword('Admin123!'),
        rol: 'admin',
        creado: ahora
      },
      {
        id: 'usr_cliente',
        nombre: 'María',
        apellido: 'Rodríguez',
        email: 'cliente@mecanix.cr',
        telefono: '8888-8888',
        password: hashPassword('Cliente123!'),
        rol: 'cliente',
        creado: ahora
      },
      {
        id: 'usr_cliente2',
        nombre: 'Juan',
        apellido: 'López',
        email: 'juan@mecanix.cr',
        telefono: '8777-1234',
        password: hashPassword('Cliente123!'),
        rol: 'cliente',
        creado: ahora
      }
    ];
    Store.guardar('usuarios', usuarios);

    const anio = new Date().getFullYear();
    Store.guardar('solicitudes', [
      {
        id: uid('sol'),
        codigo: `MEC-${anio}-0001`,
        clienteId: 'usr_cliente',
        placa: 'ABC-123',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2019,
        kilometraje: 85000,
        servicioId: 'general',
        fecha: sumarDias(2),
        hora: '09:00',
        notas: 'Mantenimiento preventivo de los 85 000 km. Revisar ruido leve en suspensión delantera.',
        estado: 'Pendiente',
        creado: new Date(Date.now() - 86400000).toISOString(),
        actualizado: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: uid('sol'),
        codigo: `MEC-${anio}-0002`,
        clienteId: 'usr_cliente',
        placa: 'ABC-123',
        marca: 'Toyota',
        modelo: 'Corolla',
        anio: 2019,
        kilometraje: 82000,
        servicioId: 'aceite',
        fecha: sumarDias(-12),
        hora: '14:30',
        notas: '',
        estado: 'Completado',
        creado: new Date(Date.now() - 1209600000).toISOString(),
        actualizado: new Date(Date.now() - 1036800000).toISOString()
      },
      {
        id: uid('sol'),
        codigo: `MEC-${anio}-0003`,
        clienteId: 'usr_cliente2',
        placa: 'XYZ-789',
        marca: 'Nissan',
        modelo: 'Sentra',
        anio: 2021,
        kilometraje: 42000,
        servicioId: 'frenos',
        fecha: sumarDias(0),
        hora: '11:00',
        notas: 'El pedal de freno se siente esponjoso.',
        estado: 'En proceso',
        creado: new Date(Date.now() - 172800000).toISOString(),
        actualizado: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }

  if (!Array.isArray(Store.obtener('solicitudes', null))) {
    Store.guardar('solicitudes', []);
  }
}

/* ============================================================
   5. REPOSITORIO DE DATOS (operaciones CRUD)
   ============================================================ */
const Repo = {
  usuarios() { return Store.obtener('usuarios', []) || []; },
  guardarUsuarios(lista) { Store.guardar('usuarios', lista); },

  solicitudes() { return Store.obtener('solicitudes', []) || []; },
  guardarSolicitudes(lista) { Store.guardar('solicitudes', lista); },

  clientes() {
    return this.usuarios()
      .filter(u => u.rol === 'cliente')
      .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
  },

  usuario(id) { return this.usuarios().find(u => u.id === id) || null; },
  solicitud(id) { return this.solicitudes().find(s => s.id === id) || null; },

  solicitudesDeCliente(clienteId) {
    return this.solicitudes().filter(s => s.clienteId === clienteId);
  },

  crearSolicitud(datos) {
    const lista = this.solicitudes();
    const ahora = new Date().toISOString();
    const nueva = {
      ...datos,
      id: uid('sol'),
      codigo: generarCodigo(),
      creado: ahora,
      actualizado: ahora
    };
    lista.push(nueva);
    this.guardarSolicitudes(lista);
    return nueva;
  },

  actualizarSolicitud(id, cambios) {
    const lista = this.solicitudes();
    const indice = lista.findIndex(s => s.id === id);
    if (indice < 0) return null;
    lista[indice] = { ...lista[indice], ...cambios, actualizado: new Date().toISOString() };
    this.guardarSolicitudes(lista);
    return lista[indice];
  },

  eliminarSolicitud(id) {
    this.guardarSolicitudes(this.solicitudes().filter(s => s.id !== id));
  }
};

/* Genera un código correlativo: MEC-2026-0004 */
function generarCodigo() {
  const anio = new Date().getFullYear();
  const prefijo = `MEC-${anio}-`;
  const numeros = Repo.solicitudes()
    .map(s => s.codigo)
    .filter(codigo => typeof codigo === 'string' && codigo.startsWith(prefijo))
    .map(codigo => parseInt(codigo.slice(prefijo.length), 10))
    .filter(numero => Number.isFinite(numero));
  const siguiente = (numeros.length ? Math.max(...numeros) : 0) + 1;
  return prefijo + String(siguiente).padStart(4, '0');
}

/* ============================================================
   6. AUTENTICACIÓN Y SESIÓN
   ============================================================ */
const Auth = {
  sesion() {
    const sesion = Store.obtener('sesion', null);
    if (!sesion || !sesion.usuarioId) return null;
    return sesion;
  },

  actual() {
    const sesion = this.sesion();
    if (!sesion) return null;
    const usuario = Repo.usuario(sesion.usuarioId);
    if (!usuario) { Store.borrar('sesion'); return null; }
    return usuario;
  },

  esAdmin() {
    const usuario = this.actual();
    return !!usuario && usuario.rol === 'admin';
  },

  iniciar(email, password) {
    const correo = String(email || '').trim().toLowerCase();
    const usuario = Repo.usuarios().find(u => String(u.email).toLowerCase() === correo);

    if (!usuario || usuario.password !== hashPassword(password)) {
      return { ok: false, mensaje: 'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.' };
    }

    Store.guardar('sesion', { usuarioId: usuario.id, inicio: new Date().toISOString() });
    return { ok: true, usuario };
  },

  registrar(datos) {
    const correo = String(datos.email || '').trim().toLowerCase();
    const existe = Repo.usuarios().some(u => String(u.email).toLowerCase() === correo);
    if (existe) {
      return { ok: false, mensaje: 'Ese correo ya está registrado. Inicia sesión o usa otro correo.' };
    }

    const usuario = {
      id: uid('usr'),
      nombre: String(datos.nombre).trim(),
      apellido: String(datos.apellido).trim(),
      email: correo,
      telefono: String(datos.telefono).trim(),
      password: hashPassword(datos.password),
      rol: 'cliente',
      creado: new Date().toISOString()
    };

    const lista = Repo.usuarios();
    lista.push(usuario);
    Repo.guardarUsuarios(lista);

    Store.guardar('sesion', { usuarioId: usuario.id, inicio: new Date().toISOString() });
    return { ok: true, usuario };
  },

  actualizarPerfil(id, cambios) {
    const lista = Repo.usuarios();
    const indice = lista.findIndex(u => u.id === id);
    if (indice < 0) return null;
    lista[indice] = { ...lista[indice], ...cambios };
    Repo.guardarUsuarios(lista);
    return lista[indice];
  },

  cerrar() {
    Store.borrar('sesion');
  }
};

/* ============================================================
   7. AYUDAS DE FORMULARIOS (validación visual)
   ============================================================ */
function setFieldError(input, mensaje) {
  if (!input) return;
  input.classList.add('is-invalid');
  const campo = input.closest('.form-field');
  const feedback = campo ? campo.querySelector('.invalid-feedback') : null;
  if (feedback) {
    feedback.textContent = mensaje;
    feedback.classList.add('show');
  }
}

function limpiarErrores(scope) {
  if (!scope) return;
  scope.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  scope.querySelectorAll('.invalid-feedback.show').forEach(el => el.classList.remove('show'));
}

function limpiarErrorDe(input) {
  if (!input) return;
  input.classList.remove('is-invalid');
  const campo = input.closest('.form-field');
  const feedback = campo ? campo.querySelector('.invalid-feedback') : null;
  if (feedback) feedback.classList.remove('show');
}

function enfocarPrimerError(scope) {
  const primero = scope ? scope.querySelector('.is-invalid') : null;
  if (primero) primero.focus();
}

/* ============================================================
   8. COMPONENTES DE INTERFAZ (HTML reutilizable)
   ============================================================ */
function badgeEstado(estado) {
  const info = ESTADO_INFO[estado] || { clase: 'pendiente', icono: 'bi-hourglass-split' };
  return `<span class="badge-estado ${info.clase}"><i class="bi ${info.icono}"></i> ${escapeHtml(estado)}</span>`;
}

function statCard(tono, icono, valor, etiqueta, nota = '') {
  return `
    <article class="stat-card ${tono}">
      <div class="stat-icon"><i class="bi ${icono}"></i></div>
      <div>
        <small>${escapeHtml(etiqueta)}</small>
        <strong>${escapeHtml(String(valor))}</strong>
        ${nota ? `<span class="stat-note">${escapeHtml(nota)}</span>` : ''}
      </div>
    </article>`;
}

function emptyState(icono, titulo, texto, accion = '') {
  return `
    <div class="empty-state">
      <i class="bi ${icono}"></i>
      <h4>${escapeHtml(titulo)}</h4>
      <p>${escapeHtml(texto)}</p>
      ${accion}
    </div>`;
}

function contarEstados(lista) {
  const conteo = { total: lista.length, Pendiente: 0, 'En proceso': 0, Completado: 0, Cancelado: 0 };
  lista.forEach(s => { if (conteo[s.estado] !== undefined) conteo[s.estado] += 1; });
  return conteo;
}

/* ============================================================
   9. NAVEGACIÓN (estado de sesión en la barra superior)
   ============================================================ */
function renderNavegacion() {
  const contenedor = document.getElementById('navAuth');
  if (!contenedor) return;

  const usuario = Auth.actual();

  if (!usuario) {
    contenedor.innerHTML = `
      <a href="login.html" class="btn btn-outline-light btn-sm">Ingresar</a>
      <a href="login.html#registro" class="btn btn-brand btn-sm">Crear cuenta</a>`;
    return;
  }

  contenedor.innerHTML = `
    <a href="#panel" class="btn btn-brand btn-sm" data-action="ir-panel">
      <i class="bi bi-speedometer2"></i> Mi panel
    </a>
    <div class="dropdown">
      <button class="user-chip" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <span class="avatar-sm">${escapeHtml(iniciales(usuario.nombre, usuario.apellido))}</span>
        <span class="user-meta">
          <strong>${escapeHtml(usuario.nombre)}</strong>
          <small>${usuario.rol === 'admin' ? 'Administrador' : 'Cliente'}</small>
        </span>
        <i class="bi bi-chevron-down"></i>
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="#panel" data-action="ir-panel"><i class="bi bi-grid-1x2"></i> Mi panel</a></li>
        <li><button class="dropdown-item" type="button" data-action="editar-perfil"><i class="bi bi-person-gear"></i> Editar perfil</button></li>
        <li><hr class="dropdown-divider"></li>
        <li><button class="dropdown-item" type="button" data-action="logout"><i class="bi bi-box-arrow-right"></i> Cerrar sesión</button></li>
      </ul>
    </div>`;
}

/* ============================================================
   10. PÁGINA INSTITUCIONAL (index.html)
   ============================================================ */
let observador = null;

function observarReveals() {
  const elementos = document.querySelectorAll('.reveal:not(.is-visible)');
  if (!elementos.length) return;

  if (!('IntersectionObserver' in window)) {
    elementos.forEach(el => el.classList.add('is-visible'));
    return;
  }

  if (!observador) {
    observador = new IntersectionObserver(entradas => {
      entradas.forEach(entrada => {
        if (!entrada.isIntersecting) return;
        entrada.target.classList.add('is-visible');
        entrada.target.querySelectorAll('[data-count]').forEach(animarContador);
        observador.unobserve(entrada.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  }

  elementos.forEach(el => observador.observe(el));
}

function animarContador(elemento) {
  if (elemento.dataset.animado === 'true') return;
  elemento.dataset.animado = 'true';

  const destino = Number(elemento.dataset.count) || 0;
  const sufijo = elemento.dataset.suffix || '';
  const duracion = 1300;
  const inicio = performance.now();

  function paso(ahora) {
    const progreso = Math.min((ahora - inicio) / duracion, 1);
    const suavizado = 1 - Math.pow(1 - progreso, 3);
    const valor = Math.round(destino * suavizado);
    elemento.textContent = valor.toLocaleString('es-CR') + sufijo;
    if (progreso < 1) requestAnimationFrame(paso);
  }

  requestAnimationFrame(paso);
}
function initHeaderScroll() {
  const header = document.getElementById('siteHeader');
  if (!header) return;

  const actualizar = () => header.classList.toggle('scrolled', window.scrollY > 24);
  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
}
function initFormContacto() {
  const form = document.getElementById('formContacto');
  if (!form) return;

  const campos = {
    nombre: document.getElementById('contactoNombre'),
    email: document.getElementById('contactoEmail'),
    telefono: document.getElementById('contactoTelefono'),
    mensaje: document.getElementById('contactoMensaje')
  };

  form.addEventListener('submit', evento => {
    evento.preventDefault();
    limpiarErrores(form);
    let valido = true;

    if (campos.nombre.value.trim().length < 3) {
      setFieldError(campos.nombre, 'Escribe tu nombre completo (mínimo 3 caracteres).');
      valido = false;
    }
    if (!esEmailValido(campos.email.value)) {
      setFieldError(campos.email, 'Ingresa un correo electrónico válido.');
      valido = false;
    }
    const telefono = soloDigitos(campos.telefono.value);
    if (campos.telefono.value.trim() && (telefono.length < 8 || telefono.length > 12)) {
      setFieldError(campos.telefono, 'El teléfono debe tener entre 8 y 12 dígitos.');
      valido = false;
    }
    if (campos.mensaje.value.trim().length < 10) {
      setFieldError(campos.mensaje, 'Cuéntanos un poco más (mínimo 10 caracteres).');
      valido = false;
    }

    if (!valido) { enfocarPrimerError(form); return; }

    const mensajes = Store.obtener('mensajes', []) || [];
    mensajes.push({
      id: uid('msg'),
      nombre: campos.nombre.value.trim(),
      email: campos.email.value.trim(),
      telefono: campos.telefono.value.trim(),
      asunto: document.getElementById('contactoAsunto').value,
      mensaje: campos.mensaje.value.trim(),
      fecha: new Date().toISOString()
    });
    Store.guardar('mensajes', mensajes);

    form.reset();
    notificar('¡Gracias! Recibimos tu mensaje y te contactaremos pronto.', 'success');
  });
}

/* ============================================================
   11. PANEL: VISTA DEL CLIENTE
   ============================================================ */
let filtroCliente = 'Todas';

function renderCliente() {
  const usuario = Auth.actual();
  if (!usuario) return;

  const solicitudes = Repo.solicitudesDeCliente(usuario.id);
  const conteo = contarEstados(solicitudes);

  document.getElementById('statsCliente').innerHTML = [
    statCard('brand', 'bi-clipboard2-data', conteo.total, 'Solicitudes totales', 'Historial completo'),
    statCard('amber', 'bi-hourglass-split', conteo.Pendiente, 'Pendientes', 'Esperando confirmación'),
    statCard('blue', 'bi-arrow-repeat', conteo['En proceso'], 'En proceso', 'En el taller ahora'),
    statCard('green', 'bi-check2-circle', conteo.Completado, 'Completadas', 'Servicios finalizados')
  ].join('');

  document.getElementById('perfilAvatar').textContent = iniciales(usuario.nombre, usuario.apellido);
  document.getElementById('perfilNombre').textContent = nombreCompleto(usuario);
  document.getElementById('perfilEmail').textContent = usuario.email;
  document.getElementById('perfilTelefono').textContent = usuario.telefono || 'Sin teléfono';
  document.getElementById('perfilDesde').textContent = formatearFechaISO(usuario.creado);

  const proxima = solicitudes
    .filter(s => s.estado === 'Pendiente' || s.estado === 'En proceso')
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))[0];

  const contenedorProxima = document.getElementById('proximaCita');
  if (proxima) {
    const servicio = buscarServicio(proxima.servicioId);
    contenedorProxima.innerHTML = `
      <div class="na-label"><i class="bi bi-calendar-check"></i> Próxima cita</div>
      <strong>${escapeHtml(servicio ? servicio.nombre : 'Servicio')}</strong>
      <small>${escapeHtml(formatearFechaHora(proxima.fecha, proxima.hora))} · ${escapeHtml(proxima.codigo)}</small>`;
  } else {
    contenedorProxima.innerHTML = `
      <div class="na-label"><i class="bi bi-calendar-x"></i> Próxima cita</div>
      <strong>Sin citas programadas</strong>
      <small>Registra una nueva solicitud cuando lo necesites.</small>`;
  }

  renderListaCliente();
}

function renderListaCliente() {
  const usuario = Auth.actual();
  const contenedor = document.getElementById('tablaCliente');
  if (!usuario || !contenedor) return;

  const todas = Repo.solicitudesDeCliente(usuario.id);
  const lista = (filtroCliente === 'Todas' ? todas : todas.filter(s => s.estado === filtroCliente))
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  if (!lista.length) {
    contenedor.innerHTML = todas.length
      ? emptyState('bi-funnel', 'Sin solicitudes en este estado', 'Prueba con otro filtro para ver tus mantenimientos.')
      : emptyState(
          'bi-clipboard-plus',
          'Aún no tienes solicitudes',
          'Registra tu primer mantenimiento y podrás seguir su estado desde aquí.',
          '<button type="button" class="btn btn-brand" data-action="nueva-solicitud"><i class="bi bi-plus-lg"></i> Registrar mantenimiento</button>'
        );
    return;
  }

  contenedor.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Vehículo</th>
            <th class="d-none d-lg-table-cell">Servicio</th>
            <th>Fecha y hora</th>
            <th>Estado</th>
            <th class="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(s => filaCliente(s)).join('')}
        </tbody>
      </table>
    </div>`;
}

function filaCliente(solicitud) {
  const servicio = buscarServicio(solicitud.servicioId);
  return `
    <tr>
      <td><span class="code-chip">${escapeHtml(solicitud.codigo)}</span></td>
      <td>
        <div class="cell-stack">
          <strong><span class="plate-chip">${escapeHtml(solicitud.placa)}</span></strong>
          <small>${escapeHtml(solicitud.marca)} ${escapeHtml(solicitud.modelo)} · ${escapeHtml(solicitud.anio)}</small>
        </div>
      </td>
      <td class="d-none d-lg-table-cell">
        <div class="cell-stack">
          <strong>${escapeHtml(servicio ? servicio.nombre : 'Servicio')}</strong>
          <small>${escapeHtml(servicio ? servicio.duracion : '')}</small>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <strong>${escapeHtml(formatearFechaCorta(solicitud.fecha))}</strong>
          <small>${escapeHtml(solicitud.hora)}</small>
        </div>
      </td>
      <td>${badgeEstado(solicitud.estado)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="ver-solicitud" data-id="${solicitud.id}" title="Ver detalle" aria-label="Ver detalle de ${escapeHtml(solicitud.codigo)}">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

/* ============================================================
   12. PANEL: VISTA DEL ADMINISTRADOR
   ============================================================ */
function renderAdmin() {
  const solicitudes = Repo.solicitudes();
  const conteo = contarEstados(solicitudes);
  const clientes = Repo.clientes().length;

  document.getElementById('statsAdmin').innerHTML = [
    statCard('brand', 'bi-clipboard2-data', conteo.total, 'Solicitudes totales', 'Registros en el sistema'),
    statCard('amber', 'bi-hourglass-split', conteo.Pendiente, 'Pendientes', 'Por atender'),
    statCard('blue', 'bi-arrow-repeat', conteo['En proceso'], 'En proceso', 'En el taller'),
    statCard('green', 'bi-check2-circle', conteo.Completado, 'Completadas', 'Servicios finalizados'),
    statCard('brand', 'bi-people', clientes, 'Clientes registrados', 'Cuentas de tipo cliente')
  ].join('');

  renderListaAdmin();
}

function leerFiltrosAdmin() {
  return {
    texto: normalizar(document.getElementById('adminBuscar').value),
    estado: document.getElementById('adminEstado').value,
    servicio: document.getElementById('adminServicio').value
  };
}

function renderListaAdmin() {
  const contenedor = document.getElementById('tablaAdmin');
  if (!contenedor) return;

  const filtros = leerFiltrosAdmin();
  const todas = Repo.solicitudes();

  const lista = todas
    .filter(s => {
      if (filtros.estado && s.estado !== filtros.estado) return false;
      if (filtros.servicio && s.servicioId !== filtros.servicio) return false;
      if (!filtros.texto) return true;

      const cliente = Repo.usuario(s.clienteId);
      const servicio = buscarServicio(s.servicioId);
      const bolsa = normalizar([
        s.codigo, s.placa, s.marca, s.modelo, s.anio,
        cliente ? nombreCompleto(cliente) : '',
        cliente ? cliente.email : '',
        servicio ? servicio.nombre : ''
      ].join(' '));

      return bolsa.includes(filtros.texto);
    })
    .sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));

  document.getElementById('adminCount').textContent = `${lista.length} de ${todas.length}`;

  if (!lista.length) {
    contenedor.innerHTML = todas.length
      ? emptyState('bi-search', 'Sin resultados', 'No encontramos solicitudes con esos filtros. Prueba con otros criterios.',
          '<button type="button" class="btn btn-outline-light" data-action="limpiar-filtros-admin"><i class="bi bi-eraser"></i> Limpiar filtros</button>')
      : emptyState('bi-clipboard-x', 'Todavía no hay solicitudes', 'Cuando un cliente registre un mantenimiento aparecerá aquí.',
          '<button type="button" class="btn btn-brand" data-action="nueva-solicitud"><i class="bi bi-plus-lg"></i> Crear solicitud</button>');
    return;
  }

  contenedor.innerHTML = `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Código</th>
            <th>Cliente</th>
            <th>Vehículo</th>
            <th class="d-none d-xl-table-cell">Servicio</th>
            <th>Fecha y hora</th>
            <th>Estado</th>
            <th class="text-end">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${lista.map(s => filaAdmin(s)).join('')}
        </tbody>
      </table>
    </div>`;
}

function filaAdmin(solicitud) {
  const cliente = Repo.usuario(solicitud.clienteId);
  const servicio = buscarServicio(solicitud.servicioId);
  const info = ESTADO_INFO[solicitud.estado] || ESTADO_INFO.Pendiente;

  return `
    <tr>
      <td><span class="code-chip">${escapeHtml(solicitud.codigo)}</span></td>
      <td>
        <div class="cell-user">
          <span class="mini-avatar">${escapeHtml(iniciales(cliente?.nombre, cliente?.apellido))}</span>
          <div>
            <strong>${escapeHtml(nombreCompleto(cliente))}</strong>
            <small>${escapeHtml(cliente ? cliente.email : '—')}</small>
          </div>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <strong><span class="plate-chip">${escapeHtml(solicitud.placa)}</span></strong>
          <small>${escapeHtml(solicitud.marca)} ${escapeHtml(solicitud.modelo)} · ${escapeHtml(solicitud.anio)}</small>
        </div>
      </td>
      <td class="d-none d-xl-table-cell">
        <div class="cell-stack">
          <strong>${escapeHtml(servicio ? servicio.nombre : 'Servicio')}</strong>
          <small>${escapeHtml(servicio ? formatearMoneda(servicio.precio) : '')}</small>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <strong>${escapeHtml(formatearFechaCorta(solicitud.fecha))}</strong>
          <small>${escapeHtml(solicitud.hora)}</small>
        </div>
      </td>
      <td>
        <select class="form-select form-select-sm estado-select estado--${info.clase}"
                data-action="cambiar-estado" data-id="${solicitud.id}"
                aria-label="Cambiar estado de ${escapeHtml(solicitud.codigo)}">
          ${ESTADOS.map(estado => `<option value="${estado}" ${estado === solicitud.estado ? 'selected' : ''}>${estado}</option>`).join('')}
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-action="ver-solicitud" data-id="${solicitud.id}" title="Ver detalle" aria-label="Ver detalle de ${escapeHtml(solicitud.codigo)}">
            <i class="bi bi-eye"></i>
          </button>
          <button type="button" class="icon-btn" data-action="editar-solicitud" data-id="${solicitud.id}" title="Editar" aria-label="Editar ${escapeHtml(solicitud.codigo)}">
            <i class="bi bi-pencil"></i>
          </button>
          <button type="button" class="icon-btn danger" data-action="eliminar-solicitud" data-id="${solicitud.id}" title="Eliminar" aria-label="Eliminar ${escapeHtml(solicitud.codigo)}">
            <i class="bi bi-trash3"></i>
          </button>
        </div>
      </td>
    </tr>`;
}

/* ============================================================
   13. PANEL: RENDER PRINCIPAL SEGÚN EL ROL
   ============================================================ */
function renderPanel() {
  const panel = document.getElementById('panel');
  if (!panel) return;

  const usuario = Auth.actual();
  const aviso = document.getElementById('avisoSinSesion');

  if (!usuario) {
    panel.classList.add('d-none');
    if (aviso) aviso.classList.remove('d-none');
    return;
  }

  if (aviso) aviso.classList.add('d-none');
  panel.classList.remove('d-none');

  const esAdmin = usuario.rol === 'admin';
  document.getElementById('panelRol').textContent = esAdmin ? 'Panel administrador' : 'Panel del cliente';
  document.getElementById('panelNombre').textContent = usuario.nombre;
  document.getElementById('panelSubtitulo').textContent = esAdmin
    ? 'Consulta, crea, edita y elimina las solicitudes de mantenimiento del taller.'
    : 'Registra mantenimientos y consulta el estado de tus solicitudes.';

  document.getElementById('vistaAdmin').classList.toggle('d-none', !esAdmin);
  document.getElementById('vistaCliente').classList.toggle('d-none', esAdmin);

  if (esAdmin) renderAdmin();
  else renderCliente();
}

/* ============================================================
   14. MODAL DE SOLICITUD (crear / editar)
   ============================================================ */
function modalSolicitud() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('modalSolicitud'));
}
function modalDetalle() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalle'));
}
function modalEliminar() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEliminar'));
}
function modalPerfil() {
  return bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPerfil'));
}

function poblarSelectsFormulario() {
  document.getElementById('solicitudServicio').innerHTML =
    '<option value="">Selecciona un servicio…</option>' +
    SERVICIOS.map(s => `<option value="${s.id}">${escapeHtml(s.nombre)} — ${formatearMoneda(s.precio)} (${escapeHtml(s.duracion)})</option>`).join('');

  document.getElementById('solicitudEstado').innerHTML =
    ESTADOS.map(e => `<option value="${e}">${e}</option>`).join('');

  document.getElementById('solicitudCliente').innerHTML =
    '<option value="">Selecciona un cliente…</option>' +
    Repo.clientes().map(c =>
      `<option value="${c.id}">${escapeHtml(nombreCompleto(c))} — ${escapeHtml(c.email)}</option>`).join('');
}

function actualizarInfoCliente() {
  const select = document.getElementById('solicitudCliente');
  const info = document.getElementById('clienteInfo');
  if (!select || !info) return;

  const cliente = Repo.usuario(select.value);
  if (!cliente) {
    info.textContent = 'Selecciona el cliente al que pertenece la solicitud.';
    return;
  }
  const total = Repo.solicitudesDeCliente(cliente.id).length;
  info.textContent = `Teléfono: ${cliente.telefono || '—'} · Solicitudes registradas: ${total}`;
}

function abrirFormularioSolicitud(solicitud = null, servicioId = null) {
  const usuario = Auth.actual();
  if (!usuario) {
    window.location.href = 'login.html';
    return;
  }

  const esAdmin = usuario.rol === 'admin';
  const form = document.getElementById('formSolicitud');
  form.reset();
  limpiarErrores(form);
  poblarSelectsFormulario();

  document.getElementById('grupoCliente').classList.toggle('d-none', !esAdmin);
  document.getElementById('grupoEstado').classList.toggle('d-none', !esAdmin);

  const campoFecha = document.getElementById('solicitudFecha');
  const campoHora = document.getElementById('solicitudHora');
  campoHora.min = CONFIG.horaApertura;
  campoHora.max = CONFIG.horaCierre;

  if (solicitud) {
    document.getElementById('modalSolicitudEyebrow').textContent = 'Edición de solicitud';
    document.getElementById('modalSolicitudTitulo').textContent = `Editar ${solicitud.codigo}`;
    document.getElementById('solicitudId').value = solicitud.id;
    document.getElementById('solicitudCliente').value = solicitud.clienteId || '';
    document.getElementById('solicitudPlaca').value = solicitud.placa || '';
    document.getElementById('solicitudMarca').value = solicitud.marca || '';
    document.getElementById('solicitudModelo').value = solicitud.modelo || '';
    document.getElementById('solicitudAnio').value = solicitud.anio || '';
    document.getElementById('solicitudKilometraje').value = solicitud.kilometraje ?? '';
    document.getElementById('solicitudServicio').value = solicitud.servicioId || '';
    document.getElementById('solicitudEstado').value = solicitud.estado || 'Pendiente';
    document.getElementById('solicitudFecha').value = solicitud.fecha || '';
    document.getElementById('solicitudHora').value = solicitud.hora || '';
    document.getElementById('solicitudNotas').value = solicitud.notas || '';
    campoFecha.removeAttribute('min');
  } else {
    document.getElementById('modalSolicitudEyebrow').textContent = 'Registro de mantenimiento';
    document.getElementById('modalSolicitudTitulo').textContent = 'Nueva solicitud';
    document.getElementById('solicitudId').value = '';
    document.getElementById('solicitudEstado').value = 'Pendiente';
    if (servicioId) document.getElementById('solicitudServicio').value = servicioId;
    campoFecha.min = isoLocal();
  }

  actualizarInfoCliente();
  modalSolicitud().show();
}

function validarFormularioSolicitud() {
  const form = document.getElementById('formSolicitud');
  limpiarErrores(form);

  const esAdmin = Auth.esAdmin();
  const campos = {
    cliente: document.getElementById('solicitudCliente'),
    placa: document.getElementById('solicitudPlaca'),
    marca: document.getElementById('solicitudMarca'),
    modelo: document.getElementById('solicitudModelo'),
    anio: document.getElementById('solicitudAnio'),
    kilometraje: document.getElementById('solicitudKilometraje'),
    servicio: document.getElementById('solicitudServicio'),
    estado: document.getElementById('solicitudEstado'),
    fecha: document.getElementById('solicitudFecha'),
    hora: document.getElementById('solicitudHora'),
    notas: document.getElementById('solicitudNotas')
  };

  let valido = true;
  const editando = !!document.getElementById('solicitudId').value;

  if (esAdmin && !campos.cliente.value) {
    setFieldError(campos.cliente, 'Selecciona el cliente al que pertenece la solicitud.');
    valido = false;
  }

  const placa = campos.placa.value.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9-]{5,8}$/.test(placa)) {
    setFieldError(campos.placa, 'Ingresa una placa válida (5 a 8 caracteres: letras, números o guion).');
    valido = false;
  }

  if (campos.marca.value.trim().length < 2) {
    setFieldError(campos.marca, 'Indica la marca del vehículo.');
    valido = false;
  }
  if (campos.modelo.value.trim().length < 1) {
    setFieldError(campos.modelo, 'Indica el modelo del vehículo.');
    valido = false;
  }

  const anio = Number(campos.anio.value);
  const anioMaximo = new Date().getFullYear() + 1;
  if (!Number.isInteger(anio) || anio < CONFIG.anioMinimo || anio > anioMaximo) {
    setFieldError(campos.anio, `El año debe estar entre ${CONFIG.anioMinimo} y ${anioMaximo}.`);
    valido = false;
  }

  const kilometraje = Number(campos.kilometraje.value);
  if (!Number.isInteger(kilometraje) || kilometraje < 0 || kilometraje > CONFIG.kilometrajeMaximo) {
    setFieldError(campos.kilometraje, `El kilometraje debe ser un número entre 0 y ${CONFIG.kilometrajeMaximo.toLocaleString('es-CR')}.`);
    valido = false;
  }

  if (!buscarServicio(campos.servicio.value)) {
    setFieldError(campos.servicio, 'Selecciona el servicio que necesitas.');
    valido = false;
  }

  if (esAdmin && !ESTADOS.includes(campos.estado.value)) {
    setFieldError(campos.estado, 'Selecciona un estado válido.');
    valido = false;
  }

  if (!campos.fecha.value) {
    setFieldError(campos.fecha, 'Selecciona la fecha del mantenimiento.');
    valido = false;
  } else if (!editando && campos.fecha.value < isoLocal()) {
    setFieldError(campos.fecha, 'La fecha no puede ser anterior a hoy.');
    valido = false;
  }

  const hora = campos.hora.value;
  const formatoHora = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!formatoHora.test(hora)) {
    setFieldError(campos.hora, 'Selecciona una hora válida.');
    valido = false;
  } else if (hora < CONFIG.horaApertura || hora > CONFIG.horaCierre) {
    setFieldError(campos.hora, `La hora debe estar entre ${CONFIG.horaApertura} y ${CONFIG.horaCierre}.`);
    valido = false;
  } else if (Number(hora.slice(3)) % CONFIG.intervaloMinutos !== 0) {
    setFieldError(campos.hora, `Las citas se agendan cada ${CONFIG.intervaloMinutos} minutos (ej. 09:00 o 09:30).`);
    valido = false;
  }

  if (campos.notas.value.length > CONFIG.notasMaximo) {
    setFieldError(campos.notas, `Las notas no pueden superar ${CONFIG.notasMaximo} caracteres.`);
    valido = false;
  }

  if (!valido) enfocarPrimerError(form);
  return valido;
}

function guardarSolicitud(evento) {
  evento.preventDefault();
  if (!validarFormularioSolicitud()) return;

  const usuario = Auth.actual();
  const esAdmin = usuario.rol === 'admin';
  const id = document.getElementById('solicitudId').value;

  const datos = {
    clienteId: esAdmin ? document.getElementById('solicitudCliente').value : usuario.id,
    placa: document.getElementById('solicitudPlaca').value.toUpperCase().replace(/\s+/g, ''),
    marca: document.getElementById('solicitudMarca').value.trim(),
    modelo: document.getElementById('solicitudModelo').value.trim(),
    anio: Number(document.getElementById('solicitudAnio').value),
    kilometraje: Number(document.getElementById('solicitudKilometraje').value),
    servicioId: document.getElementById('solicitudServicio').value,
    fecha: document.getElementById('solicitudFecha').value,
    hora: document.getElementById('solicitudHora').value,
    notas: document.getElementById('solicitudNotas').value.trim(),
    estado: esAdmin ? document.getElementById('solicitudEstado').value : 'Pendiente'
  };

  if (id) {
    const actualizada = Repo.actualizarSolicitud(id, datos);
    notificar(`Solicitud ${actualizada.codigo} actualizada correctamente.`, 'success');
  } else {
    const nueva = Repo.crearSolicitud(datos);
    notificar(`Solicitud ${nueva.codigo} registrada. Estado: ${nueva.estado}.`, 'success');
  }

  modalSolicitud().hide();
  renderPanel();
}

/* ============================================================
   15. MODAL DE DETALLE
   ============================================================ */
let detalleActualId = null;

function abrirDetalle(id) {
  const solicitud = Repo.solicitud(id);
  if (!solicitud) { notificar('La solicitud ya no existe.', 'error'); return; }

  detalleActualId = id;
  const cliente = Repo.usuario(solicitud.clienteId);
  const servicio = buscarServicio(solicitud.servicioId);
  const esAdmin = Auth.esAdmin();

  document.getElementById('modalDetalleTitulo').textContent = solicitud.codigo;

  const bloqueCliente = esAdmin ? `
    <div class="detail-block">
      <h4><i class="bi bi-person"></i> Cliente</h4>
      <div class="detail-row"><span>Nombre</span><span>${escapeHtml(nombreCompleto(cliente))}</span></div>
      <div class="detail-row"><span>Correo</span><span>${escapeHtml(cliente ? cliente.email : '—')}</span></div>
      <div class="detail-row"><span>Teléfono</span><span>${escapeHtml(cliente ? (cliente.telefono || '—') : '—')}</span></div>
    </div>` : '';

  document.getElementById('detalleContenido').innerHTML = `
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      ${badgeEstado(solicitud.estado)}
      <span class="muted" style="font-size:.82rem">Creada el ${escapeHtml(formatearFechaISO(solicitud.creado))}</span>
    </div>

    <div class="detail-grid">
      ${bloqueCliente}

      <div class="detail-block">
        <h4><i class="bi bi-car-front"></i> Vehículo</h4>
        <div class="detail-row"><span>Placa</span><span class="plate-chip">${escapeHtml(solicitud.placa)}</span></div>
        <div class="detail-row"><span>Marca</span><span>${escapeHtml(solicitud.marca)}</span></div>
        <div class="detail-row"><span>Modelo</span><span>${escapeHtml(solicitud.modelo)}</span></div>
        <div class="detail-row"><span>Año</span><span>${escapeHtml(solicitud.anio)}</span></div>
        <div class="detail-row"><span>Kilometraje</span><span>${Number(solicitud.kilometraje).toLocaleString('es-CR')} km</span></div>
      </div>

      <div class="detail-block">
        <h4><i class="bi bi-wrench-adjustable"></i> Servicio</h4>
        <div class="detail-row"><span>Servicio</span><span>${escapeHtml(servicio ? servicio.nombre : '—')}</span></div>
        <div class="detail-row"><span>Duración</span><span>${escapeHtml(servicio ? servicio.duracion : '—')}</span></div>
        <div class="detail-row"><span>Precio</span><span>${servicio ? formatearMoneda(servicio.precio) : '—'}</span></div>
      </div>

      <div class="detail-block">
        <h4><i class="bi bi-calendar-event"></i> Cita</h4>
        <div class="detail-row"><span>Fecha</span><span>${escapeHtml(formatearFechaCorta(solicitud.fecha))}</span></div>
        <div class="detail-row"><span>Hora</span><span>${escapeHtml(solicitud.hora)}</span></div>
        <div class="detail-row"><span>Actualizada</span><span>${escapeHtml(formatearFechaISO(solicitud.actualizado))}</span></div>
      </div>

      <div class="detail-block" style="grid-column:1/-1">
        <h4><i class="bi bi-chat-left-text"></i> Notas del cliente</h4>
        <p class="detail-notes">${solicitud.notas ? escapeHtml(solicitud.notas) : 'Sin notas adicionales.'}</p>
      </div>
    </div>`;

  document.getElementById('detalleEditar').classList.toggle('d-none', !esAdmin);
  modalDetalle().show();
}

/* ============================================================
   16. CAMBIO DE ESTADO Y ELIMINACIÓN
   ============================================================ */
function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado)) return;
  const actualizada = Repo.actualizarSolicitud(id, { estado });
  if (!actualizada) return;
  notificar(`Estado de ${actualizada.codigo} actualizado a "${estado}".`, 'info');
  renderPanel();
}

let eliminarId = null;

function abrirConfirmacionEliminar(id) {
  const solicitud = Repo.solicitud(id);
  if (!solicitud) { notificar('La solicitud ya no existe.', 'error'); return; }

  eliminarId = id;
  const cliente = Repo.usuario(solicitud.clienteId);
  document.getElementById('eliminarCodigo').textContent = solicitud.codigo;
  document.getElementById('eliminarCliente').textContent = nombreCompleto(cliente);
  modalEliminar().show();
}

function confirmarEliminar() {
  const solicitud = Repo.solicitud(eliminarId);
  if (!solicitud) { modalEliminar().hide(); return; }

  Repo.eliminarSolicitud(eliminarId);
  modalEliminar().hide();
  eliminarId = null;
  notificar(`Solicitud ${solicitud.codigo} eliminada.`, 'success');
  renderPanel();
}

/* ============================================================
   17. EXPORTAR A CSV (administrador)
   ============================================================ */
function exportarCSV() {
  const solicitudes = Repo.solicitudes();
  if (!solicitudes.length) {
    notificar('No hay solicitudes para exportar.', 'error');
    return;
  }

  const encabezados = ['Código', 'Cliente', 'Correo', 'Teléfono', 'Placa', 'Marca', 'Modelo',
    'Año', 'Kilometraje', 'Servicio', 'Fecha', 'Hora', 'Estado', 'Notas'];

  const filas = solicitudes.map(s => {
    const cliente = Repo.usuario(s.clienteId);
    const servicio = buscarServicio(s.servicioId);
    return [
      s.codigo,
      nombreCompleto(cliente),
      cliente ? cliente.email : '',
      cliente ? cliente.telefono : '',
      s.placa, s.marca, s.modelo, s.anio, s.kilometraje,
      servicio ? servicio.nombre : '',
      s.fecha, s.hora, s.estado, s.notas || ''
    ];
  });

  const escapar = valor => `"${String(valor ?? '').replace(/"/g, '""')}"`;
  const contenido = [encabezados, ...filas].map(fila => fila.map(escapar).join(';')).join('\r\n');

  const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `mecanix-solicitudes-${isoLocal()}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);

  notificar(`Se exportaron ${solicitudes.length} solicitudes a CSV.`, 'success');
}

/* ============================================================
   18. PERFIL DEL USUARIO
   ============================================================ */
function abrirPerfil() {
  const usuario = Auth.actual();
  if (!usuario) { window.location.href = 'login.html'; return; }

  const form = document.getElementById('formPerfil');
  form.reset();
  limpiarErrores(form);

  document.getElementById('perfilInputNombre').value = usuario.nombre || '';
  document.getElementById('perfilInputApellido').value = usuario.apellido || '';
  document.getElementById('perfilInputTelefono').value = usuario.telefono || '';
  document.getElementById('perfilInputEmail').value = usuario.email || '';

  modalPerfil().show();
}

function guardarPerfil(evento) {
  evento.preventDefault();
  const usuario = Auth.actual();
  if (!usuario) return;

  const form = document.getElementById('formPerfil');
  limpiarErrores(form);

  const nombre = document.getElementById('perfilInputNombre');
  const apellido = document.getElementById('perfilInputApellido');
  const telefono = document.getElementById('perfilInputTelefono');
  let valido = true;

  if (nombre.value.trim().length < 2) { setFieldError(nombre, 'Escribe tu nombre.'); valido = false; }
  if (apellido.value.trim().length < 2) { setFieldError(apellido, 'Escribe tu apellido.'); valido = false; }

  const digitos = soloDigitos(telefono.value);
  if (digitos.length < 8 || digitos.length > 12) {
    setFieldError(telefono, 'El teléfono debe tener entre 8 y 12 dígitos.');
    valido = false;
  }

  if (!valido) { enfocarPrimerError(form); return; }

  Auth.actualizarPerfil(usuario.id, {
    nombre: nombre.value.trim(),
    apellido: apellido.value.trim(),
    telefono: telefono.value.trim()
  });

  modalPerfil().hide();
  notificar('Perfil actualizado correctamente.', 'success');
  renderNavegacion();
  renderPanel();
}

/* ============================================================
   19. INICIALIZACIÓN DE LA PÁGINA INSTITUCIONAL
   ============================================================ */
function initIndex() {
  const panel = document.getElementById('panel');

  if (panel && window.location.hash === '#panel' && !Auth.actual()) {
    window.location.replace('login.html');
    return;
  }

  renderNavegacion();
  cargarServiciosDesdeDOM();
  observarReveals();
  initHeaderScroll();
  initFormContacto();
  renderPanel();

  const selectServicio = document.getElementById('adminServicio');
  if (selectServicio) {
    selectServicio.innerHTML = '<option value="">Todos los servicios</option>' +
      SERVICIOS.map(s => `<option value="${s.id}">${escapeHtml(s.nombre)}</option>`).join('');
  }

  ['adminBuscar', 'adminEstado', 'adminServicio'].forEach(id => {
    const campo = document.getElementById(id);
    if (!campo) return;
    const evento = id === 'adminBuscar' ? 'input' : 'change';
    campo.addEventListener(evento, () => {
      if (Auth.esAdmin()) renderListaAdmin();
    });
  });

  const formSolicitud = document.getElementById('formSolicitud');
  if (formSolicitud) formSolicitud.addEventListener('submit', guardarSolicitud);

  const formPerfil = document.getElementById('formPerfil');
  if (formPerfil) formPerfil.addEventListener('submit', guardarPerfil);

  const btnEliminar = document.getElementById('btnConfirmarEliminar');
  if (btnEliminar) btnEliminar.addEventListener('click', confirmarEliminar);

  const btnEditarDetalle = document.getElementById('detalleEditar');
  if (btnEditarDetalle) {
    btnEditarDetalle.addEventListener('click', () => {
      const solicitud = Repo.solicitud(detalleActualId);
      modalDetalle().hide();
      if (solicitud && Auth.esAdmin()) abrirFormularioSolicitud(solicitud);
    });
  }

  const selectCliente = document.getElementById('solicitudCliente');
  if (selectCliente) selectCliente.addEventListener('change', actualizarInfoCliente);

  const anio = document.getElementById('year');
  if (anio) anio.textContent = new Date().getFullYear();

  if (window.location.hash === '#panel' && Auth.actual()) {
    setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }
}

/* ============================================================
   20. DELEGACIÓN DE EVENTOS (acciones con data-action)
   ============================================================ */
document.addEventListener('click', evento => {
  const objetivo = evento.target.closest('[data-action]');
  if (!objetivo) return;

  const accion = objetivo.dataset.action;

  switch (accion) {
    case 'ir-panel': {
      if (!Auth.actual()) {
        evento.preventDefault();
        window.location.href = 'login.html';
      }
      break;
    }

    case 'logout': {
      Auth.cerrar();
      notificar('Sesión cerrada. ¡Hasta pronto!', 'info');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
      break;
    }

    case 'nueva-solicitud': {
      if (!Auth.actual()) { window.location.href = 'login.html'; break; }
      abrirFormularioSolicitud();
      break;
    }

    case 'solicitar-servicio': {
      if (!Auth.actual()) { window.location.href = 'login.html'; break; }
      abrirFormularioSolicitud(null, objetivo.dataset.servicio);
      break;
    }

    case 'ver-solicitud': {
      abrirDetalle(objetivo.dataset.id);
      break;
    }

    case 'editar-solicitud': {
      if (!Auth.esAdmin()) { notificar('Solo el administrador puede editar solicitudes.', 'error'); break; }
      const solicitud = Repo.solicitud(objetivo.dataset.id);
      if (solicitud) abrirFormularioSolicitud(solicitud);
      break;
    }

    case 'eliminar-solicitud': {
      if (!Auth.esAdmin()) { notificar('Solo el administrador puede eliminar solicitudes.', 'error'); break; }
      abrirConfirmacionEliminar(objetivo.dataset.id);
      break;
    }

    case 'editar-perfil': {
      abrirPerfil();
      break;
    }

    case 'filtrar-cliente': {
      filtroCliente = objetivo.dataset.filtro || 'Todas';
      document.querySelectorAll('#filtrosCliente .chip').forEach(chip => {
        chip.classList.toggle('is-active', chip.dataset.filtro === filtroCliente);
      });
      renderListaCliente();
      break;
    }

    case 'limpiar-filtros-admin': {
      const buscar = document.getElementById('adminBuscar');
      const estado = document.getElementById('adminEstado');
      const servicio = document.getElementById('adminServicio');
      if (buscar) buscar.value = '';
      if (estado) estado.value = '';
      if (servicio) servicio.value = '';
      renderListaAdmin();
      break;
    }

    case 'exportar-csv': {
      if (!Auth.esAdmin()) break;
      exportarCSV();
      break;
    }

    case 'ir-tab': {
      const disparador = document.querySelector(`[data-bs-target="${objetivo.dataset.irTab}"]`);
      if (disparador && window.bootstrap) bootstrap.Tab.getOrCreateInstance(disparador).show();
      break;
    }
  }
});

document.addEventListener('change', evento => {
  const select = evento.target.closest('select[data-action="cambiar-estado"]');
  if (!select) return;
  cambiarEstado(select.dataset.id, select.value);
});

document.addEventListener('input', evento => {
  if (evento.target.classList && evento.target.classList.contains('is-invalid')) {
    limpiarErrorDe(evento.target);
  }
});
document.addEventListener('change', evento => {
  if (evento.target.classList && evento.target.classList.contains('is-invalid')) {
    limpiarErrorDe(evento.target);
  }
});

/* ============================================================
   21. PÁGINA DE ACCESO (login.html)
   ============================================================ */
function mostrarAlertaLogin(mensaje) {
  const alerta = document.getElementById('loginAlert');
  if (!alerta) return;
  if (!mensaje) { alerta.classList.add('d-none'); alerta.textContent = ''; return; }
  alerta.textContent = mensaje;
  alerta.classList.remove('d-none');
}

function validarLogin() {
  const form = document.getElementById('formLogin');
  limpiarErrores(form);
  mostrarAlertaLogin('');

  const email = document.getElementById('loginEmail');
  const password = document.getElementById('loginPassword');
  let valido = true;

  if (!esEmailValido(email.value)) {
    setFieldError(email, 'Ingresa un correo electrónico válido.');
    valido = false;
  }
  if (password.value.length < 1) {
    setFieldError(password, 'Escribe tu contraseña.');
    valido = false;
  }

  if (!valido) { enfocarPrimerError(form); return null; }
  return { email: email.value, password: password.value };
}

function initLoginPage() {
  const formLogin = document.getElementById('formLogin');
  const formRegistro = document.getElementById('formRegistro');
  const usuario = Auth.actual();

  const aviso = document.getElementById('authSessionNotice');
  if (usuario && aviso) {
    document.getElementById('sesionNombre').textContent = `${nombreCompleto(usuario)} (${usuario.rol})`;
    aviso.classList.remove('d-none');
  }

  if (window.location.hash === '#registro') {
    const disparador = document.getElementById('tabRegistroBtn');
    if (disparador && window.bootstrap) bootstrap.Tab.getOrCreateInstance(disparador).show();
  }

  document.querySelectorAll('[data-toggle-password]').forEach(boton => {
    boton.addEventListener('click', () => {
      const campo = document.querySelector(boton.dataset.togglePassword);
      if (!campo) return;
      const mostrando = campo.type === 'text';
      campo.type = mostrando ? 'password' : 'text';
      const icono = boton.querySelector('i');
      if (icono) icono.className = mostrando ? 'bi bi-eye' : 'bi bi-eye-slash';
    });
  });

  if (formLogin) {
    formLogin.addEventListener('submit', evento => {
      evento.preventDefault();
      const datos = validarLogin();
      if (!datos) return;

      const resultado = Auth.iniciar(datos.email, datos.password);
      if (!resultado.ok) {
        mostrarAlertaLogin(resultado.mensaje);
        return;
      }

      notificar(`Bienvenido, ${resultado.usuario.nombre}.`, 'success');
      setTimeout(() => { window.location.href = 'index.html#panel'; }, 550);
    });
  }

  const requisitos = {
    length: valor => valor.length >= 8,
    letter: valor => /[A-Za-z]/.test(valor),
    number: valor => /\d/.test(valor)
  };

  const campoPassword = document.getElementById('regPassword');
  if (campoPassword) {
    campoPassword.addEventListener('input', () => {
      const valor = campoPassword.value;
      document.querySelectorAll('#pwRequisitos li').forEach(item => {
        const cumple = requisitos[item.dataset.req] ? requisitos[item.dataset.req](valor) : false;
        item.classList.toggle('ok', cumple);
        const icono = item.querySelector('i');
        if (icono) icono.className = cumple ? 'bi bi-check-circle-fill' : 'bi bi-circle';
      });
    });
  }

  if (formRegistro) {
    formRegistro.addEventListener('submit', evento => {
      evento.preventDefault();
      limpiarErrores(formRegistro);

      const campos = {
        nombre: document.getElementById('regNombre'),
        apellido: document.getElementById('regApellido'),
        email: document.getElementById('regEmail'),
        telefono: document.getElementById('regTelefono'),
        password: document.getElementById('regPassword'),
        password2: document.getElementById('regPassword2'),
        terminos: document.getElementById('regTerminos')
      };

      let valido = true;

      if (campos.nombre.value.trim().length < 2) {
        setFieldError(campos.nombre, 'Escribe tu nombre.');
        valido = false;
      }
      if (campos.apellido.value.trim().length < 2) {
        setFieldError(campos.apellido, 'Escribe tu apellido.');
        valido = false;
      }
      if (!esEmailValido(campos.email.value)) {
        setFieldError(campos.email, 'Ingresa un correo electrónico válido.');
        valido = false;
      } else {
        const existe = Repo.usuarios().some(u => String(u.email).toLowerCase() === campos.email.value.trim().toLowerCase());
        if (existe) {
          setFieldError(campos.email, 'Ese correo ya está registrado.');
          valido = false;
        }
      }

      const digitos = soloDigitos(campos.telefono.value);
      if (digitos.length < 8 || digitos.length > 12) {
        setFieldError(campos.telefono, 'El teléfono debe tener entre 8 y 12 dígitos.');
        valido = false;
      }

      if (campos.password.value.length < 8 || !/[A-Za-z]/.test(campos.password.value) || !/\d/.test(campos.password.value)) {
        setFieldError(campos.password, 'La contraseña debe tener mínimo 8 caracteres, con letras y números.');
        valido = false;
      }
      if (campos.password2.value !== campos.password.value) {
        setFieldError(campos.password2, 'Las contraseñas no coinciden.');
        valido = false;
      }
      if (!campos.terminos.checked) {
        setFieldError(campos.terminos, 'Debes aceptar el uso de tus datos para continuar.');
        valido = false;
      }

      if (!valido) { enfocarPrimerError(formRegistro); return; }

      const resultado = Auth.registrar({
        nombre: campos.nombre.value,
        apellido: campos.apellido.value,
        email: campos.email.value,
        telefono: campos.telefono.value,
        password: campos.password.value
      });

      if (!resultado.ok) {
        setFieldError(campos.email, resultado.mensaje);
        return;
      }

      notificar(`Cuenta creada. ¡Bienvenido, ${resultado.usuario.nombre}!`, 'success');
      setTimeout(() => { window.location.href = 'index.html#panel'; }, 650);
    });
  }
}

/* ============================================================
   22. ARRANQUE DE LA APLICACIÓN
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  inicializarDatos();

  if (document.getElementById('panel')) {
    initIndex();
  }

  if (document.getElementById('formLogin') || document.getElementById('formRegistro')) {
    initLoginPage();
  }
});
