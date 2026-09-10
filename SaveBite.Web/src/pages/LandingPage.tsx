import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <main className="landing-page">
      <section className="hero-section">
        <div className="hero-content">
          <p className="brand-label">
            SAVEBITE
          </p>

          <h1>
            Rescue Food.
            <br />
            Reduce Waste.
            <br />
            Feed People.
          </h1>

          <p className="hero-description">
            SaveBite connects surplus food from restaurants
            with nearby customers and intelligently coordinates
            delivery.
          </p>

          <div className="hero-actions">
            <button
              onClick={() =>
                navigate("/customer/login")
              }
            >
              Find Food
            </button>

            <button
              onClick={() =>
                navigate("/restaurant/login")
              }
            >
              Restaurant Owner
            </button>
          </div>
        </div>

        <div className="role-section">
          <h2>
            How do you want to use SaveBite?
          </h2>

          <div className="role-grid">

            <button
              className="role-card"
              onClick={() =>
                navigate("/restaurant/login")
              }
            >
              <span>🍽️</span>

              <h3>
                Restaurant Owner
              </h3>

              <p>
                List surplus food and reduce
                unnecessary food waste.
              </p>
            </button>

            <button
              className="role-card"
              onClick={() =>
                navigate("/customer/login")
              }
            >
              <span>🛍️</span>

              <h3>
                Customer
              </h3>

              <p>
                Discover affordable surplus
                food near you.
              </p>
            </button>

            <button
              className="role-card"
              onClick={() =>
                navigate("/delivery/login")
              }
            >
              <span>🚴</span>

              <h3>
                Delivery Partner
              </h3>

              <p>
                Accept delivery requests and
                earn through deliveries.
              </p>
            </button>

          </div>
        </div>
      </section>
    </main>
  );
}

export default LandingPage;