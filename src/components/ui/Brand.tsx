import Image from "next/image";

export default function Brand({ large = false }: { large?: boolean }) {
  return <span className={`shell-brand${large ? " shell-brand-large" : ""}`} role="img" aria-label="Coca-Cola FEMSA"><Image src="/images/coca-cola.svg" alt="" width={615} height={193} priority /></span>;
}
