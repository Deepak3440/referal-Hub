import { useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DashboardCard } from "@/components/layout/page-header";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { deleteMyAccount } from "@/lib/profile-api";

type Props = {
  email: string;
};

export function DeleteAccountCard({ email }: Props) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);

  const emailMatches = confirmEmail.trim().toLowerCase() === email.trim().toLowerCase();

  const handleDelete = async () => {
    if (!emailMatches) {
      toast({
        title: "Email does not match",
        description: "Type your account email exactly to confirm.",
        variant: "destructive",
      });
      return;
    }

    setDeleting(true);
    try {
      await deleteMyAccount(confirmEmail.trim());
      signOut();
      setOpen(false);
      setLocation("/sign-in");
      toast({
        title: "Account deleted",
        description: "Your account and data have been removed.",
      });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : "Could not delete account",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardCard className="p-5 border-destructive/25 bg-destructive/[0.03]">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold text-foreground">Delete account</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Permanently remove your profile, posts, referrals, and mentorship data. This cannot
            be undone.
          </p>

          <AlertDialog open={open} onOpenChange={(next) => {
            setOpen(next);
            if (!next) setConfirmEmail("");
          }}>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" size="sm" className="mt-1 gap-1.5">
                <Trash2 className="h-4 w-4" />
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      All your data will be permanently deleted, including profile, feed posts,
                      job listings, referrals, and messages.
                    </p>
                    <div className="space-y-2 text-left">
                      <Label htmlFor="confirm-delete-email" className="text-foreground">
                        Type your email to confirm
                      </Label>
                      <Input
                        id="confirm-delete-email"
                        type="email"
                        autoComplete="off"
                        placeholder={email}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!emailMatches || deleting}
                  onClick={() => void handleDelete()}
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete permanently
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </DashboardCard>
  );
}
