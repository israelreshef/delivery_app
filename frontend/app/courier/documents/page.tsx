"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { freelanceApi } from "@/lib/api/freelance";
import { CourierDocument, DocumentStatus } from "@/types/freelance";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const REQUIRED_DOCUMENTS = [
    { id: 'id_card', label: 'תעודת זהות', required: true },
    { id: 'driver_license', label: 'רישיון נהיגה', required: true, hasExpiry: true },
    { id: 'vehicle_license', label: 'רישיון רכב', required: true, hasExpiry: true },
    { id: 'insurance', label: 'ביטוח חובה+ג\'', required: true, hasExpiry: true },
    { id: 'profile_pic', label: 'תמונת פרופיל', required: true },
];

export default function CourierDocumentsPage() {
    const [documents, setDocuments] = useState<CourierDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState<string>("");

    // Form state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expiryDate, setExpiryDate] = useState("");

    const fetchDocuments = async () => {
        try {
            const data = await freelanceApi.getDocuments();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fileInputRef.current?.files?.[0]) {
            toast.error("אנא בחר קובץ");
            return;
        }

        const docTypeConfig = REQUIRED_DOCUMENTS.find(d => d.id === selectedDocType);
        if (docTypeConfig?.hasExpiry && !expiryDate) {
            toast.error("אנא הזן תאריך תוקף למסמך זה");
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', fileInputRef.current.files[0]);
        formData.append('document_type', selectedDocType);
        if (expiryDate) {
            formData.append('expiry_date', expiryDate);
        }

        try {
            await freelanceApi.uploadDocument(formData);
            toast.success("המסמך הועלה בהצלחה וממתין לאישור");
            setOpenUploadDialog(false);
            fetchDocuments();
            // Reset form
            if (fileInputRef.current) fileInputRef.current.value = "";
            setExpiryDate("");
        } catch (error) {
            toast.error("שגיאה בהעלאת המסמך");
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (status: DocumentStatus, isExpired: boolean) => {
        if (isExpired) {
            return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> פג תוקף</Badge>;
        }

        const styles = {
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            approved: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200",
            expired: "bg-gray-100 text-gray-800 border-gray-200"
        };

        const labels = {
            pending: "ממתין לאישור",
            approved: "מאושר",
            rejected: "נדחה",
            expired: "פג תוקף"
        };

        const icons = {
            pending: <Loader2 className="w-3 h-3 animate-spin" />,
            approved: <CheckCircle2 className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />,
            expired: <AlertCircle className="w-3 h-3" />
        };

        return (
            <Badge variant="outline" className={cn("gap-1", styles[status])}>
                {icons[status]} {labels[status]}
            </Badge>
        );
    };

    const getDocStatus = (typeId: string) => {
        return documents.find(d => d.document_type === typeId);
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl" dir="rtl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">המסמכים שלי</h1>
                    <p className="text-muted-foreground mt-1">
                        ניהול מסמכים ורגולציה - נא לוודא שכל המסמכים בתוקף
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {REQUIRED_DOCUMENTS.map((docType) => {
                    const doc = getDocStatus(docType.id);
                    const isMissing = !doc;
                    const isExpired = doc?.is_expired;

                    return (
                        <Card key={docType.id} className={cn(
                            "relative overflow-hidden transition-all",
                            isMissing ? "border-dashed border-2" : "",
                            isExpired ? "border-red-200 bg-red-50/50" : ""
                        )}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-medium">
                                    {docType.label}
                                </CardTitle>
                                {docType.required && <Badge variant="secondary">חובה</Badge>}
                            </CardHeader>
                            <CardContent>
                                <div className="mt-4 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm">
                                            {doc ? (
                                                <div className="space-y-1">
                                                    <div>{getStatusBadge(doc.status, !!doc.is_expired)}</div>
                                                    {doc.expiry_date && (
                                                        <div className={cn("text-xs flex items-center gap-1", doc.is_expired ? "text-red-600 font-bold" : "text-muted-foreground")}>
                                                            <Calendar className="w-3 h-3" />
                                                            בתוקף עד: {doc.expiry_date}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-muted-foreground">
                                                        הועלה ב: {doc.uploaded_at}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4" />
                                                    טרם הועלה מסמך
                                                </span>
                                            )}
                                        </div>

                                        <Dialog open={openUploadDialog && selectedDocType === docType.id} onOpenChange={(open) => {
                                            setOpenUploadDialog(open);
                                            if (!open) setSelectedDocType("");
                                        }}>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant={doc ? "outline" : "default"}
                                                    size="sm"
                                                    onClick={() => setSelectedDocType(docType.id)}
                                                >
                                                    <Upload className="w-4 h-4 ml-2" />
                                                    {doc ? "עדכן קובץ" : "העלה מסמך"}
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>העלאת {docType.label}</DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={handleUpload} className="space-y-4 pt-4">
                                                    <div className="space-y-2">
                                                        <Label>קובץ (תמונה או PDF)</Label>
                                                        <Input
                                                            ref={fileInputRef}
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            required
                                                        />
                                                    </div>

                                                    {docType.hasExpiry && (
                                                        <div className="space-y-2">
                                                            <Label>תאריך תוקף</Label>
                                                            <Input
                                                                type="date"
                                                                value={expiryDate}
                                                                onChange={(e) => setExpiryDate(e.target.value)}
                                                                required
                                                            />
                                                        </div>
                                                    )}

                                                    <Button type="submit" className="w-full" disabled={uploading}>
                                                        {uploading ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                מעלה...
                                                            </>
                                                        ) : (
                                                            "שמור מסמך"
                                                        )}
                                                    </Button>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>

                                    {doc && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-muted-foreground h-8 text-xs"
                                            onClick={() => window.open(freelanceApi.getDocumentFile(doc.id), '_blank')}
                                        >
                                            <FileText className="w-3 h-3 ml-2" />
                                            צפה בקובץ
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
