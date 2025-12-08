import Image from 'next/image';

interface LogoProps {
  className?: string;
  height?: number;
}

export function Logo({ className = '', height = 20 }: LogoProps) {
  // Logo aspect ratio is approximately 8.63:1 (2563x297)
  const width = Math.round(height * 8.63);

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
