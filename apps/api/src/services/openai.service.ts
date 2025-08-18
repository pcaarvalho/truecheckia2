import OpenAI from 'openai'
import { config } from '@truecheckia/config'
import type { OpenAIAnalysisResponse, AnalysisResult, Indicator, SuspiciousPart } from '@truecheckia/types'

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  organization: config.openai.orgId,
})

const DETECTION_PROMPT_PT = `You are an advanced AI text detector specializing in identifying content from GPT-4, Claude, Gemini, and other LLMs.

ANALYZE WITH MULTIPLE LAYERS:

1. MODEL-SPECIFIC PATTERNS:
- GPT-4: Tendency for "However," transitions, nested parentheticals, "It's worth noting"
- Claude: Apologetic tone, excessive caveats, "I should mention", ethical considerations
- Gemini: Balanced viewpoints, "On one hand/other hand", comprehensive lists
- Generic LLM: Perfect grammar, no typos, uniform sentence complexity

2. LINGUISTIC FORENSICS:
- Perplexity analysis: Unusually low perplexity scores
- Burstiness: Lack of variation in sentence length (humans vary 30-50%)
- Token predictability: High next-token predictability
- Semantic coherence: Unnatural consistency in topic progression

3. HUMAN AUTHENTICITY MARKERS (absence indicates AI):
- Personal anecdotes with specific details (dates, names, places)
- Emotional inconsistencies or contradictions
- Cultural references and colloquialisms specific to region/age
- Typos, grammatical quirks, or stylistic inconsistencies
- Strong opinions without hedging
- Natural digressions and tangential thoughts

4. STATISTICAL ANOMALIES:
- Sentence length variance (standard deviation < 4 words = suspicious)
- Punctuation patterns (AI uses 40% more commas on average)
- Paragraph length consistency (CV < 0.3 = likely AI)

Return ONLY valid JSON:
{
  "score": 0-100,
  "confidence": "high" | "medium" | "low",
  "main_indicators": ["specific_indicator1", "specific_indicator2"],
  "explanation": "detailed technical explanation in Portuguese",
  "suspicious_parts": [
    {"text": "suspicious excerpt", "reason": "specific reason", "score": 0-100}
  ]
}`

const DETECTION_PROMPT_EN = `You are an advanced AI text detector specializing in identifying content from GPT-4, Claude, Gemini, and other LLMs.

ANALYZE WITH MULTIPLE LAYERS:

1. MODEL-SPECIFIC PATTERNS:
- GPT-4: Tendency for "However," transitions, nested parentheticals, "It's worth noting"
- Claude: Apologetic tone, excessive caveats, "I should mention", ethical considerations
- Gemini: Balanced viewpoints, "On one hand/other hand", comprehensive lists
- Generic LLM: Perfect grammar, no typos, uniform sentence complexity

2. LINGUISTIC FORENSICS:
- Perplexity analysis: Unusually low perplexity scores
- Burstiness: Lack of variation in sentence length (humans vary 30-50%)
- Token predictability: High next-token predictability
- Semantic coherence: Unnatural consistency in topic progression

3. HUMAN AUTHENTICITY MARKERS (absence indicates AI):
- Personal anecdotes with specific details (dates, names, places)
- Emotional inconsistencies or contradictions
- Cultural references and colloquialisms specific to region/age
- Typos, grammatical quirks, or stylistic inconsistencies
- Strong opinions without hedging
- Natural digressions and tangential thoughts

4. STATISTICAL ANOMALIES:
- Sentence length variance (standard deviation < 4 words = suspicious)
- Punctuation patterns (AI uses 40% more commas on average)
- Paragraph length consistency (CV < 0.3 = likely AI)

Return ONLY valid JSON:
{
  "score": 0-100,
  "confidence": "high" | "medium" | "low",
  "main_indicators": ["specific_indicator1", "specific_indicator2"],
  "explanation": "detailed technical explanation",
  "suspicious_parts": [
    {"text": "suspicious excerpt", "reason": "specific reason", "score": 0-100}
  ]
}`

export async function analyzeWithOpenAI(
  text: string,
  language: string = 'pt'
): Promise<AnalysisResult> {
  const prompt = language === 'pt' ? DETECTION_PROMPT_PT : DETECTION_PROMPT_EN
  
  let primaryAnalysis: OpenAIAnalysisResponse | null = null
  let secondaryAnalysis: OpenAIAnalysisResponse | null = null
  
  // Try primary analysis (GPT-4o)
  try {
    primaryAnalysis = await performAnalysis(
      text,
      prompt,
      config.openai.models.primary
    )
  } catch (error) {
    console.error('Primary analysis failed:', error)
  }

  // Try secondary analysis (GPT-4o-mini)  
  try {
    secondaryAnalysis = await performAnalysis(
      text,
      prompt,
      config.openai.models.secondary
    )
  } catch (error) {
    console.error('Secondary analysis failed:', error)
  }

  // If both failed, throw error
  if (!primaryAnalysis && !secondaryAnalysis) {
    throw new Error('Both AI analysis models failed. Please check your OpenAI API configuration.')
  }

  // Use available analysis or combine if both succeeded
  let finalScore: number
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  let explanation: string
  let indicators: string[]

  if (primaryAnalysis && secondaryAnalysis) {
    // Both succeeded - combine results
    finalScore = weightedAverage(
      primaryAnalysis.score,
      secondaryAnalysis.score,
      0.7, // 70% weight for GPT-4o
      0.3  // 30% weight for GPT-4o-mini
    )
    
    const scoreDifference = Math.abs(primaryAnalysis.score - secondaryAnalysis.score)
    confidence = determineConfidence(scoreDifference, finalScore)
    explanation = primaryAnalysis.explanation
    indicators = primaryAnalysis.main_indicators
  } else {
    // Only one succeeded - use single result
    const analysis = primaryAnalysis || secondaryAnalysis!
    finalScore = analysis.score
    confidence = 'MEDIUM' // Lower confidence when only one model used
    explanation = `${analysis.explanation} (Note: Analysis performed with single model due to API limitations)`
    indicators = analysis.main_indicators
  }

  // Process indicators
  const processedIndicators = processIndicators(indicators, language)

  // Process suspicious parts
  const suspiciousParts = processSuspiciousParts(
    (primaryAnalysis || secondaryAnalysis!).suspicious_parts
  )

  return {
    id: '', // Will be set by controller
    aiScore: Math.round(finalScore),
    confidence,
    isAiGenerated: finalScore > 65, // Mais sensível após prompts melhorados
    indicators: processedIndicators,
    explanation,
    suspiciousParts,
    processingTime: 0, // Will be set by controller
    wordCount: text.split(/\s+/).length,
    charCount: text.length,
  }
}

async function performAnalysis(
  text: string,
  prompt: string,
  model: string
): Promise<OpenAIAnalysisResponse> {
  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(content) as OpenAIAnalysisResponse
  } catch (error) {
    console.error(`Analysis error with ${model}:`, error)
    // Throw error to let controller handle it properly
    throw error
  }
}

function weightedAverage(
  score1: number,
  score2: number,
  weight1: number,
  weight2: number
): number {
  return score1 * weight1 + score2 * weight2
}

function determineConfidence(
  scoreDifference: number,
  finalScore: number
): 'HIGH' | 'MEDIUM' | 'LOW' {
  // High confidence: low difference and clear result
  if (scoreDifference < 10 && (finalScore > 80 || finalScore < 20)) {
    return 'HIGH'
  }
  // Low confidence: high difference or uncertain score
  if (scoreDifference > 25 || (finalScore >= 40 && finalScore <= 60)) {
    return 'LOW'
  }
  // Medium confidence: everything else
  return 'MEDIUM'
}

function processIndicators(
  indicators: string[],
  language: string
): Indicator[] {
  const indicatorMap: Record<string, { description: string; severity: 'high' | 'medium' | 'low' }> = {
    pattern_repetition: {
      description: language === 'pt' 
        ? 'Excessive pattern repetition' 
        : 'Excessive pattern repetition',
      severity: 'high',
    },
    formal_vocabulary: {
      description: language === 'pt'
        ? 'Excessively formal vocabulary'
        : 'Excessively formal vocabulary',
      severity: 'medium',
    },
    lack_of_errors: {
      description: language === 'pt'
        ? 'Absence of natural errors'
        : 'Absence of natural errors',
      severity: 'medium',
    },
    generic_content: {
      description: language === 'pt'
        ? 'Generic and superficial content'
        : 'Generic and superficial content',
      severity: 'high',
    },
    ai_markers: {
      description: language === 'pt'
        ? 'Typical AI markers detected'
        : 'Typical AI markers detected',
      severity: 'high',
    },
    uniform_structure: {
      description: language === 'pt'
        ? 'Excessively uniform structure'
        : 'Excessively uniform structure',
      severity: 'medium',
    },
    // NOVOS INDICADORES AVANÇADOS
    'gpt4_pattern': {
      description: language === 'pt' 
        ? 'Padrões específicos do GPT-4 detectados' 
        : 'GPT-4 specific patterns detected',
      severity: 'high',
    },
    'claude_pattern': {
      description: language === 'pt'
        ? 'Padrões do Claude identificados'
        : 'Claude patterns identified',
      severity: 'high',
    },
    'gemini_pattern': {
      description: language === 'pt'
        ? 'Padrões do Gemini detectados'
        : 'Gemini patterns detected',
      severity: 'high',
    },
    'low_burstiness': {
      description: language === 'pt'
        ? 'Baixa variação no comprimento das frases'
        : 'Low sentence length variation',
      severity: 'high',
    },
    'missing_human_markers': {
      description: language === 'pt'
        ? 'Ausência de marcadores humanos naturais'
        : 'Missing natural human markers',
      severity: 'medium',
    },
    'excessive_commas': {
      description: language === 'pt'
        ? 'Uso excessivo de vírgulas'
        : 'Excessive comma usage',
      severity: 'medium',
    },
    'perfect_grammar': {
      description: language === 'pt'
        ? 'Gramática perfeita sem erros naturais'
        : 'Perfect grammar without natural errors',
      severity: 'medium',
    },
    'high_perplexity': {
      description: language === 'pt'
        ? 'Alta previsibilidade do texto'
        : 'High text predictability',
      severity: 'high',
    },
    'unnatural_coherence': {
      description: language === 'pt'
        ? 'Coerência temática não natural'
        : 'Unnatural thematic coherence',
      severity: 'medium',
    },
  }

  return indicators.map(indicator => {
    const mapped = indicatorMap[indicator] || {
      description: indicator,
      severity: 'low' as const,
    }
    return {
      type: indicator,
      description: mapped.description,
      severity: mapped.severity,
    }
  })
}

function processSuspiciousParts(
  parts: Array<{ text: string; reason: string; score: number }>
): SuspiciousPart[] {
  return parts.map(part => ({
    text: part.text.substring(0, 200), // Limit text length
    score: part.score,
    reason: part.reason,
  }))
}