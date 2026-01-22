import cron, { ScheduledTask } from 'node-cron';
import { supabase } from '@/lib/supabase';

let cleanupTask: ScheduledTask | null = null;

export function startCleanupCron() {
  if (cleanupTask) {
    console.log('Cleanup cron already running');
    return;
  }

  // Run every hour
  cleanupTask = cron.schedule('0 * * * *', () => {
    console.log('Running cleanup task...');
    cleanupExpiredDocuments();
  });

  console.log('Cleanup cron started - runs every hour');
}

export function stopCleanupCron() {
  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log('Cleanup cron stopped');
  }
}

async function cleanupExpiredDocuments() {
  try {
    const now = new Date().toISOString();

    // 1. Find expired documents
    const { data: expiredDocs, error: findError } = await supabase
      .from('pdf_filler_vault_documents')
      .select('id, file_path')
      .lt('expires_at', now);

    if (findError) {
      throw findError;
    }

    if (!expiredDocs || expiredDocs.length === 0) {
      console.log('Cleanup complete: No expired documents found');
      return;
    }

    console.log(`Found ${expiredDocs.length} expired documents. cleaning up...`);

    // 2. Delete files from Storage
    const filePaths = expiredDocs.map(doc => doc.file_path);
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase
        .storage
        .from('vault')
        .remove(filePaths);

      if (storageError) {
        console.error('Failed to remove files from storage:', storageError);
        // Continue to delete from DB anyway to prevent finding them again
      }
    }

    // 3. Delete records from DB
    const ids = expiredDocs.map(doc => doc.id);
    const { error: deleteError } = await supabase
      .from('pdf_filler_vault_documents')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Failed to delete DB records:', deleteError);
    } else {
      console.log(`Cleanup complete: ${ids.length} document(s) deleted`);
    }

  } catch (error) {
    console.error('Cleanup task failed:', error);
  }
}
