import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, DollarSign, Package, AlertTriangle, ArrowUpDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Order {
    id: number;
    order_number: string;
    pickup_address: string;
    delivery_address: string;
    estimated_price: number;
    distance_km?: number;
    urgency?: 'standard' | 'express' | 'urgent';
    package_description?: string;
}

interface CourierTaskListProps {
    orders: Order[];
    onAccept: (id: number) => void;
    onReject: (id: number) => void;
}

export default function CourierTaskList({ orders, onAccept, onReject }: CourierTaskListProps) {

    // In a real app, sorting logic would go here or be passed down
    // For now, simple presentational component

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Filter / Sort Bar */}
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-slate-500 font-medium">
                    {orders.length} הצעות זמינות
                </span>
                <div className="flex gap-2">
                    <Select defaultValue="distance">
                        <SelectTrigger className="w-[140px] h-9 text-xs">
                            <ArrowUpDown className="w-3 h-3 mr-2" />
                            <SelectValue placeholder="מיון לפי" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="distance">מרחק (הקרוב ביותר)</SelectItem>
                            <SelectItem value="price">מחיר (הגבוה ביותר)</SelectItem>
                            <SelectItem value="urgency">דחיפות</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 h-[calc(100vh-250px)] pr-4 -mr-4">
                <div className="space-y-3 pb-20">
                    {orders.length === 0 ? (
                        <div className="text-center py-10 opacity-60">
                            <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                            <p>אין משלוחים זמינים כרגע</p>
                        </div>
                    ) : (
                        orders.map((order) => (
                            <Card key={order.id} className="border-slate-100 hover:shadow-md transition-shadow duration-200">
                                <CardContent className="p-4">
                                    {/* Header: Price & Urgency */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-0 px-2 py-1 text-sm font-bold flex items-center gap-1">
                                                <DollarSign className="w-3 h-3" />
                                                ₪{order.estimated_price || 35}
                                            </Badge>
                                            {order.urgency === 'express' && (
                                                <Badge variant="destructive" className="animate-pulse">
                                                    דחוף
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono text-slate-400">#{order.order_number}</span>
                                    </div>

                                    {/* Route visual */}
                                    <div className="relative pl-4 border-l-2 border-slate-100 ml-1 space-y-4 mb-4">
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-blue-500 bg-white" />
                                            <p className="text-sm font-medium text-slate-900 line-clamp-1">{order.pickup_address}</p>
                                            <p className="text-xs text-slate-500">איסוף</p>
                                        </div>
                                        <div className="relative">
                                            <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-green-500 bg-white" />
                                            <p className="text-sm font-medium text-slate-900 line-clamp-1">{order.delivery_address}</p>
                                            <p className="text-xs text-slate-500">מסירה</p>
                                        </div>
                                    </div>

                                    {/* Footer Info */}
                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {order.distance_km ? `${order.distance_km} ק"מ` : '2.5 ק"מ'}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Package className="w-3 h-3" />
                                            {order.package_description || 'חבילה סטנדרטית'}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button
                                            onClick={() => onReject(order.id)}
                                            variant="outline"
                                            className="w-full text-slate-600 hover:text-red-600 hover:bg-red-50 border-slate-200"
                                        >
                                            דחה הצעה
                                        </Button>
                                        <Button
                                            onClick={() => onAccept(order.id)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                        >
                                            קבל משלוח
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
