# Sistema de Créditos TrueCheckIA

Este sistema implementa um conjunto completo de componentes e hooks para gerenciar créditos de usuário e fluxos de upgrade no TrueCheckIA.

## Componentes Implementados

### 1. CreditAlert
**Localização:** `/src/components/credits/CreditAlert.tsx`

Componente que exibe avisos progressivos quando os créditos estão baixos:
- 3 créditos: Aviso amarelo sugerindo upgrade
- 1 crédito: Aviso vermelho urgente  
- 0 créditos: Aviso crítico impedindo análises

**Uso:**
```tsx
import { CreditAlert } from '@/components/credits'

<CreditAlert
  credits={userCredits}
  unlimited={isUnlimited}
  onUpgrade={() => openUpgradeModal('low_credits')}
/>
```

### 2. CreditStatus
**Localização:** `/src/components/credits/CreditStatus.tsx`

Card completo mostrando status detalhado dos créditos:
- Barra de progresso para planos gratuitos
- Informações sobre renovação
- Botão de upgrade integrado
- Badges indicando o plano atual

**Uso:**
```tsx
import { CreditStatus } from '@/components/credits'

<CreditStatus
  credits={credits.credits}
  unlimited={credits.unlimited}
  plan={user?.plan || 'FREE'}
  daysUntilReset={credits.daysUntilReset}
  onUpgrade={() => openUpgradeModal('manual')}
/>
```

### 3. UpgradeModal
**Localização:** `/src/components/credits/UpgradeModal.tsx`

Modal completo de upgrade com:
- Comparação visual dos planos
- Integração com Stripe (preparada)
- Diferentes razões de ativação (sem créditos, créditos baixos, manual)
- Interface responsiva e acessível

**Uso:**
```tsx
import { UpgradeModal } from '@/components/credits'

<UpgradeModal
  isOpen={showUpgradeModal}
  onClose={closeUpgradeModal}
  currentPlan={user?.plan}
  triggerReason="no_credits"
/>
```

### 4. CreditGuard
**Localização:** `/src/components/credits/CreditGuard.tsx`

Componente wrapper que intercepta ações que requerem créditos:
- Previne cliques quando sem créditos
- Abre modal de upgrade automaticamente
- Desabilita elementos visuais quando necessário

**Uso:**
```tsx
import { CreditGuard } from '@/components/credits'

<CreditGuard action="analysis">
  <Button onClick={handleAnalysis}>
    Analisar Texto
  </Button>
</CreditGuard>
```

## Hooks Implementados

### useCredits
**Localização:** `/src/hooks/useCredits.ts`

Hook principal para gerenciar estado de créditos:

```tsx
import { useCredits } from '@/hooks/useCredits'

const {
  // Informações dos créditos
  credits,
  isUnlimited,
  hasCreditsForAnalysis,
  areCreditsLow,
  areCreditsEmpty,
  
  // Funções
  consumeCredit,
  canPerformAnalysis,
  refetchCredits,
  
  // Modal
  showUpgradeModal,
  openUpgradeModal,
  closeUpgradeModal,
  
  // Utilitários
  formatCredits
} = useCredits()
```

### useCreditToast
**Localização:** `/src/components/credits/CreditToast.tsx`

Hook para notificações específicas de créditos:

```tsx
import { useCreditToast } from '@/components/credits'

const {
  showLowCreditWarning,
  showLastCreditWarning,
  showNoCreditsError,
  showAnalysisSuccess,
  showUpgradeSuccess,
  showCreditRefill
} = useCreditToast()
```

## Integração Realizada

### Dashboard (`/src/pages/Dashboard.tsx`)
- Substituído card de créditos simples por `CreditStatus`
- Adicionado `CreditAlert` no topo da página
- Envolvido botão "Nova Análise" com `CreditGuard`

### Página de Analysis (`/src/pages/Analysis.tsx`)
- Adicionado `CreditAlert` no início da página
- Verificação de créditos antes de iniciar análise
- Consumo de crédito após análise bem-sucedida
- Envolvido botão de análise com `CreditGuard`

### AnalysisForm (`/src/components/analysis/AnalysisForm.tsx`)
- Integração com sistema de créditos
- Prevenção de submissão sem créditos
- Consumo automático de créditos

## Fluxos de Usuário

### 1. Usuário com Créditos Baixos (3 ou menos)
1. `CreditAlert` aparece em todas as páginas relevantes
2. Toast notification aparece quando créditos atingem níveis críticos
3. Sugestões de upgrade são apresentadas

### 2. Usuário Sem Créditos
1. `CreditAlert` mostra estado crítico
2. `CreditGuard` previne ações que requerem créditos
3. `UpgradeModal` abre automaticamente com razão "no_credits"
4. Botões ficam desabilitados até upgrade

### 3. Tentativa de Análise Sem Créditos
1. Verificação prévia de créditos
2. Modal de upgrade abre automaticamente
3. Toast error explica a situação
4. Usuário é direcionado para upgrade

### 4. Análise Bem-sucedida
1. Crédito é consumido após análise
2. Toast success mostra créditos restantes
3. Cache de créditos é atualizado
4. Avisos são reavaliados

## Configuração de Planos

Os planos estão configurados no `UpgradeModal` e `userService`:

- **FREE**: 10 créditos/mês, recursos básicos
- **PRO**: Ilimitado, recursos avançados, R$ 49/mês
- **ENTERPRISE**: Ilimitado, recursos premium, R$ 199/mês

## Integração com Stripe

O sistema está preparado para Stripe:
- Price IDs configuráveis em `subscriptionService`
- Redirecionamento para checkout
- Portal de gerenciamento de assinatura

## Responsividade e Acessibilidade

Todos os componentes seguem:
- Design system do Shadcn/ui
- Responsividade mobile-first
- Suporte a screen readers
- Navegação por teclado
- Estados de loading e erro

## Próximos Passos

1. **Configurar Stripe reais Price IDs**
2. **Implementar webhook para atualização de créditos**
3. **Adicionar testes unitários**
4. **Implementar analytics de conversão**
5. **Adicionar animações de transição**