import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Sparkles,
  Lightbulb,
  Copy,
  Trophy,
  Target,
  X,
  ChevronRight
} from 'lucide-react'
import axiosClient from '@/lib/axios'
import { useToast } from '@/components/ui/use-toast'
import { useOnboardingMetrics } from '@/components/onboarding/SuccessMetrics'
import { CreditAlert, CreditGuard, useCredits } from '@/components/credits'
import { useUserCredits } from '@/hooks/useUser'

export default function Analysis() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const { trackFirstAnalysisStart, trackFirstAnalysisComplete, trackErrorEncountered } = useOnboardingMetrics()
  const [searchParams] = useSearchParams()
  const [text, setText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{
    aiProbability: number;
    analysis?: {
      isAI: boolean;
      reasons?: string[];
    };
  } | null>(null)
  const [showGuide, setShowGuide] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [currentTip, setCurrentTip] = useState(0)
  const { data: credits } = useUserCredits()
  const { canPerformAnalysis, consumeCredit, openUpgradeModal } = useCredits()
  
  // Check if this is guided experience
  const isGuided = searchParams.get('guided') === 'true'
  const isFirstAnalysis = searchParams.get('first') === 'true'
  
  const sampleTexts = [
    "Artificial intelligence has revolutionized numerous industries by providing unprecedented capabilities in data processing and analysis. This technology enables organizations to automate complex tasks, derive meaningful insights from vast datasets, and enhance decision-making processes across various domains.",
    "I was walking my dog yesterday when something funny happened. Max, my golden retriever, suddenly stopped in front of Mrs. Johnson's house and started barking at absolutely nothing. Turns out, he was just excited to see his reflection in her car's mirror!"
  ]
  
  const tips = [
    {
      title: "Ideal Text",
      description: "Use texts with at least 50 words for more accurate analysis",
      icon: <Target className="w-5 h-5 text-blue-600" />
    },
    {
      title: "Multiple Analyses",
      description: "Compare different parts of the same document",
      icon: <FileText className="w-5 h-5 text-green-600" />
    },
    {
      title: "Context Matters",
      description: "Technical texts may appear more 'artificial'",
      icon: <Lightbulb className="w-5 h-5 text-yellow-600" />
    }
  ]

  useEffect(() => {
    if (isGuided) {
      setShowGuide(true)
    }
  }, [isGuided])
  
  const handleAnalysis = async () => {
    if (!text.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter text for analysis.',
        variant: 'destructive',
      })
      trackErrorEncountered('Empty text', 'analysis_validation')
      return
    }

    if (text.length < 50) {
      toast({
        title: 'Text Too Short',
        description: 'Text must have at least 50 characters.',
        variant: 'destructive',
      })
      trackErrorEncountered('Text too short', 'analysis_validation')
      return
    }

    // Check if user has credits for analysis
    const { canAnalyze, reason } = canPerformAnalysis()
    if (!canAnalyze) {
      toast({
        title: 'Insufficient Credits',
        description: reason || 'You do not have credits for this analysis.',
        variant: 'destructive',
      })
      openUpgradeModal('no_credits')
      return
    }

    // Track analysis start (especially for first-time users)
    if (isFirstAnalysis) {
      trackFirstAnalysisStart()
    }

    setIsAnalyzing(true)
    setResult(null)

    try {
      const response = await axiosClient.post('/analysis/check', { text })
      
      if (response.data) {
        setResult(response.data)
        
        // Consume a credit after successful analysis
        await consumeCredit()
        
        // Track successful analysis completion
        if (isFirstAnalysis) {
          trackFirstAnalysisComplete({
            aiProbability: response.data.aiProbability,
            textLength: text.length
          })
          setShowSuccess(true)
          setTimeout(() => setShowSuccess(false), 3000)
        }
        
        toast({
          title: 'Analysis Complete!',
          description: 'Verification was completed successfully.',
        })
      }
    } catch (error: unknown) {
      trackErrorEncountered((error as Error).message || 'Analysis failed', 'api_request')
      toast({
        title: 'Analysis Error',
        description: (error as Error).message || 'An error occurred while analyzing the text.',
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-red-600'
    if (confidence >= 60) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 80) return 'High probability of AI'
    if (confidence >= 60) return 'Possible AI content'
    return 'Likely human'
  }
  
  const useSampleText = (index: number) => {
    setText(sampleTexts[index])
    setShowGuide(false)
    toast({
      title: 'Sample text inserted!',
      description: 'Now click "Analyze Text" to see how it works.',
    })
  }
  
  const nextTip = () => {
    setCurrentTip((prev) => (prev + 1) % tips.length)
  }
  
  const prevTip = () => {
    setCurrentTip((prev) => (prev - 1 + tips.length) % tips.length)
  }

  return (
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
              <h1 className="text-xl font-semibold text-gray-900">
                New Content Analysis
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {credits && (
                <span className="text-sm text-gray-600">
                  Credits: <span className="font-medium">
                    {credits.unlimited ? 'Unlimited' : credits.credits}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Success Celebration */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              🎉 First analysis completed!
            </h2>
            <p className="text-gray-600 mb-6">
              Congratulations! You now know how to use TrueCheckIA. Keep exploring!
            </p>
            <Button
              onClick={() => setShowSuccess(false)}
              className="bg-gradient-to-r from-green-600 to-emerald-600"
            >
              Continue
            </Button>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Credit Alert */}
        {credits && (
          <div className="mb-6">
            <CreditAlert
              credits={credits.credits}
              unlimited={credits.unlimited}
              onUpgrade={() => openUpgradeModal('low_credits')}
            />
          </div>
        )}
        {/* Quick Guide for First-time Users */}
        {showGuide && (
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <Lightbulb className="w-6 h-6 text-blue-600 mr-3" />
                  <div>
                    <h3 className="font-semibold text-blue-900">Let's get started!</h3>
                    <p className="text-blue-700 text-sm">Choose a sample text or paste your own text</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGuide(false)}
                  className="text-blue-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div 
                  onClick={() => useSampleText(0)}
                  className="cursor-pointer p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">AI Text</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">85% IA</span>
                  </div>
                  <p className="text-xs text-blue-700 line-clamp-2 mb-2">
                    {sampleTexts[0].substring(0, 100)}...
                  </p>
                  <div className="flex items-center text-blue-600 text-xs">
                    <Copy className="w-3 h-3 mr-1" />
                    Click to use
                  </div>
                </div>
                
                <div 
                  onClick={() => useSampleText(1)}
                  className="cursor-pointer p-4 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-900">Human Text</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">15% IA</span>
                  </div>
                  <p className="text-xs text-blue-700 line-clamp-2 mb-2">
                    {sampleTexts[1].substring(0, 100)}...
                  </p>
                  <div className="flex items-center text-blue-600 text-xs">
                    <Copy className="w-3 h-3 mr-1" />
                    Click to use
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-blue-700 text-xs">💡 Or paste your own text in the area below</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Tips for guided users */}
        {isGuided && !showGuide && (
          <Card className="mb-6 border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {tips[currentTip].icon}
                  <div className="ml-3">
                    <h4 className="font-medium text-purple-900">{tips[currentTip].title}</h4>
                    <p className="text-purple-700 text-sm">{tips[currentTip].description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={prevTip} className="text-purple-600">
                    <ChevronRight className="w-4 h-4 rotate-180" />
                  </Button>
                  <span className="text-xs text-purple-600">{currentTip + 1}/{tips.length}</span>
                  <Button variant="ghost" size="sm" onClick={nextTip} className="text-purple-600">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Input Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Insert Text for Analysis
            </CardTitle>
            <CardDescription>
              Paste or type the text you want to check if it was generated by AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your text here... (minimum 50 characters)"
              className="min-h-[200px] mb-4"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isAnalyzing}
            />
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {text.length} characters
              </span>
              
              <CreditGuard action="analysis">
                <Button
                  onClick={handleAnalysis}
                  disabled={isAnalyzing || !text.trim()}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Analyze Text
                    </>
                  )}
                </Button>
              </CreditGuard>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isAnalyzing && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center py-8">
                <Sparkles className="w-12 h-12 text-purple-600 animate-pulse mb-4" />
                <p className="text-lg font-medium mb-2">Analyzing content...</p>
                <p className="text-sm text-gray-500 mb-4">
                  Checking writing patterns with AI
                </p>
                <Progress value={33} className="w-full max-w-xs" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {result && !isAnalyzing && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Result</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Main Result */}
              <div className="mb-6 p-6 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium">AI Probability:</span>
                  <span className={`text-2xl font-bold ${getConfidenceColor(result.aiProbability)}`}>
                    {result.aiProbability}%
                  </span>
                </div>
                
                <Progress value={result.aiProbability} className="mb-2" />
                
                <p className={`text-sm ${getConfidenceColor(result.aiProbability)}`}>
                  {getConfidenceLabel(result.aiProbability)}
                </p>
              </div>

              {/* Detailed Analysis */}
              {result.analysis && (
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Detailed Analysis</h3>
                  
                  {result.analysis.isAI ? (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        This text shows typical characteristics of AI-generated content.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        This text appears to have been written by a human.
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.analysis.reasons && result.analysis.reasons.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Found indicators:
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {result.analysis.reasons.map((reason: string, index: number) => (
                          <li key={index} className="text-sm text-gray-600">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setText('')
                    setResult(null)
                  }}
                >
                  New Analysis
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/history')}
                >
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Credits Warning - Now handled by CreditAlert component above */}
      </main>
    </div>
  )
}