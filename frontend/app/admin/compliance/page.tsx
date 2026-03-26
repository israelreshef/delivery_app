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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, FileText, AlertTriangle, Filter, Scale } from "lucide-react";
import { freelanceApi } from "@/lib/api/freelance";
import { api } from "@/lib/api";
import { CourierDocument, DocumentStatus } from "@/types/freelance";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CompliancePage() {
    const [documents, setDocuments] = useState<CourierDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending"); // Default to pending actions

    const [trafficRecords, setTrafficRecords] = useState<any[]>([]);
    const [legalCases, setLegalCases] = useState<any[]>([]);

    const [addTrafficOpen, setAddTrafficOpen] = useState(false);
    const [newTraffic, setNewTraffic] = useState({
        courier_id: '',
        violation_type: '',
        points: 0,
        violation_date: new Date().toISOString().split('T')[0],
        notes: ''
    });

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

    const fetchTrafficAndLegal = async () => {
        try {
            const trRes = await api.get('/legal/traffic');
            setTrafficRecords(trRes.data || []);
            const lcRes = await api.get('/legal/cases');
            setLegalCases(lcRes.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchTrafficAndLegal();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleAddTraffic = async () => {
        try {
            await api.post('/legal/traffic', {
                ...newTraffic,
                points: Number(newTraffic.points)
            });
            toast.success("רשומת תעבורה נוספה בהצלחה!");
            setAddTrafficOpen(false);
            fetchTrafficAndLegal();
        } catch (error) {
            toast.error("שגיאה בהוספת רשומה");
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
                        <CheckCircle2 className="h-8 w-8 text-brand" />
                        רגולציה ומסמכים
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        אימות מסמכי שליחים ומעקב אחר תוקף רישיונות וביטוחים
                    </p>
                </div>
            </div>

            <Tabs defaultValue="documents" className="w-full" dir="rtl">
                <TabsList className="mb-6 bg-slate-200/50 p-1 w-full justify-start overflow-x-auto">
                    <TabsTrigger value="documents" className="data-[state=active]:bg-white px-8">
                        <FileText className="w-4 h-4 ml-2" />
                        מסמכים ואימותים
                    </TabsTrigger>
                    <TabsTrigger value="traffic" className="data-[state=active]:bg-white px-8">
                        <Scale className="w-4 h-4 ml-2" />
                        משמעת, ניקוד תעבורתי ותיקים
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="mt-0">
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
                </TabsContent>

                <TabsContent value="traffic" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Traffic Scores */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-brand" />
                                        ניקוד תעבורתי לשליחים
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setAddTrafficOpen(true)}>
                                        הוסף דיווח
                                    </Button>
                                </CardTitle>
                                <CardDescription>תיעוד עבירות משמעת, חריגות מהירות ונקודות חובה</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>שליח</TableHead>
                                            <TableHead>עבירה</TableHead>
                                            <TableHead>נקודות</TableHead>
                                            <TableHead>תאריך</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {trafficRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    אין רשומות תעבורה להצגה
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            trafficRecords.map((tr) => (
                                                <TableRow key={tr.id}>
                                                    <TableCell className="font-medium">#{tr.courier_id}</TableCell>
                                                    <TableCell>{tr.violation_type}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="destructive">{tr.points} נק'</Badge>
                                                    </TableCell>
                                                    <TableCell>{new Date(tr.violation_date).toLocaleDateString('he-IL')}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Legal Cases */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Scale className="w-5 h-5 text-indigo-500" />
                                    תיקים משפטיים ובירורים
                                </CardTitle>
                                <CardDescription>מעקב אחר תביעות, בירורים משפטיים ותאונות עבודה</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>מס' תיק</TableHead>
                                            <TableHead>שליח</TableHead>
                                            <TableHead>סטטוס</TableHead>
                                            <TableHead>עו"ד מטפל</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {legalCases.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                    אין תיקים משפטיים פעילים
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            legalCases.map((lc) => (
                                                <TableRow key={lc.id}>
                                                    <TableCell className="font-medium">{lc.case_number}</TableCell>
                                                    <TableCell>#{lc.courier_id}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={lc.status === 'open' ? 'destructive' : 'secondary'}>
                                                            {lc.status === 'open' ? 'פתוח' : lc.status === 'closed' ? 'סגור' : 'בטיפול'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{lc.lawyer_assigned || '-'}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={addTrafficOpen} onOpenChange={setAddTrafficOpen}>
                <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl rounded-xl" dir="rtl">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="text-xl font-bold text-slate-800">הוספת דיווח תעבורתי</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="courier_id">מזהה שליח</Label>
                            <Input
                                id="courier_id"
                                value={newTraffic.courier_id}
                                onChange={(e) => setNewTraffic({...newTraffic, courier_id: e.target.value})}
                                placeholder="לדוגמה: 12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="violation_type">סוג עבירה</Label>
                            <Input
                                id="violation_type"
                                value={newTraffic.violation_type}
                                onChange={(e) => setNewTraffic({...newTraffic, violation_type: e.target.value})}
                                placeholder="לדוגמה: מהירות, רמזור אדום"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="points">נקודות</Label>
                                <Input
                                    id="points"
                                    type="number"
                                    min="0"
                                    value={newTraffic.points}
                                    onChange={(e) => setNewTraffic({...newTraffic, points: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="date">תאריך</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={newTraffic.violation_date}
                                    onChange={(e) => setNewTraffic({...newTraffic, violation_date: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">הערות</Label>
                            <Input
                                id="notes"
                                value={newTraffic.notes}
                                onChange={(e) => setNewTraffic({...newTraffic, notes: e.target.value})}
                                placeholder="פרטים נוספים..."
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6 gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setAddTrafficOpen(false)} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                            ביטול
                        </Button>
                        <Button onClick={handleAddTraffic} className="bg-brand hover:bg-brand-dark text-black font-medium">
                            שמור דיווח
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
