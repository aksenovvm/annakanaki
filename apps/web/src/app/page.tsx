import { Barbers } from "@/components/Barbers";
import { Contacts } from "@/components/Contacts";
import { CtaBanner } from "@/components/CtaBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Reviews } from "@/components/Reviews";
import { Services } from "@/components/Services";
import { StickyCta } from "@/components/StickyCta";

export default function HomePage() {
  return (
    <div className="has-sticky-cta">
      <Header />
      <main>
        <Hero />
        <Services />
        <Barbers />
        <Reviews />
        <Contacts />
        <CtaBanner />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
