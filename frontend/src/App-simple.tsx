import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AnalysisPage } from "./pages/AnalysisPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
            <div className="text-center p-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">🤖 TrueCheckIA</h1>
              <p className="text-xl text-gray-600 mb-8">Detector de Conteúdo IA</p>
              <div className="space-y-4">
                <div className="p-4 bg-green-100 border border-green-300 rounded-lg">
                  <h2 className="text-lg font-semibold text-green-800">✅ Frontend funcionando!</h2>
                  <p className="text-green-700">Porta corrigida: localhost:8080</p>
                </div>
                <div className="space-y-2">
                  <a 
                    href="/analysis" 
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Test Text Analysis
                  </a>
                  <br />
                  <a 
                    href="http://localhost:4000/api-docs" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Ver API Docs
                  </a>
                </div>
              </div>
            </div>
          </div>
        } />
        <Route path="/analysis" element={<AnalysisPage />} />
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
  </QueryClientProvider>
);

export default App;