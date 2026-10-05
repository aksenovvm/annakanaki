import { Barbers } from "@/components/Barbers";
import { Contacts } from "@/components/Contacts";
import { CtaBanner } from "@/components/CtaBanner";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Reviews } from "@/components/Reviews";
import { Services } from "@/components/Services";
import { StickyCta } from "@/components/StickyCta";
import { getBarbers, getPublicReviews, getServices, load } from "@/lib/api";

/**
 * Главная страница. Данные берём из нашего API (apps/api) при каждом открытии страницы.
 * Три запроса идут параллельно; если один упал — остальные секции всё равно показываются.
 */
export default async function HomePage() {
  const [services, barbers, reviews] = await Promise.all([
    load(getServices()),
    load(getBarbers()),
    load(getPublicReviews(4)),
  ]);

  return (
    <div className="has-sticky-cta">
      <Header />
      <main>
        <Hero barbers={barbers} />
        <Services services={services} />
        <Barbers barbers={barbers} />
        <Reviews reviews={reviews} />
        <Contacts />
        <CtaBanner />
      </main>
      <Footer />
      <StickyCta />
    </div>
  );
}
