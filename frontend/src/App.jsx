import React, { useState, useRef } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const MAX_WORDS = 100
const MAX_FILE_SIZE_MB = 1

const verdictConfig = {
  TRUE:      { label: 'True',      icon: '✓', cls: 'verdict-true' },
  FALSE:     { label: 'False',     icon: '✗', cls: 'verdict-false' },
  UNCERTAIN: { label: 'Uncertain', icon: '?', cls: 'verdict-uncertain' },
}

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function VerdictBadge({ verdict }) {
  const cfg = verdictConfig[verdict] || verdictConfig.UNCERTAIN
  return (
    <div className={`verdict-badge ${cfg.cls}`}>
      <span className="verdict-icon-wrap">{cfg.icon}</span>
      <span>{cfg.label}</span>
    </div>
  )
}

function ConfidenceRing({ confidence }) {
  const r = 34
  const circ = 2 * Math.PI * r
  const filled = (confidence / 100) * circ
  const color = confidence >= 70 ? '#4ade80' : confidence >= 40 ? '#fbbf24' : '#f87171'
  const trackColor = confidence >= 70
    ? 'rgba(74,222,128,0.12)'
    : confidence >= 40
    ? 'rgba(251,191,36,0.12)'
    : 'rgba(248,113,113,0.12)'
  return (
    <div className="conf-ring-wrap">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill={trackColor} />
        <circle cx="46" cy="46" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="46" cy="46" r={r} fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${filled} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
          style={{ transition: 'stroke-dasharray 0.9s ease' }}
        />
        <text x="46" y="42" textAnchor="middle" fontSize="17" fontWeight="700" fill={color}>{confidence}</text>
        <text x="46" y="56" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.35)">% sure</text>
      </svg>
    </div>
  )
}

export default function App() {
  const [sentence, setSentence] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checked, setChecked] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState('')
  const fileRef = useRef()

  const wordCount = countWords(sentence)
  const wordLimitReached = wordCount > MAX_WORDS

  const handleTextChange = (e) => {
    const val = e.target.value
    const words = countWords(val)
    if (words > MAX_WORDS) {
      const trimmed = val.trim().split(/\s+/).slice(0, MAX_WORDS).join(' ')
      setSentence(trimmed)
    } else {
      setSentence(val)
    }
    setResult(null)
    setError('')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    setFileError('')
    setFileName('')
    if (!file) return

    const allowedTypes = ['text/plain', 'text/csv', 'application/json']
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
      setFileError('Only .txt and .csv files are supported.')
      fileRef.current.value = ''
      return
    }

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
      fileRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const words = text.trim().split(/\s+/)
      const limited = words.slice(0, MAX_WORDS).join(' ')
      setSentence(limited)
      setFileName(file.name)
      setResult(null)
      setError('')
      if (words.length > MAX_WORDS) {
        setFileError(`File has ${words.length} words. Only first ${MAX_WORDS} words loaded.`)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      const dt = new DataTransfer()
      dt.items.add(file)
      fileRef.current.files = dt.files
      handleFileUpload({ target: { files: [file] } })
    }
  }

  const handleCheck = async (text) => {
    const target = text || sentence
    if (!target.trim()) return
    if (countWords(target) > MAX_WORDS) return
    setLoading(true)
    setResult(null)
    setError('')
    setChecked(target)

    try {
      const res = await fetch(`${API_URL}/api/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: target })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Server error')
      setResult(data)
    } catch (err) {
      setError('Cannot connect to server. Make sure backend is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setSentence('')
    setResult(null)
    setError('')
    setFileName('')
    setFileError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="page">
      <div className="bg-glow glow-1" />
      <div className="bg-glow glow-2" />

      <div className="container">

        <header className="header">
          <div className="logo-wrap">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14l5.5 5.5L22 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="title">AI Truth Checker</h1>
          <p className="subtitle">Analyze any sentence for factual accuracy using AI</p>
          <div className="tag-row">
            <span className="tag tag-blue">Powered by Groq</span>
            <span className="tag tag-purple">Llama 3 Model</span>
            <span className="tag tag-teal">100% Free</span>
          </div>
        </header>

        <div className="input-card">
          <div className="input-card-header">
            <label className="input-label">Enter a sentence to fact-check</label>
            <span className={`word-count ${wordCount >= MAX_WORDS ? 'word-limit' : ''}`}>
              {wordCount} / {MAX_WORDS} words
            </span>
          </div>

          <textarea
            className="input-area"
            value={sentence}
            onChange={handleTextChange}
            placeholder="Type or paste your sentence here, or upload a file below..."
            rows={4}
            onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleCheck()}
          />

          <div
            className="upload-zone"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            {fileName
              ? <span className="upload-filename">{fileName}</span>
              : <span>Click or drag a <strong>.txt</strong> or <strong>.csv</strong> file · Max <strong>1MB</strong></span>
            }
          </div>

          {fileError && (
            <p className="file-error">⚠ {fileError}</p>
          )}

          <div className="input-footer">
            <button className="btn-clear" onClick={handleClear} disabled={!sentence && !fileName}>
              Clear
            </button>
            <button
              className="btn-primary"
              onClick={() => handleCheck()}
              disabled={loading || !sentence.trim() || wordLimitReached}
            >
              {loading
                ? <><span className="spinner" /> Analyzing...</>
                : <>Check Truth</>}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-box">
            <span style={{ fontSize: '16px' }}>⚠</span> {error}
          </div>
        )}

        {loading && (
          <div className="skeleton-card">
            <div className="skel skel-title" />
            <div className="skel skel-bar" />
            <div className="skel skel-text" />
            <div className="skel skel-text short" />
          </div>
        )}

        {result && !loading && (
          <div className="result-card">
            <div className="result-header">
              <div className="result-left">
                <VerdictBadge verdict={result.verdict} />
                <p className="checked-sentence">"{checked}"</p>
              </div>
              <ConfidenceRing confidence={result.confidence} />
            </div>

            <div className="divider" />

            <div className="result-body">
              <div>
                <span className="block-label">Analysis</span>
                <p className="explanation">{result.explanation}</p>
              </div>
              <div className="sources-block">
                <span className="block-label">Verify with</span>
                <p className="sources-text">{result.sources_hint}</p>
              </div>
            </div>

            <div className="result-footer">
              <button className="btn-secondary" onClick={handleClear}>
                ← Check another sentence
              </button>
            </div>
          </div>
        )}

        <p className="footer-note">Results are AI-generated. Always verify with trusted sources.</p>

      </div>
    </div>
  )
}
