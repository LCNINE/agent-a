import React from "react";
import BaseLayout from "@/layouts/BaseLayout";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import LoginForm from "@/pages/LoginPage/LoginForm";

export const RootRoute = createRootRoute({
  component: Root,
});

function Root() {
  return (
    <AuthProvider
      unauthenticatedFallback={
        <div className="flex h-full w-full items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <LoginForm/>
          </div>
        </div>
      }
    >
      <BaseLayout>
        <Outlet />
      </BaseLayout>
    </AuthProvider>
  );
}
