"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Calendar, Download, FileSearch, History, Trash2, RefreshCw } from "lucide-react";
import { freelanceApi } from "@/lib/api/freelance";
import { CourierDocument, DocumentStatus, TaxForm, CourierReportHistory } from "@/types/freelance";
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
    const [taxForms, setTaxForms] = useState<TaxForm[]>([]);
    const [reportHistory, setReportHistory] = useState<CourierReportHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [generatingForm, setGeneratingForm] = useState<string | null>(null);
    const [actionReportId, setActionReportId] = useState<number | null>(null);
    const [openUploadDialog, setOpenUploadDialog] = useState(false);
    const [selectedDocType, setSelectedDocType] = useState<string>("");
    const [periodForm, setPeriodForm] = useState<TaxForm | null>(null);
    const [periodMonth, setPeriodMonth] = useState(new Date().getMonth() + 1);
    const [periodYear, setPeriodYear] = useState(new Date().getFullYear());

    // Form state
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [expiryDate, setExpiryDate] = useState("");

    const fetchDocuments = async () => {
        try {
            const [docsData, formsData, historyData] = await Promise.all([
                freelanceApi.getDocuments(),
                freelanceApi.getTaxForms(),
                freelanceApi.getReportHistory().catch(() => [] as CourierReportHistory[])
            ]);
            setDocuments(docsData);
            setTaxForms(formsData);
            setReportHistory(historyData);
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleGenerateTaxForm = async (form: TaxForm) => {
        if (!form) return;
        
        setGeneratingForm(form.id);
        try {
            const blob = await freelanceApi.generateTaxForm(form.id, {
                month: form.period === 'month' ? periodMonth : undefined,
                year: periodYear
            });
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${form.title}_${periodYear}${form.period === 'month' ? `_${periodMonth}` : ''}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("הדוח נוצר בהצלחה");
            setPeriodForm(null);
            fetchDocuments();
        } catch (error) {
            console.error("Failed to generate tax form", error);
            toast.error("שגיאה ביצירת הדוח");
        } finally {
            setGeneratingForm(null);
        }
    };

    const identifyFormPeriod = (report: CourierReportHistory) => ({
        month: report.period_month ?? undefined,
        year: report.period_year,
    });

    const handleRefreshReport = async (report: CourierReportHistory) => {
        setActionReportId(report.id);
        try {
            await freelanceApi.generateTaxForm(report.form_id, identifyFormPeriod(report));
            toast.success("הדוח עודכן");
            fetchDocuments();
        } catch (error) {
            toast.error("שגיאה ברענון הדוח");
        } finally {
            setActionReportId(null);
        }
    };

    const handleDownloadReport = async (report: CourierReportHistory) => {
        setActionReportId(report.id);
        try {
            const blob = await freelanceApi.downloadReport(report.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', report.filename || `${report.title}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("שגיאה בהורדת הדוח");
        } finally {
            setActionReportId(null);
        }
    };

    const handleDeleteReport = async (report: CourierReportHistory) => {
        setActionReportId(report.id);
        try {
            await freelanceApi.deleteReport(report.id);
            toast.success("הדוח נמחק");
            fetchDocuments();
        } catch (error) {
            toast.error("שגיאה במחיקת הדוח");
        } finally {
            setActionReportId(null);
        }
    };

    const handleDownloadBlank = async (form: TaxForm) => {
        setGeneratingForm(form.id);
        try {
            const blob = await freelanceApi.downloadBlankForm(form.id);
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${form.title}_ריק.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("הטופס הריק הורד בהצלחה");
        } catch (error) {
            console.error("Failed to download blank form", error);
            toast.error("שגיאה בהורדת הטופס הריק");
        } finally {
            setGeneratingForm(null);
        }
    };

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
                        ניהול מסמכים, דוחות מס ורגולציה - נא לוודא שכל המסמכים בתוקף
                    </p>
                </div>
            </div>

            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <FileSearch className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">דוחות מס</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    הדוחות מופקים אוטומטית מהפעילות העסקית שלך. הורד והגש לרשויות.
                </p>

                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                ) : taxForms.length === 0 ? (
                    <p className="text-muted-foreground">אין טפסי מס זמינים כעת.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {taxForms.map((form) => (
                            <Card key={form.id}>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-medium">
                                        {form.title}
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {form.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!form.available ? (
                                        <span className="text-xs text-destructive">
                                            לא זמין בעונת הדיווח הנוכחית
                                        </span>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {form.kind === "auto" && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    disabled={generatingForm === form.id}
                                                    onClick={() => setPeriodForm(form)}
                                                >
                                                    {generatingForm === form.id ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                            מייצר...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileText className="w-3 h-3 mr-2" />
                                                            צור דוח
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            {form.period === "year" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={generatingForm === form.id}
                                                    onClick={() => handleDownloadBlank(form)}
                                                >
                                                    <Download className="w-3 h-3 mr-2" />
                                                    הורד טופס ריק
                                                </Button>
                                            )}
                                            {form.kind === "blank" && (
                                                <span className="text-xs text-muted-foreground">
                                                    הטופס ממולא בפרטים שלך
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold">דוחות שנוצרו</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                    דוחות שהופקו נשמרים כאן. דוח שצריך רענון מצוין — הנתונים השתנו מאז היצירה.
                </p>

                {reportHistory.length === 0 ? (
                    <p className="text-muted-foreground">
                        עוד לא נוצר אף דוח. צור דוח מהרשימה למעלה.
                    </p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {reportHistory.map((report) => (
                            <Card key={report.id}>
                                <CardContent className="py-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                            <div className="min-w-0">
                                                <div className="font-medium truncate">{report.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    תקופה: {report.period_label} · נוצר ב: {report.created_at ? new Date(report.created_at).toLocaleString('he-IL') : '—'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {report.status === "needs_refresh" ? (
                                                <Badge variant="outline" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-200">
                                                    <AlertCircle className="w-3 h-3" /> דורש רענון
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="gap-1 bg-green-100 text-green-800 border-green-200">
                                                    <CheckCircle2 className="w-3 h-3" /> עדכני
                                                </Badge>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={actionReportId === report.id}
                                                onClick={() => handleDownloadReport(report)}
                                            >
                                                <Download className="w-3 h-3 mr-1" /> הורד
                                            </Button>
                                            {report.status === "needs_refresh" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    disabled={actionReportId === report.id}
                                                    onClick={() => handleRefreshReport(report)}
                                                >
                                                    <RefreshCw className="w-3 h-3 mr-1" /> רענן
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive"
                                                disabled={actionReportId === report.id}
                                                onClick={() => handleDeleteReport(report)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
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

            {/* Period picker for generating auto tax forms */}
            <Dialog open={periodForm !== null} onOpenChange={(open) => { if (!open) setPeriodForm(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>יצירת דוח - {periodForm?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {periodForm?.period === "month" && (
                            <div className="space-y-2">
                                <Label>חודש</Label>
                                <div className="flex gap-3">
                                    <select
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={periodMonth}
                                        onChange={(e) => setPeriodMonth(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <option key={m} value={m}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                    <select
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={periodYear}
                                        onChange={(e) => setPeriodYear(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                            <option key={y} value={y}>
                                                {y}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                        {periodForm?.period === "year" && (
                            <div className="space-y-2">
                                <Label>שנה</Label>
                                <select
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={periodYear}
                                    onChange={(e) => setPeriodYear(Number(e.target.value))}
                                >
                                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                                        <option key={y} value={y}>
                                            {y}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            הדוח יופק מהפעילות העסקית שלך בתקופה הנבחרת.
                        </p>
                        <Button
                            className="w-full"
                            onClick={() => periodForm && handleGenerateTaxForm(periodForm)}
                            disabled={generatingForm !== null}
                        >
                            {generatingForm ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    מייצר...
                                </>
                            ) : (
                                "צור דוח"
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
