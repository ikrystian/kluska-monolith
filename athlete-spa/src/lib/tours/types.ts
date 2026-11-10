/** Where the card sits relative to the spotlighted element; Intro.js picks the best fit when omitted. */
export type TourPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TourStepDef {
  /**
   * `data-tour` value of the element to spotlight. A step whose element is not
   * on screen (feature hidden for this role, empty state, section turned off)
   * is dropped, so tours never point at nothing. Omit for a centred card.
   */
  target?: string;
  title: string;
  /** One or two short sentences. May contain `<strong>`; never user content. */
  body: string;
  position?: TourPosition;
}

export interface TourDef {
  /** Stable key under which "already seen" is stored. */
  id: string;
  /** Bump after rewriting a tour to show it once more to people who saw the old one. */
  version: number;
  /** Whether this tour belongs to the screen at `pathname` + `search`. */
  match: (pathname: string, search: URLSearchParams) => boolean;
  steps: TourStepDef[];
}
