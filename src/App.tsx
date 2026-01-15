import { useState, useEffect, useMemo } from 'react'
import { useNotes } from './hooks/useNotes'
import { useSearch } from './hooks/useSearch'
import { NoteInputComponent } from './components/NoteInputComponent'
import { SearchBar } from './components/SearchBar'
import { NoteList } from './components/NoteList'
import { BackupRestore } from './components/BackupRestore'
import { Note, NoteInput } from './types'
import './App.css'

function App() {
  const { notes, isLoading, error, addNote, updateNote, deleteNote, search, restoreFromBackup, isReady } = useNotes()
  const { query, setQuery, debouncedQuery, isSearching } = useSearch()
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  // Search results
  const displayedNotes = useMemo(() => {
    if (!isReady) return []
    if (debouncedQuery) {
      return search(debouncedQuery)
    }
    return notes
  }, [notes, debouncedQuery, search, isReady])

  const handleSave = (input: NoteInput) => {
    if (editingNote) {
      updateNote(editingNote.id, input)
      setEditingNote(null)
    } else {
      addNote(input)
    }
  }

  const handleEdit = (note: Note) => {
    setEditingNote(note)
    // Scroll to top to see the input
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingNote(null)
  }

  const handleDelete = (id: number) => {
    deleteNote(id)
  }

  const handleRestore = (restoredNotes: Note[]) => {
    restoreFromBackup(restoredNotes)
  }

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing Nenasu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reload App</button>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <img src="/logo.png" alt="Nenasu Logo" className="logo-image" />
        </div>
      </header>

      <main className="app-main">
        <section className="search-section">
          <SearchBar
            query={query}
            onChange={setQuery}
            resultCount={isSearching ? displayedNotes.length : undefined}
          />
        </section>

        <section className="input-section">
          <NoteInputComponent
            onSave={handleSave}
            editingNote={editingNote}
            onCancelEdit={handleCancelEdit}
          />
        </section>

        <section className="notes-section">
          <NoteList
            notes={displayedNotes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isSearching={isSearching}
          />
        </section>

        <section className="backup-section">
          <BackupRestore
            notes={notes}
            onRestore={handleRestore}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>All data stored locally on your device • No cloud • No accounts</p>
      </footer>
    </div>
  )
}

export default App
