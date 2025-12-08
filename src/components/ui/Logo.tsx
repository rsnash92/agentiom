import Image from 'next/image';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className = '', size = 20 }: LogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Agentiom"
      width={size}
      height={size}
      className={className}
    />
  );
}
