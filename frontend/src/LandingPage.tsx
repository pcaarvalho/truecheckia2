import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <span className="text-3xl mr-3">🤖</span>
              <h1 className="text-2xl font-bold text-gray-900">TrueCheckIA</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#how" className="text-gray-600 hover:text-gray-900">Como Funciona</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Preços</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</a>
            </nav>
            <div className="flex space-x-4">
              <button className="text-gray-600 hover:text-gray-900 font-medium">
                Login
              </button>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">
                Start Free
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Descubra se um texto foi escrito por{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                IA em segundos
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Tecnologia avançada com 95% de precisão para detectar conteúdo gerado por 
              Inteligência Artificial. Confiado por mais de 10.000 profissionais.
            </p>
            
            {/* Demo Box */}
            <div className="bg-white rounded-xl shadow-xl p-6 mb-8 max-w-3xl mx-auto border border-gray-200">
              <textarea 
                className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Cole ou digite o texto que deseja analisar..."
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  ✨ Teste grátis - sem cadastro necessário
                </span>
                <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-shadow font-medium">
                  Analisar Texto
                </button>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex justify-center items-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                95% de precisão
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Resultado instantâneo
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Suporte PT/EN
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900">10,000+</div>
              <div className="text-gray-600">Usuários Ativos</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">1M+</div>
              <div className="text-gray-600">Análises Realizadas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">95%</div>
              <div className="text-gray-600">Precisão</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900">4.9⭐</div>
              <div className="text-gray-600">Avaliação</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para detectar conteúdo gerado por IA
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Alta Precisão</h3>
              <p className="text-gray-600">
                Algoritmos avançados treinados em milhões de textos para máxima precisão
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Análise Instantânea</h3>
              <p className="text-gray-600">
                Resultados em segundos, não minutos. Otimizado para velocidade
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Relatório Detalhado</h3>
              <p className="text-gray-600">
                Explicações claras sobre por que o texto foi classificado como IA ou humano
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">100% Privado</h3>
              <p className="text-gray-600">
                Seus textos nunca são armazenados ou compartilhados. Privacidade garantida
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🌍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Multi-idioma</h3>
              <p className="text-gray-600">
                Suporte para Português e Inglês, com mais idiomas em breve
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔌</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">API Disponível</h3>
              <p className="text-gray-600">
                Integre nossa tecnologia em seus próprios aplicativos e fluxos de trabalho
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Como Funciona
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Três passos simples para detectar conteúdo IA
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Cole seu texto</h3>
              <p className="text-gray-600">
                Adicione o conteúdo que deseja verificar na caixa de texto
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Nossa IA analisa</h3>
              <p className="text-gray-600">
                Algoritmos avançados detectam padrões únicos de IA
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Receba o resultado</h3>
              <p className="text-gray-600">
                Obtenha score detalhado e explicação completa instantaneamente
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Preços Simples e Transparentes
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Escolha o plano ideal para suas necessidades
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-4">Gratuito</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 0</span>
                <span className="text-gray-600">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  10 análises por mês
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Detecção básica
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Histórico de 30 dias
                </li>
              </ul>
              <button className="w-full bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 font-medium">
                Start Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-blue-600 to-purple-600 text-white rounded-xl p-8 shadow-xl transform scale-105">
              <div className="text-center mb-2">
                <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-medium">
                  MAIS POPULAR
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 29</span>
                <span className="opacity-80">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Análises ilimitadas
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  API para integrações
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Relatórios em PDF
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Suporte prioritário
                </li>
              </ul>
              <button className="w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-gray-100 font-bold">
                Começar Teste Grátis
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-4">Enterprise</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">Personalizado</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Volume ilimitado
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  SLA garantido
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Suporte dedicado
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 text-green-500 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Instalação on-premise
                </li>
              </ul>
              <button className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 font-medium">
                Falar com Vendas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            <details className="bg-gray-50 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">
                Como o TrueCheckIA detecta conteúdo gerado por IA?
              </summary>
              <p className="mt-4 text-gray-600">
                Utilizamos algoritmos avançados de machine learning treinados em milhões de textos 
                para identificar padrões únicos presentes em conteúdo gerado por IA.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">
                Qual a precisão da detecção?
              </summary>
              <p className="mt-4 text-gray-600">
                Nossa tecnologia tem uma precisão média de 95%, variando de acordo com o tipo 
                e tamanho do texto analisado.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">
                Meus textos são armazenados?
              </summary>
              <p className="mt-4 text-gray-600">
                Não. Levamos sua privacidade a sério. Os textos são analisados em tempo real 
                e não são armazenados em nossos servidores.
              </p>
            </details>

            <details className="bg-gray-50 rounded-lg p-6">
              <summary className="font-semibold cursor-pointer">
                Posso cancelar minha assinatura a qualquer momento?
              </summary>
              <p className="mt-4 text-gray-600">
                Sim! Você pode cancelar sua assinatura a qualquer momento, sem taxas ou 
                penalidades adicionais.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para detectar conteúdo IA?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Junte-se a milhares de profissionais que confiam no TrueCheckIA
          </p>
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-bold hover:bg-gray-100 shadow-lg">
            Começar Agora - É Grátis
          </button>
          <p className="mt-4 text-sm opacity-75">
            Não precisa de cartão de crédito • Setup em 30 segundos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">🤖</span>
                <span className="text-xl font-bold">TrueCheckIA</span>
              </div>
              <p className="text-gray-400">
                Detecte conteúdo IA com precisão.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Preços</a></li>
                <li><a href="#" className="hover:text-white">API</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Sobre</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
                <li><a href="#" className="hover:text-white">Contato</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacidade</a></li>
                <li><a href="#" className="hover:text-white">Termos</a></li>
                <li><a href="#" className="hover:text-white">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© 2024 TrueCheckIA. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}