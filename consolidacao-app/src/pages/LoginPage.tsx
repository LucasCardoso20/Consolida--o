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
    <main className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
      <section className="w-full max-w-md rounded-2xl border border-brand-100 bg-white p-6 shadow-xl shadow-brand-900/5 sm:p-8">
        <div className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <HeartHandshake size={26} />
        </div>

        <p className="mt-6 text-sm font-semibold text-brand-700">
          Equipe de acolhimento
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          {isLoginMode ? "Entre na Consolidação" : "Criar conta de líder"}
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-slate-500">
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
          <p className="mt-5 rounded-xl border border-brand-100 bg-brand-50 p-3 text-sm leading-relaxed text-brand-800">
            {feedback}
          </p>
        )}

        <div className="mt-7 border-t border-slate-100 pt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setMode(isLoginMode ? "REGISTER" : "LOGIN");
            }}
            className="text-sm font-bold text-brand-700 transition hover:text-brand-900"
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
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>

      <input
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        {...registration}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
            : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
        }`}
      />

      {error && (
        <span className="mt-1.5 block text-xs font-medium text-red-600">
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
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