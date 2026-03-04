import dynamic from 'next/dynamic';
import { Loader2 } from "lucide-react";
import styles from './map.module.css';

// React-Leaflet must be dynamically imported with SSR disabled
const RouteBuilderMap = dynamic(
    () => import('./RouteBuilder'),
    {
        ssr: false,
        loading: () => (
            <div className="flex flex-col items-center justify-center h-full w-full bg-[#0B0E14]">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">טוען מנוע אופטימיזציית מסלולים...</p>
            </div>
        )
    }
);

export default function RouteOptimizationPage() {
    return (
        <div className={styles.mapContainer}>
            <RouteBuilderMap />
        </div>
    );
}
