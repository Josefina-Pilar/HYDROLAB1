# HYDROLAB 3D – Publicación en Render

HYDROLAB es un **sitio estático**: solo HTML, CSS, JavaScript y fuentes.
No usa servidor, base de datos, Node.js ni compilación. Por eso se publica como **Render Static Site**
(gratis, con HTTPS y CDN). No hace falta un Web Service.

## Estructura

```
hydrolab-render/              ← raíz del repositorio de GitHub
├── render.yaml               Configuración de Render (opcional: para crear el sitio como Blueprint)
├── LEEME.md                  Esta guía
├── .gitignore
├── scripts/
│   └── verificar.sh          Se ejecuta en cada despliegue: comprueba que estén todos los archivos
└── public/                   ← lo que se publica (Publish Directory)
    ├── index.html
    ├── styles.css
    ├── script.js             ← acá está VIDEO_CONFIG para tu video
    ├── js/                   motor 3D, modelos y los 6 escenarios
    └── assets/
        ├── icon.svg
        ├── fonts/            Poppins y Lora (WOFF, 86 KB en total)
        └── video/            video «Arquímedes en acción» (MP4, ~18 MB) y su portada
```

## Comandos

| Paso        | Comando                                   |
|-------------|-------------------------------------------|
| Instalación | ninguno (no hay dependencias)             |
| Compilación | `bash scripts/verificar.sh` (solo verifica; no genera archivos) |
| Ejecución   | ninguno en Render: los archivos de `public/` se sirven tal cual |
| Probar en tu computadora | `python3 -m http.server 8000 --directory public` y abrir http://localhost:8000 |

## Variables de entorno

**Ninguna.** El sitio no tiene claves, contraseñas ni configuración de servidor.
El video «Arquímedes en acción» ya viene incluido y configurado en `public/script.js` (`VIDEO_CONFIG`).

## Paso a paso para publicar

1. Creá una cuenta gratuita en https://github.com y otra en https://render.com (podés entrar a Render con tu cuenta de GitHub).
2. En GitHub, creá un repositorio nuevo, por ejemplo `hydrolab` (puede ser público o privado).
3. Subí **el contenido** de la carpeta `hydrolab-render` (que `render.yaml` y `public/` queden en la raíz del repositorio).
   La forma más simple: en el repositorio vacío, tocá «uploading an existing file» y arrastrá todo.
4. En Render, tocá **New → Static Site** y conectá el repositorio.
5. Completá:
   - **Branch:** `main`
   - **Root Directory:** (vacío)
   - **Build Command:** `bash scripts/verificar.sh`
   - **Publish Directory:** `public`
6. Tocá **Create Static Site**. En uno o dos minutos Render te da el enlace público, del estilo `https://hydrolab-xxxx.onrender.com`.
7. (Opcional) Para los encabezados de caché y seguridad, en el sitio de Render andá a **Headers** y cargá los de `render.yaml`,
   o creá el sitio desde **New → Blueprint** eligiendo este repositorio: Render lee `render.yaml` y configura todo solo.

Cada vez que subas un cambio a GitHub, Render vuelve a publicar automáticamente.
Si cambiás archivos `.js` o `.css`, subí el número de versión `?v=3.0.0` en `public/index.html` (por ejemplo a `3.0.1`)
para que los navegadores descarguen la versión nueva.

## Qué se verificó

- Todos los recursos usan rutas relativas y existen con el nombre exacto (Render usa Linux, que distingue mayúsculas).
- No hay direcciones `localhost`, `127.0.0.1` ni `file://`, y no se usan archivos de tu computadora.
- No hay imágenes, texturas, sonidos ni modelos externos: todo el 3D se genera con código.
- Sirviendo `public/` por HTTP: 21 archivos con estado 200, sin errores en la consola, en tamaño computadora (1366×768) y celular (390×844).
- Peso de la página: unos 430 KB sin comprimir; el video (~18 MB) solo se descarga cuando alguien lo abre (Render además los envía comprimidos). Solo se construye el escenario de inicio al abrir; cada módulo se arma al entrar (menos de 0,15 s).
- Si la computadora es lenta, el laboratorio baja la calidad gráfica automáticamente.

## Video «Arquímedes en acción»

- Ya está incluido: `public/assets/video/arquimedes.mp4` (~18 MB) con su portada `arquimedes-portada.jpg`.
- Se abre desde el botón «Arquímedes en acción» del módulo Arquímedes.
- Al subir el repositorio a GitHub desde la web, el límite por archivo es 25 MB, así que el video entra sin problema.
- Para cambiarlo, reemplazá el archivo con el mismo nombre o poné un enlace de YouTube en `VIDEO_CONFIG.url`.
