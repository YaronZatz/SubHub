import PlatformWrapper from '@/components/shared/PlatformWrapper';
import { WebPostPage } from '@/components/web/PostPage';
import { MobilePostScreen } from '@/components/mobile/PostScreen';
import AuthGuard from '@/components/shared/AuthGuard';

export default function PostPage() {
  return (
    <AuthGuard>
      <PlatformWrapper
        web={<WebPostPage />}
        mobile={<MobilePostScreen />}
      />
    </AuthGuard>
  );
}
