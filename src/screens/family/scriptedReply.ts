import type { Action } from '../../shared/index.ts';
import { PERSON, SCENARIO, SWING_STORY_ID, meaningsForStory, type AppState } from '../../shared/index.ts';

/**
 * Wizard-of-Oz step for the demo. Auntie Lin is not on a real second phone, so when Mei Xin
 * sends her the swing story, the app plays her part of the Iter2.02 scenario: she adds her
 * meaning, explains that she lived near the kampong, and Mum agrees her version is fuller.
 * Times are the scenario times (9:05 pm, 9:12 pm, 9:20 pm on the demo day).
 */
type Dispatch = (action: Action) => Promise<void>;

export async function playScriptedReply(dispatch: Dispatch, state: AppState, storyId: string, helperId: string) {
  if (storyId !== SWING_STORY_ID || helperId !== PERSON.auntieLin) return;
  if (meaningsForStory(state, storyId).some((m) => m.authorId === helperId)) return;
  await dispatch({
    type: 'meaning/add',
    id: 'meaning-auntie-lin',
    storyId,
    authorId: helperId,
    text: SCENARIO.auntieLinMeaning,
    context: SCENARIO.context,
    suggestedReply: null,
    at: SCENARIO.times.auntieLinMeaning,
  });
  await dispatch({
    type: 'reply/add',
    id: 'reply-auntie-lin',
    storyId,
    authorId: helperId,
    text: SCENARIO.auntieLinReply,
    at: SCENARIO.times.auntieLinReply,
  });
  await dispatch({
    type: 'reply/add',
    id: 'reply-mum',
    storyId,
    authorId: PERSON.mum,
    text: SCENARIO.mumReply,
    at: SCENARIO.times.mumReply,
  });
}
