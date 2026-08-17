import Header from '../sections/Header.jsx';
import Hero from '../sections/Hero.jsx';
import Projects from '../sections/Projects.jsx';
import Capabilities from '../sections/Capabilities.jsx';
import Process from '../sections/Process.jsx';
import Stack from '../sections/Stack.jsx';
import ClientArea from '../sections/ClientArea.jsx';
import Contact from '../sections/Contact.jsx';
import Footer from '../sections/Footer.jsx';
import FloatingWhatsApp from '../components/FloatingWhatsApp.jsx';

/** O site público. */
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>

      <Header />

      {/* Ordem = funil: descoberta → prova → oferta → conversa */}
      <main id="conteudo">
        <Hero />
        <Projects />
        <Capabilities />
        <Process />
        <Stack />
        <ClientArea />
        <Contact />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
