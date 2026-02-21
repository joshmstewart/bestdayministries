import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Bike, Plus, Edit, DollarSign, Loader2, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { showErrorToastWithCopy } from "@/lib/errorToast";

interface BikeEvent {
  id: string;
  title: string;
  description: string | null;
  rider_name: string;
  ride_date: string;
  mile_goal: number;
  actual_miles: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
}

interface Pledge {
  id: string;
  pledger_name: string;
  pledger_email: string;
  pledge_type: string;
  cents_per_mile: number | null;
  flat_amount: number | null;
  calculated_total: number | null;
  charge_status: string;
  charge_error: string | null;
  message: string | null;
  created_at: string;
  stripe_mode: string;
}

export function BikeRideManager() {
  const [events, setEvents] = useState<BikeEvent[]>([]);
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<BikeEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  // Create/Edit form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BikeEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formRiderName, setFormRiderName] = useState("");
  const [formRideDate, setFormRideDate] = useState("");
  const [formMileGoal, setFormMileGoal] = useState("118");
  const [formSaving, setFormSaving] = useState(false);

  // Process charges state
  const [actualMiles, setActualMiles] = useState("");
  const [chargeResults, setChargeResults] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) fetchPledges(selectedEvent.id);
  }, [selectedEvent]);

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('bike_ride_events')
      .select('*')
      .order('created_at', { ascending: false });
    setEvents((data as any[]) || []);
    setLoading(false);
  };

  const fetchPledges = async (eventId: string) => {
    const { data, error } = await supabase
      .from('bike_ride_pledges')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching pledges:', error);
    }
    console.log('Fetched pledges for event', eventId, ':', data?.length, data);
    setPledges((data as any[]) || []);
  };

  const openCreateDialog = (event?: BikeEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormTitle(event.title);
      setFormDescription(event.description || "");
      setFormRiderName(event.rider_name);
      setFormRideDate(event.ride_date);
      setFormMileGoal(String(event.mile_goal));
    } else {
      setEditingEvent(null);
      setFormTitle("");
      setFormDescription("");
      setFormRiderName("");
      setFormRideDate("");
      setFormMileGoal("118");
    }
    setShowCreateDialog(true);
  };

  const saveEvent = async () => {
    if (!formTitle || !formRiderName || !formRideDate || !formMileGoal) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const payload = {
        title: formTitle,
        description: formDescription || null,
        rider_name: formRiderName,
        ride_date: formRideDate,
        mile_goal: Number(formMileGoal),
      };

      if (editingEvent) {
        await supabase.from('bike_ride_events').update(payload).eq('id', editingEvent.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('bike_ride_events').insert({ ...payload, created_by: user!.id });
      }

      setShowCreateDialog(false);
      fetchEvents();
      toast({ title: editingEvent ? "Event updated" : "Event created" });
    } catch (err) {
      toast({ title: "Error saving event", variant: "destructive" });
    } finally {
      setFormSaving(false);
    }
  };

  const toggleEventStatus = async (event: BikeEvent, newStatus: string) => {
    await supabase.from('bike_ride_events').update({ status: newStatus }).eq('id', event.id);
    fetchEvents();
  };

  const handleProcessCharges = async () => {
    if (!selectedEvent || !actualMiles) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-bike-ride-charges', {
        body: { event_id: selectedEvent.id, actual_miles: Number(actualMiles) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setChargeResults(data);
      fetchEvents();
      fetchPledges(selectedEvent.id);
      toast({ title: `Charges processed: ${data.summary.charged} successful, ${data.summary.failed} failed` });
    } catch (err) {
      toast({ title: "Error processing charges", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReconcilePledges = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-bike-pledges');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const s = data.summary;
      toast({ title: `Reconciled: ${s.confirmed} confirmed, ${s.failed} failed, ${s.auto_cancelled} cancelled, ${s.skipped} skipped` });
      if (selectedEvent) fetchPledges(selectedEvent.id);
    } catch (err) {
      showErrorToastWithCopy("Reconciling pledges", err);
    } finally {
      setReconciling(false);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'charges_processed': return 'default';
      default: return 'secondary';
    }
  };

  const chargeStatusColor = (status: string) => {
    switch (status) {
      case 'charged': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bike className="h-5 w-5 text-primary" />
            Bike Ride Pledges
          </h2>
          <p className="text-sm text-muted-foreground">Manage bike ride fundraiser events and pledges</p>
        </div>
        <Button onClick={() => openCreateDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          New Event
        </Button>
      </div>

      {/* Events List */}
      <div className="grid gap-3">
        {events.map(event => (
          <Card
            key={event.id}
            className={`cursor-pointer transition-colors ${selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedEvent(event)}
          >
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{event.title}</span>
                  <Badge variant={statusColor(event.status)}>{event.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.rider_name} · {event.mile_goal} miles · {new Date(event.ride_date + 'T00:00:00').toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={e => { e.stopPropagation(); openCreateDialog(event); }} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                {event.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); toggleEventStatus(event, 'active'); }}>
                    Activate
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No events yet. Create your first bike ride event!</p>
        )}
      </div>

      {/* Selected Event Details */}
      {selectedEvent && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                     <Users className="h-5 w-5" />
                     Pledges for "{selectedEvent.title}"
                   </CardTitle>
                   <CardDescription>
                     {pledges.length} total pledges
                     {(() => {
                       const confirmed = pledges.filter(p => p.charge_status === 'confirmed');
                       const pending = pledges.filter(p => p.charge_status === 'pending');
                       const testConfirmed = confirmed.filter(p => p.stripe_mode === 'test').length;
                       const liveConfirmed = confirmed.filter(p => p.stripe_mode === 'live').length;
                       return (
                         <span className="ml-2">
                           ({confirmed.length} confirmed
                           {testConfirmed > 0 && <span> · <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">🟡 {testConfirmed} TEST</Badge></span>}
                           {liveConfirmed > 0 && <span> · <Badge variant="default" className="text-[10px] px-1.5 py-0 ml-0.5">🟢 {liveConfirmed} LIVE</Badge></span>}
                           {pending.length > 0 && ` · ${pending.length} pending`})
                         </span>
                       );
                     })()}
                   </CardDescription>
                 </div>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={handleReconcilePledges}
                   disabled={reconciling}
                   title="Check Stripe for pending pledges and auto-confirm/cancel"
                 >
                   {reconciling ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                   Reconcile Pending
                 </Button>
               </div>
            </CardHeader>
            <CardContent>
              {pledges.length > 0 ? (
                <div className="space-y-2">
                    {pledges.map(pledge => (
                     <div key={pledge.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                       <div>
                         <div className="flex items-center gap-2">
                           <span className="font-medium">{pledge.pledger_name}</span>
                           <Badge variant={pledge.stripe_mode === 'live' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0">
                             {pledge.stripe_mode === 'live' ? '🟢 LIVE' : '🟡 TEST'}
                           </Badge>
                         </div>
                         <span className="text-muted-foreground text-sm">{pledge.pledger_email}</span>
                         {pledge.message && <p className="text-xs text-muted-foreground italic">"{pledge.message}"</p>}
                       </div>
                       <div className="text-right">
                         {pledge.pledge_type === 'per_mile' ? (
                           <div>
                             <span className="font-semibold">{pledge.cents_per_mile}¢/mile</span>
                             <span className="text-sm text-muted-foreground ml-1">
                               (up to ${((pledge.cents_per_mile || 0) / 100 * Number(selectedEvent.mile_goal)).toFixed(2)})
                             </span>
                           </div>
                         ) : (
                           <span className="font-semibold">${pledge.flat_amount?.toFixed(2)}</span>
                         )}
                         <span className={`text-xs block ${chargeStatusColor(pledge.charge_status)}`}>
                           {pledge.charge_status}
                           {pledge.calculated_total != null && ` · $${pledge.calculated_total.toFixed(2)}`}
                         </span>
                         {pledge.charge_error && (
                           <span className="text-xs text-destructive block">{pledge.charge_error}</span>
                         )}
                       </div>
                     </div>
                   ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No pledges yet</p>
              )}
            </CardContent>
          </Card>

          {/* Process Charges */}
          {(selectedEvent.status === 'active' || selectedEvent.status === 'completed') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Process Charges
                </CardTitle>
                <CardDescription>Enter actual miles ridden to calculate and charge all per-mile pledges</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label>Actual Miles Ridden (max {selectedEvent.mile_goal})</Label>
                    <Input
                      type="number"
                      value={actualMiles}
                      onChange={e => setActualMiles(e.target.value)}
                      max={selectedEvent.mile_goal}
                      min={0}
                      placeholder={`e.g., ${selectedEvent.mile_goal}`}
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button disabled={!actualMiles || processing}>
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                        Process Charges
                      </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                       <AlertDialogHeader>
                         <AlertDialogTitle className="flex items-center gap-2">
                           <AlertTriangle className="h-5 w-5 text-yellow-500" />
                           Confirm Charge Processing
                         </AlertDialogTitle>
                         <AlertDialogDescription asChild>
                           <div className="space-y-3">
                             <p>
                               This will charge all confirmed per-mile pledgers based on <strong>{actualMiles}</strong> actual miles.
                             </p>
                             {(() => {
                               const confirmed = pledges.filter(p => p.pledge_type === 'per_mile' && p.charge_status === 'confirmed');
                               const testPledges = confirmed.filter(p => p.stripe_mode === 'test');
                               const livePledges = confirmed.filter(p => p.stripe_mode === 'live');
                               const calcTotal = (list: Pledge[]) => list.reduce((s, p) => s + ((p.cents_per_mile || 0) / 100) * Number(actualMiles || 0), 0);
                               return (
                                 <div className="rounded-lg border p-3 space-y-2 text-sm">
                                   {testPledges.length > 0 && (
                                     <div className="flex justify-between items-center">
                                       <span className="flex items-center gap-1.5">
                                         <Badge variant="secondary" className="text-[10px] px-1.5 py-0">🟡 TEST</Badge>
                                         {testPledges.length} pledge{testPledges.length !== 1 ? 's' : ''}
                                       </span>
                                       <span className="font-semibold">${calcTotal(testPledges).toFixed(2)}</span>
                                     </div>
                                   )}
                                   {livePledges.length > 0 && (
                                     <div className="flex justify-between items-center">
                                       <span className="flex items-center gap-1.5">
                                         <Badge variant="default" className="text-[10px] px-1.5 py-0">🟢 LIVE</Badge>
                                         {livePledges.length} pledge{livePledges.length !== 1 ? 's' : ''}
                                       </span>
                                       <span className="font-semibold text-destructive">${calcTotal(livePledges).toFixed(2)} (REAL $)</span>
                                     </div>
                                   )}
                                   {livePledges.length === 0 && testPledges.length > 0 && (
                                     <p className="text-xs text-muted-foreground italic">✅ No real money will be charged — test mode only.</p>
                                   )}
                                   <div className="border-t pt-2 flex justify-between font-semibold">
                                     <span>Total</span>
                                     <span>${calcTotal(confirmed).toFixed(2)}</span>
                                   </div>
                                 </div>
                               );
                             })()}
                           </div>
                         </AlertDialogDescription>
                       </AlertDialogHeader>
                       <AlertDialogFooter>
                         <AlertDialogCancel>Cancel</AlertDialogCancel>
                         <AlertDialogAction onClick={handleProcessCharges}>
                           Yes, Process Charges
                         </AlertDialogAction>
                       </AlertDialogFooter>
                     </AlertDialogContent>
                  </AlertDialog>
                </div>

                {chargeResults && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2">
                    <h4 className="font-semibold">Results</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{chargeResults.summary.charged}</div>
                        <div className="text-muted-foreground">Charged</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{chargeResults.summary.failed}</div>
                        <div className="text-muted-foreground">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">${chargeResults.summary.total_collected.toFixed(2)}</div>
                        <div className="text-muted-foreground">Collected</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Bike Ride Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Bike Ride for Best Day" />
            </div>
            <div>
              <Label>Rider Name *</Label>
              <Input value={formRiderName} onChange={e => setFormRiderName(e.target.value)} placeholder="John Smith" />
            </div>
            <div>
              <Label>Ride Date *</Label>
              <Input type="date" value={formRideDate} onChange={e => setFormRideDate(e.target.value)} />
            </div>
            <div>
              <Label>Mile Goal *</Label>
              <Input type="number" value={formMileGoal} onChange={e => setFormMileGoal(e.target.value)} min={1} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Tell supporters about the ride..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={saveEvent} disabled={formSaving}>
              {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingEvent ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
