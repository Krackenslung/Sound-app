import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { isLikeable, useIsLiked, useToggleLike } from '@/features/library/useLiked';

export interface LikeButtonProps {
  uri: string | undefined;
  title?: string;
  className?: string;
  iconClassName?: string;
}

export function LikeButton({
  uri,
  title,
  className,
  iconClassName = 'size-[18px]',
}: LikeButtonProps) {
  const { data: liked = false, isPending } = useIsLiked(uri);
  const toggle = useToggleLike();
  const disabled = !isLikeable(uri) || isPending;

  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={
        liked
          ? `Remove ${title ?? 'track'} from Liked Songs`
          : `Save ${title ?? 'track'} to Liked Songs`
      }
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (uri) toggle.mutate({ uri, liked: !liked });
      }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed',
        liked
          ? 'text-accent-2'
          : 'text-text-primary opacity-60 hover:opacity-100 disabled:opacity-30',
        className,
      )}
    >
      <Heart aria-hidden className={cn(iconClassName, liked && 'fill-current')} strokeWidth={1.8} />
    </button>
  );
}
