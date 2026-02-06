import { LoginForm } from "@/components/auth/LoginForm";

export default function AdminLoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <LoginForm role="admin" />
        </div>
    );
}
