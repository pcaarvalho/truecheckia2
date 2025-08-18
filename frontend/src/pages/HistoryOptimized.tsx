import React, { useState, useMemo, useCallback, memo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  RefreshCw, 
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  MoreHorizontal,
  ArrowLeft,
  LogOut,
  Sparkles
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSEO } from '@/hooks/useSEO';
import { usePerformance } from '@/hooks/usePerformance';
import { VirtualizedHistory, useVirtualizedInfiniteQuery } from '@/components/VirtualizedList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Memoized components for better performance
const HistoryFilters = memo(({ filters, onFiltersChange }: {
  filters: any;
  onFiltersChange: (filters: any) => void;
}) => {
  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, search: value });
  }, [filters, onFiltersChange]);

  const handleDateRangeChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, dateRange: value });
  }, [filters, onFiltersChange]);

  const handleResultTypeChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, result: value });
  }, [filters, onFiltersChange]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar por texto..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Período</label>
            <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Resultado</label>
            <Select value={filters.result} onValueChange={handleResultTypeChange}>
              <SelectTrigger>
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ai">IA Detectada</SelectItem>
                <SelectItem value="human">Humano</SelectItem>
                <SelectItem value="uncertain">Incerto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

HistoryFilters.displayName = 'HistoryFilters';

const HistoryStats = memo(({ stats }: { stats: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <FileText className="w-8 h-8 text-blue-500" />
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">IA Detectada</p>
            <p className="text-2xl font-bold text-red-600">{stats?.aiDetected || 0}</p>
          </div>
          <XCircle className="w-8 h-8 text-red-500" />
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Humano</p>
            <p className="text-2xl font-bold text-green-600">{stats?.human || 0}</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Precisão Média</p>
            <p className="text-2xl font-bold">{stats?.averageConfidence || 0}%</p>
          </div>
          <Sparkles className="w-8 h-8 text-purple-500" />
        </div>
      </CardContent>
    </Card>
  </div>
));

HistoryStats.displayName = 'HistoryStats';

const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

const HistoryOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const performance = usePerformance();

  // SEO optimization
  useSEO({
    title: 'Histórico de Análises - TrueCheckIA',
    description: 'Visualize seu histórico completo de análises de conteúdo IA com estatísticas detalhadas.',
    noIndex: true,
  });

  // State management with proper memoization
  const [filters, setFilters] = useState({
    search: '',
    dateRange: 'month',
    result: 'all',
    confidence: 'all',
  });

  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Virtualized infinite query for large datasets
  const {
    items: historyItems,
    loadMore,
    hasNextPage,
    isLoading,
    error,
  } = useVirtualizedInfiniteQuery(
    useCallback(async (page: number) => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...filters,
      });
      
      const response = await api.get(`/analysis/history?${params}`);
      return {
        data: response.data?.analyses || [],
        hasNextPage: response.data?.hasNextPage || false,
      };
    }, [filters]),
    20
  );

  // Fetch stats with caching
  const { data: stats } = useQuery({
    queryKey: ['history-stats', filters],
    queryFn: async () => {
      const response = await api.get('/analysis/stats', { params: filters });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Optimized filter handler
  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/analysis/${id}`);
    },
    onMutate: async (id: string) => {
      // Optimistically remove from cache
      queryClient.setQueryData(['history-stats', filters], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          total: old.total - 1,
        };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history-stats'] });
      setShowDeleteDialog(false);
      setSelectedAnalysis(null);
    },
  });

  // Export functionality
  const handleExport = useCallback(async () => {
    try {
      const response = await api.get('/analysis/export', {
        params: filters,
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [filters]);

  // Memoized header component
  const headerActions = useMemo(() => (
    <div className="flex items-center space-x-4">
      <Button
        variant="outline"
        onClick={handleExport}
        className="flex items-center"
      >
        <Download className="w-4 h-4 mr-2" />
        Exportar
      </Button>
      
      <Button
        variant="outline"
        onClick={() => navigate('/dashboard')}
        className="flex items-center"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Dashboard
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-2">
              <span className="text-sm font-medium text-purple-600">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <span className="hidden md:block">{user?.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => navigate('/profile')}>
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ), [handleExport, navigate, user, logout]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar histórico: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Histórico de Análises</h1>
            </div>
            {headerActions}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <HistoryStats stats={stats} />
        <HistoryFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {isLoading && historyItems.length === 0 ? (
          <LoadingSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Suas Análises</CardTitle>
              <CardDescription>
                {historyItems.length} análise(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VirtualizedHistory
                items={historyItems}
                onLoadMore={loadMore}
                hasNextPage={hasNextPage}
                isLoading={isLoading}
                height={600}
              />
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta análise? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedAnalysis && deleteMutation.mutate(selectedAnalysis.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default memo(HistoryOptimized);