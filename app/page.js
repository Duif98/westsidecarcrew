import Nav from "./components/Nav";
import Hero from "./components/Hero";
import NewsBoard from "./components/NewsBoard";
import EventTeaser from "./components/EventTeaser";
import About from "./components/About";
import Garage from "./components/Garage";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <NewsBoard />
        <EventTeaser />
        <About />
        <Garage />
      </main>
      <Footer />
    </>
  );
}
