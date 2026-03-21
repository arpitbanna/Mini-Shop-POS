import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { NoteItem, ApiSuccessResponse } from '@/types';
import { toast } from 'sonner';

const queryKeys = {
  notes: ['notes'] as const,
};

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null));
    throw new Error(errorBody?.message || errorBody?.error || 'Request failed');
  }
  const json = await res.json();
  if (json.success !== undefined && json.data !== undefined) {
    return json.data as T;
  }
  return json as T;
}

export function useNotes() {
  const { isGuest } = useAuthStore();
  
  return useQuery<NoteItem[]>({
    queryKey: queryKeys.notes,
    queryFn: async () => {
      if (isGuest) {
        return [
          {
            id: 'mock-note-1',
            title: 'Mock Note',
            content: '<p>This is a mock note for guest mode</p>',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        ];
      }
      return fetcher<NoteItem[]>('/api/notes');
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateNote() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, content }: { title?: string, content?: string }) => {
      if (isGuest) {
        toast.info('Guest Mode: Note creation simulated.');
        return Promise.resolve({ success: true, data: { id: 'mock-note-1' } });
      }
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to create note');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to create note');
    },
  });
}

export function useUpdateNote() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title?: string; content?: string }) => {
      if (isGuest) {
        return Promise.resolve({ success: true });
      }
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to update note');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to save note');
    },
  });
}

export function useDeleteNote() {
  const { isGuest } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isGuest) {
        return Promise.resolve({ success: true });
      }
      const res = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => null));
        throw new Error(errorBody?.message || errorBody?.error || 'Failed to delete note');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes });
      toast.success('Note deleted');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof Error ? error.message : 'Unable to delete note');
    },
  });
}
