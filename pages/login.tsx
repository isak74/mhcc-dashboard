import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (response.ok) {
      window.location.href = "/";
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data?.message ?? "Login failed.");
  };

  return (
    <div className="login">
      <div className="card">
        <h1>Dashboard Login</h1>
        <p className="notice">Enter the shared password to continue.</p>
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
        {error ? <p className="notice">{error}</p> : null}
      </div>
    </div>
  );
}
