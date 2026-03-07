/**
 * Editor JavaScript - Media2026
 * CodeMirror Professional Editor
 */

let editor = null;
let originalContent = '';
let hasChanges = false;

// Initialize editor on page load
document.addEventListener('DOMContentLoaded', function() {
    loadFileContent();
});

// Load file content from API
async function loadFileContent() {
    const file = window.editorConfig?.file;
    if (!file) {
        showError('Archivo no especificado');
        return;
    }

    try {
        const response = await fetch(`/api/file/read?file=${encodeURIComponent(file)}`);
        const data = await response.json();

        if (data.success) {
            // Set file info
            document.getElementById('fileSize').textContent = data.size;
            document.getElementById('lastModified').innerHTML = `<i class="bi bi-clock me-1"></i>${data.lastModified}`;
            document.getElementById('languageBadge').textContent = getLanguageName(data.mode);

            // Store original content
            originalContent = data.content;

            // Initialize CodeMirror
            initializeEditor(data.content, data.mode);
        } else {
            showError(data.error || 'Error al cargar el archivo');
        }
    } catch (error) {
        console.error('Error loading file:', error);
        showError('Error de conexión al cargar el archivo');
    }
}

// Initialize CodeMirror editor
function initializeEditor(content, mode) {
    const textArea = document.getElementById('codeEditor');
    
    // Create CodeMirror instance
    editor = CodeMirror.fromTextArea(textArea, {
        mode: mode,
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        indentUnit: 4,
        tabSize: 4,
        indentWithTabs: false,
        styleActiveLine: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        autoCloseTags: true,
        extraKeys: {
            'Ctrl-S': saveFile,
            'Cmd-S': saveFile,
            'Ctrl-F': find,
            'Cmd-F': find,
            'Ctrl-H': replace,
            'Cmd-H': replace,
            'Ctrl-/': toggleComment,
            'Cmd-/': toggleComment,
            'Tab': indentMore,
            'Shift-Tab': indentLess,
            'Ctrl-Z': undo,
            'Cmd-Z': undo,
            'Ctrl-Y': redo,
            'Cmd-Y': redo,
            'Ctrl-A': 'selectAll'
        },
        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
        foldGutter: true,
        scrollbarStyle: 'simple'
    });

    // Set content
    editor.setValue(content);

    // Track changes
    editor.on('change', function() {
        const currentContent = editor.getValue();
        hasChanges = currentContent !== originalContent;
        updateSaveStatus(hasChanges);
    });

    // Track cursor position
    editor.on('cursorActivity', function() {
        updateCursorPosition();
    });

    // Focus editor
    editor.focus();
}

// Update cursor position display
function updateCursorPosition() {
    const cursor = editor.getCursor();
    const position = `Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`;
    document.getElementById('cursorPosition').innerHTML = `<i class="bi bi-cursor me-1"></i>${position}`;
}

// Update save status
function updateSaveStatus(changes) {
    const statusEl = document.getElementById('saveStatus');
    if (changes) {
        statusEl.className = 'text-warning';
        statusEl.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Sin guardar';
    } else {
        statusEl.className = 'text-success';
        statusEl.innerHTML = '<i class="bi bi-check-circle me-1"></i>Guardado';
    }
}

// Save file
async function saveFile() {
    if (!hasChanges) {
        showInfo('No hay cambios para guardar');
        return;
    }

    const file = window.editorConfig?.file;
    if (!file) {
        showError('Archivo no especificado');
        return;
    }

    const content = editor.getValue();
    const statusEl = document.getElementById('saveStatus');

    // Show saving state
    statusEl.className = 'text-info saving';
    statusEl.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Guardando...';

    try {
        const response = await fetch('/api/file/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file: file,
                content: content
            })
        });

        const data = await response.json();

        if (data.success) {
            originalContent = content;
            hasChanges = false;
            updateSaveStatus(false);
            showSuccess('Archivo guardado exitosamente');
        } else {
            showError(data.error || 'Error al guardar el archivo');
            updateSaveStatus(true);
        }
    } catch (error) {
        console.error('Error saving file:', error);
        showError('Error de conexión al guardar el archivo');
        updateSaveStatus(true);
    }
}

// Undo action
function undo() {
    if (editor) {
        editor.undo();
    }
}

// Redo action
function redo() {
    if (editor) {
        editor.redo();
    }
}

// Find text
function find() {
    if (editor) {
        CodeMirror.commands.find(editor);
    }
}

// Replace text
function replace() {
    if (editor) {
        CodeMirror.commands.replace(editor);
    }
}

// Toggle comment
function toggleComment() {
    if (editor) {
        editor.toggleComment();
    }
}

// Indent more
function indentMore() {
    if (editor) {
        editor.indentMore();
    }
}

// Indent less
function indentLess() {
    if (editor) {
        editor.indentLess();
    }
}

// Format code (basic formatting)
function formatCode() {
    if (!editor) return;

    const mode = window.editorConfig?.mode;
    
    // For JSON, format the content
    if (mode === 'javascript' || mode.includes('json')) {
        try {
            const content = editor.getValue();
            const formatted = JSON.stringify(JSON.parse(content), null, 4);
            editor.setValue(formatted);
            showSuccess('Código formateado');
        } catch (e) {
            showError('No se pudo formatear: error de sintaxis');
        }
    } else {
        // Auto-indent for other modes
        editor.autoIndentRange(editor.getCursor(), editor.lastLine());
        showSuccess('Código indentado');
    }
}

// Get language display name
function getLanguageName(mode) {
    const languages = {
        'javascript': 'JavaScript',
        'json': 'JSON',
        'htmlmixed': 'HTML',
        'xml': 'XML',
        'css': 'CSS',
        'scss': 'SCSS',
        'python': 'Python',
        'sql': 'SQL',
        'markdown': 'Markdown',
        'yaml': 'YAML',
        'shell': 'Shell',
        'clike': 'C/C++',
        'go': 'Go',
        'rust': 'Rust',
        'php': 'PHP',
        'ruby': 'Ruby',
        'swift': 'Swift',
        'kotlin': 'Kotlin',
        'powershell': 'PowerShell',
        'dockerfile': 'Dockerfile',
        'properties': 'Properties',
        'text': 'Texto'
    };

    if (typeof mode === 'object' && mode.json) {
        return 'JSON';
    }

    return languages[mode] || mode.toUpperCase();
}

// Show success notification
function showSuccess(message) {
    Swal.fire({
        icon: 'success',
        title: 'Éxito',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: '#21222c',
        color: '#f8f8f2'
    });
}

// Show error notification
function showError(message) {
    Swal.fire({
        icon: 'error',
        title: 'Error',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        background: '#21222c',
        color: '#ff5555'
    });
}

// Show info notification
function showInfo(message) {
    Swal.fire({
        icon: 'info',
        title: 'Información',
        text: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        background: '#21222c',
        color: '#8be9fd'
    });
}

// Warn before leaving with unsaved changes
window.addEventListener('beforeunload', function(e) {
    if (hasChanges) {
        e.preventDefault();
        e.returnValue = '¿Estás seguro de que quieres salir? Tienes cambios sin guardar.';
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl+S or Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
    }
});
