import React, { useState, useRef } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const MAX_WORDS = 100
const MAX_FILE_SIZE_MB = 5

const verdictConfig = {
  TRUE:      { label: 'True',      icon: '✓', cls: 'verdict-true' },
  FALSE:     { label: 'False',     icon: '✗', cls: 'verdict-false' },
  UNCERTAIN: { label: 'Uncertain', icon: '?', cls: 'verdict-uncertain' },
}

function countWords(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return { label: 'PDF', color: '#f87171', cls: 'fi-pdf' }
  if (ext === 'ppt' || ext === 'pptx') return { label: 'PPT', color: '#fbbf24', cls: 'fi-ppt' }
  if (ext === 'doc' || ext === 'docx') return { label: 'DOC', color: '#60a5fa', cls: 'fi-doc' }
  return { label: 'TXT', color: '#34d399', cls: 'fi-txt' }
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
  const [fileInfo, setFileInfo] = useState(null)
  const [fileError, setFileError] = useState('')
  const fileRef = useRef()

  const wordCount = countWords(sentence)
  const overLimit = wordCount > MAX_WORDS

  const handleTextChange = (e) => {
    setSentence(e.target.value)
    setResult(null)
    setError('')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    setFileError('')
    if (!file) return

    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_FILE_SIZE_MB) {
      setFileError(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
      fileRef.current.value = ''
      return
    }

    const ft = getFileType(file.name)
    setFileInfo({
      name: file.name,
      size: formatSize(file.size),
      label: ft.label,
      color: ft.color,
      cls: ft.cls,
    })

    if (file.name.endsWith('.txt')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const words = ev.target.result.trim().split(/\s+/)
        const limited = words.slice(0, MAX_WORDS).join(' ')
        setSentence(limited)
        if (words.length > MAX_WORDS) {
          setFileError(`File has ${words.length} words. Only first ${MAX_WORDS} words loaded.`)
        }
      }
      reader.readAsText(file)
    }

    setResult(null)
    setError('')
  }

  const clearFile = () => {
    setFileInfo(null)
    setFileError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleClear = () => {
    setSentence('')
    setResult(null)
    setError('')
    setFileError('')
    clearFile()
  }

  const handleCheck = async () => {
    const target = sentence.trim()
    if (!target || overLimit) return
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
            <span className={`word-count ${overLimit ? 'over' : ''}`}>
              {wordCount} / {MAX_WORDS} words
            </span>
          </div>

          <div className="textarea-wrap">
            {fileInfo && (
              <div className="file-info-bar">
                <div className={`file-icon-wrap ${fileInfo.cls}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke={fileInfo.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div className="file-meta">
                  <div className="file-name">{fileInfo.name}</div>
                  <div className="file-size">{fileInfo.size} · {fileInfo.label}</div>
                </div>
                <button className="file-remove" onClick={clearFile}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}

            <textarea
              className="input-area"
              value={sentence}
              onChange={handleTextChange}
              placeholder={fileInfo ? 'File uploaded. Type your sentence or question here...' : 'Type or paste your sentence here...'}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && handleCheck()}
            />

            <div className="textarea-bottom">
              <button className="upload-btn" onClick={() => fileRef.current.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload File
              </button>
              <span className="upload-hint">PDF, PPT, DOCX, TXT · Max 5MB</span>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>
          </div>

          {fileError && <p className="file-error">⚠ {fileError}</p>}

          <div className="action-row">
            <button
              className="btn-clear"
              onClick={handleClear}
              disabled={!sentence && !fileInfo}
            >
              Clear
            </button>
            <button
              className="btn-primary"
              onClick={handleCheck}
              disabled={loading || !sentence.trim() || overLimit}
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
