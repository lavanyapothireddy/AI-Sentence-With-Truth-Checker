const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/', async (req, res) => {
  const { sentence } = req.body;

  if (!sentence || sentence.trim() === '') {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a fact-checking AI. Analyze the following sentence and determine if it is TRUE, FALSE, or UNCERTAIN.

Respond ONLY in this exact JSON format (no extra text):
{
  "verdict": "TRUE" | "FALSE" | "UNCERTAIN",
  "confidence": <number 0-100>,
  "explanation": "<brief explanation in 2-3 sentences>",
  "sources_hint": "<mention what type of sources would confirm this>"
}

Sentence to check: "${sentence}"`
        }
      ]
    });

    const raw = message.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid AI response format');

    const result = JSON.parse(jsonMatch[0]);
    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Failed to analyze sentence' });
  }
});

module.exports = router;