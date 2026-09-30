import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Script kiểm tra ranh giới sở hữu thư mục (Ownership Boundaries & Path Change Checker)
 * Tuân thủ quy định bất khả xâm phạm tại AGENTS.md (HauI Advisor)
 *
 * TV1: tv1-ai/ (ngoại trừ tv1-ai/docs/ là READ-ONLY)
 * TV2: tv2-web/
 * TV3: tv3-planner-ui/
 * TV4: tv4-academic/
 * TV5: tv5-platform/ + Root build/infra files (pom.xml, package.json, scripts/, .github/, etc.)
 */

console.log('--- Checking Ownership Boundaries and Path Changes ---');

const ROOT_FILES_ALLOWED_FOR_TV5 = new Set([
  'pom.xml',
  'package.json',
  'package-lock.json',
  'AGENTS.md',
  'README.md',
  '.gitignore',
  '.gitattributes',
  '.dockerignore',
  '.env.example',
  'mvnw',
  'mvnw.cmd'
]);

const ROOT_DIRS_ALLOWED_FOR_TV5 = [
  'scripts/',
  '.github/',
  '.mvn/'
];

export function classifyFile(filePath) {
  // Chuẩn hóa đường dẫn dạng Unix
  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '');

  if (normalized.startsWith('tv1-ai/docs/')) {
    return { domain: 'tv1-docs-readonly', role: null, readOnly: true };
  }
  if (normalized.startsWith('tv1-ai/')) {
    return { domain: 'tv1-ai', role: 'tv1' };
  }
  if (normalized.startsWith('tv2-web/')) {
    return { domain: 'tv2-web', role: 'tv2' };
  }
  if (normalized.startsWith('tv3-planner-ui/')) {
    return { domain: 'tv3-planner-ui', role: 'tv3' };
  }
  if (normalized.startsWith('tv4-academic/')) {
    return { domain: 'tv4-academic', role: 'tv4' };
  }
  if (normalized.startsWith('tv5-platform/')) {
    return { domain: 'tv5-platform', role: 'tv5' };
  }

  // Root files & infra dirs thuộc quyền quản lý của TV5
  if (ROOT_FILES_ALLOWED_FOR_TV5.has(normalized)) {
    return { domain: 'root-files', role: 'tv5' };
  }
  for (const dir of ROOT_DIRS_ALLOWED_FOR_TV5) {
    if (normalized.startsWith(dir)) {
      return { domain: 'root-files', role: 'tv5' };
    }
  }

  return { domain: 'unknown', role: null };
}

export function validateChanges(changedFiles, targetRole = null) {
  const violations = [];
  const rolesInvolved = new Set();

  for (const file of changedFiles) {
    if (!file || file.trim() === '') continue;
    const trimmed = file.trim();
    const info = classifyFile(trimmed);

    // Rule: tv1-ai/docs/ tuyệt đối READ-ONLY đối với mọi vai trò
    if (info.domain === 'tv1-docs-readonly') {
      violations.push({
        file: trimmed,
        reason: 'CRITICAL VIOLATION: tv1-ai/docs/ is strictly READ-ONLY. Modifying task 1.1 documents is prohibited.'
      });
      continue;
    }

    if (info.role) {
      rolesInvolved.add(info.role);
    } else {
      violations.push({
        file: trimmed,
        reason: `File outside recognized ownership boundaries: ${trimmed}`
      });
      continue;
    }

    // Nếu kiểm tra theo vai trò cụ thể
    if (targetRole) {
      const normalizedTargetRole = targetRole.toLowerCase();
      if (info.role !== normalizedTargetRole) {
        violations.push({
          file: trimmed,
          reason: `Role '${normalizedTargetRole}' is NOT permitted to modify file in '${info.domain}' (owned by ${info.role}).`
        });
      }
    }
  }

  // Nếu không chỉ định targetRole: kiểm tra nguyên tắc 1 agent - 1 domain (không sửa chéo)
  if (!targetRole && rolesInvolved.size > 1) {
    // Nếu có cả vai trò khác và tv5 sửa root files, kiểm tra xem có sửa chéo giữa các module nghiệp vụ không
    const businessRoles = Array.from(rolesInvolved).filter(r => r !== 'tv5');
    if (businessRoles.length > 1) {
      violations.push({
        file: '(multiple)',
        reason: `Cross-domain violation: detected changes across multiple distinct roles [${Array.from(rolesInvolved).join(', ')}]. Each agent must stay within their own assigned working tree.`
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    rolesInvolved: Array.from(rolesInvolved)
  };
}

function getChangedFilesFromGit() {
  const files = new Set();
  try {
    // 1. Unstaged và Staged changes
    const statusOutput = execSync('git status --porcelain -uall', { encoding: 'utf-8' });
    const lines = statusOutput.split('\n');
    for (const line of lines) {
      if (line.trim().length > 3) {
        const filePath = line.substring(3).trim().replace(/^"|"$/g, '');
        // Xử lý đổi tên file dạng "old -> new"
        if (filePath.includes(' -> ')) {
          const parts = filePath.split(' -> ');
          files.add(parts[1]);
        } else {
          files.add(filePath);
        }
      }
    }

    // 2. Diff so với HEAD hoặc commit gần nhất nếu repo sạch
    if (files.size === 0) {
      try {
        const diffHead = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' });
        diffHead.split('\n').map(s => s.trim()).filter(Boolean).forEach(f => files.add(f));
      } catch {
        // Có thể chưa có HEAD~1
      }
    }
  } catch (err) {
    console.warn(`[WARN] Could not retrieve git status: ${err.message}`);
  }
  return Array.from(files);
}

// CLI Execution
const args = process.argv.slice(2);
let targetRole = null;
let customFiles = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--role' && args[i + 1]) {
    targetRole = args[i + 1];
    i++;
  } else if (args[i] === '--files' && args[i + 1]) {
    customFiles = args[i + 1].split(',').map(s => s.trim());
    i++;
  }
}

const filesToCheck = customFiles || getChangedFilesFromGit();

console.log(`Checking ${filesToCheck.length} path(s)${targetRole ? ` for role [${targetRole}]` : ' against ownership matrix'}...`);

const result = validateChanges(filesToCheck, targetRole);

if (!result.valid) {
  console.error('\n❌ OWNERSHIP VIOLATIONS DETECTED:');
  for (const v of result.violations) {
    console.error(` - [${v.file}]: ${v.reason}`);
  }
  console.error('\nPlease ensure modifications adhere strictly to AGENTS.md ownership boundaries.\n');
  process.exit(1);
}

console.log('✅ Ownership check PASSED: All paths adhere strictly to AGENTS.md ownership boundaries.');
if (result.rolesInvolved.length > 0) {
  console.log(`   Involved roles: ${result.rolesInvolved.join(', ')}`);
}
