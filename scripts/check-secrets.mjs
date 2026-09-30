import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Script quét và loại trừ secrets khỏi mã nguồn (Secret Scanner)
 * Tuân thủ Quy tắc 6 trong AGENTS.md: Không đưa secrets, API keys thật vào source code hoặc log.
 */

console.log('--- Scanning Source Code for Hardcoded Secrets & Credentials ---');

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'target',
  'dist',
  '.idea',
  '.vscode',
  'build'
]);

const IGNORED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.ico',
  '.pdf',
  '.docx',
  '.xlsx',
  '.jar',
  '.class',
  '.woff',
  '.woff2',
  '.ttf'
]);

// Danh sách pattern phát hiện bí mật thực tế
const SECRET_RULES = [
  {
    name: 'OpenAI API Key',
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/g,
    isIgnored: (match) => match.includes('sk-test-mock') || match.includes('placeholder')
  },
  {
    name: 'Anthropic API Key',
    regex: /\bsk-ant-[A-Za-z0-9_-]{32,}\b/g,
    isIgnored: (match) => match.includes('placeholder')
  },
  {
    name: 'Google / Gemini API Key',
    regex: /\bAIza[0-9A-Za-z-_]{35}\b/g,
    isIgnored: (match) => match.includes('placeholder')
  },
  {
    name: 'Generic Private Key',
    regex: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----/g,
    isIgnored: () => false
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /\b(?:ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\b/g,
    isIgnored: () => false
  },
  {
    name: 'AWS Access Key ID',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    isIgnored: (match) => match === 'AKIAEXAMPLEKEY123'
  },
  {
    name: 'Slack Token',
    regex: /\bxox[baprs]-[0-9a-zA-Z]{10,}\b/g,
    isIgnored: () => false
  },
  {
    name: 'Hardcoded JWT Bearer Token',
    regex: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/g,
    isIgnored: () => false
  }
];

const findings = [];

// 1. Kiểm tra xem file .env có bị commit vào git hay không
try {
  const trackedEnv = execSync('git ls-files .env', { encoding: 'utf-8' }).trim();
  if (trackedEnv.length > 0) {
    findings.push({
      file: '.env',
      line: 1,
      rule: 'Committed .env File',
      preview: 'The .env file is tracked in git index! Secrets might be leaked.'
    });
  }
} catch {
  // git command failed or not in repo
}

// 2. Kiểm tra .gitignore có chứa .env
const gitignorePath = path.resolve('.gitignore');
if (fs.existsSync(gitignorePath)) {
  const content = fs.readFileSync(gitignorePath, 'utf-8');
  if (!content.includes('.env')) {
    findings.push({
      file: '.gitignore',
      line: 1,
      rule: 'Missing .env in .gitignore',
      preview: '.gitignore does not contain .env entry.'
    });
  }
}

// 3. Đệ quy duyệt cây thư mục quét nội dung file
function scanDirectory(currentDir) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      scanDirectory(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IGNORED_EXTENSIONS.has(ext)) continue;
      // Bỏ qua .env.example và check-secrets.mjs chính nó
      if (relPath === '.env.example' || relPath === 'scripts/check-secrets.mjs') continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const rule of SECRET_RULES) {
            const matches = line.match(rule.regex);
            if (matches) {
              for (const match of matches) {
                if (!rule.isIgnored(match)) {
                  findings.push({
                    file: relPath,
                    line: i + 1,
                    rule: rule.name,
                    preview: line.trim().substring(0, 80)
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        // Bỏ qua tệp nhị phân nếu đọc UTF-8 lỗi
      }
    }
  }
}

scanDirectory(process.cwd());

if (findings.length > 0) {
  console.error('\n❌ CRITICAL: Potential secrets or insecure credentials detected in repository:');
  for (const f of findings) {
    console.error(` - [${f.file}:${f.line}] Rule: ${f.rule}`);
    console.error(`   Excerpt: "${f.preview}"`);
  }
  console.error('\nPlease remove all credentials, use environment variables (.env / system env), and retry.\n');
  process.exit(1);
}

console.log('✅ Secrets check PASSED: No hardcoded API keys, private keys, or exposed secrets detected.');
