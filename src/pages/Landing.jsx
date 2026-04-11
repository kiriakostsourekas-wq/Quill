import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import AppMockup from '../components/landing/AppMockup';
import HowItWorks from '../components/landing/HowItWorks';
import Features from '../components/landing/Features';
import Pricing from '../components/landing/Pricing';
import FAQ from '../components/landing/FAQ';
import CTABanner from '../components/landing/CTABanner';
import Footer from '../components/landing/Footer';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-inter">
      <Navbar />
      <Hero />
      <AppMockup />
      <HowItWorks />
      <Features />
      <Pricing />
      <FAQ />
      <CTABanner />
      <Footer />
    </div>
  );
}