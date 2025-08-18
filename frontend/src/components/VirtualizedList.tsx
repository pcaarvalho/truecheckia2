import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useInView } from 'react-intersection-observer';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (props: { index: number; style: React.CSSProperties; data: T }) => React.ReactElement;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
}

const VirtualizedList = <T,>({
  items,
  height,
  itemHeight,
  renderItem,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
}: VirtualizedListProps<T>) => {
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // Trigger load more when approaching the end
  React.useEffect(() => {
    if (inView && hasNextPage && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasNextPage, isLoading, onLoadMore]);

  // Item renderer with load more trigger
  const itemRenderer = useMemo(() => {
    return ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];
      
      // Add load more trigger near the end
      const shouldTriggerLoadMore = index >= items.length - 5;
      
      return (
        <div style={style}>
          {shouldTriggerLoadMore && (
            <div ref={loadMoreRef} style={{ height: 1 }} />
          )}
          {renderItem({ index, style: {}, data: item })}
        </div>
      );
    };
  }, [items, renderItem, loadMoreRef]);

  // Loading indicator component
  const LoadingIndicator = () => (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      <span className="ml-2 text-gray-600">Carregando mais itens...</span>
    </div>
  );

  // Calculate total height including loading indicator
  const totalHeight = hasNextPage && isLoading ? height + 60 : height;

  return (
    <div className={`relative ${className}`}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={items}
        overscanCount={5} // Render 5 extra items above and below viewport
        className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
      >
        {itemRenderer}
      </List>
      
      {/* Loading indicator */}
      {hasNextPage && isLoading && (
        <div className="absolute bottom-0 left-0 right-0">
          <LoadingIndicator />
        </div>
      )}
      
      {/* End of list indicator */}
      {!hasNextPage && items.length > 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Todos os itens foram carregados
        </div>
      )}
    </div>
  );
};

export default VirtualizedList;

// Specialized component for analysis history
interface AnalysisHistoryItem {
  id: string;
  text: string;
  result: {
    isAI: boolean;
    confidence: number;
    model: string;
  };
  createdAt: string;
}

interface VirtualizedHistoryProps {
  items: AnalysisHistoryItem[];
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  height?: number;
}

export const VirtualizedHistory: React.FC<VirtualizedHistoryProps> = ({
  items,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  height = 600,
}) => {
  const renderHistoryItem = ({ data, index }: { data: AnalysisHistoryItem; index: number }) => (
    <div className="p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">
            {data.text.length > 100 ? `${data.text.substring(0, 100)}...` : data.text}
          </p>
          <div className="mt-1 flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                data.result.isAI
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {data.result.isAI ? 'AI Detectado' : 'Humano'}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(data.result.confidence * 100)}% confiança
            </span>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <span className="text-xs text-gray-500">
            {new Date(data.createdAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <VirtualizedList
      items={items}
      height={height}
      itemHeight={120} // Approximate height of each history item
      renderItem={renderHistoryItem}
      onLoadMore={onLoadMore}
      hasNextPage={hasNextPage}
      isLoading={isLoading}
      className="border border-gray-200 rounded-lg overflow-hidden"
    />
  );
};

// Hook for infinite scrolling with virtual list
export const useVirtualizedInfiniteQuery = <T,>(
  queryFn: (page: number) => Promise<{ data: T[]; hasNextPage: boolean }>,
  pageSize: number = 20
) => {
  const [items, setItems] = React.useState<T[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [hasNextPage, setHasNextPage] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadMore = React.useCallback(async () => {
    if (isLoading || !hasNextPage) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn(currentPage);
      
      setItems(prev => [...prev, ...result.data]);
      setHasNextPage(result.hasNextPage);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, hasNextPage, isLoading, queryFn]);

  // Load initial data
  React.useEffect(() => {
    if (items.length === 0) {
      loadMore();
    }
  }, [loadMore, items.length]);

  const reset = React.useCallback(() => {
    setItems([]);
    setCurrentPage(1);
    setHasNextPage(true);
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    items,
    loadMore,
    hasNextPage,
    isLoading,
    error,
    reset,
  };
};