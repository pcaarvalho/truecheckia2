import OpenAI from 'openai'
import { config } from '@truecheckia/config'
import type { OpenAIAnalysisResponse, AnalysisResult, Indicator, SuspiciousPart } from '@truecheckia/types'

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
  organization: config.openai.orgId,
})

const DETECTION_PROMPT_PT = `You are a specialized detector for identifying AI-generated texts.
Analyze the provided text considering:

1. STRUCTURE AND FLOW:
- Pattern repetitions
- Predictable transitions
- Overly uniform structure
- Similar paragraph lengths

2. VOCABULARY AND STYLE:
- Excessive use of formal words
- Lack of authentic colloquialisms
- Absence of natural errors or typos
- Excessively consistent vocabulary

3. CONTENT AND DEPTH:
- Generalities without specific experiences
- Superficial knowledge
- Lack of controversial or personal opinions
- Excessive caution and neutrality

4. AI MARKERS:
- Phrases like "It's important to note that...", "It's worth mentioning..."
- Excessive and well-structured lists
- Generic and obvious conclusions
- Overuse of connectives

Return ONLY valid JSON in the following format:
{
  "score": 0-100,
  "confidence": "high" | "medium" | "low",
  "main_indicators": ["indicator1", "indicator2"],
  "explanation": "detailed explanation",
  "suspicious_parts": [
    {"text": "suspicious excerpt", "reason": "reason", "score": 0-100}
  ]
}`

const DETECTION_PROMPT_EN = `You are a specialized detector for identifying AI-generated texts.
Analyze the provided text considering:

1. STRUCTURE AND FLOW:
- Pattern repetitions
- Predictable transitions
- Overly uniform structure
- Similar paragraph lengths

2. VOCABULARY AND STYLE:
- Excessive use of formal words
- Lack of authentic colloquialisms
- Absence of natural errors or typos
- Excessively consistent vocabulary

3. CONTENT AND DEPTH:
- Generalities without specific experiences
- Superficial knowledge
- Lack of controversial or personal opinions
- Excessive caution and neutrality

4. AI MARKERS:
- Phrases like "It's important to note that...", "It's worth mentioning..."
- Excessive and well-structured lists
- Generic and obvious conclusions
- Overuse of connectives

Return ONLY valid JSON in the following format:
{
  "score": 0-100,
  "confidence": "high" | "medium" | "low",
  "main_indicators": ["indicator1", "indicator2"],
  "explanation": "detailed explanation",
  "suspicious_parts": [
    {"text": "suspicious excerpt", "reason": "reason", "score": 0-100}
  ]
}`

export async function analyzeWithOpenAI(
  text: string,
  language: string = 'pt'
): Promise<AnalysisResult> {
  try {
    const prompt = language === 'pt' ? DETECTION_PROMPT_PT : DETECTION_PROMPT_EN

    // Primary analysis with GPT-4
    const primaryAnalysis = await performAnalysis(
      text,
      prompt,
      config.openai.models.primary
    )

    // Secondary verification with GPT-3.5 for cross-validation
    const secondaryAnalysis = await performAnalysis(
      text,
      prompt,
      config.openai.models.secondary
    )

    // Combine and weight the results
    const finalScore = weightedAverage(
      primaryAnalysis.score,
      secondaryAnalysis.score,
      0.7, // 70% weight for GPT-4
      0.3  // 30% weight for GPT-3.5
    )

    // Determine confidence based on agreement
    const scoreDifference = Math.abs(primaryAnalysis.score - secondaryAnalysis.score)
    const confidence = determineConfidence(scoreDifference, finalScore)

    // Process indicators
    const indicators = processIndicators(
      primaryAnalysis.main_indicators,
      language
    )

    // Process suspicious parts
    const suspiciousParts = processSuspiciousParts(
      primaryAnalysis.suspicious_parts
    )

    return {
      id: '', // Will be set by controller
      aiScore: Math.round(finalScore),
      confidence,
      isAiGenerated: finalScore > 70,
      indicators,
      explanation: primaryAnalysis.explanation,
      suspiciousParts,
      processingTime: 0, // Will be set by controller
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
    }
  } catch (error) {
    console.error('OpenAI analysis error:', error)
    throw new Error('Failed to analyze text')
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
    // Return a default response on error
    return {
      score: 50,
      confidence: 'low',
      main_indicators: ['analysis_error'],
      explanation: 'Unable to complete analysis',
      suspicious_parts: [],
    }
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