import {
  WifiOff,
  Trophy,
  Dumbbell,
  Footprints,
  Users2,
  Volume2,
  Sparkles,
  Lock,
  ArrowUpRight,
  Flame,
  CheckSquare,
  Activity,
  Layers
} from 'lucide-react';

export function BentoGrid() {
  return (
    <section id="dziennik" className="py-24 relative bg-[#0c0806] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#ff5722]/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#ccff00]/8 blur-[130px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff5722]/15 border border-[#ff5722]/30 text-[#ff8a65] text-xs font-bold uppercase tracking-wider font-headline">
            <Layers className="w-3.5 h-3.5 text-[#ccff00]" />
            Architektura Volt Ember
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Zaprojektowane bez kompromisów. <br />
            <span className="text-gradient-ember">Dla maksymalnych rezultatów.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-300 font-normal">
            Żadnego zbędnego balastu. Każda funkcja powstała z myślą o realnych potrzebach sportowca na treningu.
          </p>
        </div>

        {/* Bento Grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1: Offline First (2 cols) */}
          <div className="md:col-span-2 glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ff5722]/20 border border-[#ff5722]/40 flex items-center justify-center text-[#ff5722]">
                <WifiOff className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ccff00] font-headline">
                Offline-First PWA
              </span>
              <h3 className="font-display font-bold text-2xl text-white">
                Trenuj w podziemiach. Bez zasięgu, bez problemu.
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed max-w-md">
                Wiele siłowni znajduje się w piwnicach z grubymi ścianami, gdzie internet znika. Nasz silnik SWR Cache zapisuje każdą serię lokalnie w pamięci urządzenia i synchronizuje dane w tle zaraz po powrocie do sieci.
              </p>
            </div>
            
            <div className="absolute right-4 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <WifiOff className="w-64 h-64 text-white" />
            </div>
          </div>

          {/* Card 2: Grywalizacja & Nawyki (1 col) */}
          <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#ccff00]/20 border border-[#ccff00]/40 flex items-center justify-center text-[#ccff00]">
                <Trophy className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ff8a65] font-headline">
                Grywalizacja
              </span>
              <h3 className="font-display font-bold text-xl text-white">
                Zmień rutynę w grę RPG.
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Zbieraj punkty XP za ukończone treningi, odblokowuj odznaki za rekordy siłowe i buduj nieprzerwaną serię dni (Streak).
              </p>
              <div className="pt-2 flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-[#ff5722]/20 text-[#ff7043] text-xs font-bold font-mono">
                  🔥 Poziom 24: Gladiator
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Ronnie Coleman Audio (1 col) */}
          <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <Volume2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#ccff00] font-headline">
                Hype Audio
              </span>
              <h3 className="font-display font-bold text-xl text-white">
                Ronnie Coleman w Twoich uszach.
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Podchodzisz do serii z rekordowym ciężarem? Jeden klik uruchamia kultowe okrzyki motywacyjne, które dodają +10% do siły mentalnej.
              </p>
              <span className="inline-block text-[11px] font-mono text-gray-400">
                &ldquo;Ain&apos;t nothin&apos; but a peanut!&rdquo;
              </span>
            </div>
          </div>

          {/* Card 4: Most z Trenerem (2 cols) */}
          <div id="trenerzy" className="md:col-span-2 glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Users2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-purple-300 font-headline">
                Dla Trenerów i Podopiecznych
              </span>
              <h3 className="font-display font-bold text-2xl text-white">
                Koniec z gubieniem wiadomości i PDF-ami.
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed max-w-md">
                Trener rozpisuje plan w panelu, a Ty widzisz go bezpośrednio w zakładce treningowej. Po treningu trener otrzymuje powiadomienie z Twoimi wynikami, filmikami z techniki i uwagami.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-200">
                  Cotygodniowy Check-in
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-200">
                  Czat bez WhatsAppa
                </span>
                <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-gray-200">
                  Wspólna analiza wideo
                </span>
              </div>
            </div>

            <div className="absolute right-4 -bottom-6 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
              <Users2 className="w-64 h-64 text-white" />
            </div>
          </div>

          {/* Card 5: Habit Tracker & Kalendarz (1 col) */}
          <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <CheckSquare className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-300 font-headline">
                Nawyki & Rutyna
              </span>
              <h3 className="font-display font-bold text-xl text-white">
                Buduj żelazne nawyki.
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Śledź codzienne cele: woda (3L), sen (8h), kreatyna, białko. Utrzymuj passę sukcesu każdego dnia.
              </p>
            </div>
          </div>

          {/* Card 6: Baza Ćwiczeń & Technika (1 col) */}
          <div className="glass-panel glass-panel-hover rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Dumbbell className="w-6 h-6" />
              </div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-300 font-headline">
                Baza Ćwiczeń
              </span>
              <h3 className="font-display font-bold text-xl text-white">
                Atlas 250+ ruchów.
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Szczegółowe instrukcje biomechaniczne, angażowane partie mięśniowe i bezpieczna technika wykonywania ćwiczeń.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
