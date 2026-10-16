import AuthGuard from '@/components/shared/AuthGuard';
import PostPageClient from '@/components/post/PostPageClient';

export default function PostPage() {
  return (
    <AuthGuard>
      <PostPageClient />
    </AuthGuard>
  );
}
