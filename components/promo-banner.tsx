// Top promotion banner. (P6: driven by `promotion` table with 노출위치=상단배너)
export default function PromoBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="w-full bg-ink text-white text-center text-xs py-2 px-4">
      {message}
    </div>
  );
}
