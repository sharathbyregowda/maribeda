import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useNotes } from './hooks/useNotes'
import { useSearch } from './hooks/useSearch'
import { NoteInputComponent } from './components/NoteInputComponent'
import { SearchBar } from './components/SearchBar'
import { NoteList } from './components/NoteList'
import { BackupRestore } from './components/BackupRestore'
import { InstallPrompt } from './components/InstallPrompt'
import { ThemeToggle } from './components/ThemeToggle'
import { FloatingAddButton } from './components/FloatingAddButton'
import { RediscoverButton } from './components/RediscoverButton'
import { Note, NoteInput } from './types'
import './App.css'

function App() {
  const { notes, isLoading, isSearchReady, error, addNote, updateNote, deleteNote, togglePin, rediscoverNote, markAsViewed, search, restoreFromBackup, isReady } = useNotes()
  const { query, setQuery, debouncedQuery, isSearching } = useSearch()
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [searchResults, setSearchResults] = useState<Note[]>([])
  const [isScrolled, setIsScrolled] = useState(false)
  const [sharedContent, setSharedContent] = useState<string | null>(null)
  const [rediscoveredNoteId, setRediscoveredNoteId] = useState<number | null>(null)
  const [theme, setTheme] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.getAttribute('data-theme') || 'light'
      : 'light'
  )

  // Handle Web Share Target - extract shared content from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const title = params.get('title')
    const text = params.get('text')
    const url = params.get('url')

    // Build shared content from available params
    const parts: string[] = []
    if (title) parts.push(title)
    if (text) parts.push(text)
    if (url && !text?.includes(url)) parts.push(url) // Avoid duplicate URL if already in text

    if (parts.length > 0) {
      setSharedContent(parts.join('\n\n'))
    }
  }, [])

  // Clear URL params after shared content is consumed
  const handleSharedContentConsumed = useCallback(() => {
    setSharedContent(null)
    // Clean up URL without reloading
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Handle PWA file launch (Open with Maribeda)
  useEffect(() => {
    if ('launchQueue' in window) {
      const launchQueue = (window as any).launchQueue
      launchQueue.setConsumer(async (launchParams: any) => {
        if (launchParams.files?.length) {
          try {
            const fileHandle = launchParams.files[0]
            const file = await fileHandle.getFile()
            const arrayBuffer = await file.arrayBuffer()

            // Import restoreFromBinary dynamically to avoid circular deps
            const { restoreFromBinary } = await import('./db/database')
            await restoreFromBinary(new Uint8Array(arrayBuffer))

            alert('Database restored! The page will reload to apply changes.')
            window.location.reload()
          } catch (err) {
            console.error('Failed to restore from launched file:', err)
            alert('Failed to restore from file. Please use the Restore button instead.')
          }
        }
      })
    }
  }, [])

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setTheme(document.documentElement.getAttribute('data-theme') || 'light');
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Handle async search
  useEffect(() => {
    if (!isReady || !isSearchReady) {
      setSearchResults([])
      return
    }

    if (debouncedQuery) {
      search(debouncedQuery).then(results => setSearchResults(results))
    } else {
      setSearchResults(notes)
    }
  }, [debouncedQuery, notes, search, isReady, isSearchReady])

  // Display either search results or all notes
  const displayedNotes = debouncedQuery ? searchResults : notes

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

  const handleFabClick = () => {
    setQuery('')  // Clear search
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleRediscover = () => {
    // Clear any existing highlight first
    setRediscoveredNoteId(null)

    // Get a random old note (older than 7 days)
    const note = rediscoverNote(7)

    if (!note) {
      // Try with a shorter time frame if no old notes
      const recentNote = rediscoverNote(1)
      if (!recentNote) {
        alert('No notes to rediscover yet. Add more notes and check back later!')
        return
      }
      setRediscoveredNoteId(recentNote.id)
    } else {
      setRediscoveredNoteId(note.id)
    }

    // Mark as viewed after 3 seconds (so it doesn't repeat immediately)
    const noteId = note?.id ?? rediscoverNote(1)?.id
    if (noteId) {
      setTimeout(() => {
        markAsViewed(noteId)
      }, 3000)
    }

    // Scroll to the note after a short delay (let React re-render first)
    setTimeout(() => {
      const noteElement = document.querySelector(`[data-note-id="${rediscoveredNoteId ?? noteId}"]`)
      if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  if (isLoading || !isSearchReady) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>{isLoading ? 'Initializing Maribeda...' : 'Building search index...'}</p>
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
      <div className="header-controls">
        <RediscoverButton onClick={handleRediscover} disabled={!isReady || notes.length === 0} />
        <ThemeToggle />
      </div>
      <header className={`app-header ${isScrolled || editingNote ? 'scrolled' : ''}`}>
        <div className="app-logo">
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo.png'}
            alt="Maribeda Logo"
            className="logo-image"
          />
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

        {/* Hide input form during search to save screen space, show FAB instead */}
        {(!isSearching || editingNote) && (
          <section className="input-section">
            <NoteInputComponent
              onSave={handleSave}
              editingNote={editingNote}
              onCancelEdit={handleCancelEdit}
              sharedContent={sharedContent}
              onSharedContentConsumed={handleSharedContentConsumed}
            />
          </section>
        )}

        <FloatingAddButton
          onClick={handleFabClick}
          visible={isSearching && !editingNote}
        />

        <section className="notes-section">
          <NoteList
            notes={displayedNotes}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={togglePin}
            isSearching={isSearching}
            searchQuery={debouncedQuery}
            rediscoveredNoteId={rediscoveredNoteId}
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
      <InstallPrompt />
      <Analytics />
    </div>
  )
}

export default App
