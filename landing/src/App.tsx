import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Manifesto } from './components/Manifesto';
import { YearPlan } from './components/YearPlan';
import { TrainingStage, RunningStage, NutritionStage, HabitsStage, CoachStage } from './components/Stages';
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
        <Manifesto />
        <YearPlan />
        <TrainingStage />
        <PlateCalcInteractive />
        <RunningStage />
        <NutritionStage />
        <HabitsStage />
        <CoachStage />
        <KeyFeatures />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
