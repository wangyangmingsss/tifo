import dotenv from 'dotenv';
dotenv.config();

import { Correspondent } from './correspondent';
import { config } from './config';

async function main() {
  console.log('==============================================');
  console.log('  TIFO War Correspondent');
  console.log('  On-chain events → Auto-tweet @XLayerOfficial');
  console.log('  Chain: X Layer Testnet (195)');
  console.log(`  Mode: ${config.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('==============================================');

  const correspondent = new Correspondent();

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n[main] Shutting down...');
    correspondent.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await correspondent.start();
}

main().catch((err) => {
  console.error('[main] Fatal error:', err);
  process.exit(1);
});
