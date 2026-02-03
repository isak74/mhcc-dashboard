import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Login = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      navigate("/");
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data?.message ?? "Login failed.");
  };

  return (
    <div className="login">
      <div className="card">
        <h1>Dashboard Login</h1>
        <p className="status">Enter the shared password to continue.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button type="submit">Sign in</button>
        </form>
        {error ? <p className="status">{error}</p> : null}
      </div>
    </div>
  );
};
