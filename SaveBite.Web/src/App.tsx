import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/restaurant/login"
          element={
            <div>
              Restaurant Owner Login
            </div>
          }
        />

        <Route
          path="/customer/login"
          element={
            <div>
              Customer Login
            </div>
          }
        />

        <Route
          path="/delivery/login"
          element={
            <div>
              Delivery Partner Login
            </div>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;