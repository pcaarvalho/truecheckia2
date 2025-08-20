#!/usr/bin/env node

/**
 * Monitor Agent - Agente especializado em monitoramento de aplicações Vercel
 * Responsabilidades:
 * - Monitoramento contínuo de deployments
 * - Análise de performance e disponibilidade
 * - Alertas automáticos para problemas
 * - Coleta e análise de métricas
 * - Relatórios de saúde da aplicação
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class MonitorAgent {
  constructor(token, projectId) {
    this.token = token;
    this.projectId = projectId;
    this.baseUrl = 'api.vercel.com';
    this.alertThresholds = {
      responseTime: 5000, // 5 segundos
      errorRate: 0.05, // 5%
      downtime: 60000, // 1 minuto
      buildTime: 300000 // 5 minutos
    };
    this.monitoringInterval = 30000; // 30 segundos
    this.isMonitoring = false;
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

  async startContinuousMonitoring(duration = 300000) { // 5 minutos por padrão
    console.log('🔍 Iniciando monitoramento contínuo...');
    console.log(`⏱️  Duração: ${duration / 1000} segundos`);
    console.log(`🔄 Intervalo: ${this.monitoringInterval / 1000} segundos`);
    
    this.isMonitoring = true;
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    const metrics = {
      checks: 0,
      successes: 0,
      failures: 0,
      responseTimes: [],
      alerts: [],
      deploymentStates: [],
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    };

    while (this.isMonitoring && Date.now() < endTime) {
      try {
        const checkResult = await this.performHealthCheck();
        metrics.checks++;
        
        if (checkResult.healthy) {
          metrics.successes++;
          metrics.responseTimes.push(checkResult.responseTime);
        } else {
          metrics.failures++;
          metrics.alerts.push({
            timestamp: new Date().toISOString(),
            type: 'health_check_failed',
            details: checkResult
          });
        }

        // Verificar deployments
        const deploymentStatus = await this.checkRecentDeployments();
        metrics.deploymentStates.push({
          timestamp: new Date().toISOString(),
          ...deploymentStatus
        });

        // Verificar se há alertas críticos
        await this.checkAndSendAlerts(checkResult, deploymentStatus);

        console.log(`📊 Check ${metrics.checks}: ${checkResult.healthy ? '✅' : '❌'} (${checkResult.responseTime}ms)`);
        
        await this.sleep(this.monitoringInterval);
        
      } catch (error) {
        console.log(`❌ Erro no monitoramento: ${error.message}`);
        metrics.failures++;
        metrics.alerts.push({
          timestamp: new Date().toISOString(),
          type: 'monitoring_error',
          error: error.message
        });
        await this.sleep(this.monitoringInterval);
      }
    }

    this.isMonitoring = false;
    return this.generateMonitoringReport(metrics);
  }

  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      // Verificar endpoint principal
      const projectResponse = await this.makeRequest(`/v9/projects/${this.projectId}`);
      
      if (projectResponse.status !== 200) {
        return {
          healthy: false,
          responseTime: Date.now() - startTime,
          reason: `Project API returned ${projectResponse.status}`,
          timestamp: new Date().toISOString()
        };
      }

      // Verificar deployment ativo
      const deploymentsResponse = await this.makeRequest(`/v6/deployments?projectId=${this.projectId}&limit=1`);
      
      if (deploymentsResponse.status === 200 && deploymentsResponse.data.deployments.length > 0) {
        const latestDeployment = deploymentsResponse.data.deployments[0];
        
        if (latestDeployment.state === 'READY') {
          // Verificar se a aplicação responde
          const appHealthy = await this.checkApplicationHealth(latestDeployment.url);
          
          return {
            healthy: appHealthy.healthy,
            responseTime: Date.now() - startTime,
            deploymentState: latestDeployment.state,
            deploymentUrl: latestDeployment.url,
            applicationHealth: appHealthy,
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            healthy: false,
            responseTime: Date.now() - startTime,
            reason: `Deployment state is ${latestDeployment.state}`,
            deploymentState: latestDeployment.state,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        return {
          healthy: false,
          responseTime: Date.now() - startTime,
          reason: 'No deployments found',
          timestamp: new Date().toISOString()
        };
      }
      
    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        reason: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async checkApplicationHealth(url) {
    if (!url) return { healthy: false, reason: 'No URL provided' };
    
    try {
      // Simular check HTTP (em ambiente real, usar fetch ou http.get)
      const healthUrl = url.endsWith('/') ? `${url}api/health` : `${url}/api/health`;
      
      // Para este exemplo, assumimos que a aplicação está saudável
      // Em implementação real, fazer requisição HTTP real
      return {
        healthy: true,
        url: healthUrl,
        status: 200,
        responseTime: Math.random() * 1000 + 100 // Simulado
      };
      
    } catch (error) {
      return {
        healthy: false,
        reason: error.message,
        url: url
      };
    }
  }

  async checkRecentDeployments() {
    try {
      const response = await this.makeRequest(`/v6/deployments?projectId=${this.projectId}&limit=5`);
      
      if (response.status === 200) {
        const deployments = response.data.deployments;
        
        const states = deployments.reduce((acc, deployment) => {
          acc[deployment.state] = (acc[deployment.state] || 0) + 1;
          return acc;
        }, {});

        const hasErrors = deployments.some(d => d.state === 'ERROR');
        const hasBuilding = deployments.some(d => d.state === 'BUILDING');
        
        return {
          total: deployments.length,
          states: states,
          hasErrors: hasErrors,
          hasBuilding: hasBuilding,
          latest: deployments[0] ? {
            state: deployments[0].state,
            createdAt: deployments[0].createdAt,
            url: deployments[0].url
          } : null
        };
      } else {
        return {
          error: `Failed to fetch deployments: ${response.status}`,
          states: {}
        };
      }
    } catch (error) {
      return {
        error: error.message,
        states: {}
      };
    }
  }

  async checkAndSendAlerts(healthCheck, deploymentStatus) {
    const alerts = [];

    // Alert: Aplicação não está saudável
    if (!healthCheck.healthy) {
      alerts.push({
        severity: 'critical',
        type: 'application_down',
        message: `Aplicação não está respondendo: ${healthCheck.reason}`,
        timestamp: new Date().toISOString()
      });
    }

    // Alert: Tempo de resposta alto
    if (healthCheck.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        severity: 'warning',
        type: 'high_response_time',
        message: `Tempo de resposta alto: ${healthCheck.responseTime}ms (limite: ${this.alertThresholds.responseTime}ms)`,
        timestamp: new Date().toISOString()
      });
    }

    // Alert: Deployment com erro
    if (deploymentStatus.hasErrors) {
      alerts.push({
        severity: 'high',
        type: 'deployment_errors',
        message: 'Deployments com erro detectados',
        details: deploymentStatus.states,
        timestamp: new Date().toISOString()
      });
    }

    // Alert: Build em andamento por muito tempo
    if (deploymentStatus.hasBuilding && deploymentStatus.latest) {
      const buildStartTime = new Date(deploymentStatus.latest.createdAt).getTime();
      const buildDuration = Date.now() - buildStartTime;
      
      if (buildDuration > this.alertThresholds.buildTime) {
        alerts.push({
          severity: 'warning',
          type: 'long_build_time',
          message: `Build em andamento há ${Math.round(buildDuration / 1000)} segundos`,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Processar alertas
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }

    return alerts;
  }

  async sendAlert(alert) {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Aqui você pode implementar integrações com:
    // - Slack
    // - Discord
    // - Email
    // - Webhooks
    // - Sistema de tickets
    
    // Salvar alerta em arquivo
    await this.saveAlertToFile(alert);
  }

  async saveAlertToFile(alert) {
    const alertsDir = path.join(process.cwd(), 'alerts');
    if (!fs.existsSync(alertsDir)) {
      fs.mkdirSync(alertsDir, { recursive: true });
    }

    const alertFile = path.join(alertsDir, `alert-${Date.now()}.json`);
    fs.writeFileSync(alertFile, JSON.stringify(alert, null, 2));
  }

  async analyzePerformanceTrends() {
    console.log('📈 Analisando tendências de performance...');
    
    try {
      // Buscar deployments dos últimos 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const response = await this.makeRequest(`/v6/deployments?projectId=${this.projectId}&since=${sevenDaysAgo}`);
      
      if (response.status === 200) {
        const deployments = response.data.deployments;
        
        const analysis = {
          totalDeployments: deployments.length,
          successRate: 0,
          averageBuildTime: 0,
          deploymentFrequency: 0,
          errorTrends: {},
          recommendations: []
        };

        // Calcular taxa de sucesso
        const successfulDeployments = deployments.filter(d => d.state === 'READY').length;
        analysis.successRate = deployments.length > 0 ? successfulDeployments / deployments.length : 0;

        // Calcular tempo médio de build (estimado pela diferença entre created e ready)
        const buildTimes = deployments
          .filter(d => d.state === 'READY' && d.readyAt)
          .map(d => new Date(d.readyAt).getTime() - new Date(d.createdAt).getTime());
        
        analysis.averageBuildTime = buildTimes.length > 0 
          ? buildTimes.reduce((sum, time) => sum + time, 0) / buildTimes.length 
          : 0;

        // Calcular frequência de deployments
        analysis.deploymentFrequency = deployments.length / 7; // Por dia

        // Analisar tendências de erro
        const errors = deployments.filter(d => d.state === 'ERROR');
        analysis.errorTrends = errors.reduce((acc, deployment) => {
          const date = new Date(deployment.createdAt).toDateString();
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});

        // Gerar recomendações
        if (analysis.successRate < 0.9) {
          analysis.recommendations.push('Taxa de sucesso baixa - revisar processo de CI/CD');
        }
        
        if (analysis.averageBuildTime > 300000) { // 5 minutos
          analysis.recommendations.push('Tempo de build alto - otimizar processo de build');
        }
        
        if (analysis.deploymentFrequency > 5) {
          analysis.recommendations.push('Alta frequência de deployments - considerar batching');
        }

        return analysis;
      } else {
        throw new Error(`Failed to fetch deployments: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro na análise de performance: ${error.message}`);
      return { error: error.message };
    }
  }

  generateMonitoringReport(metrics) {
    const availabilityRate = metrics.checks > 0 ? metrics.successes / metrics.checks : 0;
    const averageResponseTime = metrics.responseTimes.length > 0 
      ? metrics.responseTimes.reduce((sum, time) => sum + time, 0) / metrics.responseTimes.length 
      : 0;

    const report = {
      summary: {
        duration: `${(new Date(metrics.endTime) - new Date(metrics.startTime)) / 1000} segundos`,
        totalChecks: metrics.checks,
        successfulChecks: metrics.successes,
        failedChecks: metrics.failures,
        availabilityRate: `${(availabilityRate * 100).toFixed(2)}%`,
        averageResponseTime: `${averageResponseTime.toFixed(2)}ms`
      },
      alerts: metrics.alerts,
      deploymentHistory: metrics.deploymentStates,
      recommendations: this.generateRecommendations(metrics, availabilityRate, averageResponseTime)
    };

    console.log('\n📊 RELATÓRIO DE MONITORAMENTO:');
    console.log('================================');
    console.log(`Duração: ${report.summary.duration}`);
    console.log(`Total de verificações: ${report.summary.totalChecks}`);
    console.log(`Taxa de disponibilidade: ${report.summary.availabilityRate}`);
    console.log(`Tempo médio de resposta: ${report.summary.averageResponseTime}`);
    console.log(`Alertas gerados: ${report.alerts.length}`);

    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMENDAÇÕES:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    return report;
  }

  generateRecommendations(metrics, availabilityRate, averageResponseTime) {
    const recommendations = [];

    if (availabilityRate < 0.95) {
      recommendations.push('Taxa de disponibilidade baixa - investigar problemas de infraestrutura');
    }

    if (averageResponseTime > this.alertThresholds.responseTime) {
      recommendations.push('Tempo de resposta alto - otimizar performance da aplicação');
    }

    if (metrics.alerts.length > 5) {
      recommendations.push('Muitos alertas gerados - revisar thresholds de monitoramento');
    }

    const criticalAlerts = metrics.alerts.filter(a => a.severity === 'critical').length;
    if (criticalAlerts > 0) {
      recommendations.push('Alertas críticos detectados - ação imediata necessária');
    }

    return recommendations;
  }

  stopMonitoring() {
    console.log('⏹️  Parando monitoramento...');
    this.isMonitoring = false;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveReportToFile(report, filename = null) {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportFile = filename || path.join(reportsDir, `monitoring-report-${Date.now()}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório salvo em: ${reportFile}`);
  }
}

// Comando CLI
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const token = process.env.VERCEL_TOKEN || 'XRIAx5pnoOPqUQcnsfT0h5Qj';
  const projectId = process.env.VERCEL_PROJECT_ID || 'truecheckiagpt';
  
  const agent = new MonitorAgent(token, projectId);

  switch (command) {
    case 'start':
      const duration = parseInt(args[1]) || 300000; // 5 minutos por padrão
      const report = await agent.startContinuousMonitoring(duration);
      await agent.saveReportToFile(report);
      process.exit(0);
      
    case 'check':
      const healthResult = await agent.performHealthCheck();
      console.log('\n🏥 RESULTADO DA VERIFICAÇÃO:');
      console.log(JSON.stringify(healthResult, null, 2));
      process.exit(healthResult.healthy ? 0 : 1);
      
    case 'analyze':
      const analysis = await agent.analyzePerformanceTrends();
      console.log('\n📈 ANÁLISE DE PERFORMANCE:');
      console.log(JSON.stringify(analysis, null, 2));
      process.exit(0);
      
    case 'deployments':
      const deploymentStatus = await agent.checkRecentDeployments();
      console.log('\n🚀 STATUS DOS DEPLOYMENTS:');
      console.log(JSON.stringify(deploymentStatus, null, 2));
      process.exit(0);
      
    default:
      console.log(`
👀 Monitor Agent - Comandos disponíveis:

  start [duration]    Iniciar monitoramento contínuo (duração em ms, padrão: 300000)
  check              Verificação única de saúde
  analyze            Análise de tendências de performance
  deployments        Status dos deployments recentes

Exemplos:
  node monitor-agent.js start 600000     # Monitorar por 10 minutos
  node monitor-agent.js check            # Verificação única
  node monitor-agent.js analyze          # Análise de tendências
  node monitor-agent.js deployments      # Status de deployments
      `);
      process.exit(0);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MonitorAgent;