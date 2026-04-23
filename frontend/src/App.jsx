import { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function VerdictBadge({ verdict }) {
  const styles = {
    TRUE:      { bg: '#EAF3DE', color: '#3B6D11', label: '✓ TRUE' },
    FALSE:     { bg: '#FCEBEB', color: '#A32D2D', label: '✗ FALSE' },
    UNCERTAIN: { bg: '#FAEEDA', color: '#854F0B', label: '? UNCERTAIN' },
  }
  const s = styles[verdict] || styles.UNCERTAIN
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '6px 18px', borderRadius: '99px',
      fontWeight: 600, fontSize: '15px', display: 'inline-block'
    }}>
      {s.label}
    </span>
  )
}

function ConfidenceBar({ confidence }) {
  const color = confidence >= 70 ? '#639922' : confidence >= 40 ? '#BA7517' : '#E24B4A'
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#888', marginBottom: '5px' }}>
        <span>Confidence</span><span>{confidence}%</span>
      </div>
      <div style={{ background: '#eee', borderRadius: '99px', height: '8px', overflow: 'hidden' }}>
        <div style={{ width: `${confidence}%`, background: color, height: '100%', borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function App() {
  const [sentence, setSentence] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheck = async () => {
    if (!sentence.trim()) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <header>
        <h1>AI Sentence Truth Checker</h1>
        <p>Enter any sentence and AI will analyze its truthfulness</p>
      </header>

      <div className="card">
        <textarea
          value={sentence}
          onChange={e => setSentence(e.target.value)}
          placeholder="Type a sentence to fact-check... e.g. The Great Wall of China is visible from space."
          rows={4}
          onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleCheck()}
        />
        <button onClick={handleCheck} disabled={loading || !sentence.trim()} className="btn-check">
          {loading ? 'Analyzing...' : 'Check Truth'}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="result-card">
          <VerdictBadge verdict={result.verdict} />
          <ConfidenceBar confidence={result.confidence} />
          <p className="explanation">{result.explanation}</p>
          <div className="sources-hint">
            <span>Sources to verify: </span>{result.sources_hint}
          </div>
        </div>
      )}
    </div>
  )
}
