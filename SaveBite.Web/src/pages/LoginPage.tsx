import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";

interface LoginPageProps {
  role: UserRole;
  title: string;
  subtitle: string;
  registerPath: string;
}

function LoginPage({
  role,
  title,
  subtitle,
  registerPath,
}: LoginPageProps) {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login({
        email: email.trim(),
        password,
      });

      /*
       * Make sure the logged-in account matches
       * the role-specific page selected by the user.
       */
      if (loggedInUser.role !== role) {
        logout();
        setError(
          `This account is registered as ${loggedInUser.role}. Please sign in through the ${loggedInUser.role} portal.`,
        );
        return;
      }

      /*
       * Redirect according to backend role.
       */
      switch (loggedInUser.role) {
        case "RestaurantOwner":
          navigate("/restaurant/dashboard", {
            replace: true,
          });
          break;

        case "Customer":
          navigate("/customer/dashboard", {
            replace: true,
          });
          break;

        case "DeliveryPerson":
          navigate("/delivery/dashboard", {
            replace: true,
          });
          break;

        case "Admin":
          navigate("/admin/dashboard", {
            replace: true,
          });
          break;

        default:
          setError("Unknown user role.");
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        (err?.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(" ")
          : null) ||
        (err?.message === "Network Error"
          ? "Cannot connect to server. Please verify the backend API is running."
          : null) ||
        "Login failed. Please check your credentials.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }


  return (
    <main className="auth-page">
      <section className="auth-card">

        <Link
          to="/"
          className="auth-back-link"
        >
          ← Back to SaveBite
        </Link>

        <div className="auth-header">
          <p className="auth-brand">
            SAVEBITE
          </p>

          <h1>{title}</h1>

          <p>{subtitle}</p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label htmlFor="email">
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <div className="auth-footer">
          <span>
            Don't have an account?
          </span>

          <Link to={registerPath}>
            Create account
          </Link>
        </div>

        <div className="auth-role">
          Signing in as{" "}
          <strong>{role}</strong>
        </div>

      </section>
    </main>
  );
}

export default LoginPage;