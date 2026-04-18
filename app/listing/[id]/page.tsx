import ListingDetailClient from './ListingDetailClient';
import { normalizeListingIdParam } from '@/lib/listingRouteParams';
import { getListingByIdForServer, type ServerListingFetchResult } from '@/lib/getListingServer';

type PageProps = { params: Promise<{ id: string }> };

export default async function ListingPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const listingId = normalizeListingIdParam(rawId);

  if (!listingId) {
    return (
      <ListingDetailClient
        key="__empty__"
        listingId=""
        initialListing={null}
        serverResult="missing"
      />
    );
  }

  const result = await getListingByIdForServer(listingId);

  if (result.ok) {
    // pin_status is authoritative — no on-demand re-geocoding.
    // Coordinates are set permanently by the pipeline's Stage 5 & 6.
    return (
      <ListingDetailClient
        key={listingId}
        listingId={listingId}
        initialListing={result.listing}
        serverResult="found"
      />
    );
  } else {
    const err = result as Extract<ServerListingFetchResult, { ok: false }>;
    if (err.reason === 'missing') {
      return (
        <ListingDetailClient
          key={listingId}
          listingId={listingId}
          initialListing={null}
          serverResult="missing"
        />
      );
    }

    const serverErrorMessage =
      err.error instanceof Error ? err.error.message : 'Server could not load this listing.';

    return (
      <ListingDetailClient
        key={listingId}
        listingId={listingId}
        initialListing={null}
        serverResult="error"
        serverErrorMessage={serverErrorMessage}
      />
    );
  }
}
