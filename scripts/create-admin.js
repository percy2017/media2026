// Script para crear el usuario administrador
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'media2026.db');
const db = new Database(DB_PATH);

// Generar token SHA-1
function generateToken() {
    return crypto.createHash('sha1')
        .update(crypto.randomBytes(16).toString('hex'))
        .digest('hex');
}

// Verificar si ya existe un admin
const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');

if (adminExists) {
    // Actualizar token del admin existente
    const newToken = generateToken();
    db.prepare('UPDATE users SET token = ?, name = ? WHERE role = ?').run(newToken, 'admin', 'admin');
    console.log('✓ Admin actualizado');
    console.log('  Token:', newToken);
} else {
    // Crear nuevo admin
    const token = generateToken();
    db.prepare('INSERT INTO users (token, name, role, ruta) VALUES (?, ?, ?, ?)').run(token, 'admin', 'admin', '');
    console.log('✓ Admin creado');
    console.log('  Token:', token);
}

db.close();
