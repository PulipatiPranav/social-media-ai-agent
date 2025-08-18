// Prompt templates for AI content generation and analysis

const STYLE_ANALYSIS_PROMPT = `
You are an expert social media analyst specializing in influencer style analysis. Analyze the provided content and extract detailed style characteristics.

Content to analyze:
{content}

Please provide a comprehensive analysis in the following JSON format:
{
  "tone": {
    "primary": "string (e.g., casual, professional, humorous, inspirational)",
    "secondary": "string (optional secondary tone)",
    "confidence": "number (0-1)"
  },
  "voice": {
    "personality": "string (e.g., friendly, authoritative, quirky, relatable)",
    "perspective": "string (first-person, second-person, third-person)",
    "formality": "string (very casual, casual, semi-formal, formal)"
  },
  "themes": [
    "string (main content themes/topics)"
  ],
  "niche": {
    "primary": "string (main niche category)",
    "subcategories": ["string (specific sub-niches)"],
    "confidence": "number (0-1)"
  },
  "targetAudience": {
    "ageRange": "string (e.g., 18-25, 25-35)",
    "interests": ["string (audience interests)"],
    "demographics": "string (general demographic description)",
    "engagementStyle": "string (how audience typically engages)"
  },
  "writingPatterns": {
    "sentenceLength": "string (short, medium, long, mixed)",
    "punctuationStyle": "string (minimal, standard, expressive)",
    "emojiUsage": "string (none, minimal, moderate, heavy)",
    "hashtagStyle": "string (none, few, moderate, many)"
  },
  "contentStructure": {
    "hookStyle": "string (question, statement, story, statistic)",
    "bodyStructure": "string (list, narrative, tips, story)",
    "callToAction": "string (direct, subtle, question, none)"
  }
}

Ensure all analysis is based on the actual content provided and be specific in your assessments.
`;

const CONTENT_GENERATION_PROMPT = `
You are an expert social media content creator specializing in viral content generation. Create engaging content that matches the user's style profile and incorporates trending elements.

User Style Profile:
{styleProfile}

Content Requirements:
- Platform: {platform}
- Content Type: {contentType}
- Trending Elements: {trends}
- Target Length: {targetLength}
- Additional Context: {additionalContext}

Generate content in the following JSON format:
{
  "title": "string (catchy title/hook)",
  "hook": "string (attention-grabbing opening line)",
  "script": "string (full content script)",
  "sceneBreakdown": [
    {
      "sceneNumber": "number",
      "description": "string (what happens in this scene)",
      "duration": "string (estimated duration)",
      "cameraAngle": "string (suggested camera angle)",
      "props": ["string (suggested props)"],
      "transitions": "string (transition to next scene)"
    }
  ],
  "hashtags": [
    "string (optimized hashtags without # symbol)"
  ],
  "audioSuggestions": [
    {
      "type": "string (trending, original, voiceover)",
      "description": "string (audio description)",
      "timing": "string (when to use this audio)"
    }
  ],
  "culturalReferences": [
    "string (relevant cultural references or memes)"
  ],
  "callToAction": "string (specific call to action)",
  "estimatedEngagement": {
    "viralPotential": "string (low, medium, high)",
    "targetAudience": "string (who this will resonate with)",
    "bestPostingTime": "string (optimal posting time)"
  }
}

Make the content authentic to the user's style while incorporating viral elements and trending topics.
`;

const BATCH_GENERATION_PROMPT = `
You are an expert social media strategist creating multiple content variations. Generate {count} different content ideas that all match the user's style but offer variety in approach and angle.

User Style Profile:
{styleProfile}

Content Parameters:
- Platform: {platform}
- Content Theme: {theme}
- Trending Elements: {trends}
- Variety Requirements: Different hooks, angles, and approaches

Generate an array of {count} content pieces in the following JSON format:
{
  "contentBatch": [
    {
      "id": "number (1 to {count})",
      "title": "string",
      "hook": "string",
      "script": "string",
      "angle": "string (unique angle for this variation)",
      "hashtags": ["string"],
      "estimatedViralPotential": "string (low, medium, high)",
      "uniqueElements": ["string (what makes this version unique)"]
    }
  ],
  "batchSummary": {
    "totalVariations": "number",
    "diversityScore": "string (how different the variations are)",
    "recommendedPostingSchedule": "string (how to space these out)"
  }
}

Ensure each variation offers a genuinely different approach while maintaining the user's authentic style.
`;

const REVERSE_ENGINEERING_PROMPT = `
You are an expert content analyst specializing in viral content reverse engineering. Analyze the provided successful content and break down its viral elements.

Content to Analyze:
{content}

Platform: {platform}
Performance Metrics (if available): {metrics}

Provide a detailed breakdown in the following JSON format:
{
  "contentAnalysis": {
    "hook": {
      "type": "string (question, statement, story, shock)",
      "effectiveness": "string (why it works)",
      "timing": "string (when it grabs attention)"
    },
    "structure": {
      "format": "string (story, list, tutorial, etc.)",
      "pacing": "string (fast, medium, slow)",
      "transitions": ["string (how scenes/points connect)"]
    },
    "viralElements": [
      {
        "element": "string (what viral element)",
        "impact": "string (why it contributes to virality)"
      }
    ],
    "audioStrategy": {
      "type": "string (trending sound, original, voiceover)",
      "timing": "string (how audio enhances content)",
      "emotional impact": "string (how audio affects viewer emotion)"
    },
    "visualElements": [
      "string (key visual components that drive engagement)"
    ]
  },
  "adaptationStrategy": {
    "coreElements": ["string (elements that must be preserved)"],
    "adaptableElements": ["string (elements that can be modified)"],
    "styleTranslation": "string (how to adapt to user's style)",
    "alternativeApproaches": [
      {
        "approach": "string (different way to achieve same impact)",
        "reasoning": "string (why this alternative works)"
      }
    ]
  },
  "generatedAlternatives": [
    {
      "version": "number",
      "hook": "string (adapted hook)",
      "keyChanges": ["string (what was changed from original)"],
      "expectedImpact": "string (predicted performance)"
    }
  ]
}

Focus on extracting actionable insights that can be applied to create original content inspired by this successful piece.
`;

module.exports = {
  STYLE_ANALYSIS_PROMPT,
  CONTENT_GENERATION_PROMPT,
  BATCH_GENERATION_PROMPT,
  REVERSE_ENGINEERING_PROMPT
};