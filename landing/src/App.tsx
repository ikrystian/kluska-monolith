import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureSimulator } from './components/FeatureSimulator';
import { RunningFold } from './components/RunningFold';
import { PlateCalcInteractive } from './components/PlateCalcInteractive';
import { OfflineFold } from './components/OfflineFold';
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
        <FeatureSimulator />
        <RunningFold />
        <PlateCalcInteractive />
        <OfflineFold />
        <Faq />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
