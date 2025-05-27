import React, { useEffect, useState } from 'react'
import { cn } from '@/utils/tailwind'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import LangToggle from '@/components/LangToggle'
import { useForm } from 'react-hook-form'
import { loginSchema, LoginSchema } from './schema'
import { zodResolver } from '@hookform/resolvers/zod'
import useCreateClient from '@/supabase/client'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Link } from '@tanstack/react-router'
import { Spinner } from '@/components/spinner'
import { toast } from 'sonner'
import { Checkbox } from '@renderer/components/ui/checkbox'

export default function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation()
  const supabase = useCreateClient()
  const [rememberEmail, setRememberEmail] = useState(false)

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('rememberedEmail') || '',
      password: ''
    }
  })

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setRememberEmail(true)
    }
  }, [])

  const handleRememberEmailChange = (checked: boolean) => {
    setRememberEmail(checked)
    if (!checked) {
      localStorage.removeItem('rememberedEmail')
    }
  }

  async function onSubmit(values: LoginSchema) {
    if (rememberEmail) {
      localStorage.setItem('rememberedEmail', values.email)
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password
    })
    if (error) {
      console.error('loginForm onsubmit Error', error)
      toast.error(t('loginForm.error'), { description: (error as Error).message })
      throw error
    }
    toast.success(t('loginForm.success'))
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <LangToggle />
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('loginForm.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('loginForm.email.label')}</FormLabel>
                        <FormControl>
                          <Input placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-2">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('loginForm.password.label')}</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberEmail}
                    onCheckedChange={handleRememberEmailChange}
                  />
                  <Label htmlFor="remember">email 저장하기</Label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={form.formState.isSubmitSuccessful}
                >
                  {form.formState.isSubmitting ? <Spinner /> : t('loginForm.submit')}
                </Button>

              </div>
              <div className="mt-4 text-center text-sm">
                {t('loginForm.noAccount')}
                <a
                  href="https://www.agent-a.me/auth/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {t('loginForm.applyForAccount')}
                </a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
