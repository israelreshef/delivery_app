import { LoginForm } from "@/components/auth/LoginForm";

export default function CustomerLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <LoginForm role="customer" />
        </div>
    );
}
