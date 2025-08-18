const IndexSimple = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-8">TrueCheckIA</h1>
          <p className="text-xl mb-8">Detecte conteúdo gerado por IA com 95% de precisão</p>
          <div className="space-x-4">
            <a 
              href="/register" 
              className="inline-block px-8 py-3 bg-white text-purple-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Start Free
            </a>
            <a 
              href="/login" 
              className="inline-block px-8 py-3 border border-white text-white rounded-lg font-semibold hover:bg-white hover:text-purple-900 transition-colors"
            >
              Fazer Login
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexSimple