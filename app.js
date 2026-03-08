// ========================================
// Proyecto Express + EJS + Bootstrap + ES6
// Multi-usuario con SQLite
// ========================================

// Cargar variables de entorno
import dotenv from 'dotenv';
dotenv.config();

// Importar módulos
import express from 'express';
import session from 'express-session';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Importar funciones de base de datos
import { 
    getUserByToken, 
    getUserById, 
    getAllUsers, 
    createUser, 
    updateUser, 
    deleteUser 
} from './database.js';

// Configurar multer para uploads por usuario
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Get folder from form data or query
        const folder = req.body.folder || req.query.folder || '';
        // User's configured directory (ruta)
        const userRuta = req.session.user?.ruta;
        
        if (!userRuta) {
            return cb(new Error('Ruta no configurada. Por favor configura tu directorio en Mi Perfil'));
        }
        
        // Usar la ruta del usuario directamente
        let uploadPath = userRuta;
        
        if (folder) {
            uploadPath = join(uploadPath, folder);
        }
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Configuración de __dirname para ES6
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Directorio de uploads
const UPLOAD_DIR = join(__dirname, process.env.UPLOAD_DIR || 'uploads');

// Crear directorio de uploads si no existe
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    console.log(`📁 Directorio de uploads creado: ${UPLOAD_DIR}`);
}

// Función para obtener archivos del directorio de un usuario
function getFilesFromDirectory(user, folderPath = '') {
    const userDir = getUserUploadDir(user);
    const dirPath = folderPath ? join(userDir, folderPath) : userDir;
    
    // Crear directorio del usuario si no existe
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }
    
    try {
        // Si el directorio no existe, retornamos vacío
        if (!fs.existsSync(dirPath)) {
            return [];
        }
        
        const items = fs.readdirSync(dirPath);
        
        // La ruta es absoluta, usarla directamente para la URL
        const userPath = user.ruta;
        
        const result = items.map(item => {
            const itemPath = join(dirPath, item);
            const stats = fs.statSync(itemPath);
            
            // Si es directorio, retornar como carpeta
            if (stats.isDirectory()) {
                return {
                    name: item,
                    type: 'folder',
                    size: '-',
                    date: stats.birthtime.toLocaleDateString('es-ES'),
                    url: '#'
                };
            }
            
            // Determinar tipo de archivo
            let type = 'document';
            const ext = item.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
                type = 'image';
            } else if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
                type = 'video';
            } else if (['mp3', 'wav', 'ogg', 'oga', 'flac', 'm4a', 'aac'].includes(ext)) {
                type = 'audio';
            } else if (['pdf'].includes(ext)) {
                type = 'pdf';
            } else if (TEXT_EXTENSIONS.includes(ext)) {
                type = 'text';
            }
            
            // Construir URL pública usando /userfiles/[userId]/[filename]
            const urlPath = folderPath ? `${folderPath}/${item}` : `${item}`;
            
            return {
                name: item,
                type: type,
                size: formatFileSize(stats.size),
                date: stats.birthtime.toLocaleDateString('es-ES'),
                url: `/userfiles/${user.id}/${urlPath}`
            };
        });
        
        // Ordenar: carpetas primero, luego archivos
        return result.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error('Error al leer directorio:', error);
        return [];
    }
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Configurar motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));

// Archivos estáticos (Bootstrap, CSS, JS personalizado)
app.use(express.static(join(__dirname, 'public')));

// Middleware para parsear datos de formularios
app.use(express.urlencoded({ extended: true }));

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'media2026-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Middleware para sesiones y usuario
app.use((req, res, next) => {
    req.session = req.session || {};
    res.locals.user = req.session.user || null;
    res.locals.isAdmin = req.session.user?.role === 'admin';
    next();
});

// Servir archivos de uploads (directorio base para poder listar subdirectorios)
app.use('/uploads', express.static(UPLOAD_DIR, {
    setHeaders: (res, path) => {
        // Forzar descarga para algunos tipos
        if (path.endsWith('.exe') || path.endsWith('.zip')) {
            res.set('Content-Disposition', 'attachment');
        }
    }
}));

// Ruta dinámica para servir archivos públicos (sin auth)
// Formato: /userfiles/[userId]/[filename]
// Esto permite compartir enlaces públicos de archivos subidos
app.get(/\/userfiles\/(.+)/, (req, res) => {
    const pathParts = req.params[0].split('/');
    
    // El primer segmento es el userId
    if (pathParts.length < 2) {
        return res.status(400).send('Formato de URL inválido. Use: /userfiles/[userId]/[filename]');
    }
    
    const userId = parseInt(pathParts[0]);
    const requestedPath = pathParts.slice(1).join('/');
    
    // Obtener el usuario de la base de datos
    const user = getUserById(userId);
    
    console.log('=== DEBUG ===');
    console.log('user from DB:', user);
    console.log('user.ruta:', user?.ruta);
    console.log('requestedPath:', requestedPath);
    
    if (!user || !user.ruta) {
        return res.status(400).send('Ruta no configurada');
    }
    
    // La ruta absoluta del usuario - asegurar que termina sin /
    let userPath = user.ruta;
    if (userPath.endsWith('/')) {
        userPath = userPath.slice(0, -1);
    }
    
    // Combinar la ruta del usuario con la ruta solicitada
    const filePath = join(userPath, requestedPath);
    
    console.log('userPath:', userPath);
    console.log('filePath:', filePath);
    console.log('file exists:', fs.existsSync(filePath));
    
    // Verificar que el archivo está dentro de la ruta del usuario (seguridad)
    if (!filePath.startsWith(userPath)) {
        return res.status(403).send('Acceso denegado');
    }
    
    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
        console.log('ERROR: Archivo no encontrado:', filePath);
        return res.status(404).send('Archivo no encontrado: ' + filePath);
    }
    
    // Intentar con ruta absoluta
    console.log('Intentando servir archivo con ruta absoluta...');
    res.sendFile(filePath, (err) => {
        if (err) {
            console.log('Error en sendFile:', err);
            // Fallback: leer y enviar manualmente
            console.log('Intentando servir archivo manualmente...');
            const data = fs.readFileSync(filePath);
            const ext = filePath.split('.').pop().toLowerCase();
            const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                              ext === 'png' ? 'image/png' : 
                              ext === 'gif' ? 'image/gif' : 
                              'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', data.length);
            res.end(data);
        }
    });
});

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
    if (!req.session || !req.session.authenticated) {
        return res.redirect('/login');
    }
    next();
}

// Middleware para verificar si es admin
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.authenticated || req.session.user?.role !== 'admin') {
        return res.status(403).send('Acceso denegado');
    }
    next();
}

// Directorio de archivos del usuario (ruta absoluta)
const getUserUploadDir = (user) => {
    // Usar la ruta absoluta directamente (no combinar con UPLOAD_DIR)
    return user.ruta;
};

// ========================================
// RUTAS DE API - Editor de Texto
// ========================================

// Lista de extensiones de archivos de texto permitidos para editar
const TEXT_EXTENSIONS = [
    'txt', 'log', 'csv', 'ini', 'cfg', 'conf', 'config',
    'json', 'jsonl', 'xml', 'yaml', 'yml',
    'html', 'htm', 'css', 'scss', 'sass', 'less',
    'js', 'ts', 'mjs', 'cjs', 'jsx', 'tsx',
    'py', 'pyw',
    'java', 'c', 'cpp', 'h', 'hpp', 'cs',
    'go', 'rs', 'php', 'rb', 'swift', 'kt', 'scala',
    'sh', 'bash', 'zsh', 'bat', 'ps1', 'cmd',
    'sql', 'ddl', 'dml',
    'md', 'markdown', 'tex', 'rst',
    'toml', 'env', 'gitignore', 'dockerfile',
    'api', 'vue', 'svelte', 'jsx', 'tsx'
];

// Función para verificar si un archivo es de texto
function isTextFile(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    return TEXT_EXTENSIONS.includes(ext);
}

// Función para obtener el modo de CodeMirror según la extensión
function getCodeMirrorMode(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const modeMap = {
        'js': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
        'ts': 'javascript', 'tsx': 'javascript', 'jsx': 'javascript',
        'json': { name: 'javascript', json: true },
        'jsonl': { name: 'javascript', json: true },
        'html': 'htmlmixed', 'htm': 'htmlmixed',
        'css': 'css', 'scss': 'css', 'sass': 'css', 'less': 'css',
        'xml': 'xml', 'svg': 'xml',
        'yaml': 'yaml', 'yml': 'yaml',
        'py': 'python', 'pyw': 'python',
        'java': 'java',
        'c': 'clike', 'cpp': 'clike', 'h': 'clike', 'hpp': 'clike',
        'cs': 'clike',
        'go': 'go',
        'rs': 'rust',
        'php': 'php',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin', 'scala': 'scala',
        'sh': 'shell', 'bash': 'shell', 'zsh': 'shell', 'bat': 'shell', 'ps1': 'powershell', 'cmd': 'shell',
        'sql': 'sql',
        'md': 'markdown', 'markdown': 'markdown',
        'tex': 'stex',
        'rst': 'rst',
        'toml': 'toml',
        'ini': 'properties', 'cfg': 'properties', 'conf': 'properties', 'config': 'properties',
        'env': 'shell', 'gitignore': 'shell',
        'dockerfile': 'dockerfile',
        'vue': 'htmlmixed', 'svelte': 'htmlmixed'
    };
    return modeMap[ext] || 'text';
}

// Ruta GET /api/file/read - Lee contenido de archivo de texto
app.get('/api/file/read', requireAuth, express.json(), (req, res) => {
    const { file } = req.query;
    
    if (!file) {
        return res.status(400).json({ error: 'Archivo no especificado' });
    }
    
    const user = req.session.user;
    const userDir = getUserUploadDir(user);
    const filePath = join(userDir, file);
    
    // Verificar que el archivo está dentro de la ruta del usuario (seguridad)
    if (!filePath.startsWith(userDir)) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Verificar que es un archivo de texto permitido
    const fileName = file.split('/').pop();
    if (!isTextFile(fileName)) {
        return res.status(400).json({ error: 'Tipo de archivo no editable' });
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const stats = fs.statSync(filePath);
        const mode = getCodeMirrorMode(fileName);
        
        res.json({
            success: true,
            content: content,
            filename: fileName,
            path: file,
            size: formatFileSize(stats.size),
            mode: mode,
            lastModified: stats.mtime.toLocaleString('es-ES')
        });
    } catch (error) {
        console.error('Error al leer archivo:', error);
        res.status(500).json({ error: 'Error al leer el archivo: ' + error.message });
    }
});

// Ruta POST /api/file/save - Guarda contenido de archivo de texto
app.post('/api/file/save', requireAuth, express.json(), (req, res) => {
    const { file, content } = req.body;
    
    if (!file) {
        return res.status(400).json({ error: 'Archivo no especificado' });
    }
    
    if (content === undefined) {
        return res.status(400).json({ error: 'Contenido no especificado' });
    }
    
    const user = req.session.user;
    const userDir = getUserUploadDir(user);
    const filePath = join(userDir, file);
    
    // Verificar que el archivo está dentro de la ruta del usuario (seguridad)
    if (!filePath.startsWith(userDir)) {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    
    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Verificar que es un archivo de texto permitido
    const fileName = file.split('/').pop();
    if (!isTextFile(fileName)) {
        return res.status(400).json({ error: 'Tipo de archivo no editable' });
    }
    
    try {
        fs.writeFileSync(filePath, content, 'utf-8');
        res.json({ success: true, message: 'Archivo guardado exitosamente' });
    } catch (error) {
        console.error('Error al guardar archivo:', error);
        res.status(500).json({ error: 'Error al guardar el archivo: ' + error.message });
    }
});

// Ruta GET /editor - Vista del editor de texto
app.get('/editor', requireAuth, (req, res) => {
    const { file } = req.query;
    
    if (!file) {
        return res.redirect('/files');
    }
    
    const user = req.session.user;
    const userDir = getUserUploadDir(user);
    const filePath = join(userDir, file);
    const fileName = file.split('/').pop();
    
    // Verificar que el archivo es de texto
    if (!isTextFile(fileName)) {
        return res.redirect('/files?folder=' + encodeURIComponent(file.replace(fileName, '').replace(/\/$/, '')));
    }
    
    const mode = getCodeMirrorMode(fileName);
    
    res.render('editor', {
        user: req.session.user,
        titulo: 'Editar: ' + fileName,
        file: file,
        filename: fileName,
        mode: mode,
        currentFolder: file.replace(fileName, '').replace(/\/$/, '')
    });
});

// ========================================
// RUTAS
// ========================================

// Ruta principal - Redirigir a login
app.get('/', (req, res) => {
    if (req.session.authenticated) {
        res.redirect('/files');
    } else {
        res.redirect('/login');
    }
});

// Ruta /login - Formulario de login
app.get('/login', (req, res) => {
    if (req.session.authenticated) {
        return res.redirect('/files');
    }
    
    res.render('login', {
        error: null
    });
});

// Ruta /login - Procesar login con token
app.post('/login', (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.render('login', {
            error: 'Por favor ingresa tu token'
        });
    }
    
    const user = getUserByToken(token);
    
    if (!user) {
        return res.render('login', {
            error: 'Token inválido'
        });
    }
    
    req.session.authenticated = true;
    req.session.user = {
        id: user.id,
        token: user.token,
        name: user.name || 'Usuario',
        role: user.role,
        ruta: user.ruta
    };
    
    res.redirect('/files');
});

// Ruta /logout - Cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Ruta /admin/users - Lista de usuarios (solo admin)
app.get('/admin/users', requireAuth, requireAdmin, (req, res) => {
    const users = getAllUsers();
    res.render('admin-users', {
        users: users,
        titulo: 'Gestión de Usuarios'
    });
});

// Ruta /admin/users - Crear usuario (solo admin)
app.post('/admin/users/create', requireAuth, requireAdmin, express.json(), (req, res) => {
    const { token, name, role, ruta } = req.body;
    
    if (!token) {
        return res.status(400).json({ error: 'Token es requerido' });
    }
    
    // Crear el directorio del usuario si no existe
    if (ruta && !fs.existsSync(ruta)) {
        try {
            fs.mkdirSync(ruta, { recursive: true });
            console.log('📁 Directorio creado:', ruta);
        } catch (dirError) {
            console.error('Error al crear directorio:', dirError);
            return res.status(500).json({ error: 'No se pudo crear el directorio: ' + dirError.message });
        }
    }
    
    const result = createUser(token, role || 'cliente', ruta || '', name || '');
    
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true, message: 'Usuario creado exitosamente' });
});

// Ruta /admin/users/:id/delete - Eliminar usuario (solo admin)
app.post('/admin/users/:id/delete', requireAuth, requireAdmin, express.json(), (req, res) => {
    const userId = parseInt(req.params.id);
    
    // No permitir eliminarse a sí mismo
    if (userId === req.session.user.id) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    
    try {
        deleteUser(userId);
        res.json({ success: true, message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// Ruta /admin/users/:id/update - Actualizar usuario (solo admin)
app.post('/admin/users/:id/update', requireAuth, requireAdmin, express.json(), (req, res) => {
    const userId = parseInt(req.params.id);
    const { token, name, role, ruta } = req.body;
    
    const data = {};
    if (token) data.token = token;
    if (name !== undefined) data.name = name;
    if (role) data.role = role;
    if (ruta !== undefined) data.ruta = ruta;
    
    try {
        updateUser(userId, data);
        res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

// Ruta /profile - Mi perfil
app.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {
        user: req.session.user,
        titulo: 'Mi Perfil'
    });
});

// Ruta /profile/update - Actualizar mi perfil (nombre y ruta)
app.post('/profile/update', requireAuth, express.json(), (req, res) => {
    const userId = req.session.user.id;
    const { name, ruta } = req.body;
    
    try {
        const data = {};
        if (ruta !== undefined) {
            // Crear el directorio si no existe
            if (ruta && !fs.existsSync(ruta)) {
                try {
                    fs.mkdirSync(ruta, { recursive: true });
                } catch (dirError) {
                    console.error('Error al crear directorio:', dirError);
                    return res.status(500).json({ error: 'No se pudo crear el directorio: ' + dirError.message });
                }
            }
            data.ruta = ruta;
        }
        if (name !== undefined) data.name = name;
        
        updateUser(userId, data);
        
        // Actualizar la sesión
        if (ruta) req.session.user.ruta = ruta;
        if (name) req.session.user.name = name;
        
        res.json({ success: true, message: 'Perfil actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// Ruta /create-folder - Crear carpeta (protegida)
app.post('/create-folder', requireAuth, express.json(), (req, res) => {
    const { folderName } = req.body;
    
    if (!folderName) {
        return res.status(400).json({ error: 'Nombre de carpeta requerido' });
    }
    
    // Sanitize folder name
    const sanitizedName = folderName.replace(/[^a-zA-Z0-9\-_\s]/g, '').trim();
    const user = req.session.user;
    const folderPath = join(getUserUploadDir(user), sanitizedName);
    
    try {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'La carpeta ya existe' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al crear la carpeta' });
    }
});

// Ruta /files - Vista de archivos (protegida)
app.get('/files', requireAuth, (req, res) => {
    const user = req.session.user;
    const folder = req.query.folder || '';
    const breadcrumb = folder ? folder.split('/') : [];
    
    const files = getFilesFromDirectory(user, folder);
    
    res.render('files', {
        files: files,
        user: req.session.user,
        currentFolder: folder,
        breadcrumb: breadcrumb,
        uploadError: null,
        uploadSuccess: null
    });
});

// Ruta /upload - Subir archivos (protegida)
app.post('/upload', requireAuth, upload.array('files', 20), (req, res) => {
    const user = req.session.user;
    const folder = req.body.folder || req.query.folder || '';
    
    const files = getFilesFromDirectory(user, folder);
    
    res.render('files', {
        files: files,
        user: req.session.user,
        currentFolder: folder,
        breadcrumb: folder.split('/'),
        uploadError: null,
        uploadSuccess: req.files ? `${req.files.length} archivo(s) subido(s) exitosamente` : null
    });
});

// Ruta /delete - Eliminar archivo o carpeta (protegida)
app.delete('/delete', requireAuth, express.json(), (req, res) => {
    const { path: deletePath } = req.body;
    const user = req.session.user;
    const userDir = getUserUploadDir(user);
    const filePath = join(userDir, deletePath);
    
    try {
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                // Es una carpeta - eliminarla recursively
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                // Es un archivo - eliminarlo
                fs.unlinkSync(filePath);
            }
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Archivo no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar: ' + error.message });
    }
});

// Ruta /about - Acerca de
app.get('/about', (req, res) => {
    res.render('about', {
        titulo: 'Acerca de',
        mensaje: 'Somos un equipo dedicado a crear experiencias web increíbles.'
    });
});

// Ruta /contacto - Contacto
app.get('/contact', (req, res) => {
    res.render('contact', {
        titulo: 'Contacto',
        email: 'info@media2026.com',
        telefono: '+1 234 567 890'
    });
});

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`📁 Directorio del proyecto: ${__dirname}`);
});
