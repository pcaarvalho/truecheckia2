#!/bin/bash

# TrueCheckIA - Neon PostgreSQL Monitoring
# Script para monitoramento de performance e saúde do banco Neon

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_metric() {
    echo -e "${CYAN}📊 $1${NC}"
}

# Função para mostrar ajuda
show_help() {
    echo "TrueCheckIA - Monitoramento Neon PostgreSQL"
    echo ""
    echo "Uso: $0 <comando> [opções]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  health            - Verificar saúde geral do banco"
    echo "  performance       - Análise de performance"
    echo "  connections       - Monitorar conexões ativas"
    echo "  slow-queries      - Identificar queries lentas"
    echo "  disk-usage        - Verificar uso de disco"
    echo "  cache-stats       - Estatísticas de cache"
    echo "  index-usage       - Análise de uso de índices"
    echo "  table-stats       - Estatísticas das tabelas"
    echo "  watch             - Monitoramento contínuo"
    echo "  report            - Relatório completo"
    echo ""
    echo "Opções:"
    echo "  --environment     - Ambiente (production|preview)"
    echo "  --interval        - Intervalo para watch (segundos)"
    echo "  --limit           - Limite de resultados"
    echo "  --format          - Formato de saída (table|json)"
    echo ""
    echo "Exemplos:"
    echo "  $0 health --environment production"
    echo "  $0 performance --limit 10"
    echo "  $0 watch --interval 30"
    echo "  $0 report --format json"
}

# Verificar parâmetros
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

COMMAND="$1"
shift

# Parsear opções
ENVIRONMENT=""
INTERVAL=10
LIMIT=10
FORMAT="table"

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Configurar ambiente
case $ENVIRONMENT in
    "production")
        if [ -z "$DATABASE_URL" ]; then
            log_error "DATABASE_URL não configurada para produção"
            exit 1
        fi
        log_info "Monitorando ambiente: PRODUCTION"
        ;;
    "preview")
        if [ -z "$PREVIEW_DATABASE_URL" ]; then
            log_error "PREVIEW_DATABASE_URL não configurada"
            exit 1
        fi
        export DATABASE_URL="$PREVIEW_DATABASE_URL"
        log_info "Monitorando ambiente: PREVIEW"
        ;;
    "")
        log_info "Usando ambiente padrão"
        ;;
esac

# Verificar se estamos no diretório correto
if [ ! -f "packages/database/package.json" ]; then
    log_error "Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

cd packages/database

# Função para executar queries de monitoramento
run_monitoring_query() {
    local query="$1"
    local description="$2"
    
    if [ "$FORMAT" = "json" ]; then
        echo "{"
        echo "  \"query\": \"$description\","
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "  \"data\": "
    else
        log_info "$description"
    fi
    
    npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    
    const prisma = new PrismaClient();
    
    async function runQuery() {
      try {
        const result = await prisma.\$queryRaw\`$query\`;
        
        if ('$FORMAT' === 'json') {
          console.log(JSON.stringify(result, null, 2));
        } else {
          if (Array.isArray(result)) {
            console.table(result);
          } else {
            console.log(result);
          }
        }
        
        await prisma.\$disconnect();
      } catch (error) {
        console.error('Erro na query:', error.message);
        process.exit(1);
      }
    }
    
    runQuery();
    " || log_error "Falha ao executar query: $description"
    
    if [ "$FORMAT" = "json" ]; then
        echo "}"
    fi
}

# Executar comandos de monitoramento
case $COMMAND in
    "health")
        log_info "Verificando saúde geral do banco de dados..."
        
        run_monitoring_query "
        SELECT 
          'Database' as component,
          CASE WHEN pg_is_in_recovery() THEN 'Standby' ELSE 'Primary' END as status,
          version() as version,
          current_database() as database_name,
          pg_size_pretty(pg_database_size(current_database())) as database_size
        " "Informações gerais do banco"
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          attname as column_name,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public' 
        AND n_distinct > 100
        ORDER BY abs(n_distinct) DESC
        LIMIT $LIMIT
        " "Estatísticas de colunas (top $LIMIT)"
        ;;
        
    "performance")
        log_info "Analisando performance do banco..."
        
        run_monitoring_query "
        SELECT 
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          rows
        FROM pg_stat_statements 
        WHERE calls > 1
        ORDER BY mean_exec_time DESC 
        LIMIT $LIMIT
        " "Queries mais lentas (top $LIMIT)"
        
        run_monitoring_query "
        SELECT 
          datname as database,
          numbackends as active_connections,
          xact_commit as transactions_committed,
          xact_rollback as transactions_rolled_back,
          blks_read as blocks_read,
          blks_hit as blocks_hit,
          ROUND((blks_hit::float / (blks_hit + blks_read) * 100), 2) as cache_hit_ratio
        FROM pg_stat_database 
        WHERE datname = current_database()
        " "Estatísticas da base de dados"
        ;;
        
    "connections")
        log_info "Monitorando conexões ativas..."
        
        run_monitoring_query "
        SELECT 
          state,
          COUNT(*) as count,
          MAX(EXTRACT(EPOCH FROM (now() - state_change))) as max_duration_seconds
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state
        ORDER BY count DESC
        " "Conexões por estado"
        
        run_monitoring_query "
        SELECT 
          pid,
          usename as user,
          application_name,
          client_addr as client_ip,
          state,
          EXTRACT(EPOCH FROM (now() - state_change)) as duration_seconds,
          LEFT(query, 100) as query_preview
        FROM pg_stat_activity 
        WHERE datname = current_database()
        AND state = 'active'
        ORDER BY state_change
        LIMIT $LIMIT
        " "Conexões ativas (top $LIMIT)"
        ;;
        
    "slow-queries")
        log_info "Identificando queries lentas..."
        
        run_monitoring_query "
        SELECT 
          LEFT(query, 200) as query_preview,
          calls,
          ROUND(total_exec_time::numeric, 2) as total_time_ms,
          ROUND(mean_exec_time::numeric, 2) as avg_time_ms,
          ROUND(max_exec_time::numeric, 2) as max_time_ms,
          rows
        FROM pg_stat_statements 
        WHERE mean_exec_time > 100
        AND calls > 5
        ORDER BY mean_exec_time DESC 
        LIMIT $LIMIT
        " "Queries com tempo médio > 100ms"
        ;;
        
    "disk-usage")
        log_info "Verificando uso de disco..."
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT $LIMIT
        " "Uso de disco por tabela (top $LIMIT)"
        ;;
        
    "cache-stats")
        log_info "Analisando estatísticas de cache..."
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          heap_blks_read,
          heap_blks_hit,
          CASE 
            WHEN (heap_blks_hit + heap_blks_read) = 0 THEN 0
            ELSE ROUND((heap_blks_hit::float / (heap_blks_hit + heap_blks_read) * 100), 2)
          END as cache_hit_ratio,
          idx_blks_read,
          idx_blks_hit
        FROM pg_statio_user_tables
        WHERE schemaname = 'public'
        ORDER BY (heap_blks_hit + heap_blks_read) DESC
        LIMIT $LIMIT
        " "Cache hit ratio por tabela"
        ;;
        
    "index-usage")
        log_info "Analisando uso de índices..."
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          indexname,
          idx_tup_read,
          idx_tup_fetch,
          idx_blks_read,
          idx_blks_hit
        FROM pg_stat_user_indexes psi
        JOIN pg_statio_user_indexes psio USING (schemaname, tablename, indexname)
        WHERE schemaname = 'public'
        ORDER BY idx_tup_read DESC
        LIMIT $LIMIT
        " "Uso de índices (top $LIMIT)"
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          seq_scan,
          seq_tup_read,
          idx_scan,
          idx_tup_fetch,
          CASE 
            WHEN seq_scan = 0 THEN 'Index Only'
            WHEN idx_scan = 0 THEN 'Seq Scan Only'
            ELSE ROUND((idx_scan::float / (seq_scan + idx_scan) * 100), 2)::text || '%'
          END as index_usage_ratio
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY seq_scan DESC
        LIMIT $LIMIT
        " "Índices vs Sequential Scans"
        ;;
        
    "table-stats")
        log_info "Estatísticas das tabelas..."
        
        run_monitoring_query "
        SELECT 
          schemaname,
          tablename,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_tuples,
          n_dead_tup as dead_tuples,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC
        LIMIT $LIMIT
        " "Atividade das tabelas (top $LIMIT)"
        ;;
        
    "watch")
        log_info "Iniciando monitoramento contínuo (intervalo: ${INTERVAL}s)"
        log_info "Pressione Ctrl+C para parar..."
        
        while true; do
            clear
            echo "=== TrueCheckIA - Monitoramento Neon PostgreSQL ==="
            echo "Timestamp: $(date)"
            echo "Ambiente: ${ENVIRONMENT:-default}"
            echo "Intervalo: ${INTERVAL}s"
            echo ""
            
            # Métricas essenciais
            npx tsx -e "
            import { PrismaClient } from '@prisma/client';
            
            const prisma = new PrismaClient();
            
            async function watchMetrics() {
              try {
                // Conexões ativas
                const connections = await prisma.\$queryRaw\`
                  SELECT COUNT(*) as active_connections 
                  FROM pg_stat_activity 
                  WHERE state = 'active' AND datname = current_database()
                \`;
                
                // Performance geral
                const performance = await prisma.\$queryRaw\`
                  SELECT 
                    ROUND(AVG(mean_exec_time), 2) as avg_query_time,
                    SUM(calls) as total_queries,
                    COUNT(*) as unique_queries
                  FROM pg_stat_statements
                \`;
                
                // Cache hit ratio
                const cache = await prisma.\$queryRaw\`
                  SELECT 
                    ROUND((blks_hit::float / (blks_hit + blks_read) * 100), 2) as cache_hit_ratio
                  FROM pg_stat_database 
                  WHERE datname = current_database()
                \`;
                
                console.log('📊 Métricas em tempo real:');
                console.log(\`   Conexões ativas: \${connections[0].active_connections}\`);
                console.log(\`   Tempo médio de query: \${performance[0].avg_query_time || 0}ms\`);
                console.log(\`   Total de queries: \${performance[0].total_queries || 0}\`);
                console.log(\`   Cache hit ratio: \${cache[0].cache_hit_ratio || 0}%\`);
                
                await prisma.\$disconnect();
              } catch (error) {
                console.error('❌ Erro no monitoramento:', error.message);
              }
            }
            
            watchMetrics();
            "
            
            sleep $INTERVAL
        done
        ;;
        
    "report")
        log_info "Gerando relatório completo do banco..."
        
        if [ "$FORMAT" = "json" ]; then
            echo "{"
            echo "  \"report_timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
            echo "  \"environment\": \"${ENVIRONMENT:-default}\","
            echo "  \"sections\": {"
        fi
        
        # Executar todos os checks principais
        $0 health --environment "$ENVIRONMENT" --format "$FORMAT"
        $0 performance --environment "$ENVIRONMENT" --format "$FORMAT" --limit 5
        $0 connections --environment "$ENVIRONMENT" --format "$FORMAT"
        $0 disk-usage --environment "$ENVIRONMENT" --format "$FORMAT" --limit 5
        
        if [ "$FORMAT" = "json" ]; then
            echo "  }"
            echo "}"
        fi
        ;;
        
    *)
        log_error "Comando inválido: $COMMAND"
        show_help
        exit 1
        ;;
esac

cd ../..

log_success "Monitoramento '$COMMAND' concluído"

# Alertas baseados em métricas críticas
if [ "$COMMAND" = "health" ] || [ "$COMMAND" = "performance" ] || [ "$COMMAND" = "report" ]; then
    log_info "Verificando alertas críticos..."
    
    cd packages/database
    npx tsx -e "
    import { PrismaClient } from '@prisma/client';
    
    const prisma = new PrismaClient();
    
    async function checkAlerts() {
      try {
        // Verificar conexões em excesso
        const connections = await prisma.\$queryRaw\`
          SELECT COUNT(*) as count 
          FROM pg_stat_activity 
          WHERE datname = current_database()
        \`;
        
        if (connections[0].count > 80) {
          console.log('🚨 ALERTA: Muitas conexões ativas (' + connections[0].count + ')');
        }
        
        // Verificar queries lentas
        const slowQueries = await prisma.\$queryRaw\`
          SELECT COUNT(*) as count 
          FROM pg_stat_statements 
          WHERE mean_exec_time > 1000
        \`;
        
        if (slowQueries[0].count > 0) {
          console.log('🚨 ALERTA: ' + slowQueries[0].count + ' queries com tempo > 1s');
        }
        
        // Verificar cache hit ratio baixo
        const cache = await prisma.\$queryRaw\`
          SELECT 
            ROUND((blks_hit::float / (blks_hit + blks_read) * 100), 2) as ratio
          FROM pg_stat_database 
          WHERE datname = current_database()
        \`;
        
        if (cache[0].ratio < 95) {
          console.log('🚨 ALERTA: Cache hit ratio baixo (' + cache[0].ratio + '%)');
        }
        
        await prisma.\$disconnect();
      } catch (error) {
        console.error('Erro ao verificar alertas:', error.message);
      }
    }
    
    checkAlerts();
    " || log_warning "Não foi possível verificar alertas"
    
    cd ../..
fi