/* =========================================================================
   Ícones inline (SVG) — evita dependência de biblioteca de ícones.
   Uso: <Icon name="bolt" /> · <Icon name="mail" size={20} />
   ========================================================================= */

const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  browser: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M6.5 6.5h.01M9.5 6.5h.01" />
    </>
  ),
  bolt: <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />,
  nodes: (
    <>
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5v4m0 0-5 4.5m5-4.5 5 4.5" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      <path d="M4 11.5v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.7-5.4L3 8.5" />
      <path d="M3 4v4.5h4.5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.4L21 15.5" />
      <path d="M21 20v-4.5h-4.5" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.7 9l5.3 1.7-5.3 1.8L12 18l-1.7-5.5L5 10.7 10.3 9 12 3.5Z" />
      <path d="M18.5 4v3M20 5.5h-3M5.5 16v3M7 17.5H4" />
    </>
  ),
  cpu: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  trending: (
    <>
      <path d="m3 16 5.5-5.5 3.5 3.5L21 5" />
      <path d="M15.5 5H21v5.5" />
    </>
  ),
  chat: (
    <path d="M20 12a7.5 7.5 0 0 1-7.5 7.5H8L4 22v-4.2A7.5 7.5 0 0 1 12.5 4.5 7.5 7.5 0 0 1 20 12Z" />
  ),
  arrowRight: <path d="M4 12h15m0 0-5.5-5.5M19 12l-5.5 5.5" />,
  arrowUpRight: <path d="M7 17 17 7m0 0H8m9 0v9" />,
  arrowDown: <path d="M12 4v15m0 0-5.5-5.5M12 19l5.5-5.5" />,
  mail: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="m3.5 7 7.3 5.3a2 2 0 0 0 2.4 0L20.5 7" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  layers: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3.5 12.5 8.5 4.7 8.5-4.7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="m3.5 17 4.8-4.5 3.2 3 3.5-3.2L20.5 16" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16.5 5.2a3.5 3.5 0 0 1 0 5.6M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
};

/** WhatsApp usa preenchimento sólido em vez de traço. */
const WhatsAppGlyph = ({ size, className, title }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden={title ? undefined : 'true'}
    role={title ? 'img' : undefined}
    focusable="false"
  >
    {title ? <title>{title}</title> : null}
    <path d="M12.04 2C6.6 2 2.2 6.4 2.2 11.84c0 1.74.46 3.44 1.32 4.94L2.1 22l5.36-1.4a9.83 9.83 0 0 0 4.58 1.16h.01c5.43 0 9.84-4.4 9.84-9.84 0-2.63-1.02-5.1-2.88-6.96A9.77 9.77 0 0 0 12.04 2Zm0 1.8c2.15 0 4.17.84 5.69 2.36a7.99 7.99 0 0 1 2.36 5.69c0 4.44-3.61 8.04-8.05 8.04a8.2 8.2 0 0 1-4.16-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.03 8.03 0 0 1-1.23-4.21c0-4.44 3.61-8.04 8.06-8.04Zm-3.4 4.03c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02 0 1.2.87 2.35.99 2.51.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12s-.62.79-.76.95c-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.79-.2-.47-.4-.4-.54-.41h-.46Z" />
  </svg>
);

export default function Icon({
  name,
  size = 24,
  strokeWidth = 1.6,
  className = '',
  title,
}) {
  if (name === 'whatsapp') {
    return <WhatsAppGlyph size={size} className={className} title={title} />;
  }

  const path = paths[name];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {path}
    </svg>
  );
}
