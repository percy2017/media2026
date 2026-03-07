# Media2026

Sistema de gestión de archivos multimedia multi-usuario construido con Express.js, EJS, Bootstrap 5, SQLite y JavaScript moderno (ES6+).

## Características

- **Gestión de Archivos**: Sube, descarga, elimina y organiza tus archivos multimedia
- **Soporte Multi-formato**: Imágenes, videos, audio, documentos y más
- **Interfaz Moderna**: Diseño responsive con Bootstrap 5
- **Vistas Flexibles**: Vista de cuadrícula y lista
- **Organización por Carpetas**: Crea y navega por carpetas
- **Búsqueda**: Encuentra archivos rápidamente
- **Previsualización**: Ver imágenes y videos en modal integrado
- **Autenticación Segura**: Sistema de token de acceso con sesiones
- **Multi-usuario**: Múltiples usuarios con roles diferenciados
- **Roles**: Administrador y Cliente
- **Gestión de Usuarios**: Panel de administración para crear y editar usuarios
- **Directorios privados**: Cada usuario tiene su propio directorio de archivos

## Requisitos Previos

- Node.js (v14 o superior)
- npm (v6 o superior)

## Instalación

1. **Clona el repositorio o descarga los archivos**

2. **Instala las dependencias:**

```bash
npm install
```

3. **Configura las variables de entorno:**

Copia el archivo `.env.example` a `.env` y modifica los valores:

```bash
cp .env.example .env
```

4. **Inicia el servidor:**

```bash
# Modo desarrollo (con nodemon)
npm run dev

# Modo producción
npm start
```

5. **Accede a la aplicación:**

Abre tu navegador en: `http://localhost:3000`

## Configuración

Las variables de entorno se configuran en el archivo `.env`:

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `NODE_ENV` | Entorno de ejecución | `development` |
| `APP_URL` | URL de la aplicación | `http://localhost:3000` |
| `SESSION_SECRET` | Clave secreta para sesiones | `media2026-secret-key` |
| `UPLOAD_DIR` | Directorio de uploads | `./uploads` |

## Estructura del Proyecto

```
media2026/
├── app.js                 # Aplicación principal (ES6 modules)
├── database.js            # Configuración de SQLite
├── package.json           # Dependencias y scripts
├── .env                  # Variables de entorno
├── .env.example          # Ejemplo de variables de entorno
├── .gitignore           # Archivos ignorados por git
├── media2026.db         # Base de datos SQLite (se crea automáticamente)
├── public/               # Archivos estáticos
│   ├── css/
│   │   └── files.css    # Estilos de la página de archivos
│   └── js/
│       └── files.js     # JavaScript del cliente
├── uploads/             # Archivos subidos (se crea automáticamente por usuario)
│   └── {user_id}/     # Directorio privado de cada usuario
└── views/              # Plantillas EJS
    ├── index.ejs       # Página de inicio
    ├── files.ejs       # Gestor de archivos
    ├── login.ejs       # Página de login
    ├── profile.ejs     # Perfil de usuario
    ├── admin-users.ejs # Gestión de usuarios (admin)
    ├── about.ejs       # Acerca de
    └── contact.ejs     # Contacto
```

## Rutas

### Rutas Públicas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Redirige a `/login` o `/files` |
| GET | `/login` | Página de login |
| POST | `/login` | Procesa el login |
| GET | `/logout` | Cierra sesión |
| GET | `/about` | Página Acerca de |
| GET | `/contact` | Página de Contacto |

### Rutas Protegidas (requieren autenticación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/files` | Gestor de archivos |
| GET | `/files?folder=nombre` | Archivos en carpeta específica |
| POST | `/upload` | Sube archivos |
| POST | `/create-folder` | Crea una carpeta |
| DELETE | `/delete/:filename` | Elimina un archivo |
| GET | `/profile` | Perfil de usuario |
| POST | `/profile/update` | Actualizar perfil |

### Rutas de Administrador (solo admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/users` | Lista de usuarios |
| POST | `/admin/users/create` | Crear usuario |
| POST | `/admin/users/:id/delete` | Eliminar usuario |
| POST | `/admin/users/:id/update` | Actualizar usuario |

## Uso

### Login

1. Accede a `http://localhost:3000`
2. Ingresa tu token de acceso proporcionado por el administrador
3. Serás redirigido al gestor de archivos

### Token de Administrador

El token se genera automáticamente como un hash SHA-1 de 40 caracteres.

**Para crear el admin:**

1. **Opción 1:** Inicia el servidor por primera vez (`npm run dev`) y se creará automáticamente
2. **Opción 2:** Ejecuta `npm run create-admin` para crear/actualizar el token

El token se muestra en la consola al crear el usuario.

### Registro de Usuarios

Los nuevos usuarios son creados por el administrador desde el panel de administración (`/admin/users`). Cada usuario recibe un token de acceso único.

### Gestión de Usuarios (Admin)

Los administradores pueden gestionar usuarios desde `/admin/users`:
- Ver lista de usuarios
- Crear nuevos usuarios
- Eliminar usuarios (no admin)
- Cambiar roles de usuario

### Subir Archivos

- Arrastra archivos a la zona de drop
- O haz clic para seleccionar archivos
- Los archivos se suben automáticamente

### Crear Carpetas

1. Haz clic en "Nueva carpeta"
2. Ingresa el nombre de la carpeta
3. Haz clic en "Crear"

### Navegar Carpetas

- Haz clic en una carpeta para entrar
- Usa el breadcrumb para volver atrás

### Eliminar Archivos/Carpetas

1. Haz clic en el botón de eliminar (icono de papelera) en la vista de cuadrícula o lista
2. Confirma la eliminación en el diálogo de SweetAlert2
3. Las carpetas se eliminan con todo su contenido

## Tecnologías

- **Backend**: Express.js 5
- **Motor de Plantillas**: EJS 4
- **Frontend**: Bootstrap 5, Bootstrap Icons, SweetAlert2
- **JavaScript**: ES6+ (Vanilla)
- **Base de Datos**: SQLite (better-sqlite3)
- **Gestión de Archivos**: Multer
- **Sesiones**: express-session
- **Variables de Entorno**: dotenv

## Scripts Disponibles

```bash
npm start            # Inicia el servidor en modo producción
npm run dev          # Inicia el servidor en modo desarrollo con nodemon
npm run create-admin # Crea/actualiza el usuario administrador con token SHA-1
```

## Límites

- Tamaño máximo por archivo: 100MB
- Número máximo de archivos por upload: 20

## Notas

- El directorio `uploads/` se crea automáticamente si no existe
- Los archivos subidos se renombran con un timestamp + número aleatorio para evitar conflictos
- Las sesiones duran 24 horas

## Licencia

ISC
