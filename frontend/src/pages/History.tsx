import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
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
} from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { CreditTracker } from '@/components/credits'
import { AnalysisHistory, ApiResponse } from '@/types/api'

interface HistoryFilters {
  search: string
  dateRange: 'week' | 'month' | 'all'
  result: 'all' | 'ai' | 'human' | 'uncertain'
  confidence: 'all' | 'HIGH' | 'MEDIUM' | 'LOW'
}

interface HistoryMeta {
  page: number
  limit: number
  total: number
}

const ITEMS_PER_PAGE = 10

const History: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<HistoryFilters>({
    search: '',
    dateRange: 'all',
    result: 'all',
    confidence: 'all'
  })
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)

  // Query para buscar histórico
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analysis-history', currentPage, filters],
    queryFn: async (): Promise<{ analyses: AnalysisHistory[], meta: HistoryMeta }> => {
      const params: any = {
        page: currentPage,
        limit: ITEMS_PER_PAGE
      }

      // Aplicar filtros
      if (filters.search) params.search = filters.search
      if (filters.dateRange !== 'all') params.dateRange = filters.dateRange
      if (filters.result !== 'all') {
        if (filters.result === 'ai') params.isAiGenerated = true
        else if (filters.result === 'human') params.isAiGenerated = false
        else if (filters.result === 'uncertain') params.confidence = 'LOW'
      }
      if (filters.confidence !== 'all') params.confidence = filters.confidence

      const response: ApiResponse<AnalysisHistory[]> = await api.get('/analysis/history', params)
      
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Error loading history')
      }

      return {
        analyses: response.data,
        meta: response.meta as HistoryMeta || { page: 1, limit: ITEMS_PER_PAGE, total: 0 }
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  })

  // Query para buscar detalhes de uma análise
  const { data: analysisDetails } = useQuery({
    queryKey: ['analysis-details', selectedAnalysis],
    queryFn: async () => {
      if (!selectedAnalysis) return null
      const response = await api.get(`/analysis/${selectedAnalysis}`)
      return response.data
    },
    enabled: !!selectedAnalysis
  })

  // Mutation para deletar análise
  const deleteAnalysisMutation = useMutation({
    mutationFn: async (analysisId: string) => {
      await api.delete(`/analysis/${analysisId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-history'] })
    }
  })

  // Mutation para re-analisar texto
  const reAnalyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await api.post('/analysis/check', { text })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analysis-history'] })
    }
  })

  // Calcular dados filtrados e paginação
  const filteredData = useMemo(() => {
    if (!data?.analyses) return { analyses: [], meta: { page: 1, limit: ITEMS_PER_PAGE, total: 0 } }
    return data
  }, [data])

  const totalPages = Math.ceil(filteredData.meta.total / ITEMS_PER_PAGE)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  // Função para truncar texto
  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Função para obter cor do resultado
  const getResultColor = (isAiGenerated: boolean, confidence: string) => {
    if (confidence === 'LOW') return 'bg-yellow-100 text-yellow-800'
    return isAiGenerated ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
  }

  // Função para obter texto do resultado
  const getResultText = (isAiGenerated: boolean, confidence: string) => {
    if (confidence === 'LOW') return 'Uncertain'
    return isAiGenerated ? 'AI' : 'Human'
  }

  // Função para obter ícone do resultado
  const getResultIcon = (isAiGenerated: boolean, confidence: string) => {
    if (confidence === 'LOW') return <AlertCircle className="w-4 h-4" />
    return isAiGenerated ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />
  }

  // Função para exportar dados (apenas Pro)
  const exportData = (format: 'csv' | 'pdf') => {
    if (user?.plan === 'FREE') return
    // Implementar export
    console.log(`Exportando dados em formato ${format}`)
  }

  // Reset de filtros
  const resetFilters = () => {
    setFilters({
      search: '',
      dateRange: 'all',
      result: 'all',
      confidence: 'all'
    })
    setCurrentPage(1)
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error loading history: {(error as Error).message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg">
                    <Sparkles className="text-xl font-bold text-white w-6 h-6" />
                  </div>
                  <span className="ml-3 text-xl font-semibold text-gray-900">TrueCheckIA</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <CreditTracker useRealTimeData={true} className="mr-2" />
                <span className="text-sm text-gray-600">
                  Hello, <span className="font-medium">{user?.name || user?.email}</span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Analysis History</h1>
              <p className="text-gray-600 mt-1">
                {user?.plan === 'FREE' 
                  ? 'View your last 10 analyses' 
                  : 'Complete history of your analyses'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {user?.plan !== 'FREE' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => exportData('csv')}>
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportData('pdf')}>
                      Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Busca */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search in text</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Type to search..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Period</label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, dateRange: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last week</SelectItem>
                      <SelectItem value="month">Last month</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Resultado */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Result</label>
                  <Select
                    value={filters.result}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, result: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="human">Human</SelectItem>
                      <SelectItem value="uncertain">Uncertain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Confiança */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confidence</label>
                  <Select
                    value={filters.confidence}
                    onValueChange={(value: any) => setFilters(prev => ({ ...prev, confidence: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Botão limpar filtros */}
              <div className="mt-4 flex justify-end">
                <Button variant="ghost" onClick={resetFilters}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <Skeleton className="h-12 w-12" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredData.analyses.length === 0 ? (
                <div className="p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No analyses found
                  </h3>
                  <p className="text-gray-600">
                    {Object.values(filters).some(f => f !== 'all' && f !== '')
                      ? 'Try adjusting the filters to see more results.'
                      : 'You haven\'t performed any analyses yet.'
                    }
                  </p>
                  {Object.values(filters).some(f => f !== 'all' && f !== '') && (
                    <Button variant="outline" onClick={resetFilters} className="mt-4">
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Words</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.analyses.map((analysis) => (
                      <TableRow key={analysis.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm">
                              {format(new Date(analysis.createdAt), 'MM/dd/yy HH:mm', { locale: enUS })}
                            </span>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-xs cursor-pointer">
                                <p className="text-sm">{truncateText(analysis.text)}</p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md">
                              <p>{analysis.text}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={getResultColor(analysis.isAiGenerated, analysis.confidence)}
                          >
                            <div className="flex items-center gap-1">
                              {getResultIcon(analysis.isAiGenerated, analysis.confidence)}
                              {getResultText(analysis.isAiGenerated, analysis.confidence)}
                            </div>
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={
                            analysis.confidence === 'HIGH' ? 'default' :
                            analysis.confidence === 'MEDIUM' ? 'secondary' : 'outline'
                          }>
                            {analysis.confidence === 'HIGH' ? 'High' :
                             analysis.confidence === 'MEDIUM' ? 'Medium' : 'Low'}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium">{analysis.aiScore}%</div>
                            <div 
                              className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden"
                            >
                              <div
                                className={`h-full transition-all ${
                                  analysis.aiScore >= 70 ? 'bg-red-500' :
                                  analysis.aiScore >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${analysis.aiScore}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <span className="text-sm text-gray-600">{analysis.wordCount}</span>
                        </TableCell>
                        
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedAnalysis(analysis.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => reAnalyzeMutation.mutate(analysis.text)}
                                disabled={reAnalyzeMutation.isPending}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Re-analyze
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteAnalysisMutation.mutate(analysis.id)}
                                disabled={deleteAnalysisMutation.isPending}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredData.meta.total)} of{' '}
                {filteredData.meta.total} analyses
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2 text-gray-400">...</span>
                    }
                    return null
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Modal de detalhes */}
          <Dialog open={!!selectedAnalysis} onOpenChange={() => setSelectedAnalysis(null)}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Analysis Details</DialogTitle>
                <DialogDescription>
                  View the complete details of this AI analysis
                </DialogDescription>
              </DialogHeader>
              
              {analysisDetails && (
                <div className="space-y-6">
                  {/* Resumo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">AI Score</p>
                      <p className="text-2xl font-bold">{analysisDetails.aiScore}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Confidence</p>
                      <Badge variant={
                        analysisDetails.confidence === 'HIGH' ? 'default' :
                        analysisDetails.confidence === 'MEDIUM' ? 'secondary' : 'outline'
                      }>
                        {analysisDetails.confidence === 'HIGH' ? 'High' :
                         analysisDetails.confidence === 'MEDIUM' ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Words</p>
                      <p className="text-xl font-semibold">{analysisDetails.wordCount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Characters</p>
                      <p className="text-xl font-semibold">{analysisDetails.charCount}</p>
                    </div>
                  </div>

                  {/* Texto analisado */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Analyzed Text</h3>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{analysisDetails.text}</p>
                    </div>
                  </div>

                  {/* Explicação */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Explanation</h3>
                    <p className="text-sm text-gray-600">{analysisDetails.explanation}</p>
                  </div>

                  {/* Indicadores */}
                  {analysisDetails.indicators && analysisDetails.indicators.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Detected Indicators</h3>
                      <div className="grid gap-2">
                        {analysisDetails.indicators.map((indicator: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium">{indicator.type}</p>
                              <p className="text-sm text-gray-600">{indicator.description}</p>
                            </div>
                            <Badge variant={
                              indicator.severity === 'high' ? 'destructive' :
                              indicator.severity === 'medium' ? 'default' : 'secondary'
                            }>
                              {indicator.severity === 'high' ? 'High' :
                               indicator.severity === 'medium' ? 'Medium' : 'Low'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partes suspeitas */}
                  {analysisDetails.suspiciousParts && analysisDetails.suspiciousParts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Suspicious Parts</h3>
                      <div className="space-y-2">
                        {analysisDetails.suspiciousParts.map((part: any, index: number) => (
                          <div key={index} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">Score: {part.score}%</span>
                              <Badge variant="outline">{part.reason}</Badge>
                            </div>
                            <p className="text-sm text-gray-700 italic">"{part.text}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default History