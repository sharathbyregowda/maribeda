import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useNotes } from './hooks/useNotes'
import { useSearch } from './hooks/useSearch'
import { NoteInputComponent } from './components/NoteInputComponent'
import { SearchBar } from './components/SearchBar'
import { NoteList } from './components/NoteList'
import { BackupRestore } from './components/BackupRestore'
import { InstallPrompt } from './components/InstallPrompt'
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt'
import { ThemeToggle } from './components/ThemeToggle'
import { FloatingAddButton } from './components/FloatingAddButton'
import { RediscoverButton } from './components/RediscoverButton'
import { SmartMergeModal, SmartMergeMode } from './components/SmartMergeModal'
import { ClusterPrompt } from './components/ClusterPrompt'
import { findClusters, NoteCluster } from './utils/noteCluster'
import { extractUrls } from './utils/urlDetector'
import { Note, NoteInput } from './types'
import './App.css'

function App() {
  const { notes, linkPreviews, isLoading, isSearchReady, error, addNote, updateNote, deleteNote, togglePin, rediscoverNote, fetchOldNotes, markAsViewed, getRelatedNotes, findByUrl, findSimilar, appendToNote, search, restoreFromBackup, mergeFromBackup, isReady } = useNotes()
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

  // Smart Merge Intent modal state
  const [mergeModal, setMergeModal] = useState<{
    isOpen: boolean;
    mode: SmartMergeMode;
    incomingContent: string;
    incomingTitle?: string;
    matchedNotes: Note[];
  } | null>(null)

  // Cluster prompt state for Better Rediscover
  const [clusterPrompt, setClusterPrompt] = useState<NoteCluster | null>(null)

  // Handle Web Share Target - check for duplicates/similar before creating
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const title = params.get('title')
    const text = params.get('text')
    const url = params.get('url')

    // Build shared content from available params
    const parts: string[] = []
    if (title) parts.push(title)
    if (text) parts.push(text)
    if (url && !text?.includes(url)) parts.push(url)

    if (parts.length > 0) {
      const content = parts.join('\n\n')
      checkForMergeIntent(content, url || undefined)
    }
  }, [isReady])

  // Check for duplicate URL or similar notes (Smart Merge Intent)
  const checkForMergeIntent = async (content: string, url?: string) => {
    if (!isReady) {
      // Database not ready, just set shared content
      setSharedContent(content)
      return
    }

    // Step 1: Check for exact URL duplicate
    if (url) {
      const existingNote = findByUrl(url)
      if (existingNote) {
        setMergeModal({
          isOpen: true,
          mode: 'duplicate',
          incomingContent: content,
          matchedNotes: [existingNote]
        })
        // Clean URL params
        if (window.location.search) {
          window.history.replaceState({}, '', window.location.pathname)
        }
        return
      }
    }

    // Step 2: Check for similar notes
    const similarNotes = await findSimilar(content, 5)
    if (similarNotes.length > 0) {
      setMergeModal({
        isOpen: true,
        mode: similarNotes.length === 1 ? 'single' : 'multiple',
        incomingContent: content,
        matchedNotes: similarNotes
      })
      // Clean URL params
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname)
      }
      return
    }

    // Step 3: No matches - proceed with normal flow
    setSharedContent(content)
  }

  // Clear URL params after shared content is consumed
  const handleSharedContentConsumed = useCallback(() => {
    setSharedContent(null)
    // Clean up URL without reloading
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Smart Merge Intent handlers
  const handleMergeAppend = async (targetNote: Note) => {
    if (!mergeModal) return
    await appendToNote(targetNote.id, mergeModal.incomingContent)
    setMergeModal(null)
    // Scroll to and highlight the updated note
    setTimeout(() => {
      const element = document.querySelector(`[data-note-id="${targetNote.id}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setRediscoveredNoteId(targetNote.id)
        setTimeout(() => setRediscoveredNoteId(null), 3000)
      }
    }, 100)
  }

  const handleMergeCreateNew = (content: string) => {
    const title = mergeModal?.incomingTitle
    setMergeModal(null)
    // Directly save the note - bypass merge intent check since user explicitly chose to create new
    addNote({ content, title })
  }

  const handleMergeOpenNote = (note: Note) => {
    setMergeModal(null)
    // Scroll to and highlight the note
    setTimeout(() => {
      const element = document.querySelector(`[data-note-id="${note.id}"]`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setRediscoveredNoteId(note.id)
        setTimeout(() => setRediscoveredNoteId(null), 3000)
      }
    }, 100)
  }

  const handleMergeClose = () => {
    setMergeModal(null)
  }

  // Smart Merge Intent for manual input (called before save)
  const handleCheckMergeIntent = async (input: NoteInput): Promise<boolean> => {
    if (!isReady) return false

    const content = `${input.title || ''} ${input.content}`.trim()
    const urls = extractUrls(content)
    const url = urls.length > 0 ? urls[0] : undefined

    // Step 1: Check for exact URL duplicate
    if (url) {
      const existingNote = findByUrl(url)
      if (existingNote) {
        setMergeModal({
          isOpen: true,
          mode: 'duplicate',
          incomingContent: input.content,
          incomingTitle: input.title,
          matchedNotes: [existingNote]
        })
        return true // Modal shown
      }
    }

    // Step 2: Check for similar notes
    const similarNotes = await findSimilar(content, 5)
    if (similarNotes.length > 0) {
      setMergeModal({
        isOpen: true,
        mode: similarNotes.length === 1 ? 'single' : 'multiple',
        incomingContent: input.content,
        incomingTitle: input.title,
        matchedNotes: similarNotes
      })
      return true // Modal shown
    }

    return false // No match, proceed with normal save
  }

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

    // 30% chance: try cluster-based rediscover
    const shouldTryCluster = Math.random() < 0.3

    if (shouldTryCluster) {
      const oldNotes = fetchOldNotes(30)
      if (oldNotes.length >= 3) {
        const cluster = findClusters(oldNotes)
        if (cluster) {
          setClusterPrompt(cluster)
          return // Show the cluster prompt instead of single-note rediscover
        }
      }
    }

    // Default: single-note rediscover (existing behavior)
    doSingleRediscover()
  }

  const doSingleRediscover = () => {
    const note = rediscoverNote(7)

    if (!note) {
      const recentNote = rediscoverNote(1)
      if (!recentNote) {
        alert('No notes to rediscover yet. Add more notes and check back later!')
        return
      }
      setRediscoveredNoteId(recentNote.id)
    } else {
      setRediscoveredNoteId(note.id)
    }

    const noteId = note?.id ?? rediscoverNote(1)?.id
    if (noteId) {
      setTimeout(() => {
        markAsViewed(noteId)
      }, 3000)
    }

    setTimeout(() => {
      const noteElement = document.querySelector(`[data-note-id="${rediscoveredNoteId ?? noteId}"]`)
      if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleClusterShowAll = () => {
    if (!clusterPrompt) return

    // Clear search so all notes are visible
    if (query || debouncedQuery) {
      setQuery('')
    }

    setClusterPrompt(null)

    // Highlight the first note and scroll to it, mark all as viewed
    const noteIds = clusterPrompt.notes.map(n => n.id)
    if (noteIds.length > 0) {
      setRediscoveredNoteId(noteIds[0])

      setTimeout(() => {
        // Highlight all cluster notes briefly
        for (const id of noteIds) {
          const el = document.querySelector(`[data-note-id="${id}"]`)
          if (el) {
            el.classList.add('rediscovered')
          }
        }

        // Scroll to the first one
        const firstEl = document.querySelector(`[data-note-id="${noteIds[0]}"]`)
        if (firstEl) {
          firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }

        // Remove highlights after 5 seconds
        setTimeout(() => {
          setRediscoveredNoteId(null)
          for (const id of noteIds) {
            const el = document.querySelector(`[data-note-id="${id}"]`)
            if (el) {
              el.classList.remove('rediscovered')
            }
          }
        }, 5000)
      }, 300)

      // Mark all cluster notes as viewed
      for (const id of noteIds) {
        setTimeout(() => markAsViewed(id), 3000)
      }
    }
  }

  const handleClusterJustOne = () => {
    setClusterPrompt(null)
    doSingleRediscover()
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
              onCheckMergeIntent={handleCheckMergeIntent}
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
            onMarkAsViewed={markAsViewed}
            isSearching={isSearching}
            searchQuery={debouncedQuery}
            rediscoveredNoteId={rediscoveredNoteId}
            getRelatedNotes={getRelatedNotes}
            linkPreviews={linkPreviews}
            onRelatedNoteClick={(note) => {
              // Store the target note ID before clearing search
              const targetNoteId = note.id;

              // Clear search first so the target note is visible in the list
              if (query || debouncedQuery) {
                setQuery('');
              }

              // Wait for React to re-render with full list (needs time for debounce to clear)
              // 300ms = debounce delay (usually ~150ms) + render time
              setTimeout(() => {
                const element = document.querySelector(`[data-note-id="${targetNoteId}"]`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  // Briefly highlight with rediscover effect
                  setRediscoveredNoteId(targetNoteId);
                  setTimeout(() => setRediscoveredNoteId(null), 3000);
                } else {
                  console.warn('See Also: Could not find note element with id:', targetNoteId);
                }
              }, 300);
            }}
          />
        </section>

        <section className="backup-section">
          <BackupRestore
            notes={notes}
            onRestore={handleRestore}
            onMerge={mergeFromBackup}
          />
        </section>
      </main>

      <footer className="app-footer">
        <p>All data stored locally on your device • No cloud • No accounts</p>
      </footer>
      <InstallPrompt />
      <PWAUpdatePrompt />
      <Analytics />

      {/* Smart Merge Intent Modal */}
      {mergeModal && (
        <SmartMergeModal
          mode={mergeModal.mode}
          incomingContent={mergeModal.incomingContent}
          matchedNotes={mergeModal.matchedNotes}
          onAppend={handleMergeAppend}
          onCreateNew={handleMergeCreateNew}
          onOpenNote={handleMergeOpenNote}
          onClose={handleMergeClose}
        />
      )}

      {/* Cluster Prompt for Better Rediscover */}
      {clusterPrompt && (
        <ClusterPrompt
          cluster={clusterPrompt}
          onShowAll={handleClusterShowAll}
          onJustOne={handleClusterJustOne}
          onDismiss={() => setClusterPrompt(null)}
        />
      )}
    </div>
  )
}

export default App
