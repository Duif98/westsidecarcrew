import Nav from "./components/Nav";
import Hero from "./components/Hero";
import About from "./components/About";
import Garage from "./components/Garage";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Garage />
      </main>
      <Footer />
    </>
  );
}
