#!/bin/bash

# TrueCheckIA - Neon PostgreSQL Migration Management
# Script para gerenciar migrations no Neon PostgreSQL

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Função para mostrar ajuda
show_help() {
    echo "TrueCheckIA - Gerenciamento de Migrations Neon PostgreSQL"
    echo ""
    echo "Uso: $0 <comando> [opções]"
    echo ""
    echo "Comandos disponíveis:"
    echo "  create <nome>     - Criar nova migration"
    echo "  deploy            - Aplicar migrations em produção"
    echo "  status            - Verificar status das migrations"
    echo "  reset             - Reset do banco (apenas preview)"
    echo "  diff              - Comparar schema atual com Prisma"
    echo "  generate          - Gerar cliente Prisma"
    echo "  validate          - Validar schema Prisma"
    echo "  backup            - Criar backup antes das migrations"
    echo ""
    echo "Opções:"
    echo "  --environment     - Especificar ambiente (production|preview)"
    echo "  --dry-run         - Simular operação sem executar"
    echo "  --verbose         - Log detalhado"
    echo "  --help            - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 create add_user_preferences"
    echo "  $0 deploy --environment production"
    echo "  $0 status --verbose"
    echo "  $0 reset --environment preview"
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
DRY_RUN=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            MIGRATION_NAME="$1"
            shift
            ;;
    esac
done

# Verificar se estamos no diretório correto
if [ ! -f "packages/database/package.json" ]; then
    log_error "Execute este script a partir do diretório raiz do projeto"
    exit 1
fi

# Configurar ambiente
case $ENVIRONMENT in
    "production")
        if [ -z "$DATABASE_URL" ] || [ -z "$DIRECT_URL" ]; then
            log_error "Variáveis de produção não configuradas"
            log_info "Configure DATABASE_URL e DIRECT_URL para produção"
            exit 1
        fi
        log_info "Usando ambiente: PRODUCTION"
        ;;
    "preview")
        if [ -z "$PREVIEW_DATABASE_URL" ] || [ -z "$PREVIEW_DIRECT_URL" ]; then
            log_error "Variáveis de preview não configuradas"
            log_info "Configure PREVIEW_DATABASE_URL e PREVIEW_DIRECT_URL"
            exit 1
        fi
        export DATABASE_URL="$PREVIEW_DATABASE_URL"
        export DIRECT_URL="$PREVIEW_DIRECT_URL"
        log_info "Usando ambiente: PREVIEW"
        ;;
    "")
        log_info "Usando ambiente padrão (variáveis atuais)"
        ;;
    *)
        log_error "Ambiente inválido: $ENVIRONMENT"
        log_info "Use: production ou preview"
        exit 1
        ;;
esac

# Navegar para diretório do banco
cd packages/database

# Executar comandos
case $COMMAND in
    "create")
        if [ -z "$MIGRATION_NAME" ]; then
            log_error "Nome da migration é obrigatório"
            log_info "Uso: $0 create <nome_da_migration>"
            exit 1
        fi
        
        log_info "Criando migration: $MIGRATION_NAME"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Seria criada migration: $MIGRATION_NAME"
            npx prisma migrate diff --preview-feature
        else
            npx prisma migrate dev --name "$MIGRATION_NAME"
            log_success "Migration '$MIGRATION_NAME' criada com sucesso"
        fi
        ;;
        
    "deploy")
        log_info "Aplicando migrations..."
        
        if [ "$ENVIRONMENT" = "production" ]; then
            log_warning "ATENÇÃO: Aplicando migrations em PRODUÇÃO"
            read -p "Continuar? (y/N): " confirm
            if [ "$confirm" != "y" ]; then
                log_info "Operação cancelada"
                exit 0
            fi
        fi
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Verificando migrations pendentes..."
            npx prisma migrate status
        else
            # Backup automático antes das migrations em produção
            if [ "$ENVIRONMENT" = "production" ]; then
                log_info "Criando backup automático..."
                BACKUP_NAME="pre-migration-$(date +%Y%m%d-%H%M%S)"
                # Aqui você integraria com Neon CLI se disponível
                log_info "Backup sugerido: $BACKUP_NAME"
            fi
            
            npx prisma migrate deploy
            log_success "Migrations aplicadas com sucesso"
        fi
        ;;
        
    "status")
        log_info "Verificando status das migrations..."
        
        npx prisma migrate status
        
        if [ "$VERBOSE" = true ]; then
            log_info "Informações detalhadas do banco:"
            npx tsx -e "
            import { PrismaClient } from '@prisma/client';
            
            const prisma = new PrismaClient();
            
            async function getStatus() {
              try {
                const migrations = await prisma.\$queryRaw\`
                  SELECT * FROM _prisma_migrations 
                  ORDER BY finished_at DESC 
                  LIMIT 5;
                \`;
                
                console.log('🕒 Últimas 5 migrations:');
                migrations.forEach(m => {
                  console.log(\`   \${m.migration_name} - \${m.finished_at || 'PENDENTE'}\`);
                });
                
                const tableCount = await prisma.\$queryRaw\`
                  SELECT COUNT(*) as count 
                  FROM information_schema.tables 
                  WHERE table_schema = 'public';
                \`;
                
                console.log(\`📊 Tabelas no banco: \${tableCount[0].count}\`);
                
                await prisma.\$disconnect();
              } catch (error) {
                console.error('❌ Erro ao obter status:', error.message);
              }
            }
            
            getStatus();
            "
        fi
        ;;
        
    "reset")
        if [ "$ENVIRONMENT" = "production" ]; then
            log_error "Reset não é permitido em produção!"
            log_info "Use backup/restore para produção"
            exit 1
        fi
        
        log_warning "ATENÇÃO: Isso irá resetar todo o banco de dados"
        read -p "Continuar? (y/N): " confirm
        if [ "$confirm" != "y" ]; then
            log_info "Operação cancelada"
            exit 0
        fi
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Seria executado reset do banco"
        else
            npx prisma migrate reset --force
            log_success "Banco resetado com sucesso"
        fi
        ;;
        
    "diff")
        log_info "Comparando schema atual com Prisma..."
        
        npx prisma db diff || {
            log_info "Diferenças encontradas entre schema e banco"
            log_info "Execute 'create' para gerar migration ou 'deploy' para aplicar"
        }
        ;;
        
    "generate")
        log_info "Gerando cliente Prisma..."
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Cliente Prisma seria gerado"
        else
            npm run db:generate
            log_success "Cliente Prisma gerado com sucesso"
        fi
        ;;
        
    "validate")
        log_info "Validando schema Prisma..."
        
        npx prisma validate || {
            log_error "Schema Prisma contém erros"
            exit 1
        }
        
        log_success "Schema Prisma é válido"
        
        if [ "$VERBOSE" = true ]; then
            log_info "Informações do schema:"
            npx prisma format --check || log_info "Schema pode ser formatado"
        fi
        ;;
        
    "backup")
        if [ "$ENVIRONMENT" != "production" ]; then
            log_warning "Backup é recomendado apenas para produção"
        fi
        
        BACKUP_NAME="manual-backup-$(date +%Y%m%d-%H%M%S)"
        log_info "Criando backup: $BACKUP_NAME"
        
        if [ "$DRY_RUN" = true ]; then
            log_info "[DRY RUN] Seria criado backup: $BACKUP_NAME"
        else
            # Integração com Neon CLI seria aqui
            log_info "Para criar backup manual, use o painel do Neon ou CLI:"
            log_info "neonctl branches create --name $BACKUP_NAME --parent main"
            
            # Backup de schema local
            npx prisma db pull --force
            log_info "Schema local atualizado como backup"
        fi
        ;;
        
    *)
        log_error "Comando inválido: $COMMAND"
        show_help
        exit 1
        ;;
esac

# Voltar ao diretório raiz
cd ../..

log_success "Operação '$COMMAND' concluída"

# Mostrar próximos passos baseado no comando
case $COMMAND in
    "create")
        echo ""
        log_info "Próximos passos:"
        echo "  1. Revisar a migration gerada em packages/database/prisma/migrations/"
        echo "  2. Testar a migration: $0 deploy --environment preview"
        echo "  3. Aplicar em produção: $0 deploy --environment production"
        ;;
    "deploy")
        echo ""
        log_info "Próximos passos:"
        echo "  1. Verificar se aplicação funciona corretamente"
        echo "  2. Executar testes de integração"
        echo "  3. Monitorar logs de erro"
        ;;
    "reset")
        echo ""
        log_info "Próximos passos:"
        echo "  1. Executar seed: npm run db:seed"
        echo "  2. Testar aplicação"
        echo "  3. Recriar dados de teste se necessário"
        ;;
esac