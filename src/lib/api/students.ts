import { Students } from '@/types/students';
import { serverFetch } from '../server-fetch';

export async function fetchStudentsServer(
   sectionId: string,
): Promise<Students[]> {
   const response = await serverFetch(`/api/department/students/${sectionId}`);
   const json = await response.json();
   if (!response.ok) throw new Error('Failed to fetch');
   return json.data;
}
