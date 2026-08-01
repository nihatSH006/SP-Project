"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from "@tabler/icons-react"
import { signInWithEmailAndPassword, signOut } from "firebase/auth"

import { useT } from "@/components/i18n-provider"
import { LanguageSwitcher } from "@/components/language-switcher"
import { SocarLogo } from "@/components/socar-logo"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { getFirebaseAuth } from "@/lib/firebase/client"

/**
 * Firebase's error codes leak whether an address is registered. We collapse the
 * credential failures into one message so the form cannot be used to enumerate
 * staff accounts.
 */
function messageFor(
  code: string,
  errors: ReturnType<typeof useT>["auth"]["errors"]
): string {
  switch (code) {
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return errors.badCredentials
    case "auth/user-disabled":
      return errors.disabled
    case "auth/too-many-requests":
      return errors.tooMany
    case "auth/network-request-failed":
      return errors.network
    default:
      return errors.generic
  }
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter()
  const t = useT()
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)

    const auth = getFirebaseAuth()

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      )
      const idToken = await credential.user.getIdToken()

      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      // The cookie is the real session; drop the client credential either way.
      await signOut(auth)

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        setError(body?.error ?? t.auth.errors.noSession)
        setPending(false)
        return
      }

      router.replace(redirectTo)
      router.refresh()
    } catch (cause) {
      const code =
        typeof cause === "object" && cause && "code" in cause
          ? String((cause as { code: unknown }).code)
          : ""
      setError(messageFor(code, t.auth.errors))
      setPending(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <SocarLogo className="h-9" />
            <span className="text-xs text-muted-foreground">
              {t.brand.tagline}
            </span>
          </div>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </div>
        <CardTitle>{t.auth.signIn}</CardTitle>
        <CardDescription>{t.auth.internalOnly}</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">{t.auth.workEmail}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <IconMail />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  autoFocus
                  disabled={pending}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@socar.az"
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">{t.auth.password}</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <IconLock />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={pending}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    aria-label={
                      showPassword ? t.auth.hidePassword : t.auth.showPassword
                    }
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>{t.auth.sessionNote}</FieldDescription>
            </Field>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/[0.07] px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
              >
                <IconAlertTriangle className="mt-0.5 size-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="btn-3d w-full"
              disabled={pending || !email || !password}
            >
              {pending ? <Spinner /> : null}
              {pending ? t.auth.signingIn : t.auth.signIn}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
