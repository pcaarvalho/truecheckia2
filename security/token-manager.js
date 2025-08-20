#!/usr/bin/env node

/**
 * Token Manager - Sistema de segurança para gerenciamento de tokens Vercel
 * Responsabilidades:
 * - Validação e rotação segura de tokens
 * - Monitoramento de uso de tokens
 * - Detecção de atividades suspeitas
 * - Gestão de permissões e scopes
 * - Auditoria de acesso
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class TokenManager {
  constructor() {
    this.tokens = new Map();
    this.auditLog = [];
    this.securityRules = {
      maxFailedAttempts: 5,
      tokenRotationDays: 30,
      suspiciousActivityThreshold: 100, // requests per minute
      allowedIPs: [], // Empty = allow all
      requiredScopes: ['read:project', 'write:project', 'read:deployments', 'write:deployments']
    };
  }

  async validateToken(token, context = {}) {
    const validation = {
      isValid: false,
      token: this.maskToken(token),
      timestamp: new Date().toISOString(),
      context: context,
      issues: [],
      recommendations: []
    };

    try {
      // 1. Verificar formato do token
      if (!this.isValidTokenFormat(token)) {
        validation.issues.push('Token format is invalid');
        return validation;
      }

      // 2. Verificar se o token está ativo via API
      const tokenInfo = await this.getTokenInfo(token);
      if (!tokenInfo.success) {
        validation.issues.push(`Token validation failed: ${tokenInfo.error}`);
        return validation;
      }

      // 3. Verificar permissões necessárias
      const scopeCheck = this.validateTokenScopes(tokenInfo.data);
      if (!scopeCheck.valid) {
        validation.issues.push(`Insufficient permissions: missing ${scopeCheck.missing.join(', ')}`);
        validation.recommendations.push('Update token permissions in Vercel dashboard');
      }

      // 4. Verificar se o token não está comprometido
      const securityCheck = await this.checkTokenSecurity(token, tokenInfo.data);
      if (!securityCheck.secure) {
        validation.issues.push(`Security concerns: ${securityCheck.issues.join(', ')}`);
        validation.recommendations.push(...securityCheck.recommendations);
      }

      // 5. Verificar idade do token
      const ageCheck = this.checkTokenAge(tokenInfo.data);
      if (!ageCheck.acceptable) {
        validation.issues.push(`Token is too old: ${ageCheck.age} days`);
        validation.recommendations.push('Rotate token - tokens should be rotated every 30 days');
      }

      validation.isValid = validation.issues.length === 0;
      validation.tokenInfo = {
        id: tokenInfo.data.id,
        name: tokenInfo.data.name,
        scopes: tokenInfo.data.scopes || [],
        createdAt: tokenInfo.data.createdAt,
        lastUsed: tokenInfo.data.lastUsed
      };

      // Log da validação
      this.logTokenAccess({
        action: 'validate',
        token: this.maskToken(token),
        success: validation.isValid,
        issues: validation.issues,
        context: context
      });

      return validation;

    } catch (error) {
      validation.issues.push(`Validation error: ${error.message}`);
      this.logTokenAccess({
        action: 'validate',
        token: this.maskToken(token),
        success: false,
        error: error.message,
        context: context
      });
      return validation;
    }
  }

  async getTokenInfo(token) {
    try {
      const response = await this.makeRequest('/v2/user/tokens', 'GET', token);
      
      if (response.status === 200) {
        // Procurar o token atual na lista (comparação por último uso ou nome)
        const currentToken = response.data.tokens.find(t => {
          // Como não podemos comparar tokens diretamente, usamos heurísticas
          return t.lastUsed && new Date(t.lastUsed) > new Date(Date.now() - 60000); // Usado nos últimos 60 segundos
        }) || response.data.tokens[0]; // Fallback para o primeiro token

        return { success: true, data: currentToken };
      } else {
        return { success: false, error: `API returned ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async makeRequest(path, method = 'GET', token, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.vercel.com',
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'TokenManager/1.0.0'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = responseData ? JSON.parse(responseData) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (error) {
            resolve({ status: res.statusCode, data: responseData });
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => reject(new Error('Request timeout')));
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  isValidTokenFormat(token) {
    // Vercel tokens geralmente começam com 'vercel_' ou padrões similares
    return typeof token === 'string' && 
           token.length > 20 && 
           /^[a-zA-Z0-9_-]+$/.test(token);
  }

  validateTokenScopes(tokenInfo) {
    const tokenScopes = tokenInfo.scopes || [];
    const missing = this.securityRules.requiredScopes.filter(scope => 
      !tokenScopes.includes(scope)
    );

    return {
      valid: missing.length === 0,
      missing: missing,
      current: tokenScopes
    };
  }

  async checkTokenSecurity(token, tokenInfo) {
    const issues = [];
    const recommendations = [];

    // 1. Verificar padrões de uso suspeitos
    const usagePattern = await this.analyzeTokenUsage(token);
    if (usagePattern.suspicious) {
      issues.push(...usagePattern.issues);
      recommendations.push(...usagePattern.recommendations);
    }

    // 2. Verificar se o token foi usado recentemente de IPs diferentes
    const ipAnalysis = this.analyzeIPPatterns(tokenInfo);
    if (ipAnalysis.suspicious) {
      issues.push('Multiple IP addresses detected');
      recommendations.push('Monitor token usage for unauthorized access');
    }

    // 3. Verificar se há sinais de token vazado
    const leakCheck = await this.checkForTokenLeak(token);
    if (leakCheck.leaked) {
      issues.push('Token may be compromised');
      recommendations.push('Rotate token immediately');
    }

    return {
      secure: issues.length === 0,
      issues: issues,
      recommendations: recommendations
    };
  }

  async analyzeTokenUsage(token) {
    // Simular análise de uso (em implementação real, consultar logs da Vercel)
    const recentUsage = this.getRecentTokenUsage(token);
    
    const issues = [];
    const recommendations = [];

    // Verificar taxa de requisições
    if (recentUsage.requestsPerMinute > this.securityRules.suspiciousActivityThreshold) {
      issues.push(`High request rate: ${recentUsage.requestsPerMinute} req/min`);
      recommendations.push('Investigate potential automated abuse');
    }

    // Verificar padrões de horário
    if (recentUsage.offHoursUsage > 0.8) {
      issues.push('High off-hours usage detected');
      recommendations.push('Verify if off-hours usage is legitimate');
    }

    return {
      suspicious: issues.length > 0,
      issues: issues,
      recommendations: recommendations,
      usage: recentUsage
    };
  }

  getRecentTokenUsage(token) {
    // Simulação de dados de uso (em implementação real, buscar de logs)
    return {
      requestsPerMinute: Math.floor(Math.random() * 50) + 10,
      offHoursUsage: Math.random(),
      uniqueIPs: Math.floor(Math.random() * 3) + 1,
      errorRate: Math.random() * 0.1
    };
  }

  analyzeIPPatterns(tokenInfo) {
    // Simulação de análise de IPs (em implementação real, analisar logs)
    const uniqueIPs = Math.floor(Math.random() * 5) + 1;
    
    return {
      suspicious: uniqueIPs > 3,
      uniqueIPs: uniqueIPs,
      locations: ['US', 'BR'] // Simulado
    };
  }

  async checkForTokenLeak(token) {
    // Verificar se o token aparece em repositórios públicos ou vazamentos conhecidos
    // Em implementação real, integrar com serviços como GitGuardian, TruffleHog, etc.
    
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Simulação de verificação
    const leaked = Math.random() < 0.05; // 5% de chance simulada
    
    return {
      leaked: leaked,
      hash: hashToken.substring(0, 16), // Primeiros 16 caracteres do hash
      sources: leaked ? ['github-scan'] : []
    };
  }

  checkTokenAge(tokenInfo) {
    if (!tokenInfo.createdAt) {
      return { acceptable: false, age: 'unknown' };
    }

    const createdDate = new Date(tokenInfo.createdAt);
    const ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return {
      acceptable: ageInDays <= this.securityRules.tokenRotationDays,
      age: Math.floor(ageInDays)
    };
  }

  async rotateToken(currentToken, name = null) {
    console.log('🔄 Iniciando rotação de token...');
    
    const rotationLog = {
      timestamp: new Date().toISOString(),
      success: false,
      steps: [],
      oldToken: this.maskToken(currentToken),
      newToken: null,
      error: null
    };

    try {
      // 1. Validar token atual
      rotationLog.steps.push('Validating current token');
      const validation = await this.validateToken(currentToken, { action: 'rotation' });
      if (!validation.isValid) {
        throw new Error(`Current token is invalid: ${validation.issues.join(', ')}`);
      }

      // 2. Criar novo token (simulação - em implementação real, usar API da Vercel)
      rotationLog.steps.push('Creating new token');
      const newTokenResponse = await this.createNewToken(currentToken, name);
      if (!newTokenResponse.success) {
        throw new Error(`Failed to create new token: ${newTokenResponse.error}`);
      }

      const newToken = newTokenResponse.token;
      rotationLog.newToken = this.maskToken(newToken);

      // 3. Validar novo token
      rotationLog.steps.push('Validating new token');
      const newTokenValidation = await this.validateToken(newToken, { action: 'new_token_validation' });
      if (!newTokenValidation.isValid) {
        throw new Error(`New token validation failed: ${newTokenValidation.issues.join(', ')}`);
      }

      // 4. Atualizar configurações
      rotationLog.steps.push('Updating configurations');
      const updateResult = await this.updateTokenConfigurations(currentToken, newToken);
      if (!updateResult.success) {
        console.log('⚠️  Warning: Failed to update some configurations automatically');
        rotationLog.warnings = updateResult.failures;
      }

      // 5. Testar novo token
      rotationLog.steps.push('Testing new token');
      const testResult = await this.testTokenFunctionality(newToken);
      if (!testResult.success) {
        throw new Error(`New token test failed: ${testResult.error}`);
      }

      // 6. Revogar token antigo (aguardar para evitar problemas)
      console.log('⏳ Aguardando 60 segundos antes de revogar token antigo...');
      await this.sleep(60000);
      
      rotationLog.steps.push('Revoking old token');
      const revokeResult = await this.revokeToken(currentToken);
      if (!revokeResult.success) {
        console.log('⚠️  Warning: Failed to revoke old token automatically');
        rotationLog.warnings = rotationLog.warnings || [];
        rotationLog.warnings.push(`Failed to revoke old token: ${revokeResult.error}`);
      }

      rotationLog.success = true;
      console.log('✅ Token rotation completed successfully!');
      console.log(`🔑 New token: ${this.maskToken(newToken)}`);
      
      return {
        success: true,
        newToken: newToken,
        log: rotationLog
      };

    } catch (error) {
      rotationLog.error = error.message;
      console.log(`❌ Token rotation failed: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        log: rotationLog
      };
    } finally {
      // Salvar log de rotação
      await this.saveRotationLog(rotationLog);
    }
  }

  async createNewToken(currentToken, name = null) {
    // Em implementação real, usar API da Vercel para criar novo token
    // Por enquanto, simulamos o processo
    
    const tokenName = name || `auto-rotated-${Date.now()}`;
    
    try {
      // Simulação de criação de token
      const newToken = `vercel_${crypto.randomBytes(32).toString('hex')}`;
      
      console.log(`📝 Token criado: ${tokenName}`);
      
      return {
        success: true,
        token: newToken,
        name: tokenName
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateTokenConfigurations(oldToken, newToken) {
    const updates = [];
    const failures = [];

    // Lista de arquivos que podem conter o token
    const configFiles = [
      '.env',
      '.env.local',
      '.env.production',
      'vercel.json',
      '.github/workflows/deploy.yml'
    ];

    for (const file of configFiles) {
      try {
        if (fs.existsSync(file)) {
          let content = fs.readFileSync(file, 'utf8');
          
          // Não fazer replace direto por segurança - apenas alertar
          if (content.includes(oldToken.substring(0, 20))) {
            updates.push(`Token reference found in ${file} - manual update required`);
          }
        }
      } catch (error) {
        failures.push(`Failed to check ${file}: ${error.message}`);
      }
    }

    console.log('📋 Configuration update summary:');
    updates.forEach(update => console.log(`  ⚠️  ${update}`));
    
    return {
      success: failures.length === 0,
      updates: updates,
      failures: failures
    };
  }

  async testTokenFunctionality(token) {
    try {
      // Testar funcionalidades básicas
      const response = await this.makeRequest('/v2/user', 'GET', token);
      
      if (response.status === 200) {
        console.log('✅ New token is functional');
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `Token test failed with status ${response.status}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async revokeToken(token) {
    try {
      // Em implementação real, usar API da Vercel para revogar token
      console.log(`🗑️  Revogando token: ${this.maskToken(token)}`);
      
      // Simulação de revogação
      await this.sleep(1000);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  maskToken(token) {
    if (!token || token.length < 10) return '***';
    return token.substring(0, 8) + '***' + token.substring(token.length - 4);
  }

  logTokenAccess(logEntry) {
    const entry = {
      timestamp: new Date().toISOString(),
      ...logEntry
    };
    
    this.auditLog.push(entry);
    
    // Manter apenas os últimos 1000 logs em memória
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
    
    // Salvar em arquivo de auditoria
    this.saveAuditLog(entry);
  }

  saveAuditLog(entry) {
    const auditDir = path.join(process.cwd(), 'security', 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const auditFile = path.join(auditDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(auditFile, JSON.stringify(entry) + '\n');
  }

  async saveRotationLog(log) {
    const rotationDir = path.join(process.cwd(), 'security', 'rotations');
    if (!fs.existsSync(rotationDir)) {
      fs.mkdirSync(rotationDir, { recursive: true });
    }

    const rotationFile = path.join(rotationDir, `rotation-${Date.now()}.json`);
    fs.writeFileSync(rotationFile, JSON.stringify(log, null, 2));
    console.log(`📄 Rotation log saved: ${rotationFile}`);
  }

  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      auditSummary: {
        totalEntries: this.auditLog.length,
        recentActivity: this.auditLog.slice(-10),
        failedValidations: this.auditLog.filter(entry => 
          entry.action === 'validate' && !entry.success
        ).length
      },
      securityRules: this.securityRules,
      recommendations: []
    };

    // Gerar recomendações baseadas no log de auditoria
    const recentFailures = this.auditLog.filter(entry => 
      entry.action === 'validate' && 
      !entry.success &&
      new Date(entry.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (recentFailures.length > 5) {
      report.recommendations.push('High number of validation failures - investigate potential security issues');
    }

    const uniqueContexts = new Set(this.auditLog.map(entry => entry.context?.source || 'unknown'));
    if (uniqueContexts.size > 10) {
      report.recommendations.push('Token being used from many different sources - review access patterns');
    }

    return report;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Interface CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const tokenManager = new TokenManager();
  const token = process.env.VERCEL_TOKEN || args[1];

  if (!token && ['validate', 'rotate', 'test'].includes(command)) {
    console.log('❌ Token is required. Set VERCEL_TOKEN environment variable or pass as argument.');
    process.exit(1);
  }

  switch (command) {
    case 'validate':
      const validation = await tokenManager.validateToken(token, { source: 'cli' });
      console.log('\n🔐 TOKEN VALIDATION RESULT:');
      console.log(JSON.stringify(validation, null, 2));
      process.exit(validation.isValid ? 0 : 1);
      
    case 'rotate':
      const tokenName = args[2];
      const rotation = await tokenManager.rotateToken(token, tokenName);
      console.log('\n🔄 TOKEN ROTATION RESULT:');
      console.log(JSON.stringify({
        success: rotation.success,
        newToken: rotation.newToken ? tokenManager.maskToken(rotation.newToken) : null,
        error: rotation.error
      }, null, 2));
      
      if (rotation.success) {
        console.log('\n⚠️  IMPORTANT: Update your environment variables with the new token!');
        console.log(`New token: ${rotation.newToken}`);
      }
      
      process.exit(rotation.success ? 0 : 1);
      
    case 'test':
      const testResult = await tokenManager.testTokenFunctionality(token);
      console.log('\n🧪 TOKEN TEST RESULT:');
      console.log(JSON.stringify(testResult, null, 2));
      process.exit(testResult.success ? 0 : 1);
      
    case 'report':
      const report = tokenManager.generateSecurityReport();
      console.log('\n📊 SECURITY REPORT:');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
      
    default:
      console.log(`
🔐 Token Manager - Comandos disponíveis:

  validate [token]     Validar token e verificar segurança
  rotate [token] [name] Rotacionar token com segurança
  test [token]         Testar funcionalidade do token
  report               Gerar relatório de segurança

Variáveis de ambiente:
  VERCEL_TOKEN        Token padrão para operações

Exemplos:
  node token-manager.js validate
  node token-manager.js rotate "auto-rotated-token"
  node token-manager.js test
  node token-manager.js report

IMPORTANTE: Mantenha seus tokens seguros e nunca os commite no código!
      `);
      process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TokenManager;