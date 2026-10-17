import { permanentRedirect } from 'next/navigation';

// The old AI feature page was replaced by /how-it-works; keep old links working.
export default function AIFeatureRoute() {
  permanentRedirect('/how-it-works');
}
