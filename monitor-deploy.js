#!/usr/bin/env node

// SISTEMA DE MONITORAMENTO CONTÍNUO - TrueCheckIA
// Monitora deploy em tempo real e executa correções automáticas

const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const util = require('util');

const execAsync = util.promisify(exec);

class DeploymentMonitor {
    constructor() {
        this.baseUrl = 'www.truecheckia.com';
        this.maxRetries = 10;
        this.retryDelay = 15000; // 15 segundos
        this.healthEndpoints = [
            '/api/health',
            '/api/auth/register',
            '/api/auth/login',
            '/api/auth/google'
        ];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '🔍',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            deploy: '🚀'
        }[type] || '📋';
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async makeRequest(path, options = {}) {
        return new Promise((resolve, reject) => {
            const requestOptions = {
                hostname: this.baseUrl,
                path: path,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                timeout: 10000
            };

            const req = https.request(requestOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            if (options.body) {
                req.write(JSON.stringify(options.body));
            }

            req.end();
        });
    }

    async checkApiHealth() {
        try {
            const response = await this.makeRequest('/api/health');
            
            if (response.statusCode === 200) {
                this.log('API Health Check: OK', 'success');
                return true;
            } else {
                this.log(`API Health Check: Failed (${response.statusCode})`, 'error');
                return false;
            }
        } catch (error) {
            this.log(`API Health Check: Error - ${error.message}`, 'error');
            return false;
        }
    }

    async validateEndpoints() {
        this.log('Validando endpoints críticos...', 'info');
        
        const results = [];
        
        for (const endpoint of this.healthEndpoints) {
            try {
                const response = await this.makeRequest(endpoint, {
                    method: endpoint.includes('auth') ? 'POST' : 'GET',
                    body: endpoint.includes('register') ? { email: 'test', password: 'test' } : undefined
                });
                
                const isHealthy = response.statusCode < 500; // Aceitar 400, 401, etc como "funcionando"
                results.push({
                    endpoint,
                    status: response.statusCode,
                    healthy: isHealthy
                });
                
                this.log(`${endpoint}: ${response.statusCode} ${isHealthy ? '✓' : '✗'}`, 
                         isHealthy ? 'success' : 'error');
                         
            } catch (error) {
                results.push({
                    endpoint,
                    status: 'ERROR',
                    healthy: false,
                    error: error.message
                });
                
                this.log(`${endpoint}: ERROR - ${error.message}`, 'error');
            }
        }
        
        const healthyCount = results.filter(r => r.healthy).length;
        this.log(`Endpoints saudáveis: ${healthyCount}/${results.length}`, 
                healthyCount === results.length ? 'success' : 'warning');
        
        return results;
    }

    async getVercelLogs() {
        try {
            const { stdout } = await execAsync('vercel logs --since 5m');
            return stdout;
        } catch (error) {
            this.log('Não foi possível obter logs da Vercel', 'warning');
            this.log('Instale Vercel CLI: npm install -g vercel', 'info');
            return null;
        }
    }

    async diagnoseIssues() {
        this.log('Diagnosticando problemas...', 'info');
        
        const logs = await this.getVercelLogs();
        if (!logs) return [];
        
        const issues = [];
        
        // Detectar problemas comuns
        if (logs.includes('Function Runtimes must have')) {
            issues.push({
                type: 'runtime_error',
                message: 'Erro de runtime detectado',
                fix: 'fixRuntimeError'
            });
        }
        
        if (logs.includes('Module not found')) {
            issues.push({
                type: 'dependency_error',
                message: 'Dependências faltando',
                fix: 'fixDependencies'
            });
        }
        
        if (logs.includes('Build failed')) {
            issues.push({
                type: 'build_error',
                message: 'Falha no build',
                fix: 'fixBuildError'
            });
        }
        
        if (logs.includes('ENOTFOUND') || logs.includes('DNS')) {
            issues.push({
                type: 'dns_error',
                message: 'Erro de DNS/conectividade',
                fix: 'checkNetworking'
            });
        }
        
        return issues;
    }

    async fixRuntimeError() {
        this.log('Corrigindo erro de runtime...', 'deploy');
        
        try {
            // Ler vercel.json atual
            const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
            
            // Remover seção functions se existir
            if (vercelConfig.functions) {
                delete vercelConfig.functions;
                fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
                
                this.log('Seção functions removida do vercel.json', 'success');
                
                // Commit e redeploy
                await execAsync('git add vercel.json');
                await execAsync('git commit -m "fix: remove functions section to resolve runtime error"');
                await execAsync('git push origin main');
                
                this.log('Correção enviada! Aguardando redeploy...', 'deploy');
                return true;
            }
        } catch (error) {
            this.log(`Erro ao corrigir runtime: ${error.message}`, 'error');
            return false;
        }
    }

    async fixDependencies() {
        this.log('Corrigindo dependências...', 'deploy');
        
        try {
            // Verificar e instalar dependências da API
            await execAsync('cd api && npm install');
            
            // Commit e redeploy
            await execAsync('git add .');
            await execAsync('git commit -m "fix: update API dependencies"');
            await execAsync('git push origin main');
            
            this.log('Dependências atualizadas!', 'success');
            return true;
        } catch (error) {
            this.log(`Erro ao corrigir dependências: ${error.message}`, 'error');
            return false;
        }
    }

    async monitorDeployment() {
        this.log('🚀 INICIANDO MONITORAMENTO DE DEPLOY - TrueCheckIA', 'deploy');
        this.log('='.repeat(60), 'info');
        
        let attempt = 1;
        
        while (attempt <= this.maxRetries) {
            this.log(`Tentativa ${attempt}/${this.maxRetries}`, 'info');
            
            // 1. Verificar saúde da API
            const isHealthy = await this.checkApiHealth();
            
            if (isHealthy) {
                // 2. Validar todos os endpoints
                const endpointResults = await this.validateEndpoints();
                const allHealthy = endpointResults.every(r => r.healthy);
                
                if (allHealthy) {
                    this.log('🎉 DEPLOY VALIDADO COM SUCESSO!', 'success');
                    this.log(`🌐 Site: https://${this.baseUrl}`, 'success');
                    this.log(`🔗 API: https://${this.baseUrl}/api/health`, 'success');
                    break;
                } else {
                    this.log('Alguns endpoints não estão saudáveis', 'warning');
                }
            } else {
                this.log('API não está respondendo, verificando problemas...', 'warning');
                
                // 3. Diagnosticar e tentar corrigir
                const issues = await this.diagnoseIssues();
                
                if (issues.length > 0) {
                    this.log(`Problemas detectados: ${issues.length}`, 'error');
                    
                    for (const issue of issues) {
                        this.log(`- ${issue.message}`, 'error');
                        
                        // Tentar correção automática
                        if (this[issue.fix]) {
                            const fixed = await this[issue.fix]();
                            if (fixed) {
                                this.log('Aguardando redeploy após correção...', 'info');
                                await new Promise(resolve => setTimeout(resolve, 30000));
                                attempt = 1; // Resetar tentativas após correção
                                continue;
                            }
                        }
                    }
                }
            }
            
            if (attempt === this.maxRetries) {
                this.log('❌ DEPLOY FALHOU APÓS TODAS AS TENTATIVAS', 'error');
                this.log('Verifique os logs manualmente: vercel logs', 'error');
                
                // Mostrar logs se disponível
                const logs = await this.getVercelLogs();
                if (logs) {
                    this.log('Últimos logs:', 'info');
                    console.log(logs.split('\n').slice(-10).join('\n'));
                }
                
                break;
            }
            
            this.log(`Aguardando ${this.retryDelay/1000}s antes da próxima tentativa...`, 'info');
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            attempt++;
        }
    }
}

// Executar monitoramento
if (require.main === module) {
    const monitor = new DeploymentMonitor();
    monitor.monitorDeployment().catch(error => {
        console.error('❌ Erro no monitoramento:', error);
        process.exit(1);
    });
}

module.exports = DeploymentMonitor;