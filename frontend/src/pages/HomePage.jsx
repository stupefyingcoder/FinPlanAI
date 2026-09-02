import Hero from "./HomePage/Hero";
import Features from "./HomePage/Features";

/* Assets */
import Logo from "../assets/logo.png";
import Model from "../assets/model6.png";
import Logo1 from "../assets/Logo-1.png";
import Logo2 from "../assets/Logo-2.png";
import Logo3 from "../assets/Logo-3.png";
import Logo4 from "../assets/Logo-4.png";
import Feature1 from "../assets/Feature1.png";
import Feature2 from "../assets/Feature2.png";
import Feature3 from "../assets/Feature3.png";
import Feature4 from "../assets/Feature4.png";
import Feature5 from "../assets/Feature5.png";
import Feature6 from "../assets/Feature6.png";

const HomePage = () => {
  // logos array used by Hero and Footer (Footer expects first to be main logo)
  const logos = [Logo, Logo1, Logo2, Logo3, Logo4];

  const features = {
    f1: Feature1,
    f2: Feature2,
    f3: Feature3,
    f4: Feature4,
    f5: Feature5,
    f6: Feature6,
  };

  return (
    <div className="min-h-screen text-gray-900 font-sans">
      <main>
        <Hero model={Model} logos={logos.slice(1)} />
        <Features features={features} />
      </main>
    </div>
  );
};

export default HomePage;
