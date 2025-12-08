import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
}

export function Logo({ className = '', height = 12 }: LogoProps) {
  // Logo aspect ratio is approximately 8.85:1 (2627x297)
  const width = Math.round(height * 8.85);

  return (
    <Image
      src="/logo.png"
      alt="Agentiom"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
