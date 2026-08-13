import { getImageProps } from 'next/image';

type ArtDirectedImageProps = {
  desktop: string;
  mobile: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function ArtDirectedImage({ desktop, mobile, alt, className, priority = false, sizes = '100vw' }: ArtDirectedImageProps) {
  const common = {
    alt,
    quality: 75,
    decoding: 'async' as const,
    fetchPriority: priority ? ('high' as const) : ('auto' as const),
  };
  const loading = priority ? ('eager' as const) : ('lazy' as const);

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...common,
    src: desktop,
    width: 1800,
    height: 1200,
    sizes,
    loading,
  });

  const {
    props: { srcSet: mobileSrcSet, ...mobileProps },
  } = getImageProps({
    ...common,
    src: mobile,
    width: 900,
    height: 1200,
    sizes: '100vw',
    loading,
  });

  return (
    <picture className={className}>
      <source media="(min-width: 701px)" srcSet={desktopSrcSet} sizes={sizes} />
      <source media="(max-width: 700px)" srcSet={mobileSrcSet} sizes="100vw" />
      <img {...mobileProps} alt={alt} />
    </picture>
  );
}
