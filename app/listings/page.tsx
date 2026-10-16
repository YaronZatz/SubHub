import { redirect } from 'next/navigation';

// The old list + overlay view was a duplicate of /map. Owner tools (edit,
// status) now live on /listing/[id], so keep old links working by redirecting.
export default function ListingsPage() {
  redirect('/map');
}
