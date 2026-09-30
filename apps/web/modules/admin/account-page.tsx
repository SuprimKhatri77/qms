"use client";

import type { User } from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/modules/auth/change-password-form";
import { PageHeader } from "@/modules/dashboard/page-header";

// The admin's own account. Admins have no shop, so this is their
// counterpart to the Account card on the owner's Settings page.
export function AccountPage({ user }: { user: User }) {
  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader title="Account" description={`Signed in as ${user.email}.`} />

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change the password you log in with.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
