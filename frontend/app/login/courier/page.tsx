import { LoginForm } from "@/components/auth/LoginForm";

export default function CourierLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <LoginForm role="courier" />
        </div>
    );
}
