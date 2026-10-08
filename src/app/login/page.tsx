"use client";

import Brand from "@/components/ui/Brand";
import ShellIcon from "@/components/ui/ShellIcon";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { setLoggedInUser, setVisitorSession } from "@/lib/client-auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedName = username.trim();
    if (normalizedName.toLowerCase() === "talita" && password === "1234") {
      setLoggedInUser("Talita", "admin");
      router.push("/dashboard");
      return;
    }

    setError("Credenciais inválidas. Use Talita / 1234 ou entre como visitante.");
  }

  function handleVisitorAccess() {
    setVisitorSession();
    router.push("/dashboard");
  }

  return (
    <main className="front-login">
      <div className="front-login-decoration" aria-hidden="true" />
      <section className="front-login-card" aria-labelledby="login-title">
        <div className="front-login-brand">
          <Brand large />
          <strong>FEMSA</strong>
          <p>Manutenção Industrial · Unidade Marília</p>
        </div>
        <div className="front-login-heading">
          <p className="front-login-eyebrow">GESTÃO DE MANUTENÇÃO INDUSTRIAL</p>
          <h1 id="login-title">Acesso ao sistema</h1>
          <p>Entre para acompanhar a operação e gerenciar a manutenção.</p>
        </div>
        <form className="front-login-form" onSubmit={handleSubmit}>
          <label htmlFor="versary-username">
            <span>Usuário</span>
            <input
              id="versary-username"
              autoComplete="username"
              name="username"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Seu nome de usuário"
              required
              value={username}
            />
          </label>
          <label htmlFor="versary-password">
            <span>Senha</span>
            <input
              id="versary-password"
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              required
              type="password"
              value={password}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "versary-login-error" : undefined}
            />
          </label>
          {error && <p id="versary-login-error" className="front-login-error" role="alert">{error}</p>}
          <button className="front-button front-button-primary" type="submit">
            Entrar com cadastro <span aria-hidden="true">→</span>
          </button>
        </form>
        <div className="front-login-visitor">
          <ShellIcon name="help" />
          <p>Quer consultar os indicadores? Entre como visitante para acessar a visualização dos dados.</p>
        </div>
        <button type="button" className="front-button front-button-secondary front-visitor-button" onClick={handleVisitorAccess}>
          Entrar como visitante <span aria-hidden="true">→</span>
        </button>
      </section>
      <p className="front-login-tagline"><ShellIcon name="shield" /> Tradição que movimenta. Dados que dão confiança.</p>
      <footer className="front-login-footer">Coca-Cola FEMSA · Unidade Marília · Versary</footer>
    </main>
  );
}
