/**
 * Core Pipeline Types for Interactive Dilemmas & Pick Your Fate
 */

export interface VisualSpec {
  template: string;
  title?: string;
  subtitle?: string;
  tag?: string;
  sourceCitation?: string;
  payload?: Record<string, any>;
  [key: string]: any;
}

export interface PostDraft {
  id?: string;
  telegramHtml?: string;
  poll?: any;
  visualSpec?: VisualSpec;
  category?: string;
  tags?: string[];
  [key: string]: any;
}
