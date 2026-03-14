import Card from "../../../components/ui/Card";
import LoginForm from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center pt-6">
        <div className="rounded-3xl bg-white px-6 py-4 shadow-lg">
          <img
            src="/logo.png"
            alt="Assuring Security Inc"
            className="h-20 w-auto object-contain"
          />
        </div>
      </div>

      <Card className="rounded-3xl text-center">
        <div className="text-2xl font-bold">Assuring Security Inc</div>

        <div className="text-sm text-brand-text/70">Login to continue</div>
      </Card>

      <Card className="rounded-3xl">
        <LoginForm />
      </Card>
    </div>
  );
}