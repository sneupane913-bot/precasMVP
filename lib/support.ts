import { platform } from '@/lib/platform';

/**
 * The support number, as the SUPER ADMIN set it.
 *
 * Every public page used `process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP` directly,
 * which means changing the number in /super changed nothing on the site. The
 * client is going to move this to a sales number, so a number that only an
 * env var can change is a number that will be wrong the day it changes.
 *
 * Falls back to the env var so nothing breaks before the setting is first
 * saved. Never throws — a footer must not be able to take a page down.
 */
export async function supportWhatsapp(): Promise<string> {
  try {
    const s = await platform.getSettings();
    return (s.supportWhatsapp || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').trim();
  } catch {
    return (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '').trim();
  }
}
