// Icons copied from the Figma "Icons" frame (313:2). They draw in currentColor.

type IconDef = { paths: string[]; fill?: boolean; strokeWidth?: number };

const ICONS = {
  calendar: { paths: ['M19 5H5C3.9 5 3 5.9 3 7V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V7C21 5.9 20.1 5 19 5Z', 'M3 10H21M8 3V7M16 3V7'] },
  family: {
    paths: [
      'M9 11.5C10.93 11.5 12.5 9.93 12.5 8C12.5 6.07 10.93 4.5 9 4.5C7.07 4.5 5.5 6.07 5.5 8C5.5 9.93 7.07 11.5 9 11.5Z',
      'M2.5 20C2.5 18.28 3.18 16.62 4.4 15.4C5.62 14.18 7.28 13.5 9 13.5C10.72 13.5 12.38 14.18 13.6 15.4C14.82 16.62 15.5 18.28 15.5 20',
      'M16 4.6C16.76 4.79 17.44 5.22 17.92 5.84C18.41 6.46 18.67 7.22 18.67 8C18.67 8.78 18.41 9.54 17.92 10.16C17.44 10.78 16.76 11.21 16 11.4M18 14C19.09 14.57 20 15.43 20.62 16.49C21.24 17.56 21.54 18.77 21.5 20',
    ],
  },
  book: {
    paths: [
      'M12 3H6C5.47 3 4.96 3.21 4.59 3.59C4.21 3.96 4 4.47 4 5V22C4 21.47 4.21 20.96 4.59 20.59C4.96 20.21 5.47 20 6 20H12M12 3V20M12 3H18C18.53 3 19.04 3.21 19.41 3.59C19.79 3.96 20 4.47 20 5V22C20 21.47 19.79 20.96 19.41 20.59C19.04 20.21 18.53 20 18 20H12',
    ],
  },
  back: { paths: ['M19 12H5M12 5L5 12L12 19'] },
  home: { paths: ['M3 11L12 3L21 11', 'M5 10V20H19V10'] },
  send: { paths: ['M3 11L21 3L13 21L11 13L3 11Z'] },
  save: { paths: ['M5 3H16L19 6V21H5V3Z', 'M8 3V9H16'] },
  play: { paths: ['M7 4L20 12L7 20V4Z'], fill: true },
  pause: { paths: ['M6 4H10V20H6V4ZM14 4H18V20H14V4Z'], fill: true },
  stop: { paths: ['M16 6H8C6.9 6 6 6.9 6 8V16C6 17.1 6.9 18 8 18H16C17.1 18 18 17.1 18 16V8C18 6.9 17.1 6 16 6Z'], fill: true },
  x: { paths: ['M6 6L18 18M18 6L6 18'], strokeWidth: 2.2 },
  bin: { paths: ['M4 7H20M10 11V17M14 11V17M6 7L7 20H17L18 7M9 7V4H15V7'] },
  clock: { paths: ['M12 21C16.97 21 21 16.97 21 12C21 7.03 16.97 3 12 3C7.03 3 3 7.03 3 12C3 16.97 7.03 21 12 21Z', 'M12 7V12L15 14'], strokeWidth: 2.6 },
  warn: { paths: ['M12 3L22 21H2L12 3Z', 'M12 10V14M12 17.5V18'], strokeWidth: 2.6 },
  check: { paths: ['M5 12L10 17L19 7'], strokeWidth: 3 },
  pencil: { paths: ['M4 20H8L19 9L15 5L4 16V20Z'], strokeWidth: 2.6 },
  flame: {
    paths: [
      'M12 2C13 5.5 17 8 17 13C17 14.33 16.47 15.6 15.54 16.54C14.6 17.47 13.33 18 12 18C10.67 18 9.4 17.47 8.46 16.54C7.53 15.6 7 14.33 7 13C7 10.6 8.3 9 9.5 8C9.7 9.8 10.5 11 11.7 11.4C11.2 8.8 11 5.4 12 2Z',
    ],
    fill: true,
  },
  mic: {
    paths: [
      'M15 6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V6Z',
      'M5 11C5 12.86 5.74 14.64 7.05 15.95C8.36 17.26 10.14 18 12 18C13.86 18 15.64 17.26 16.95 15.95C18.26 14.64 19 12.86 19 11',
      'M12 18V21',
    ],
  },
  cards: {
    paths: [
      'M15 7H5C3.9 7 3 7.9 3 9V18C3 19.1 3.9 20 5 20H15C16.1 20 17 19.1 17 18V9C17 7.9 16.1 7 15 7Z',
      'M7 7V5C7 4.47 7.21 3.96 7.59 3.59C7.96 3.21 8.47 3 9 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V16C21 16.53 20.79 17.04 20.41 17.41C20.04 17.79 19.53 18 19 18H17',
    ],
  },
  chat: { paths: ['M4 5H20V16H9L4 20V5Z'] },
  restart: {
    paths: [
      'M3 12C3 14.06 3.7 16.06 5 17.66C6.29 19.27 8.1 20.38 10.12 20.81C12.13 21.24 14.23 20.97 16.07 20.03C17.91 19.1 19.37 17.57 20.21 15.69C21.06 13.81 21.23 11.69 20.7 9.7C20.17 7.71 18.97 5.96 17.31 4.74C15.65 3.53 13.61 2.92 11.56 3.02C9.5 3.12 7.54 3.93 6 5.3',
      'M3 4V9H8',
    ],
  },
  skip: { paths: ['M5 5L15 12L5 19V5ZM17 5H19V19H17V5Z'], fill: true },
  'arrow-right': { paths: ['M5 12H19M13 18L19 12L13 6'], strokeWidth: 2.2 },
  'chev-left': { paths: ['M15 6L9 12L15 18'] },
  'chev-right': { paths: ['M9 6L15 12L9 18'] },
  listen: {
    paths: [
      'M4 15V12C4 9.88 4.84 7.84 6.34 6.34C7.84 4.84 9.88 4 12 4C14.12 4 16.16 4.84 17.66 6.34C19.16 7.84 20 9.88 20 12V15',
      'M5.5 14H4.5C3.67 14 3 14.67 3 15.5V18.5C3 19.33 3.67 20 4.5 20H5.5C6.33 20 7 19.33 7 18.5V15.5C7 14.67 6.33 14 5.5 14Z',
      'M19.5 14H18.5C17.67 14 17 14.67 17 15.5V18.5C17 19.33 17.67 20 18.5 20H19.5C20.33 20 21 19.33 21 18.5V15.5C21 14.67 20.33 14 19.5 14Z',
    ],
  },
  heart: {
    paths: [
      'M12 20C12 20 5 15.5 5 10C5.03 9.2 5.3 8.43 5.77 7.78C6.24 7.13 6.9 6.65 7.65 6.38C8.41 6.11 9.22 6.07 10 6.27C10.77 6.47 11.47 6.9 12 7.5C12.53 6.9 13.23 6.47 14 6.27C14.78 6.07 15.59 6.11 16.35 6.38C17.1 6.65 17.76 7.13 18.23 7.78C18.7 8.43 18.97 9.2 19 10C19 15.5 12 20 12 20Z',
    ],
  },
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  /** Pixel size. Default 20. */
  size?: number;
  className?: string;
};

/** Decorative by default (aria-hidden). Give the parent button an accessible name. */
export function Icon({ name, size = 20, className }: IconProps) {
  const def: IconDef = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
    >
      {def.paths.map((d) =>
        def.fill ? (
          <path key={d} d={d} fill="currentColor" />
        ) : (
          <path
            key={d}
            d={d}
            stroke="currentColor"
            strokeWidth={def.strokeWidth ?? 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ),
      )}
    </svg>
  );
}
