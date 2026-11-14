import { Nav } from './sections/Nav';
import { Hero, Ticker } from './sections/Hero';
import { CoachChapter, CrewChapter, DailyChapter, FoodChapter, ProgressChapter, RunningChapter, TrainingChapter } from './sections/Tour';
import { Catalogue, CoverRail, EverywhereSection, MoreSection, PetSection, SiteFooter } from './sections/Rest';
import { PlateCalcInteractive } from './components/PlateCalcInteractive';
import { YearPlan } from './components/YearPlan';
import { Pricing } from './components/Pricing';
import { Faq } from './components/Faq';
import { CtaSection } from './components/CtaSection';
import { useScrollReveal } from './lib/reveal';

/* A tour of the app: every chapter is one area of it, shown as the screen itself playing a scene. */
export default function App() {
  useScrollReveal();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <TrainingChapter />
        <CoverRail />
        <PlateCalcInteractive />
        <RunningChapter />
        <FoodChapter />
        <DailyChapter />
        <ProgressChapter />
        <PetSection />
        <CrewChapter />
        <CoachChapter />
        <MoreSection />
        <EverywhereSection />
        <Catalogue />
        <YearPlan />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <SiteFooter />
    </>
  );
}
