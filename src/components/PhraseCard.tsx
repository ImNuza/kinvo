export type PhraseCardProps = {
  /** Small italic line, e.g. "For Mei Xin to ask". */
  label: string;
  phrase: string;
  english: string;
  /** "clay" = Reply Field look (09). "card" = white card (13). */
  tone?: 'clay' | 'card';
  /** Phrase language for screen readers. Hokkien POJ has no BCP 47 tag that readers know, so default "nan". */
  lang?: string;
};

/** Figma "Reply Field" (314:225): a Hokkien phrase with its English gloss. */
export function PhraseCard({ label, phrase, english, tone = 'clay', lang = 'nan' }: PhraseCardProps) {
  return (
    <div className={`k-phrase k-phrase--${tone}`}>
      <p className="k-phrase__label">{label}</p>
      <p className="k-phrase__text" lang={lang}>
        {phrase}
      </p>
      <p className="k-phrase__english">{english}</p>
    </div>
  );
}
