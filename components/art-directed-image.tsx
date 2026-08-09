type ArtDirectedImageProps = {
  desktop: string;
  mobile: string;
  alt: string;
  className?: string;
  priority?: boolean;
};

export function ArtDirectedImage({ desktop, mobile, alt, className, priority = false }: ArtDirectedImageProps) {
  return (
    <picture className={className}>
      <source media="(max-width: 700px)" srcSet={mobile} />
      <img src={desktop} alt={alt} width="1800" height="1200" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
    </picture>
  );
}
