export function Wordmark({ size = 'md', collapse = false }: { size?: 'md' | 'lg'; collapse?: boolean }) {
  const mark = size === 'lg' ? 'h-11 w-11' : 'h-8 w-8';
  const text = size === 'lg' ? 'text-xl' : 'text-[0.9375rem]';

  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src="/icons/icon-192.png"
        alt=""
        width={192}
        height={192}
        className={`${mark} rounded-md border border-rule`}
      />
      <span
        className={`${text} font-semibold tracking-[-0.02em] text-ink whitespace-nowrap ${collapse ? 'max-[379px]:sr-only' : ''}`}
      >
        Leniwa Kluska
      </span>
    </span>
  );
}
