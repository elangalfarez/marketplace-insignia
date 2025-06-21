
import { type GetAnalysisInput } from '../schema';

export declare function getSessionStatus(input: GetAnalysisInput): Promise<{
  session_id: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message?: string;
}>;
