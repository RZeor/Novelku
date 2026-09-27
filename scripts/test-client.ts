/**
 * Verification test for api-client.ts
 * Tests calling backend methods through the new api-client wrapper
 */

import { authApi, novelApi, genreApi, ApiError } from '../src/lib/api-client';

async function testClient() {
  console.log('🧪 Testing API Client methods...');

  // 1. Test Genres List
  try {
    const genres = await genreApi.list();
    console.log(`  ✓ genreApi.list() returned ${genres.length} genres`);
  } catch (err: any) {
    console.error('  ❌ genreApi.list() failed:', err.message);
  }

  // 2. Test Novels List
  try {
    const novels = await novelApi.list({ limit: 5 });
    console.log(`  ✓ novelApi.list() returned ${novels.items.length} novels (total: ${novels.pagination.total})`);
  } catch (err: any) {
    console.error('  ❌ novelApi.list() failed:', err.message);
  }

  // 3. Test Error Handling (Invalid Login)
  try {
    await authApi.login({ email: 'wrong@example.com', password: 'wrongpassword' });
    console.error('  ❌ authApi.login() should have failed');
  } catch (err: any) {
    if (err instanceof ApiError) {
      console.log(`  ✓ authApi.login() correctly threw ApiError (${err.status}): "${err.message}"`);
    } else {
      console.error('  ❌ Did not throw ApiError:', err);
    }
  }

  console.log('🎉 API Client verification complete!\n');
}

testClient();
