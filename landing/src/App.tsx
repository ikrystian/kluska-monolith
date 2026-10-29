import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StickyFeatures } from './components/StickyFeatures';
import { CalcTeaser } from './components/CalcTeaser';
import { Facts } from './components/Facts';
import { TrainingChapter, RunningChapter, NutritionChapter, CoachChapter } from './components/Chapters';
import { PlateCalcInteractive } from './components/PlateCalcInteractive';
import { KeyFeatures } from './components/KeyFeatures';
import { Pricing } from './components/Pricing';
import { Faq } from './components/Faq';
import { CtaSection } from './components/CtaSection';
import { Footer } from './components/Footer';
import { useScrollReveal } from './lib/reveal';

export default function App() {
  useScrollReveal();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <StickyFeatures />
        <CalcTeaser />
        <Facts />
        <TrainingChapter />
        <PlateCalcInteractive />
        <RunningChapter />
        <NutritionChapter />
        <CoachChapter />
        <KeyFeatures />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
