import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/auth';

export function useAvatarUpload() {
  const { explorer, setExplorer } = useAuthStore();

  return useMutation({
    mutationFn: async ({ uri, mimeType }: { uri: string; mimeType: string }) => {
      const blob = await (await fetch(uri)).blob();
      const sizeBytes = blob.size;

      const signed = await api.post<{ objectKey: string; uploadUrl: string }>(
        '/api/explorers/me/avatar/upload-url',
        { mimeType, sizeBytes },
      );

      const uploaded = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob,
      });
      if (!uploaded.ok) throw new Error(`Storage upload failed: ${uploaded.status}`);

      return api.post<{ avatarUrl: string }>('/api/explorers/me/avatar/complete', {
        objectKey: signed.objectKey,
        mimeType,
        sizeBytes,
      });
    },
    onSuccess: ({ avatarUrl }) => {
      if (explorer) setExplorer({ ...explorer, avatarUrl });
    },
  });
}
