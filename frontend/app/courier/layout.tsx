import CourierLayout from "@/components/courier/CourierLayout";
import { SocketProvider } from "@/context/SocketContext";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SocketProvider>
            <CourierLayout>{children}</CourierLayout>
        </SocketProvider>
    );
}
