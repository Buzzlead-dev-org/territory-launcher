export interface SiteAnalysis {
  companyName: string;
  description: string;
  icp: string;
  valueProp: string;
  category: string;
}

export interface BuyerPain {
  quote: string;
  sourceUrl?: string;
}

export interface MarketIntel {
  buyerPains: BuyerPain[];
  competitors: string[];
  icpRefined: string;
  redditSources: string[];
  subreddits?: string[];
}

export interface CampaignAngle {
  id: string;
  tag: string;
  name: string;
  rationale: string;
  targetTitle: string[];
  triggerSignal: string;
}

export interface RawProspect {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  linkedinUrl?: string;
}

export interface Prospect extends RawProspect {
  id: string;
  personalizedLine: string;
  emailSubject: string;
  emailBody: string;
}

export interface AppState {
  step: 1 | 2 | 3 | 4 | 5;
  url: string;
  icpOverride: string;
  siteAnalysis: SiteAnalysis | null;
  intel: MarketIntel | null;
  campaigns: CampaignAngle[];
  selectedCampaign: CampaignAngle | null;
  prospects: Prospect[];
  isLoading: boolean;
  error: string | null;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
