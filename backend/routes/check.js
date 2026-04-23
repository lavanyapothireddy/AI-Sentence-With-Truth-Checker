const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  const { sentence } = req.body;

  if (!sentence || sentence.trim() === '') {
    return res.status(400).json({ error: 'Sentence is required' });
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a fact-checking AI. Always respond ONLY with valid JSON in this exact format with no extra text or markdown:
{"verdict":"TRUE","confidence":95,"explanation":"Your explanation in 2-3 sentences.","sources_hint":"Types of sources to verify this."}`
        },
        {
          role: 'user',
          content: `Fact-check this sentence: "${sentence}"`
        }
      ],
      temperature: 0.3,
      max_tokens: 512,
    });

    const text = completion.choices[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Invalid AI response format');

    const data = JSON.parse(match[0]);
    res.json(data);
  } catch (err) {
    console.error('Groq Error:', err.message);
    res.status(500).json({ error: 'Failed to analyze sentence' });
  }
});

module.exports = router;
