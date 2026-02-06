"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, XCircle, FileText, AlertTriangle, Filter } from "lucide-react";
import { freelanceApi } from "@/lib/api/freelance";
import { CourierDocument, DocumentStatus } from "@/types/freelance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CompliancePage() {
    const [documents, setDocuments] = useState<CourierDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending"); // Default to pending actions

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const data = await freelanceApi.getDocuments({
                status: statusFilter === "all" ? undefined : statusFilter
            });
            setDocuments(data);
        } catch (error) {
            console.error(error);
            toast.error("שגיאה בטעינת הקבצים");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [statusFilter]);

    const handleVerify = async (docId: number, status: 'approved' | 'rejected') => {
        try {
            await freelanceApi.verifyDocument(docId, status);
            toast.success(status === 'approved' ? "המסמך אושר" : "המסמך נדחה");
            fetchDocuments();
        } catch (error) {
            toast.error("שגיאה בעדכון המסמך");
        }
    };

    const getStatusBadge = (status: DocumentStatus, isExpired: boolean) => {
        if (isExpired) return <Badge variant="destructive">פג תוקף</Badge>;

        switch (status) {
            case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">ממתין</Badge>;
            case 'approved': return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">מאושר</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">נדחה</Badge>;
            default: return null;
        }
    };

    const getDocLabel = (type: string) => {
        const labels: Record<string, string> = {
            'id_card': 'תעודת זהות',
            'driver_license': 'רישיון נהיגה',
            'vehicle_license': 'רישיון רכב',
            'insurance': 'ביטוח',
            'profile_pic': 'תמונת פרופיל'
        };
        return labels[type] || type;
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <CheckCircle2 className="h-8 w-8 text-primary" />
                        רגולציה ומסמכים
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        אימות מסמכי שליחים ומעקב אחר תוקף רישיונות וביטוחים
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>תור לאישור מסמכים</CardTitle>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <Filter className="w-4 h-4 ml-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">ממתינים לאישור</SelectItem>
                                <SelectItem value="approved">מאושרים</SelectItem>
                                <SelectItem value="rejected">נדחים</SelectItem>
                                <SelectItem value="all">הכל</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>שליח (ID)</TableHead>
                                <TableHead>סוג מסמך</TableHead>
                                <TableHead>תאריך העלאה</TableHead>
                                <TableHead>תוקף</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : documents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        אין מסמכים להצגה
                                    </TableCell>
                                </TableRow>
                            ) : (
                                documents.map((doc) => (
                                    <TableRow key={doc.id}>
                                        <TableCell className="font-medium">#{doc.courier_id}</TableCell>
                                        <TableCell>{getDocLabel(doc.document_type)}</TableCell>
                                        <TableCell>{doc.uploaded_at}</TableCell>
                                        <TableCell>
                                            {doc.expiry_date ? (
                                                <span className={cn(doc.is_expired ? "text-red-600 font-bold" : "")}>
                                                    {doc.expiry_date}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(doc.status, doc.is_expired)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(freelanceApi.getDocumentFile(doc.id), '_blank')}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Button>

                                                {doc.status === 'pending' && (
                                                    <>
                                                        <Button
                                                            variant="default"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                            onClick={() => handleVerify(doc.id, 'approved')}
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleVerify(doc.id, 'rejected')}
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
