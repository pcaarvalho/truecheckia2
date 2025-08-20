#!/usr/bin/env node

/**
 * Deploy Agent - Agente especializado em gerenciar deployments na Vercel
 * Responsabilidades:
 * - Verificar estado do projeto antes do deploy
 * - Executar deploys seguros com validações
 * - Monitorar progresso do deployment
 * - Realizar rollback automático em caso de falha
 */

const https = require('https');
const { spawn } = require('child_process');

class DeployAgent {
  constructor(token, projectId) {
    this.token = token;
    this.projectId = projectId;
    this.baseUrl = 'api.vercel.com';
    this.deploymentTimeout = 300000; // 5 minutos
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve({ status: res.statusCode, data: parsed });
          } catch (error) {
            reject(new Error(`Erro ao parsear JSON: ${error.message}`));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(30000, () => reject(new Error('Request timeout')));
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  async preDeploymentChecks() {
    console.log('🔍 Executando verificações pré-deployment...');
    
    const checks = {
      projectStatus: false,
      lastDeploymentStatus: false,
      environmentVariables: false,
      buildCapability: false
    };

    try {
      // 1. Verificar status do projeto
      const projectResponse = await this.makeRequest(`/v9/projects/${this.projectId}`);
      if (projectResponse.status === 200) {
        checks.projectStatus = true;
        console.log('✅ Projeto acessível e ativo');
      } else {
        console.log('❌ Projeto não encontrado ou inacessível');
        return checks;
      }

      // 2. Verificar último deployment
      const deploymentsResponse = await this.makeRequest(`/v6/deployments?projectId=${this.projectId}&limit=1`);
      if (deploymentsResponse.status === 200 && deploymentsResponse.data.deployments.length > 0) {
        const lastDeployment = deploymentsResponse.data.deployments[0];
        if (lastDeployment.state === 'READY') {
          checks.lastDeploymentStatus = true;
          console.log('✅ Último deployment está estável');
        } else if (lastDeployment.state === 'ERROR') {
          console.log('⚠️  Último deployment falhou - procedendo com cautela');
        } else {
          console.log(`⏳ Último deployment em andamento: ${lastDeployment.state}`);
        }
      }

      // 3. Verificar variáveis de ambiente críticas
      const envResponse = await this.makeRequest(`/v9/projects/${this.projectId}/env`);
      if (envResponse.status === 200) {
        const envVars = envResponse.data.envs;
        const criticalVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'JWT_SECRET'];
        const missingVars = criticalVars.filter(varName => 
          !envVars.some(env => env.key === varName)
        );
        
        if (missingVars.length === 0) {
          checks.environmentVariables = true;
          console.log('✅ Todas as variáveis críticas estão configuradas');
        } else {
          console.log(`❌ Variáveis críticas ausentes: ${missingVars.join(', ')}`);
        }
      }

      // 4. Verificar capacidade de build (simulação local)
      checks.buildCapability = await this.checkBuildCapability();

    } catch (error) {
      console.log(`❌ Erro nas verificações pré-deployment: ${error.message}`);
    }

    return checks;
  }

  async checkBuildCapability() {
    console.log('🔨 Verificando capacidade de build...');
    
    return new Promise((resolve) => {
      // Verificar se package.json existe e tem scripts necessários
      const fs = require('fs');
      const path = require('path');
      
      try {
        const packageJsonPath = path.join(process.cwd(), 'frontend', 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          if (packageJson.scripts && packageJson.scripts.build) {
            console.log('✅ Script de build encontrado');
            resolve(true);
          } else {
            console.log('❌ Script de build não encontrado');
            resolve(false);
          }
        } else {
          console.log('❌ package.json do frontend não encontrado');
          resolve(false);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar build: ${error.message}`);
        resolve(false);
      }
    });
  }

  async executeDeployment(environment = 'preview') {
    console.log(`🚀 Iniciando deployment para ${environment}...`);
    
    const preChecks = await this.preDeploymentChecks();
    
    // Verificar se é seguro prosseguir
    const criticalChecks = [preChecks.projectStatus, preChecks.environmentVariables];
    if (!criticalChecks.every(check => check)) {
      console.log('❌ Verificações críticas falharam. Deployment cancelado.');
      return { success: false, reason: 'Pre-deployment checks failed' };
    }

    try {
      // Executar deployment via Vercel CLI
      const deploymentResult = await this.runVercelDeploy(environment);
      
      if (deploymentResult.success) {
        console.log(`✅ Deployment ${environment} executado com sucesso!`);
        console.log(`🔗 URL: ${deploymentResult.url}`);
        
        // Monitorar deployment
        const monitoringResult = await this.monitorDeployment(deploymentResult.deploymentId);
        
        return {
          success: true,
          url: deploymentResult.url,
          deploymentId: deploymentResult.deploymentId,
          monitoring: monitoringResult
        };
      } else {
        console.log(`❌ Deployment falhou: ${deploymentResult.error}`);
        return { success: false, reason: deploymentResult.error };
      }
      
    } catch (error) {
      console.log(`❌ Erro durante deployment: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  async runVercelDeploy(environment) {
    return new Promise((resolve) => {
      const isProduction = environment === 'production';
      const args = ['deploy'];
      
      if (isProduction) {
        args.push('--prod');
      }
      
      args.push('--token', this.token);
      
      console.log(`📦 Executando: vercel ${args.filter(arg => arg !== this.token).join(' ')}`);
      
      const vercel = spawn('vercel', args, {
        cwd: process.cwd(),
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      
      vercel.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });
      
      vercel.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });
      
      vercel.on('close', (code) => {
        if (code === 0) {
          // Extrair URL do deployment
          const urlMatch = stdout.match(/https:\/\/[^\s]+/);
          const deploymentUrl = urlMatch ? urlMatch[0] : null;
          
          // Extrair deployment ID da URL
          const deploymentId = deploymentUrl ? 
            deploymentUrl.split('-').slice(-1)[0].split('.')[0] : null;
          
          resolve({
            success: true,
            url: deploymentUrl,
            deploymentId: deploymentId,
            output: stdout
          });
        } else {
          resolve({
            success: false,
            error: stderr || 'Deployment failed with unknown error',
            output: stdout + stderr
          });
        }
      });

      // Timeout para evitar travamento
      setTimeout(() => {
        vercel.kill();
        resolve({
          success: false,
          error: 'Deployment timeout',
          output: stdout + stderr
        });
      }, this.deploymentTimeout);
    });
  }

  async monitorDeployment(deploymentId, maxAttempts = 20) {
    if (!deploymentId) {
      console.log('⚠️  ID do deployment não disponível para monitoramento');
      return { status: 'unknown' };
    }

    console.log(`👀 Monitorando deployment ${deploymentId}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.makeRequest(`/v13/deployments/${deploymentId}`);
        
        if (response.status === 200) {
          const deployment = response.data;
          console.log(`📊 Status: ${deployment.state} (tentativa ${attempt}/${maxAttempts})`);
          
          if (deployment.state === 'READY') {
            console.log('✅ Deployment concluído com sucesso!');
            return { 
              status: 'success', 
              state: deployment.state,
              url: deployment.url 
            };
          } else if (deployment.state === 'ERROR') {
            console.log('❌ Deployment falhou!');
            
            // Buscar logs de erro
            const errorLogs = await this.getDeploymentLogs(deploymentId);
            return { 
              status: 'failed', 
              state: deployment.state,
              errors: errorLogs 
            };
          } else if (['BUILDING', 'QUEUED', 'INITIALIZING'].includes(deployment.state)) {
            // Continuar monitoramento
            await this.sleep(15000); // Aguardar 15 segundos
            continue;
          } else {
            console.log(`⚠️  Estado inesperado: ${deployment.state}`);
            return { 
              status: 'unknown', 
              state: deployment.state 
            };
          }
        } else {
          console.log(`⚠️  Erro ao verificar status: ${response.status}`);
          await this.sleep(10000);
        }
      } catch (error) {
        console.log(`⚠️  Erro no monitoramento: ${error.message}`);
        await this.sleep(10000);
      }
    }
    
    console.log('⏰ Timeout no monitoramento');
    return { status: 'timeout' };
  }

  async getDeploymentLogs(deploymentId) {
    try {
      const response = await this.makeRequest(`/v2/deployments/${deploymentId}/events`);
      if (response.status === 200) {
        return response.data.filter(event => 
          event.type === 'error' || event.type === 'stderr'
        );
      }
    } catch (error) {
      console.log(`Erro ao obter logs: ${error.message}`);
    }
    return [];
  }

  async rollbackToPreviousDeployment() {
    console.log('🔄 Iniciando rollback para deployment anterior...');
    
    try {
      // Buscar deployments bem-sucedidos recentes
      const response = await this.makeRequest(`/v6/deployments?projectId=${this.projectId}&limit=10`);
      
      if (response.status === 200) {
        const deployments = response.data.deployments;
        const readyDeployments = deployments.filter(d => d.state === 'READY');
        
        if (readyDeployments.length >= 2) {
          const previousDeployment = readyDeployments[1]; // Segundo mais recente
          
          console.log(`🎯 Promovendo deployment ${previousDeployment.uid} para produção...`);
          
          // Promover deployment anterior
          const promoteResponse = await this.makeRequest(
            `/v13/deployments/${previousDeployment.uid}/promote`,
            'POST'
          );
          
          if (promoteResponse.status === 200) {
            console.log('✅ Rollback executado com sucesso!');
            console.log(`🔗 URL restaurada: ${previousDeployment.url}`);
            return {
              success: true,
              rolledBackTo: previousDeployment.uid,
              url: previousDeployment.url
            };
          } else {
            console.log(`❌ Falha ao promover deployment: ${promoteResponse.status}`);
            return { success: false, reason: 'Failed to promote deployment' };
          }
        } else {
          console.log('❌ Não há deployments anteriores estáveis para rollback');
          return { success: false, reason: 'No stable previous deployments found' };
        }
      }
    } catch (error) {
      console.log(`❌ Erro durante rollback: ${error.message}`);
      return { success: false, reason: error.message };
    }
  }

  async healthCheck(url) {
    if (!url) return { healthy: false, reason: 'No URL provided' };
    
    console.log(`🏥 Verificando saúde da aplicação: ${url}`);
    
    try {
      const healthUrl = url.endsWith('/') ? `${url}api/health` : `${url}/api/health`;
      const response = await fetch(healthUrl);
      
      if (response.ok) {
        console.log('✅ Aplicação está respondendo corretamente');
        return { healthy: true, status: response.status };
      } else {
        console.log(`⚠️  Aplicação respondeu com status: ${response.status}`);
        return { healthy: false, status: response.status };
      }
    } catch (error) {
      console.log(`❌ Erro na verificação de saúde: ${error.message}`);
      return { healthy: false, reason: error.message };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateDeploymentReport(deploymentResult) {
    const report = {
      timestamp: new Date().toISOString(),
      projectId: this.projectId,
      deployment: deploymentResult,
      preChecks: await this.preDeploymentChecks(),
      recommendations: []
    };

    // Gerar recomendações baseadas no resultado
    if (!deploymentResult.success) {
      report.recommendations.push('Verificar logs de erro detalhadamente');
      report.recommendations.push('Executar testes locais antes do próximo deploy');
    }

    if (!report.preChecks.buildCapability) {
      report.recommendations.push('Verificar configuração de build no package.json');
    }

    return report;
  }
}

// Comando CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const token = process.env.VERCEL_TOKEN || 'XRIAx5pnoOPqUQcnsfT0h5Qj';
  const projectId = process.env.VERCEL_PROJECT_ID || 'truecheckiagpt';
  
  const agent = new DeployAgent(token, projectId);

  switch (command) {
    case 'deploy':
      const environment = args[1] || 'preview';
      const result = await agent.executeDeployment(environment);
      console.log('\n📊 RESULTADO DO DEPLOYMENT:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
      
    case 'rollback':
      const rollbackResult = await agent.rollbackToPreviousDeployment();
      console.log('\n🔄 RESULTADO DO ROLLBACK:');
      console.log(JSON.stringify(rollbackResult, null, 2));
      process.exit(rollbackResult.success ? 0 : 1);
      
    case 'health':
      const url = args[1];
      const healthResult = await agent.healthCheck(url);
      console.log('\n🏥 RESULTADO DO HEALTH CHECK:');
      console.log(JSON.stringify(healthResult, null, 2));
      process.exit(healthResult.healthy ? 0 : 1);
      
    case 'monitor':
      const deploymentId = args[1];
      if (!deploymentId) {
        console.log('❌ ID do deployment é obrigatório para monitoramento');
        process.exit(1);
      }
      const monitorResult = await agent.monitorDeployment(deploymentId);
      console.log('\n👀 RESULTADO DO MONITORAMENTO:');
      console.log(JSON.stringify(monitorResult, null, 2));
      process.exit(monitorResult.status === 'success' ? 0 : 1);
      
    default:
      console.log(`
🤖 Deploy Agent - Comandos disponíveis:

  deploy [environment]     Deploy para preview ou production
  rollback                 Rollback para deployment anterior
  health [url]            Verificar saúde da aplicação
  monitor [deploymentId]   Monitorar status de deployment

Exemplos:
  node deploy-agent.js deploy preview
  node deploy-agent.js deploy production
  node deploy-agent.js rollback
  node deploy-agent.js health https://truecheckiagpt.vercel.app
  node deploy-agent.js monitor dpl_xxx
      `);
      process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeployAgent;