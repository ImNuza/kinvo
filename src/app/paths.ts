// Every URL in the app. Link with these helpers, never with hand-written strings.

export const paths = {
  archive: () => '/archive',

  record: () => '/record',
  recording: () => '/record/recording',
  save: (storyId: string) => `/record/save/${storyId}`,
  saved: (storyId: string) => `/record/saved/${storyId}`,

  family: () => '/family',
  selectStory: (personId: string) => `/family/share/${personId}`,
  send: (storyId: string) => `/family/send/${storyId}`,
  reply: (storyId: string) => `/family/reply/${storyId}`,

  /** by: a family member adding a meaning on this phone, e.g. Mum at dinner (scenario). */
  addMeaning: (storyId: string, by?: string) =>
    by ? `/stories/${storyId}/meaning/new?by=${encodeURIComponent(by)}` : `/stories/${storyId}/meaning/new`,
  meanings: (storyId: string) => `/stories/${storyId}/meanings`,

  lessons: () => '/lessons',
  practise: (storyId: string) => `/lessons/${storyId}/practise`,

  study: () => '/study',
} as const;
