/* eslint-disable @next/next/no-img-element */
export default function HospitalAvatar({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  if (logoUrl)
    return <img src={logoUrl} alt={`${name} logo`} className="w-12 h-12 rounded-md object-contain" />;
  return (
    <div className="w-12 h-12 rounded-md border grid place-items-center text-sm">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}
