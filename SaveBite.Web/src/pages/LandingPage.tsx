import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">

      {/* NAVBAR */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <img
              src="/savebite-logo.png"
              alt="SaveBite"
              className="lp-brand-img"
            />
            <span className="lp-brand-name">SaveBite</span>
          </div>

          <div className="lp-nav-actions">
            <button
              className="lp-btn-ghost"
              onClick={() => navigate("/customer/login")}
            >
              Sign In
            </button>
            <button
              className="lp-btn-solid"
              onClick={() => navigate("/restaurant/login")}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="lp-hero">
        <div className="lp-hero-inner">
          <img
            src="/savebite-logo.png"
            alt="SaveBite Logo"
            className="lp-hero-logo"
          />

          <span className="lp-hero-tag">🌍 Reducing Food Waste, One Meal at a Time</span>

          <h1 className="lp-hero-title">
            Rescue Surplus Food.<br />
            <span className="lp-hero-accent">Save Money. Save Planet.</span>
          </h1>

          <p className="lp-hero-sub">
            SaveBite connects restaurants that have surplus meals with nearby
            customers — powered by AI delivery dispatch.
          </p>

          {/* ROLE CARDS */}
          <div className="lp-role-grid">
            <div className="lp-role-card">
              <span className="lp-role-icon">🛍️</span>
              <h3>Customer</h3>
              <p>Browse discounted surplus meals from restaurants near you.</p>
              <button
                className="lp-role-btn lp-role-btn--dark"
                onClick={() => navigate("/customer/login")}
              >
                Sign In as Customer
              </button>
            </div>

            <div className="lp-role-card lp-role-card--featured">
              <span className="lp-role-icon">🍽️</span>
              <h3>Restaurant Owner</h3>
              <p>List surplus dishes and turn unsold food into revenue.</p>
              <button
                className="lp-role-btn lp-role-btn--green"
                onClick={() => navigate("/restaurant/login")}
              >
                Sign In as Restaurant
              </button>
            </div>

            <div className="lp-role-card">
              <span className="lp-role-icon">🚴</span>
              <h3>Delivery Partner</h3>
              <p>Earn by delivering eco-friendly short-distance food orders.</p>
              <button
                className="lp-role-btn lp-role-btn--dark"
                onClick={() => navigate("/delivery/login")}
              >
                Sign In as Delivery
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="lp-footer">
        <p>© {new Date().getFullYear()} SaveBite — Rescue Surplus Food</p>
        <div className="lp-footer-links">
          <a onClick={() => navigate("/customer/login")}>Customer</a>
          <a onClick={() => navigate("/restaurant/login")}>Restaurant</a>
          <a onClick={() => navigate("/delivery/login")}>Delivery</a>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;