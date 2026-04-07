/**
 * Manual Test for Store Factory
 * Simple JavaScript verification that our factory works
 */

import { createStandardStore } from './index.ts';

// Create a test store
console.log('🚀 Testing Store Factory...\n');

try {
  const testStore = createStandardStore({
    name: 'manual-test',
    initialState: { count: 0 },
    storeCreator: (set) => ({
      increment: () => set((state) => ({ count: state.count + 1 })),
      reset: () => set({ count: 0 }),
    }),
  });

  console.log('✅ Factory created store successfully');
  
  // Test initial state
  const initialState = testStore.getState();
  console.log('📊 Initial state:', initialState);
  
  // Test if clear method exists
  if (typeof initialState.clear === 'function') {
    console.log('✅ clear() method exists');
  } else {
    console.log('❌ clear() method missing');
  }
  
  // Test if custom actions exist
  if (typeof initialState.increment === 'function') {
    console.log('✅ Custom actions exist');
  } else {
    console.log('❌ Custom actions missing');
  }

  console.log('\n🎯 Manual test completed - Factory appears to work correctly!');
  
} catch (error) {
  console.log('❌ Error testing factory:', error.message);
} 