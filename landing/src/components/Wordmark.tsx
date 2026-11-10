export function Wordmark({ size = 'md', collapse = false }: { size?: 'md' | 'lg'; collapse?: boolean }) {
  const mark = size === 'lg' ? 'size-12 rounded-[14px]' : 'size-8 rounded-[10px]';
  const text = size === 'lg' ? 'text-4xl' : 'text-[1.375rem]';

  return (
    <span className="inline-flex items-center gap-2.5">
      <img src="/icons/icon-192.png" alt="" width={192} height={192} className={mark} />
      <span className={`${text} font-display font-bold uppercase leading-none tracking-[0.01em] whitespace-nowrap ${collapse ? 'max-[379px]:sr-only' : ''}`}>
        Leniwa Kluska
      </span>
    </span>
  );
}
