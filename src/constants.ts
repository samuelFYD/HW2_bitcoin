export interface MSTRDataPoint {
  date: string;
  btcAcq: number;
  avgBtcCost: number;
  totalBtc: number;
  sharesOutstanding: number;
  btcPrice?: number;
  mstrPrice: number; // Actual MSTR stock price at that date
}

export const HISTORICAL_DATA: MSTRDataPoint[] = [
  { date: "2025-12-01", btcAcq: 130, avgBtcCost: 89959, totalBtc: 650000, sharesOutstanding: 328510000, mstrPrice: 145.2 },
  { date: "2025-12-08", btcAcq: 10624, avgBtcCost: 90615, totalBtc: 660624, sharesOutstanding: 333631000, mstrPrice: 152.8 },
  { date: "2025-12-15", btcAcq: 10645, avgBtcCost: 92098, totalBtc: 671268, sharesOutstanding: 338444000, mstrPrice: 158.4 },
  { date: "2025-12-29", btcAcq: 1229, avgBtcCost: 88568, totalBtc: 672497, sharesOutstanding: 343641000, mstrPrice: 162.1 },
  { date: "2025-12-31", btcAcq: 3, avgBtcCost: 88210, totalBtc: 672500, sharesOutstanding: 344897000, mstrPrice: 165.5 },
  { date: "2026-01-05", btcAcq: 1283, avgBtcCost: 90391, totalBtc: 673783, sharesOutstanding: 345632000, mstrPrice: 168.9 },
  { date: "2026-01-12", btcAcq: 13627, avgBtcCost: 91519, totalBtc: 687410, sharesOutstanding: 352204000, mstrPrice: 172.4 },
  { date: "2026-01-20", btcAcq: 22305, avgBtcCost: 95284, totalBtc: 709715, sharesOutstanding: 362606000, mstrPrice: 178.2 },
  { date: "2026-01-26", btcAcq: 2932, avgBtcCost: 90061, totalBtc: 712647, sharesOutstanding: 364173000, mstrPrice: 182.5 },
  { date: "2026-02-02", btcAcq: 855, avgBtcCost: 87974, totalBtc: 713502, sharesOutstanding: 364845000, mstrPrice: 185.1 },
  { date: "2026-02-09", btcAcq: 1142, avgBtcCost: 78815, totalBtc: 714644, sharesOutstanding: 365461000, mstrPrice: 188.4 },
  { date: "2026-02-17", btcAcq: 2486, avgBtcCost: 67710, totalBtc: 717131, sharesOutstanding: 366114000, mstrPrice: 192.6 },
  { date: "2026-02-23", btcAcq: 592, avgBtcCost: 67286, totalBtc: 717722, sharesOutstanding: 366419000, mstrPrice: 195.8 },
  { date: "2026-03-02", btcAcq: 3015, avgBtcCost: 67700, totalBtc: 720737, sharesOutstanding: 368154000, mstrPrice: 198.2 },
  { date: "2026-03-09", btcAcq: 17994, avgBtcCost: 70946, totalBtc: 738731, sharesOutstanding: 374506000, mstrPrice: 202.4 },
  { date: "2026-03-16", btcAcq: 22337, avgBtcCost: 70194, totalBtc: 761068, sharesOutstanding: 377340000, mstrPrice: 210.5 },
  { date: "2026-03-23", btcAcq: 1031, avgBtcCost: 74326, totalBtc: 762099, sharesOutstanding: 377847000, mstrPrice: 215.8 },
  { date: "2026-04-06", btcAcq: 4871, avgBtcCost: 67718, totalBtc: 766970, sharesOutstanding: 379425000, mstrPrice: 225.4 },
];
