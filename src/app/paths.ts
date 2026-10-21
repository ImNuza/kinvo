// Every URL in the app. Link with these helpers, never with hand-written strings.

export const paths = {
  archive: () => '/archive',

  record: () => '/record',
  recording: () => '/record/recording',
  save: (storyId: string) => `/record/save/${storyId}`,
  saved: (storyId: string) => `/record/saved/${storyId}`,

  family: () => '/family',
  send: (storyId: string) => `/family/send/${storyId}`,
  reply: (storyId: string) => `/family/reply/${storyId}`,

  addMeaning: (storyId: string) => `/stories/${storyId}/meaning/new`,
  meanings: (storyId: string) => `/stories/${storyId}/meanings`,

  lessons: () => '/lessons',
  practise: (storyId: string) => `/lessons/${storyId}/practise`,
} as const;
