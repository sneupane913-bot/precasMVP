/**
 * Lets a QA suite import the product's TypeScript directly.
 *
 * The source uses the `@/` path alias from tsconfig.json. Node resolves
 * TypeScript with --experimental-strip-types but knows nothing about the
 * alias, so a suite that imports lib/data/questions.ts (which imports
 * '@/lib/data/timing') fails before it asserts anything. This hook maps '@/'
 * to the project root and adds the .ts extension the alias omits.
 *
 * Use:  node --experimental-strip-types --import ./qa/_alias-register.mjs qa/paper-check.mjs
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./_alias-loader.mjs', import.meta.url);
