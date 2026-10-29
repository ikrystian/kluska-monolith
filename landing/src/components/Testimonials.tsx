import { Star, Quote, Dumbbell, Footprints, Award, ShieldCheck } from 'lucide-react';

export function Testimonials() {
  const reviews = [
    {
      name: 'Krystian M.',
      role: 'Trójbój Siłowy (IPF)',
      badge: 'Rekord: 240kg Przysiad',
      content:
        'Kalkulator talerzy na sztangę i automatyczne przeliczanie RPE na szacowany 1RM to absolutne mistrzostwo. Aplikacja działa bez zacięcia w podziemnej siłowni bez zasięgu. Żadnych zbędnych pierdół, czyste skupienie na żelastwie.',
      rating: 5,
      avatarColor: 'from-orange-500 to-red-600',
    },
    {
      name: 'Katarzyna W.',
      role: 'Biegaczka & Entuzjastka Siłowni',
      badge: 'Półmaraton 1h 38m',
      content:
        'Przez lata używałam osobnej aplikacji do siłowni i osobnej do biegania. Kluska łączy oba te światy bez kompromisów. Każdy bieg z GPS od razu ląduje na mojej Stravie, a w dni siłowe mam idealnie rozpisany plan.',
      rating: 5,
      avatarColor: 'from-emerald-500 to-teal-600',
    },
    {
      name: 'Michał & Team',
      role: 'Certyfikowany Trener Personalny',
      badge: '22 Podopiecznych w Panelu',
      content:
        'Dla trenera moduł Check-in i podgląd tonażu podopiecznych to oszczędność 5 godzin w tygodniu. Moi zawodnicy wypełniają raporty w niedzielę wieczorem ze zdjęciami i pomiarami. Koniec z bałaganem w Excelu i na WhatsAppie.',
      rating: 5,
      avatarColor: 'from-purple-500 to-indigo-600',
    },
  ];

  return (
    <section className="py-24 relative bg-[#090604] border-t border-white/8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ccff00]/15 border border-[#ccff00]/30 text-[#ccff00] text-xs font-bold uppercase tracking-wider font-headline">
            <Star className="w-3.5 h-3.5 fill-current" />
            Opinie Społeczności
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Trenują z nami <span className="text-gradient-ember">najlepsi</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-300 font-normal">
            Zobacz, dlaczego sportowcy siłowi, biegacze i trenerzy rezygnują ze starych notatników na rzecz Leniwej Kluski.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((rev, idx) => (
            <div
              key={idx}
              className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6 relative border border-white/8"
            >
              <div className="space-y-4">
                {/* Stars and Quote */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 text-[#ccff00]">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <Quote className="w-8 h-8 text-white/10" />
                </div>

                <p className="text-sm text-gray-300 leading-relaxed italic">
                  &ldquo;{rev.content}&rdquo;
                </p>
              </div>

              {/* Author footer */}
              <div className="pt-4 border-t border-white/8 flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${rev.avatarColor} flex items-center justify-center text-white font-extrabold text-sm shadow-md`}
                >
                  {rev.name.slice(0, 2)}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{rev.name}</h4>
                  <p className="text-[11px] text-gray-400">{rev.role}</p>
                  <span className="inline-block mt-0.5 text-[10px] font-mono text-[#ff8a65] font-semibold">
                    {rev.badge}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
