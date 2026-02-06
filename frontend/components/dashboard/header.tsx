import { Bell, Search } from "lucide-react";

export function Header() {
    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">Dashboard</h2>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>

                <button className="relative rounded-full p-2 hover:bg-accent">
                    <Bell className="h-5 w-5 text-muted-foreground" />
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
                </button>

                <div className="h-8 w-8 rounded-full bg-primary/10" />
            </div>
        </header>
    );
}
