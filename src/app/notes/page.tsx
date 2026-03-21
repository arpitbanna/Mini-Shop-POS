'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote } from '@/hooks/useNotes';
import { 
  ArrowLeft, CheckCircle2, Loader2, Plus, Menu, 
  Bold, Italic, Heading1, Heading2, List, ListOrdered, FileText, Trash2
} from 'lucide-react';
import Link from 'next/link';
import styles from './notes.module.css';
import ConfirmModal from '@/components/ConfirmModal';

export default function NotesPage() {
  const { data: notes, isLoading: notesLoading } = useNotes();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  // Safely track active IDs and contents to prevent race conditions
  const currentNoteIdRef = useRef<string | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const lastSavedTitleRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: 'Write something extraordinary...',
      }),
    ],
    content: '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      handleContentChange(editor.getHTML());
    },
  });

  // Sync ref with state securely
  useEffect(() => {
    currentNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  // Initial load hook
  useEffect(() => {
    if (notesLoading || activeNoteId) return;
    if (notes && notes.length > 0) {
      loadNote(notes[0].id, notes[0].title, notes[0].content);
    }
  }, [notes, notesLoading, activeNoteId, editor]);

  // Safely switch notes, clear old state to prevent mixing
  const loadNote = (id: string, newTitle: string, newContent: string) => {
    // 1. Block saves immediately
    setIsLoaded(false);
    
    // 2. Clear old timeouts/abort controllers
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    // 3. Set standard React states
    setActiveNoteId(id);
    setTitle(newTitle || 'Untitled Note');
    
    // 4. Update the refs to the NEW baseline immediately
    currentNoteIdRef.current = id;
    lastSavedTitleRef.current = newTitle || 'Untitled Note';
    lastSavedContentRef.current = newContent || '';

    // 5. Update the TiPtap Editor
    editor?.commands.setContent(newContent || '');
    setSidebarOpen(false);
    
    // 6. Wait a tick for Tiptap to settle before we unlock auto-saving
    setTimeout(() => {
      setIsLoaded(true);
    }, 150);
  };

  const handleCreateNote = () => {
    setIsCreating(true);
    createNote.mutate(
      { title: 'Untitled Note', content: '' },
      {
        onSuccess: (res) => {
          if (res.data?.id) {
            loadNote(res.data.id, 'Untitled Note', '');
          }
        },
        onSettled: () => setIsCreating(false)
      }
    );
  };

  const attemptDeleteNote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNoteToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDeleteNote = () => {
    if (!noteToDelete || isDeleting) return;
    setIsDeleting(true);
    
    // Safety check - stop saves if we are deleting the active note
    if (noteToDelete === activeNoteId) {
       setIsLoaded(false);
    }

    deleteNote.mutate(noteToDelete, {
      onSuccess: () => {
        if (noteToDelete === activeNoteId) {
          // Hard reset editor
          setActiveNoteId(null);
          setTitle('');
          editor?.commands.setContent('');
          currentNoteIdRef.current = null;
          
          setTimeout(() => {
            const remainingNotes = notes?.filter(n => n.id !== noteToDelete);
            if (remainingNotes && remainingNotes.length > 0) {
              const nextNote = remainingNotes[0];
              loadNote(nextNote.id, nextNote.title, nextNote.content);
            }
          }, 100);
        }
      },
      onSettled: () => {
        setIsDeleting(false);
        setDeleteModalOpen(false);
        setNoteToDelete(null);
      }
    });
  };

  const triggerAutoSave = useCallback((newTitle: string, newContent: string) => {
    // Strict Safety Rules (Never auto-save if any violate)
    if (!isLoaded) return;
    if (!currentNoteIdRef.current) return;
    
    // Compare baseline refs
    const isSameContent = newContent === lastSavedContentRef.current;
    const isSameTitle = newTitle === lastSavedTitleRef.current;
    if (isSameContent && isSameTitle) return;

    // Prevent empty overwrite (unless actually intended, check trim length)
    const isEffectivelyEmpty = !newContent || newContent === '<p></p>' || newContent.trim().length < 2;
    if (isEffectivelyEmpty && newTitle.trim() === '') return;

    setSaveState('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const activeIdAtSaveTime = currentNoteIdRef.current;
      if (!activeIdAtSaveTime) return;

      updateNote.mutate(
        { id: activeIdAtSaveTime, title: newTitle, content: newContent },
        {
          onSuccess: () => {
            // Only update refs if the current ID is STILL the one we just saved
            if (currentNoteIdRef.current === activeIdAtSaveTime) {
                lastSavedTitleRef.current = newTitle;
                lastSavedContentRef.current = newContent;
                setSaveState('saved');
                setTimeout(() => setSaveState('idle'), 2000);
            }
          },
          onError: () => setSaveState('idle'),
        }
      );
    }, 1000);
  }, [updateNote, isLoaded]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    triggerAutoSave(newTitle, editor?.getHTML() || '');
  };

  const handleContentChange = (newContent: string) => {
    triggerAutoSave(title, newContent);
  };

  if (notesLoading) {
    return (
      <div className={styles.loadingFullscreen}>
        <Loader2 size={16} className={styles.spin} /> Loading notes...
      </div>
    );
  }

  const sortedNotes = notes ? [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()) : [];

  return (
    <div className={styles.layout}>
      <style jsx global>{`
        .ProseMirror {
          min-height: 400px;
          outline: none;
          color: #d1d5db;
          font-size: 16px;
          line-height: 1.7;
        }
        .ProseMirror p { margin-bottom: 1em; }
        .ProseMirror h1, .ProseMirror h2 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          color: white;
        }
        .ProseMirror h1 { font-size: 2rem; }
        .ProseMirror h2 { font-size: 1.5rem; }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5rem;
          margin-bottom: 1em;
        }
        .ProseMirror ul { list-style-type: disc; }
        .ProseMirror ol { list-style-type: decimal; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          font-style: italic;
          opacity: 0.5;
        }
      `}</style>
      
      {/* Modals */}
      <ConfirmModal 
        isOpen={deleteModalOpen}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={confirmDeleteNote}
        onCancel={() => {
          setDeleteModalOpen(false);
          setNoteToDelete(null);
        }}
        isConfirming={isDeleting}
      />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className={styles.mobileOverlay} 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.backBtn}>
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-semibold" style={{color: '#e6edf3'}}>Hostel Mini Notes</span>
        </div>
        
        <button 
          className={`${styles.newNoteBtn} ${isCreating ? styles.btnLoading : ''}`} 
          onClick={handleCreateNote}
          disabled={isCreating}
        >
          {isCreating ? (
            <><div className={styles.spinner} /> Creating...</>
          ) : (
            <><Plus size={16} /> New Note</>
          )}
        </button>

        <div className={styles.notesList}>
          {sortedNotes.map(note => (
            <div 
              key={note.id} 
              className={`${styles.noteItem} ${activeNoteId === note.id ? styles.noteItemActive : ''}`}
              onClick={() => loadNote(note.id, note.title, note.content)}
            >
              <div className={styles.noteTitle}><FileText size={14} className="inline mr-2 opacity-50"/> {note.title || 'Untitled Note'}</div>
              <button 
                className={styles.deleteBtn} 
                onClick={(e) => attemptDeleteNote(e, note.id)}
                title="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <button className={styles.mobileToggle} onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          
          <div className="flex-1"></div>

          <div className={styles.saveIndicator}>
            {saveState === 'saving' && <><Loader2 size={14} className={`${styles.spin} ${styles.saving}`} /> Saving...</>}
            {saveState === 'saved' && <><CheckCircle2 size={14} className={styles.saved} /> Saved</>}
          </div>
        </div>

        {/* Editor Area */}
        <div className={styles.editorContainer}>
          {activeNoteId ? (
            !isLoaded ? (
              <div className={styles.loadingState}>
                <Loader2 size={32} className={`${styles.spin} ${styles.loadingStateIcon}`} />
                <p>Loading document...</p>
              </div>
            ) : (
              <div className={styles.editorWrapper}>
                <input
                  type="text"
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Untitled Note"
                  className={styles.titleInput}
                />

                {/* TipTap Toolbar */}
                <div className={styles.toolbar}>
                  <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`${styles.toolBtn} ${editor?.isActive('bold') ? styles.toolBtnActive : ''}`}
                    title="Bold"
                  >
                    <Bold size={16} />
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`${styles.toolBtn} ${editor?.isActive('italic') ? styles.toolBtnActive : ''}`}
                    title="Italic"
                  >
                    <Italic size={16} />
                  </button>
                  <div className="w-px h-4 bg-[rgba(255,255,255,0.05)] mx-1" />
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={`${styles.toolBtn} ${editor?.isActive('heading', { level: 1 }) ? styles.toolBtnActive : ''}`}
                    title="Heading 1"
                  >
                    <Heading1 size={16} />
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={`${styles.toolBtn} ${editor?.isActive('heading', { level: 2 }) ? styles.toolBtnActive : ''}`}
                    title="Heading 2"
                  >
                    <Heading2 size={16} />
                  </button>
                  <div className="w-px h-4 bg-[rgba(255,255,255,0.05)] mx-1" />
                  <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`${styles.toolBtn} ${editor?.isActive('bulletList') ? styles.toolBtnActive : ''}`}
                    title="Bullet List"
                  >
                    <List size={16} />
                  </button>
                  <button
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    className={`${styles.toolBtn} ${editor?.isActive('orderedList') ? styles.toolBtnActive : ''}`}
                    title="Numbered List"
                  >
                    <ListOrdered size={16} />
                  </button>
                </div>

                <EditorContent editor={editor} />
              </div>
            )
          ) : (
             <div className={styles.emptyState}>
                <FileText size={48} className={styles.emptyStateIcon} />
                <p className={styles.emptyStateTitle}>Create your first note</p>
                <button 
                  className={`${styles.emptyStateBtn} ${isCreating ? styles.btnLoading : ''}`}
                  onClick={handleCreateNote}
                  disabled={isCreating}
                >
                  {isCreating ? <><div className={styles.spinner} /> Creating...</> : <>+ New Note</>}
                </button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}
