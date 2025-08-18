import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Simple placeholders for missing components
const SimpleToaster = () => null;
const SimpleTooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SimpleTooltipProvider>
      <SimpleToaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600">Página não encontrada</p>
                <a href="/" className="text-blue-600 hover:underline">Voltar ao início</a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
    </SimpleTooltipProvider>
  </QueryClientProvider>
);

export default App;