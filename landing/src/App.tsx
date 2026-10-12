import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ReplaceStrip } from './components/ReplaceStrip';
import { Benefits } from './components/Benefits';
import { FeatureSimulator } from './components/FeatureSimulator';
import { PlateCalcInteractive } from './components/PlateCalcInteractive';
import { CoachSection } from './components/CoachSection';
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
        <ReplaceStrip />
        <Benefits />
        <FeatureSimulator />
        <PlateCalcInteractive />
        <CoachSection />
        <Pricing />
        <Faq />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
