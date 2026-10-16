// Offline inline SVG icon set — no CDN, no emoji-only icons (DESIGN doc §3).
interface Props { name: IconName; title?: string }

export type IconName = 'home' | 'chair' | 'users' | 'plus' | 'bullhorn' | 'user' | 'check' | 'image' | 'settings' | 'receipt' | 'box' | 'wallet' | 'whatsapp';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  chair: 'M6 19v-3h12v3zM7 4h10l-1 9H8z',
  users: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6m9 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6M2 20c0-2.2 2.7-4 6-4s6 1.8 6 4m7-4c2.3 0 4 1.8 4 4',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  bullhorn: 'M3 10v4h3l7 4V6L6 10zM18 8a5 5 0 0 1 0 8',
  user: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4m0 2c-3.3 0-8 1.7-8 4v2h16v-2c0-2.3-4.7-4-8-4',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  image: 'M4 4h16v16H4zM4 16l4.5-4.5L14 17l3-3 3 3M16 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
  settings: 'M19.4 13a7.9 7.9 0 0 0 0-2l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.9 3H9.1l-.4 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.6h5.8l.4-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5',
  receipt: 'M5 2h14v20l-2-1.5L15 22l-2-1.5L11 22l-2-1.5L7 22l-2-1.5zM7 8h10v2H7zm0 4h10v2H7zm0-8h10v2H7z',
  box: 'M3 8l9-5 9 5v8l-9 5-9-5zM7 5.8v6.4l5 2.8 5-2.8V5.8L12 3z',
  wallet: 'M3 6h18v12H3zM16 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M3 8h16v8H3z',
  whatsapp: 'M20.5 3.5A10.4 10.4 0 0 0 12 1a10.9 10.9 0 0 0-9.4 16.4L1 23l5.8-1.5A10.8 10.8 0 0 0 12 23a10.5 10.5 0 0 0 8.5-17.5zM12 21a8.9 8.9 0 0 1-4.4-1.2l-.3-.2-3.4.9.9-3.3-.2-.3A9 9 0 1 1 12 21zm4.9-6.6c-.3-.1-1.8-.9-2.1-1s-.5-.1-.7.1l-.7 1c-.1.2-.3.2-.5.1a7.5 7.5 0 0 1-3.8-3.3c-.1-.3 0-.4.1-.6l.5-.6c.1-.2.2-.3.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.6A6.2 6.2 0 0 0 7 12.4a12.4 12.4 0 0 0 4.9 4.3 12 12 0 0 0 1.6.6 3.3 3.3 0 0 0 2.1.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4z',
};

export function Icon({ name, title }: Props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden={!title} role={title ? 'img' : undefined} aria-label={title}>
      <path d={PATHS[name]} />
    </svg>
  );
}
