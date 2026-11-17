/**
 * app.js — Lógica de la interfaz de Mi Billetera Lite.
 */
(() => {
  'use strict';

  const ICONOS = {
    Comida: '🍔',
    Transporte: '🚌',
    Servicios: '💡',
    Ocio: '🎮',
    Otros: '📦',
  };

  const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const fechaFmt = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  // ---------- Referencias al DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const form = $('#form-gasto');
  const inConcepto = $('#concepto');
  const inMonto = $('#monto');
  const inCategoria = $('#categoria');
  const errConcepto = $('#err-concepto');
  const errMonto = $('#err-monto');
  const lista = $('#lista-gastos');
  const vacio = $('#vacio');
  const totalEl = $('#total');
  const totalCount = $('#total-count');
  const btnBorrarTodo = $('#btn-borrar-todo');
  const btnInstalar = $('#btn-instalar');
  const estadoRed = $('#estado-red');
  const toast = $('#toast');

  // ---------- Render ----------
  async function render() {
    let gastos = [];
    try {
      gastos = await BilleteraDB.obtenerTodos();
    } catch (err) {
      console.error('Error leyendo IndexedDB', err);
      mostrarToast('No se pudieron leer los gastos');
    }

    // Totalizador: se suma en centavos para evitar errores de punto flotante
    const totalCentavos = gastos.reduce((acc, g) => acc + Math.round(g.monto * 100), 0);
    totalEl.textContent = moneda.format(totalCentavos / 100);
    totalCount.textContent = `${gastos.length} ${gastos.length === 1 ? 'gasto registrado' : 'gastos registrados'}`;

    lista.replaceChildren(...gastos.map(crearItem));
    vacio.hidden = gastos.length > 0;
    btnBorrarTodo.hidden = gastos.length === 0;
  }

  function crearItem(g) {
    const li = document.createElement('li');
    li.className = 'gasto';
    li.dataset.id = g.id;

    const icono = document.createElement('span');
    icono.className = 'gasto__icono';
    icono.setAttribute('aria-hidden', 'true');
    icono.textContent = ICONOS[g.categoria] || ICONOS.Otros;

    const info = document.createElement('div');
    info.className = 'gasto__info';
    const concepto = document.createElement('p');
    concepto.className = 'gasto__concepto';
    concepto.textContent = g.concepto; // textContent evita inyección de HTML
    const meta = document.createElement('p');
    meta.className = 'gasto__meta';
    meta.textContent = `${g.categoria} · ${fechaFmt.format(new Date(g.fecha))}`;
    info.append(concepto, meta);

    const monto = document.createElement('span');
    monto.className = 'gasto__monto';
    monto.textContent = moneda.format(g.monto);

    const borrar = document.createElement('button');
    borrar.className = 'gasto__borrar';
    borrar.type = 'button';
    borrar.dataset.accion = 'borrar';
    borrar.setAttribute('aria-label', `Eliminar ${g.concepto}`);
    borrar.textContent = '✕';

    li.append(icono, info, monto, borrar);
    return li;
  }

  // ---------- Validación ----------
  function validar() {
    let ok = true;
    const concepto = inConcepto.value.trim();
    const monto = parseFloat(inMonto.value);

    if (!concepto) {
      errConcepto.textContent = 'Escribe un concepto.';
      inConcepto.setAttribute('aria-invalid', 'true');
      ok = false;
    } else {
      errConcepto.textContent = '';
      inConcepto.removeAttribute('aria-invalid');
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      errMonto.textContent = 'Ingresa un monto mayor a 0.';
      inMonto.setAttribute('aria-invalid', 'true');
      ok = false;
    } else {
      errMonto.textContent = '';
      inMonto.removeAttribute('aria-invalid');
    }

    return ok ? { concepto, monto: Math.round(monto * 100) / 100 } : null;
  }

  // ---------- Eventos ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = validar();
    if (!datos) return;

    const gasto = {
      concepto: datos.concepto,
      monto: datos.monto,
      categoria: inCategoria.value,
      fecha: Date.now(),
    };

    try {
      await BilleteraDB.agregar(gasto);
      form.reset();
      inConcepto.focus();
      await render();
      mostrarToast(`Guardado: ${gasto.concepto} ${moneda.format(gasto.monto)}`);
    } catch (err) {
      console.error(err);
      mostrarToast('No se pudo guardar el gasto');
    }
  });

  // Delegación de eventos para borrar un gasto
  lista.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-accion="borrar"]');
    if (!btn) return;
    const id = Number(btn.closest('.gasto').dataset.id);
    await BilleteraDB.eliminar(id);
    await render();
    mostrarToast('Gasto eliminado');
  });

  btnBorrarTodo.addEventListener('click', async () => {
    if (!confirm('¿Borrar todo el historial? Esta acción no se puede deshacer.')) return;
    await BilleteraDB.limpiar();
    await render();
    mostrarToast('Historial borrado');
  });

  // ---------- Indicador de conexión ----------
  function actualizarRed() {
    const online = navigator.onLine;
    estadoRed.textContent = online ? 'En línea' : 'Sin conexión';
    estadoRed.classList.toggle('offline', !online);
  }
  window.addEventListener('online', actualizarRed);
  window.addEventListener('offline', () => {
    actualizarRed();
    mostrarToast('Sin conexión: tus gastos se siguen guardando');
  });

  // ---------- Instalación (botón propio) ----------
  let eventoInstalacion = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalacion = e;
    btnInstalar.hidden = false;
  });
  btnInstalar.addEventListener('click', async () => {
    if (!eventoInstalacion) return;
    eventoInstalacion.prompt();
    await eventoInstalacion.userChoice;
    eventoInstalacion = null;
    btnInstalar.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    btnInstalar.hidden = true;
    mostrarToast('¡App instalada!');
  });

  // ---------- Toast ----------
  let toastTimer;
  function mostrarToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ---------- Registro del Service Worker ----------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => console.log('[App] Service Worker registrado, scope:', reg.scope))
        .catch((err) => console.error('[App] Error registrando el Service Worker', err));
    });
  }

  // ---------- Inicio ----------
  actualizarRed();
  render();
})();
