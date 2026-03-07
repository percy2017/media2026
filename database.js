// ========================================
// Configuración de Base de Datos SQLite
// ========================================

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ruta de la base de datos
const DB_PATH = join(__dirname, 'media2026.db');

// Inicializar base de datos
const db = new Database(DB_PATH);

// Crear tablas si no existen
function initializeDatabase() {
    // Verificar si las tablas ya existen
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    
    if (!tableExists) {
        // Tabla de usuarios (token, nombre, rol, ruta)
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token TEXT UNIQUE NOT NULL,
                name TEXT DEFAULT '',
                role TEXT DEFAULT 'cliente' CHECK(role IN ('admin', 'cliente')),
                ruta TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Tabla de archivos subidos por usuarios
        db.exec(`
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                original_name TEXT NOT NULL,
                filepath TEXT NOT NULL,
                mimetype TEXT,
                size INTEGER,
                folder TEXT DEFAULT '',
                uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    }

    // Verificar si existe un admin por defecto
    const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
    
    if (!adminExists) {
        // Crear admin por defecto: token = admin
        db.prepare(`
            INSERT INTO users (token, name, role, ruta)
            VALUES (?, ?, ?, ?)
        `).run('admin', 'Administrador', 'admin', 'C:\\Users\\percy\\Desktop\\media2026\\uploads');
        
        console.log('✓ Usuario administrador creado: token = admin, name = Administrador');
    }
    
    // Agregar columna 'name' si no existe
    try {
        db.exec('ALTER TABLE users ADD COLUMN name TEXT DEFAULT ""');
    } catch (e) {
        // Columna ya existe, ignore error
    }

    console.log('✓ Base de datos inicializada correctamente');
    
    // Migrar tokens existentes a formato SHA-1
    migrateTokens();
}

// Migrar tokens existentes a formato SHA-1
export function migrateTokens() {
    const users = db.prepare('SELECT id, token FROM users').all();
    
    for (const user of users) {
        // Si el token no tiene formato SHA-1 (40 caracteres), actualizarlo
        if (!user.token || user.token.length !== 40 || !/^[a-f0-9]{40}$/.test(user.token)) {
            const newToken = generateToken();
            db.prepare('UPDATE users SET token = ? WHERE id = ?').run(newToken, user.id);
            console.log(`✓ Token actualizado para usuario ID ${user.id}: ${newToken}`);
        }
    }
    console.log('✓ Migración de tokens completada');
}

// Funciones de usuario

// Buscar usuario por token
export function getUserByToken(token) {
    return db.prepare('SELECT * FROM users WHERE token = ?').get(token);
}

// Buscar usuario por ID
export function getUserById(id) {
    return db.prepare('SELECT id, token, name, role, ruta, created_at FROM users WHERE id = ?').get(id);
}

// Obtener todos los usuarios (solo admin)
export function getAllUsers() {
    return db.prepare('SELECT id, token, name, role, ruta, created_at FROM users ORDER BY created_at DESC').all();
}

// Generar token SHA-1 (40 caracteres hexadecimal)
function generateToken() {
    return crypto.createHash('sha1')
        .update(crypto.randomBytes(16).toString('hex'))
        .digest('hex');
}

// Crear usuario
export function createUser(token, role = 'cliente', ruta = '', name = '') {
    // Si no se proporciona token, generar uno SHA-1
    if (!token) {
        token = generateToken();
    }
    const stmt = db.prepare(`
        INSERT INTO users (token, name, role, ruta)
        VALUES (?, ?, ?, ?)
    `);
    
    try {
        const result = stmt.run(token, name, role, ruta);
        return { success: true, id: result.lastInsertRowid };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Actualizar usuario
export function updateUser(id, data) {
    const fields = [];
    const values = [];
    
    if (data.token) {
        fields.push('token = ?');
        values.push(data.token);
    }
    if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
    }
    if (data.role) {
        fields.push('role = ?');
        values.push(data.role);
    }
    if (data.ruta !== undefined) {
        fields.push('ruta = ?');
        values.push(data.ruta);
    }
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    return stmt.run(...values);
}

// Eliminar usuario
export function deleteUser(id) {
    return db.prepare('DELETE FROM users WHERE id = ? AND role != ?').run(id, 'admin');
}

// Inicializar base de datos al importar
initializeDatabase();

export default db;
