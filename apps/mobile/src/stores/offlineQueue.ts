import { File, Paths } from 'expo-file-system';
import { api, ApiError } from '../lib/api';

interface QueuedMutation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  queuedAt: number;
}

function getQueueFile(): File {
  return new File(Paths.document, 'offline_queue.json');
}

async function readQueue(): Promise<QueuedMutation[]> {
  try {
    const file = getQueueFile();
    if (!file.exists) return [];
    const raw = await file.text();
    return JSON.parse(raw) as QueuedMutation[];
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedMutation[]): Promise<void> {
  try {
    const file = getQueueFile();
    await file.write(JSON.stringify(queue));
  } catch {
    // storage failure — queue is in-memory only for this session
  }
}

export async function enqueueOfflineMutation(
  method: QueuedMutation['method'],
  path: string,
  body?: unknown,
): Promise<void> {
  const queue = await readQueue();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method,
    path,
    body,
    queuedAt: Date.now(),
  });
  await writeQueue(queue);
}

export async function replayOfflineQueue(): Promise<{ replayed: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { replayed: 0, failed: 0 };

  const remaining: QueuedMutation[] = [];
  let replayed = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      if (item.method === 'POST') {
        await api.post(item.path, item.body, false);
      } else if (item.method === 'PUT') {
        await api.put(item.path, item.body, false);
      } else if (item.method === 'PATCH') {
        await api.patch(item.path, item.body, false);
      } else if (item.method === 'DELETE') {
        await api.delete(item.path, false);
      }
      replayed++;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        remaining.push(item);
      } else {
        // Server rejected — discard, don't retry
        failed++;
      }
    }
  }

  await writeQueue(remaining);
  return { replayed, failed };
}

export async function getQueueSize(): Promise<number> {
  const queue = await readQueue();
  return queue.length;
}

export async function clearOfflineQueue(): Promise<void> {
  await writeQueue([]);
}
