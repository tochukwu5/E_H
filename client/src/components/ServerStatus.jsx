import { useQuery } from '@tanstack/react-query';
import { get } from '../lib/api';

/** Shows a clear banner when the API can't be reached, instead of a page full of silent errors. */
export default function ServerStatus() {
  const { isError } = useQuery({ queryKey: ['health'], queryFn: () => get('/health'), retry: 2, retryDelay: 1500, refetchInterval: 10_000, refetchOnWindowFocus: true });
  if (!isError) return null;
  return (
    <div role="alert" className="bg-danger px-4 py-2.5 text-center text-[14px] font-semibold text-white">
      Can't reach the EmployHunt server. Make sure the backend is running (npm run dev in the server folder).
    </div>
  );
}