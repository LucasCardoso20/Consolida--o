import { zodResolver } from "@hookform/resolvers/zod";
import { HeartHandshake, LoaderCircle, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import {
  useForm,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import type { ReactNode } from "react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z
    .string()
    .min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

const registerSchema = loginSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(3, "Informe seu nome completo.")
    .max(120, "O nome pode ter no máximo 120 caracteres."),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export function LoginPage() {
  const { user, isLoading } = useAuth();
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [feedback, setFeedback] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  if (!isLoading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleLogin(data: LoginFormData) {
    setFeedback(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      setFeedback("Não foi possível entrar. Confira o e-mail e a senha.");
    }
  }

  async function handleRegister(data: RegisterFormData) {
    setFeedback(null);

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
        },
      },
    });

    if (error) {
      setFeedback(
        "Não foi possível criar a conta. Talvez esse e-mail já esteja cadastrado.",
      );
      return;
    }

    if (!signUpData.session) {
      setFeedback(
        "Conta criada. Confira seu e-mail para confirmar o acesso antes de entrar.",
      );
      return;
    }

    setFeedback("Conta criada com sucesso. Você já pode acessar o sistema.");
  }

  const isLoginMode = mode === "LOGIN";

  return (
    <main className="flex min-h-screen items-center justify-center bg-paz-background p-4"> {/* Ajustado bg */}
      <section className="w-full max-w-md rounded-xl border border-paz-border bg-white p-6 shadow-xl shadow-paz-primary/5 sm:p-8"> {/* Ajustado rounded, border, shadow */}
        <div className="flex size-12 items-center justify-center rounded-xl bg-paz-primary text-white shadow-sm"> {/* Ajustado rounded, bg */}
          <HeartHandshake size={26} />
        </div>

        <p className="mt-6 text-sm font-semibold text-paz-primary"> {/* Ajustado text */}
          Equipe de acolhimento
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-paz-text"> {/* Ajustado text */}
          {isLoginMode ? "Entre na Consolidação" : "Criar conta de líder"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-paz-muted"> {/* Ajustado text */}
          {isLoginMode
            ? "Acesse para registrar e acompanhar cada visitante."
            : "Crie seu acesso para colaborar com a equipe de consolidação."}
        </p>

        {isLoginMode ? (
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className="mt-7 space-y-5"
          >
            <InputField
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@igreja.com"
              error={loginForm.formState.errors.email?.message}
              registration={loginForm.register("email")}
            />

            <InputField
              label="Senha"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              error={loginForm.formState.errors.password?.message}
              registration={loginForm.register("password")}
            />

            <SubmitButton
              isLoading={loginForm.formState.isSubmitting}
              label="Entrar"
              icon={<LogIn size={18} />}
            />
          </form>
        ) : (
          <form
            onSubmit={registerForm.handleSubmit(handleRegister)}
            className="mt-7 space-y-5"
          >
            <InputField
              label="Nome completo"
              autoComplete="name"
              placeholder="Ex.: Maria Silva"
              error={registerForm.formState.errors.fullName?.message}
              registration={registerForm.register("fullName")}
            />

            <InputField
              label="E-mail"
              type="email"
              autoComplete="email"
              placeholder="voce@igreja.com"
              error={registerForm.formState.errors.email?.message}
              registration={registerForm.register("email")}
            />

            <InputField
              label="Senha"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 6 caracteres"
              error={registerForm.formState.errors.password?.message}
              registration={registerForm.register("password")}
            />

            <SubmitButton
              isLoading={registerForm.formState.isSubmitting}
              label="Criar conta"
              icon={<UserPlus size={18} />}
            />
          </form>
        )}

        {feedback && (
          <p className="mt-5 rounded-xl border border-paz-border bg-paz-soft p-3 text-sm leading-relaxed text-paz-text"> {/* Ajustado rounded, border, bg, text */}
            {feedback}
          </p>
        )}

        <div className="mt-7 border-t border-paz-border pt-6 text-center"> {/* Ajustado border */}
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode(isLoginMode ? "REGISTER" : "LOGIN");
            }}
            className="text-sm font-bold text-paz-primary transition hover:text-paz-hover"
          >
            {isLoginMode
              ? "Ainda não tenho uma conta"
              : "Já tenho uma conta, entrar"}
          </button>
        </div>
      </section>
    </main>
  );
}

type InputFieldProps = {
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder: string;
  error?: string;
  registration: UseFormRegisterReturn;
};
function InputField({
  label,
  type = "text",
  autoComplete,
  placeholder,
  error,
  registration,
}: InputFieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-paz-text"> {/* Ajustado text */}
        {label}
      </span>

      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...registration}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-paz-text outline-none transition placeholder:text-paz-muted focus:ring-4 ${ // Ajustado rounded, text, placeholder
          error
            ? "border-paz-error focus:border-paz-error focus:ring-paz-error/20" // Ajustado border, focus, ring
            : "border-paz-border focus:border-paz-primary focus:ring-paz-soft" // Ajustado border, focus, ring
        }`}
      />

      {error && (
        <span className="mt-1.5 block text-xs font-medium text-paz-error"> {/* Ajustado text */}
          {error}
        </span>
      )}
    </label>
  );
}

function SubmitButton({
  isLoading,
  label,
  icon,
}: {
  isLoading: boolean;
  label: string;
  icon: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-paz-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-paz-hover disabled:cursor-not-allowed disabled:opacity-60" // Ajustado rounded, bg, hover
    >
      {isLoading ? (
        <>
          <LoaderCircle className="animate-spin" size={18} />
          Aguarde...
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </button>
  );
}