# 💰 Mi Billetera Lite — PWA

Aplicación Web Progresiva para registrar gastos diarios que funciona **100 % sin conexión**, guarda los datos localmente con **IndexedDB** y se puede **instalar** en celular o escritorio.

🔗 **Demo:** `https://<tu-usuario>.github.io/mi-billetera-lite/`

## Funcionalidades

- **Formulario de registro:** concepto, monto y categoría (Comida, Transporte, Servicios, Ocio, Otros), con validación.
- **Historial** ordenado del más reciente al más antiguo, con opción de eliminar gastos.
- **Totalizador** en la parte superior (la suma se hace en centavos para evitar errores de redondeo).
- **Indicador de conexión** (En línea / Sin conexión).
- **Botón "Instalar aplicación"** propio (evento `beforeinstallprompt`).
- **Diseño Mobile First** y responsivo.

## Arquitectura PWA

| Requisito | Implementación |
|---|---|
| Web App Manifest | `manifest.json` con `name`, `short_name`, `theme_color`, `background_color`, `display: "standalone"` e íconos 192×192 y 512×512 (`any` y `maskable`) |
| Service Worker – install | Precachea el App Shell (HTML, CSS, JS, manifest, íconos) |
| Service Worker – activate | Borra las cachés `billetera-shell-*` de versiones anteriores y toma control con `clients.claim()` |
| Service Worker – fetch | **Cache First, Network Fallback**; si no hay red ni caché en una navegación, devuelve `index.html` |
| Persistencia | IndexedDB (`mi-billetera-lite` → store `gastos`, índice por `fecha`) |
| Seguridad | Servida por HTTPS (GitHub Pages) o `localhost` en desarrollo. El contenido del usuario se inserta con `textContent` (sin inyección de HTML) |

## Estructura

```
mi-billetera-lite/
├── index.html
├── manifest.json
├── sw.js
├── css/styles.css
├── js/
│   ├── db.js      # Capa de IndexedDB
│   └── app.js     # Lógica de UI y registro del SW
└── icons/         # 192/512 any + maskable, apple-touch-icon, favicon
```

## Ejecutar en local

El Service Worker necesita `localhost` o HTTPS (no funciona abriendo el archivo con doble clic).

```bash
# Opción 1: Python
python -m http.server 8080
# Opción 2: Node
npx serve .
```

Abrir `http://localhost:8080`.

## Despliegue en GitHub Pages

```bash
git init
git add .
git commit -m "PWA Mi Billetera Lite"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/mi-billetera-lite.git
git push -u origin main
```

En GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**. En 1–2 minutos queda en `https://<tu-usuario>.github.io/mi-billetera-lite/` con HTTPS.

> Todas las rutas son relativas (`./`), así que funciona dentro de la subcarpeta de GitHub Pages sin cambios.

## Pruebas de aceptación

1. **Instalación:** abrir en Chrome → aparece el ícono de instalar en la barra de direcciones (o el botón "Instalar aplicación"). Se abre en ventana propia sin barra de direcciones.
2. **Auditoría:** DevTools → *Application → Manifest* (sin errores, sección *Installability* OK) y *Application → Service Workers* (`sw.js` activado y en ejecución).
   > Nota: desde Chrome 126 / Lighthouse 12 la categoría "PWA" se retiró de Lighthouse; la verificación equivalente está en la pestaña *Application*. En versiones anteriores, el reporte PWA de Lighthouse muestra el badge de "Installable".
3. **Offline:** DevTools → *Network → Offline* → F5. La página carga con estilos y JS.
4. **Persistencia offline:** estando offline agregar "Taxis" $150, cerrar la pestaña y volver a abrir: el gasto sigue en el historial y el total es correcto.

## Actualizar versión

Al modificar archivos del App Shell, cambia `CACHE_VERSION` en `sw.js` (ej. `'v2'`). El nuevo SW se instala, y en `activate` elimina la caché anterior.
