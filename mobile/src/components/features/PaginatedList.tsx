import { FlatList, View } from "react-native";
import { useMemo } from "react";
import type { ListRenderItemInfo } from "react-native";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FullScreenLoading, LoadingState } from "@/components/ui/LoadingState";

interface PaginatedListProps<T> {
  isLoading: boolean;
  isError: boolean;
  data: T[];
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement;
  keyExtractor: (item: T) => string;
  empty: { icon?: "file-tray-outline"; title: string; message?: string; action?: React.ReactNode };
  onRetry?: () => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  className?: string;
  contentContainerClassName?: string;
  ListHeaderComponent?: React.ReactElement;
  ItemSeparatorComponent?: React.ComponentType;
  loadingMore?: boolean;
}

export function PaginatedList<T>({
  isLoading,
  isError,
  data,
  renderItem,
  keyExtractor,
  empty,
  onRetry,
  onEndReached,
  hasMore,
  className,
  contentContainerClassName,
  ListHeaderComponent,
  ItemSeparatorComponent,
  loadingMore,
}: PaginatedListProps<T>) {
  const tt = useT();
  const ListEmpty = useMemo(() => {
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState message={tt("common.listError")} onRetry={onRetry} />;
    return <EmptyState {...empty} />;
  }, [isLoading, isError, empty, onRetry, tt]);

  if (isLoading && data.length === 0) {
    return <FullScreenLoading />;
  }

  if (isError && data.length === 0) {
    return <ErrorState message={tt("common.listError")} onRetry={onRetry} />;
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      className={className}
      contentContainerClassName={contentContainerClassName}
      ItemSeparatorComponent={
        ItemSeparatorComponent ?? (() => <View className="h-2.5" />)
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmpty}
      onEndReached={onEndReached && hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? <LoadingState label={tt("common.loadingMore")} /> : null
      }
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    />
  );
}