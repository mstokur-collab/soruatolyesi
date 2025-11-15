#!/usr/bin/env node
/**
 * Yerel Curriculum Agent
 * Admin panelinden gelen müfredat kodlarını doğrudan repo dosyalarına yazmaya yarayan basit HTTP servisi.
 * Varsayılan port: 4311 (CURRICULUM_AGENT_PORT ile değiştirilebilir)
 * İsteğe bağlı shared secret: CURRICULUM_AGENT_TOKEN
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CURRICULUM_DIR = path.join(ROOT_DIR, 'data', 'curriculum');
const INDEX_FILE = path.join(CURRICULUM_DIR, 'index.ts');
const SUBJECTS_FILE = path.join(CURRICULUM_DIR, 'subjects.ts');
const PORT = Number(process.env.CURRICULUM_AGENT_PORT || 4311);
const TOKEN = process.env.CURRICULUM_AGENT_TOKEN || '';
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1 MB
const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];
const ALLOWED_ORIGINS = (process.env.CURRICULUM_AGENT_ORIGINS || DEFAULT_ORIGINS.join(','))
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const resolveOrigin = (req) => {
    const requestOrigin = req.headers.origin;
    if (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)) {
        return requestOrigin;
    }
    if (ALLOWED_ORIGINS.includes('*')) {
        return '*';
    }
    return ALLOWED_ORIGINS[0] || '*';
};

const sendJson = (req, res, statusCode, payload) => {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': resolveOrigin(req),
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    res.end(JSON.stringify(payload));
};

const parseBody = (req) =>
    new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            if (data.length > MAX_BODY_SIZE) {
                reject(new Error('Payload too large'));
                req.destroy();
            }
        });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(data || '{}');
                resolve(parsed);
            } catch (error) {
                reject(new Error('Geçersiz JSON gövdesi'));
            }
        });
        req.on('error', reject);
    });

const ensureWithinCurriculumDir = (targetPath) => {
    const resolved = path.resolve(ROOT_DIR, targetPath);
    if (!resolved.startsWith(CURRICULUM_DIR)) {
        throw new Error('Hedef dosya izin verilen dizin dışında');
    }
    if (!resolved.endsWith('.ts')) {
        throw new Error('Yalnızca .ts uzantılı dosyalar güncellenebilir');
    }
    return resolved;
};

const normalizeImportPath = (absolutePath) => {
    const relative = path.relative(CURRICULUM_DIR, absolutePath);
    const withoutExt = relative.replace(/\\/g, '/').replace(/\.ts$/, '');
    if (!withoutExt.startsWith('.')) {
        return `./${withoutExt}`;
    }
    return withoutExt;
};

const formatObjectKey = (key) => (/^[a-zA-Z_$][\w$]*$/.test(key) ? key : `'${key}'`);

const updateIndexFile = ({ subjectId, exportName, importPath }) => {
    if (!fs.existsSync(INDEX_FILE)) return;
    let content = fs.readFileSync(INDEX_FILE, 'utf8');
    const importStatement = `import { ${exportName} } from '${importPath}';`;
    if (!content.includes(importStatement)) {
        content = content.replace(
            'export const allCurriculumData',
            `${importStatement}\n\nexport const allCurriculumData`
        );
    }

    const entry = `  ${formatObjectKey(subjectId)}: ${exportName},`;
    if (!content.includes(entry)) {
        content = content.replace(/\};\s*$/, `${entry}\n};\n`);
    }

    fs.writeFileSync(INDEX_FILE, content, 'utf8');
};

const updateSubjectsFile = ({ subjectId, subjectName }) => {
    if (!fs.existsSync(SUBJECTS_FILE)) return;
    let content = fs.readFileSync(SUBJECTS_FILE, 'utf8');
    const entry = `    ${formatObjectKey(subjectId)}: '${subjectName.replace(/'/g, "\\'")}',`;
    if (content.includes(entry)) return;
    content = content.replace(/\};\s*$/, `${entry}\n};\n`);
    fs.writeFileSync(SUBJECTS_FILE, content, 'utf8');
};

const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': resolveOrigin(req),
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        });
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/health') {
        sendJson(req, res, 200, { status: 'ok', root: ROOT_DIR });
        return;
    }

    if (req.method === 'POST' && req.url === '/write-curriculum') {
        try {
            const body = await parseBody(req);
            const { filePath, code, token, subjectId, exportName, subjectName } = body || {};

            if (TOKEN && token !== TOKEN) {
                sendJson(req, res, 401, { error: 'Geçersiz agent anahtarı' });
                return;
            }

            if (typeof filePath !== 'string' || !filePath.trim()) {
                throw new Error('filePath alanı gerekli');
            }
            if (typeof code !== 'string' || !code.trim()) {
                throw new Error('code alanı gerekli');
            }

            const resolvedPath = ensureWithinCurriculumDir(filePath.trim());
            fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
            fs.writeFileSync(resolvedPath, `${code.trim()}\n`, 'utf8');

            if (subjectId && exportName && subjectName) {
                const importPath = normalizeImportPath(resolvedPath);
                updateIndexFile({ subjectId, exportName, importPath });
                updateSubjectsFile({ subjectId, subjectName });
            }

            sendJson(req, res, 200, {
                message: 'Dosya güncellendi',
                filePath: resolvedPath,
                bytes: Buffer.byteLength(code, 'utf8'),
                subjectRegistered: Boolean(subjectId && exportName && subjectName),
            });
        } catch (error) {
            console.error('[CurriculumAgent] Error:', error.message);
            sendJson(req, res, 400, { error: error.message || 'Bilinmeyen hata' });
        }
        return;
    }

    sendJson(req, res, 404, { error: 'Endpoint bulunamadı' });
});

server.listen(PORT, () => {
    console.log(`[CurriculumAgent] ${PORT} portunda çalışıyor`);
    console.log(`[CurriculumAgent] Müfredat dizini: ${CURRICULUM_DIR}`);
    console.log(`[CurriculumAgent] İzin verilen originler: ${ALLOWED_ORIGINS.join(', ')}`);
    if (TOKEN) {
        console.log('[CurriculumAgent] Shared token etkin');
    } else {
        console.log('[CurriculumAgent] Shared token ayarlanmadı (yalnızca yerel erişim)');
    }
});
