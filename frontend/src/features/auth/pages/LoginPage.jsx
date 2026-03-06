import Card from "../../../components/ui/Card";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <Card className="rounded-3xl text-center">
        <div className="text-2xl font-bold">Assuring Security</div>
        <div className="text-sm text-brand-text/70">Login to continue</div>
      </Card>

      <Card className="rounded-3xl">
        <LoginForm />
      </Card>
    </div>
  );
}