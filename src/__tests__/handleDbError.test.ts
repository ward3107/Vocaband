import { describe, it, expect, vi } from 'vitest';
import { handleDbError, OperationType } from '../supabase';

describe('handleDbError', () => {
  // Suppress console.error output during tests
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  it('throws a generic "Database error" message', async () => {
    await expect(handleDbError(new Error('pg error'), OperationType.GET, '/users'))
      .rejects.toThrow('Database error — please try again.');
  });

  it('logs Supabase-shaped errors with all fields', async () => {
    const supabaseError = {
      message: 'Row not found',
      details: 'No rows matched',
      hint: 'Check the ID',
      code: '404',
    };
    await expect(handleDbError(supabaseError, OperationType.GET, '/users')).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Row not found')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('No rows matched')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Check the ID')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('404')
    );
  });

  it('handles plain Error objects', async () => {
    await expect(handleDbError(new Error('connection lost'), OperationType.CREATE, '/classes'))
      .rejects.toThrow('Database error — please try again.');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('connection lost')
    );
  });

  it('handles string errors', async () => {
    await expect(handleDbError('raw string error', OperationType.UPDATE, '/progress'))
      .rejects.toThrow('Database error — please try again.');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('raw string error')
    );
  });

  it('handles null/undefined errors', async () => {
    await expect(handleDbError(null, OperationType.DELETE, '/users'))
      .rejects.toThrow('Database error — please try again.');
  });

  it('includes operation type and path in log output', async () => {
    await expect(handleDbError(new Error('timeout'), OperationType.LIST, '/assignments'))
      .rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('list')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('/assignments')
    );
  });

  it('handles Supabase errors with partial fields', async () => {
    const partialError = { message: 'Permission denied' };
    await expect(handleDbError(partialError, OperationType.WRITE, '/data')).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Permission denied')
    );
  });
});
