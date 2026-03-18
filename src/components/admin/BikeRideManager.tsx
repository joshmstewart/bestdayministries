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
import { Bike, Plus, Edit, DollarSign, Loader2, Users, AlertTriangle, RefreshCw, ExternalLink, MapPin, Upload, X, Link2, Sparkles, Image as ImageIcon, Trash2, Star, Globe, Wand2, Mountain, Clock, Flag, Archive, ArchiveRestore } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Link } from "react-router-dom";
import { showErrorToastWithCopy } from "@/lib/errorToast";
import { ImageUploadWithCrop } from "@/components/common/ImageUploadWithCrop";

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
  start_location: string | null;
  end_location: string | null;
  route_map_image_url: string | null;
  race_url: string | null;
  route_waypoints: any[] | null;
  elevation_gain_ft: number | null;
  difficulty_rating: string | null;
  ridewithgps_url: string | null;
  ridewithgps_embed_mode: string;
  aid_stations: any[] | null;
  key_climbs: string[] | null;
  start_time: string | null;
  registration_url: string | null;
  finish_description: string | null;
  route_description: string | null;
  rider_bio: string | null;
  rider_image_url: string | null;
  race_logo_url: string | null;
  slug: string | null;
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
  const [formStartLocation, setFormStartLocation] = useState("");
  const [formEndLocation, setFormEndLocation] = useState("");
  const [formRouteMapUrl, setFormRouteMapUrl] = useState("");
  const [formRaceUrl, setFormRaceUrl] = useState("");
  const [formRouteWaypoints, setFormRouteWaypoints] = useState<any[] | null>(null);
  const [uploadingRouteMap, setUploadingRouteMap] = useState(false);
  const [analyzingRoute, setAnalyzingRoute] = useState(false);
  const [scenicPhotos, setScenicPhotos] = useState<{id: string; image_url: string; caption: string | null; display_order: number; is_default: boolean}[]>([]);
  const [uploadingScenicPhoto, setUploadingScenicPhoto] = useState(false);
  const [scenicPhotoPreview, setScenicPhotoPreview] = useState<string | null>(null);
  const [scenicPhotoFile, setScenicPhotoFile] = useState<File | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importingRace, setImportingRace] = useState(false);
  const [importedImages, setImportedImages] = useState<string[]>([]);
  const [deepCrawl, setDeepCrawl] = useState(false);

  // Enhanced fields
  const [formElevationGain, setFormElevationGain] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("");
  const [formRideWithGpsUrl, setFormRideWithGpsUrl] = useState("");
  const [formKeyClimbs, setFormKeyClimbs] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formRegistrationUrl, setFormRegistrationUrl] = useState("");
  const [formFinishDescription, setFormFinishDescription] = useState("");
  const [formRouteDescription, setFormRouteDescription] = useState("");
  const [formAidStations, setFormAidStations] = useState<any[]>([]);
  const [formRiderBio, setFormRiderBio] = useState("");
  const [formRiderImageUrl, setFormRiderImageUrl] = useState("");
  const [uploadingRiderImage, setUploadingRiderImage] = useState(false);
  const [formRaceLogoUrl, setFormRaceLogoUrl] = useState("");
  const [fetchingLogos, setFetchingLogos] = useState(false);
  const [logoCandidates, setLogoCandidates] = useState<{url: string; source: string; confidence: number}[]>([]);
  const [formSlug, setFormSlug] = useState("");
  const [slugSuggestion, setSlugSuggestion] = useState("");
  const [formRwgpsEmbedMode, setFormRwgpsEmbedMode] = useState("embed");
  const [formShowGoogleMap, setFormShowGoogleMap] = useState(false);

  // Process charges state
  const [actualMiles, setActualMiles] = useState("");
  const [chargeResults, setChargeResults] = useState<any>(null);
  const [hasLivePledges, setHasLivePledges] = useState(false);

  const generateSlug = (title: string, rideDate: string) => {
    const year = rideDate ? new Date(rideDate + "T00:00:00").getFullYear() : new Date().getFullYear();
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      + `-${year}`;
  };

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

  const openCreateDialog = async (event?: BikeEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormTitle(event.title);
      setFormDescription(event.description || "");
      setFormRiderName(event.rider_name);
      setFormRideDate(event.ride_date);
      setFormMileGoal(String(event.mile_goal));
      setFormStartLocation(event.start_location || "");
      setFormEndLocation(event.end_location || "");
      setFormRouteMapUrl(event.route_map_image_url || "");
      setFormRaceUrl(event.race_url || "");
      setFormRouteWaypoints(event.route_waypoints || null);
      setFormElevationGain(event.elevation_gain_ft ? String(event.elevation_gain_ft) : "");
      setFormDifficulty(event.difficulty_rating || "");
      setFormRideWithGpsUrl(event.ridewithgps_url || "");
      setFormRwgpsEmbedMode(event.ridewithgps_embed_mode || "embed");
      setFormShowGoogleMap((event as any).show_google_map || false);
      setFormKeyClimbs(event.key_climbs?.join(", ") || "");
      setFormStartTime(event.start_time || "");
      setFormRegistrationUrl(event.registration_url || "");
      setFormFinishDescription(event.finish_description || "");
      setFormRouteDescription(event.route_description || "");
      setFormAidStations(event.aid_stations || []);
      setFormRiderBio(event.rider_bio || "");
      setFormRiderImageUrl(event.rider_image_url || "");
      setFormRaceLogoUrl((event as any).race_logo_url || "");
      setLogoCandidates([]);
      setFormSlug(event.slug || "");
      setSlugSuggestion(event.slug ? "" : generateSlug(event.title, event.ride_date));
      fetchScenicPhotos(event.id);

      // Check if there are any LIVE confirmed pledges — locks mile_goal editing
      const { count } = await supabase
        .from('bike_ride_pledges')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('stripe_mode', 'live')
        .in('charge_status', ['confirmed', 'charged']);
      setHasLivePledges((count || 0) > 0);
    } else {
      setEditingEvent(null);
      setHasLivePledges(false);
      setFormTitle("");
      setFormDescription("");
      setFormRiderName("");
      setFormRideDate("");
      setFormMileGoal("118");
      setFormStartLocation("");
      setFormEndLocation("");
      setFormRouteMapUrl("");
      setFormRaceUrl("");
      setFormRouteWaypoints(null);
      setFormElevationGain("");
      setFormDifficulty("");
      setFormRideWithGpsUrl("");
      setFormRwgpsEmbedMode("embed");
      setFormShowGoogleMap(false);
      setFormKeyClimbs("");
      setFormStartTime("");
      setFormRegistrationUrl("");
      setFormFinishDescription("");
      setFormRouteDescription("");
      setFormAidStations([]);
      setFormRiderBio("");
      setFormRiderImageUrl("");
      setFormRaceLogoUrl("");
      setLogoCandidates([]);
      setFormSlug("");
      setSlugSuggestion("");
      setScenicPhotos([]);
    }
    setImportUrl("");
    setImportedImages([]);
    setShowCreateDialog(true);
  };

  const saveEvent = async () => {
    if (!formTitle || !formRiderName || !formRideDate || !formMileGoal) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const payload: Record<string, any> = {
        title: formTitle,
        description: formDescription || null,
        rider_name: formRiderName,
        ride_date: formRideDate,
        mile_goal: Number(formMileGoal),
        start_location: formStartLocation || null,
        end_location: formEndLocation || null,
        route_map_image_url: formRouteMapUrl || null,
        race_url: formRaceUrl || null,
        route_waypoints: formRouteWaypoints || null,
        elevation_gain_ft: formElevationGain ? Number(formElevationGain) : null,
        difficulty_rating: formDifficulty || null,
        ridewithgps_url: formRideWithGpsUrl || null,
        ridewithgps_embed_mode: formRwgpsEmbedMode,
        show_google_map: formShowGoogleMap,
        key_climbs: formKeyClimbs ? formKeyClimbs.split(",").map(s => s.trim()).filter(Boolean) : null,
        start_time: formStartTime || null,
        registration_url: formRegistrationUrl || null,
        finish_description: formFinishDescription || null,
        route_description: formRouteDescription || null,
        aid_stations: formAidStations.length > 0 ? formAidStations : null,
        rider_bio: formRiderBio || null,
        rider_image_url: formRiderImageUrl || null,
        race_logo_url: formRaceLogoUrl || null,
        slug: formSlug || null,
      };

      if (editingEvent) {
        await supabase.from('bike_ride_events').update(payload).eq('id', editingEvent.id);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('bike_ride_events').insert([{ ...payload, created_by: user!.id }] as any);
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

  const toggleArchive = async (event: BikeEvent) => {
    await supabase.from('bike_ride_events').update({ is_active: !event.is_active }).eq('id', event.id);
    if (selectedEvent?.id === event.id) setSelectedEvent(null);
    fetchEvents();
    toast({ title: event.is_active ? "Event archived" : "Event restored" });
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

  const handleRouteMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingRouteMap(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `bike-ride-routes/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('app-assets')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('app-assets')
        .getPublicUrl(filePath);
      
      setFormRouteMapUrl(publicUrl);
      toast({ title: "Route map uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingRouteMap(false);
    }
  };

  const analyzeRouteImage = async () => {
    if (!formRouteMapUrl) return;
    setAnalyzingRoute(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-route-image", {
        body: { imageUrl: formRouteMapUrl, startLocation: formStartLocation, endLocation: formEndLocation },
      });
      if (error) throw error;
      if (data?.waypoints?.length) {
        setFormRouteWaypoints(data.waypoints);
        toast({ title: `Extracted ${data.waypoints.length} waypoints from route image` });
      } else {
        toast({ title: "Could not extract waypoints", variant: "destructive" });
      }
    } catch (err) {
      showErrorToastWithCopy("Analyzing route image", err);
    } finally {
      setAnalyzingRoute(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrl) return;
    setImportingRace(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-race-info", {
        body: { url: importUrl, deepCrawl },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const info = data.data;
      // Auto-fill only empty fields
      if (info.title && !formTitle) setFormTitle(info.title);
      if (info.description) setFormDescription(prev => prev || info.description);
      if (info.ride_date && !formRideDate) setFormRideDate(info.ride_date);
      if (info.mile_goal && formMileGoal === "118") setFormMileGoal(String(Math.round(info.mile_goal)));
      if (info.start_location && !formStartLocation) setFormStartLocation(info.start_location);
      if (info.end_location && !formEndLocation) setFormEndLocation(info.end_location);
      if (!formRaceUrl) setFormRaceUrl(importUrl);
      if (info.images?.length) setImportedImages(info.images);

      // Enhanced fields
      if (info.elevation_gain_ft && !formElevationGain) setFormElevationGain(String(Math.round(info.elevation_gain_ft)));
      if (info.difficulty_rating && !formDifficulty) setFormDifficulty(info.difficulty_rating);
      if (info.ridewithgps_url && !formRideWithGpsUrl) setFormRideWithGpsUrl(info.ridewithgps_url);
      if (info.key_climbs?.length && !formKeyClimbs) setFormKeyClimbs(info.key_climbs.join(", "));
      if (info.start_time && !formStartTime) setFormStartTime(info.start_time);
      if (info.registration_url && !formRegistrationUrl) setFormRegistrationUrl(info.registration_url);
      if (info.finish_description && !formFinishDescription) setFormFinishDescription(info.finish_description);
      if (info.route_description && !formRouteDescription) setFormRouteDescription(info.route_description);
      if (info.aid_stations?.length && formAidStations.length === 0) setFormAidStations(info.aid_stations);

      toast({ title: "Race info extracted!", description: `Found: ${info.title || "event details"}${data.total_images_found ? ` (${data.total_images_found} images discovered)` : ""}` });
    } catch (err) {
      showErrorToastWithCopy("Extracting race info", err);
    } finally {
      setImportingRace(false);
    }
  };

  const addImportedImageAsScenic = async (imageUrl: string) => {
    if (!editingEvent) {
      toast({ title: "Save the event first, then add scenic photos", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from("bike_ride_scenic_photos").insert({
        event_id: editingEvent.id,
        image_url: imageUrl,
        display_order: scenicPhotos.length,
      });
      if (error) throw error;
      fetchScenicPhotos(editingEvent.id);
      setImportedImages(prev => prev.filter(u => u !== imageUrl));
      toast({ title: "Image added as scenic photo" });
    } catch (err) {
      toast({ title: "Failed to add image", variant: "destructive" });
    }
  };

  const fetchScenicPhotos = async (eventId: string) => {
    const { data } = await supabase
      .from("bike_ride_scenic_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("display_order");
    setScenicPhotos(data || []);
  };

  const handleScenicPhotoSelected = (file: File | null, preview: string | null) => {
    setScenicPhotoFile(file);
    setScenicPhotoPreview(preview);
    if (file && editingEvent) {
      uploadScenicPhoto(file);
    }
  };

  const uploadScenicPhoto = async (file: File) => {
    if (!editingEvent) return;
    setUploadingScenicPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `bike-ride-scenic/${editingEvent.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('app-assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      const { error: insertError } = await supabase.from("bike_ride_scenic_photos").insert({
        event_id: editingEvent.id,
        image_url: publicUrl,
        display_order: scenicPhotos.length,
      });
      if (insertError) throw insertError;
      fetchScenicPhotos(editingEvent.id);
      toast({ title: "Scenic photo added" });
      setScenicPhotoFile(null);
      setScenicPhotoPreview(null);
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingScenicPhoto(false);
    }
  };

  const uploadRiderImage = async (file: File) => {
    setUploadingRiderImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `bike-ride-riders/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('app-assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      setFormRiderImageUrl(publicUrl);
      toast({ title: "Rider image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingRiderImage(false);
    }
  };

  const handleFetchLogos = async () => {
    const urlToFetch = formRaceUrl || importUrl;
    if (!urlToFetch) {
      toast({ title: "Enter a Race/Event Link first", variant: "destructive" });
      return;
    }
    setFetchingLogos(true);
    setLogoCandidates([]);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-race-logos", {
        body: { url: urlToFetch },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to fetch logos");
      setLogoCandidates(data.logos || []);
      if (!data.logos?.length) {
        toast({ title: "No logos found on that page", variant: "destructive" });
      } else {
        toast({ title: `Found ${data.logos.length} potential logos` });
      }
    } catch (err) {
      showErrorToastWithCopy("Fetching logos", err);
    } finally {
      setFetchingLogos(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `bike-ride-logos/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('app-assets').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('app-assets').getPublicUrl(filePath);
      setFormRaceLogoUrl(publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const deleteScenicPhoto = async (photoId: string) => {
    await supabase.from("bike_ride_scenic_photos").delete().eq("id", photoId);
    setScenicPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const toggleDefaultPhoto = async (photoId: string) => {
    if (!editingEvent) return;
    const isCurrentlyDefault = scenicPhotos.find(p => p.id === photoId)?.is_default;
    await supabase.from("bike_ride_scenic_photos").update({ is_default: false }).eq("event_id", editingEvent.id);
    if (!isCurrentlyDefault) {
      await supabase.from("bike_ride_scenic_photos").update({ is_default: true }).eq("id", photoId);
    }
    fetchScenicPhotos(editingEvent.id);
  };

  const addAidStation = () => {
    setFormAidStations(prev => [...prev, { name: "", mile: 0, services: "" }]);
  };

  const updateAidStation = (index: number, field: string, value: any) => {
    setFormAidStations(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeAidStation = (index: number) => {
    setFormAidStations(prev => prev.filter((_, i) => i !== index));
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

      {/* Quick Links */}
      <div className="flex gap-3 flex-wrap">
        <Link to="/bike-rides" target="_blank">
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Bike Rides Landing Page
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {events.filter(e => e.is_active).map(event => (
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
                  {event.difficulty_rating && (
                    <Badge variant="outline" className="text-[10px]">{event.difficulty_rating}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {event.rider_name} · {event.mile_goal} miles
                  {event.elevation_gain_ft ? ` · ${event.elevation_gain_ft.toLocaleString()}ft gain` : ""}
                  {" · "}{new Date(event.ride_date + 'T00:00:00').toLocaleDateString()}
                  {event.slug && <span className="ml-1 font-mono text-xs">/{event.slug}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="icon" variant="outline" onClick={e => { e.stopPropagation(); openCreateDialog(event); }} title="Edit">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={e => { e.stopPropagation(); toggleArchive(event); }} title="Archive">
                  <Archive className="h-4 w-4" />
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
        {events.filter(e => e.is_active).length === 0 && (
          <p className="text-center text-muted-foreground py-8">No active events. Create your first bike ride event!</p>
        )}
      </div>

      {/* Archived Events */}
      {events.filter(e => !e.is_active).length > 0 && (
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Archive className="h-4 w-4 mr-1.5" />
              Archived ({events.filter(e => !e.is_active).length})
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 grid gap-3">
            {events.filter(e => !e.is_active).map(event => (
              <Card
                key={event.id}
                className={`cursor-pointer transition-colors opacity-60 ${selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setSelectedEvent(event)}
              >
                <CardContent className="pt-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{event.title}</span>
                      <Badge variant="secondary">archived</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {event.rider_name} · {event.mile_goal} miles · {new Date(event.ride_date + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={e => { e.stopPropagation(); toggleArchive(event); }} title="Restore">
                      <ArchiveRestore className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

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
        <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Bike Ride Event'}</DialogTitle>
          </DialogHeader>
          {/* Import from Race URL */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <Wand2 className="h-4 w-4 text-primary" /> Import from Race Website
            </p>
            <p className="text-xs text-muted-foreground">Paste a race/event URL and AI will extract details, images, elevation, aid stations, and more</p>
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://race-website.com/event-page"
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleImportFromUrl}
                disabled={!importUrl || importingRace}
                type="button"
              >
                {importingRace ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                {importingRace ? (deepCrawl ? "Crawling..." : "Extracting...") : "Extract"}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={deepCrawl}
                onChange={e => setDeepCrawl(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              <span>🔍 Deep crawl — explore multiple pages for more images (slower, uses more credits)</span>
            </label>
            {/* Show extracted images */}
            {importedImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Found {importedImages.length} images — click to add as scenic photos{!editingEvent && " (save event first)"}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {importedImages.map((imgUrl, i) => (
                    <div key={i} className="relative group cursor-pointer" onClick={() => addImportedImageAsScenic(imgUrl)}>
                      <img src={imgUrl} alt={`Race image ${i + 1}`} className="rounded border h-16 w-full object-cover" />
                      <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                        <Plus className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={formTitle} onChange={e => {
                  setFormTitle(e.target.value);
                  if (!formSlug) {
                    setSlugSuggestion(generateSlug(e.target.value, formRideDate));
                  }
                }} placeholder="Bike Ride for Best Day" />
              </div>
              <div className="col-span-2">
                <Label>URL Slug</Label>
                <div className="flex gap-2 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">/bike-rides/</span>
                    <Input 
                      value={formSlug} 
                      onChange={e => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-");
                        setFormSlug(val);
                        setSlugSuggestion("");
                      }}
                      className="pl-[95px]"
                      placeholder="my-ride-2026"
                    />
                  </div>
                  {formSlug && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => { setFormSlug(""); setSlugSuggestion(generateSlug(formTitle, formRideDate)); }} title="Clear slug">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {!formSlug && slugSuggestion && (
                  <button 
                    type="button"
                    onClick={() => { setFormSlug(slugSuggestion); setSlugSuggestion(""); }}
                    className="mt-1.5 text-xs text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Use suggestion: <span className="font-mono">{slugSuggestion}</span>
                  </button>
                )}
                {formSlug && (
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: <span className="font-mono text-foreground">/bike-rides/{formSlug}</span>
                    {editingEvent?.slug === formSlug && <span className="ml-1.5 text-green-600">✓ Locked</span>}
                  </p>
                )}
              </div>
              <div>
                <Label>Rider Name *</Label>
                <Input value={formRiderName} onChange={e => setFormRiderName(e.target.value)} placeholder="John Smith" />
              </div>
              <div>
                <Label>Ride Date *</Label>
                <Input type="date" value={formRideDate} onChange={e => {
                  setFormRideDate(e.target.value);
                  if (!formSlug && formTitle) {
                    setSlugSuggestion(generateSlug(formTitle, e.target.value));
                  }
                }} />
              </div>
              <div>
                <Label>Mile Goal *</Label>
                <Input type="number" value={formMileGoal} onChange={e => setFormMileGoal(e.target.value)} min={1} />
              </div>
              <div>
                <Label>Start Time</Label>
                <Input value={formStartTime} onChange={e => setFormStartTime(e.target.value)} placeholder="5:15 AM" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Tell supporters about the ride..." rows={3} />
            </div>

            {/* Rider Bio (optional) */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Rider Bio (optional)
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Rider Photo</Label>
                  {formRiderImageUrl ? (
                    <div className="relative inline-block mt-1">
                      <img src={formRiderImageUrl} alt="Rider" className="h-24 w-24 rounded-full object-cover border" />
                      <Button type="button" size="icon" variant="ghost" className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-background border" onClick={() => setFormRiderImageUrl("")}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors mt-1">
                      {uploadingRiderImage ? (
                        <><Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" /><span className="text-sm text-muted-foreground">Uploading...</span></>
                      ) : (
                        <><Upload className="h-5 w-5 mr-2 text-muted-foreground" /><span className="text-sm text-muted-foreground">Upload rider photo</span></>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadRiderImage(e.target.files[0]); }} />
                    </label>
                  )}
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea value={formRiderBio} onChange={e => setFormRiderBio(e.target.value)} placeholder="Tell supporters about the rider..." rows={3} />
                </div>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5"><Link2 className="h-4 w-4" /> Race/Event Link</Label>
              <Input value={formRaceUrl} onChange={e => setFormRaceUrl(e.target.value)} placeholder="https://race-website.com/event" />
            </div>
            {formRegistrationUrl && (
              <div>
                <Label className="flex items-center gap-1.5"><ExternalLink className="h-4 w-4" /> Registration URL</Label>
                <Input value={formRegistrationUrl} onChange={e => setFormRegistrationUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {/* Race Logo */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4" /> Race Logo
              </p>
              {formRaceLogoUrl ? (
                <div className="flex items-center gap-3 mb-3">
                  <img src={formRaceLogoUrl} alt="Race logo" className="h-16 max-w-[200px] object-contain rounded border bg-background p-1" />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setFormRaceLogoUrl("")}>
                    <X className="h-4 w-4 mr-1" /> Remove
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-2">No logo set</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleFetchLogos}
                  disabled={fetchingLogos || (!formRaceUrl && !importUrl)}
                >
                  {fetchingLogos ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Globe className="h-4 w-4 mr-1" />}
                  {fetchingLogos ? "Searching..." : "Fetch Logo from Website"}
                </Button>
                <label>
                  <Button type="button" size="sm" variant="outline" asChild>
                    <span><Upload className="h-4 w-4 mr-1" /> Upload Logo</span>
                  </Button>
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
              </div>
              {logoCandidates.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Found {logoCandidates.length} candidates — click to select:
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {logoCandidates.map((logo, i) => (
                      <div
                        key={i}
                        className={`relative group cursor-pointer rounded-lg border-2 p-2 bg-background transition-all hover:border-primary ${formRaceLogoUrl === logo.url ? 'border-primary ring-2 ring-primary/20' : 'border-border'}`}
                        onClick={() => { setFormRaceLogoUrl(logo.url); toast({ title: "Logo selected" }); }}
                        title={`${logo.source} (${logo.confidence}% confidence)`}
                      >
                        <img
                          src={logo.url}
                          alt={`Logo candidate ${i + 1}`}
                          className="h-12 w-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="text-[9px] text-muted-foreground block mt-1 truncate text-center">{logo.source}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <Mountain className="h-4 w-4" /> Elevation & Difficulty
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Elevation Gain (ft)</Label>
                  <Input type="number" value={formElevationGain} onChange={e => setFormElevationGain(e.target.value)} placeholder="10800" />
                </div>
                <div>
                  <Label>Difficulty Rating</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formDifficulty}
                    onChange={e => setFormDifficulty(e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                    <option value="Epic">Epic</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Label>Key Climbs (comma-separated)</Label>
                <Input value={formKeyClimbs} onChange={e => setFormKeyClimbs(e.target.value)} placeholder="Juniper Pass, Loveland Pass, Vail Pass" />
              </div>
              {formRouteDescription !== undefined && (
                <div className="mt-3">
                  <Label>Route Description</Label>
                  <Textarea value={formRouteDescription} onChange={e => setFormRouteDescription(e.target.value)} placeholder="Describe the terrain and route..." rows={2} />
                </div>
              )}
              {formFinishDescription !== undefined && (
                <div className="mt-3">
                  <Label>Finish Line Details</Label>
                  <Input value={formFinishDescription} onChange={e => setFormFinishDescription(e.target.value)} placeholder="Post-ride party, food, awards..." />
                </div>
              )}
            </div>

            {/* Aid Stations */}
            <div className="border-t pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flag className="h-4 w-4" /> Aid Stations / Milestones
                </p>
                <Button type="button" size="sm" variant="outline" onClick={addAidStation}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {formAidStations.map((station, i) => (
                <div key={i} className="grid grid-cols-[1fr_60px_1fr_32px] gap-2 mb-2 items-end">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={station.name} onChange={e => updateAidStation(i, "name", e.target.value)} placeholder="Station name" className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Mile</Label>
                    <Input type="number" value={station.mile} onChange={e => updateAidStation(i, "mile", Number(e.target.value))} className="h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Services</Label>
                    <Input value={station.services || ""} onChange={e => updateAidStation(i, "services", e.target.value)} placeholder="Water, snacks..." className="h-8 text-sm" />
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => removeAidStation(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* Route Information */}
            <div className="border-t pt-4 mt-2">
              <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> Route Information
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Location</Label>
                    <Input value={formStartLocation} onChange={e => setFormStartLocation(e.target.value)} placeholder="e.g., City Park, Denver CO" />
                  </div>
                  <div>
                    <Label>End Location</Label>
                    <Input value={formEndLocation} onChange={e => setFormEndLocation(e.target.value)} placeholder="e.g., Avon, CO" />
                  </div>
                </div>
                <div>
                  <Label>Ride With GPS / Interactive Map URL</Label>
                  <Input value={formRideWithGpsUrl} onChange={e => setFormRideWithGpsUrl(e.target.value)} placeholder="https://ridewithgps.com/routes/..." />
                </div>
                {formRideWithGpsUrl && (
                  <div>
                    <Label>RideWithGPS Display Mode</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={formRwgpsEmbedMode === 'embed' ? 'default' : 'outline'}
                        onClick={() => setFormRwgpsEmbedMode('embed')}
                      >
                        Embed Map
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={formRwgpsEmbedMode === 'link' ? 'default' : 'outline'}
                        onClick={() => setFormRwgpsEmbedMode('link')}
                      >
                        Link Only
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formRwgpsEmbedMode === 'embed'
                        ? "Shows the interactive map inline (requires the route to be public on RideWithGPS)"
                        : "Shows a link card — use this if the route is private"}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="checkbox"
                    id="show-google-map"
                    checked={formShowGoogleMap}
                    onChange={e => setFormShowGoogleMap(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="show-google-map" className="cursor-pointer text-sm">
                    Also show Google Maps route (uses start/end locations)
                  </Label>
                </div>
                <div>
                  <Label>Route Map Image</Label>
                  {formRouteMapUrl ? (
                    <div className="space-y-2 mt-1">
                      <div className="relative">
                        <img src={formRouteMapUrl} alt="Route map" className="rounded-lg border max-h-48 w-full object-cover" />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-2 right-2 h-7 w-7"
                          onClick={() => { setFormRouteMapUrl(""); setFormRouteWaypoints(null); }}
                          type="button"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={analyzeRouteImage}
                        disabled={analyzingRoute}
                        className="w-full"
                        type="button"
                      >
                        {analyzingRoute ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                        {analyzingRoute ? "Analyzing route..." : formRouteWaypoints ? `Re-analyze (${formRouteWaypoints.length} waypoints)` : "AI: Extract Route Waypoints"}
                      </Button>
                      {formRouteWaypoints && (
                        <p className="text-xs text-muted-foreground">
                          ✅ {formRouteWaypoints.length} waypoints extracted — will render on Google Maps
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-1">
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                          {uploadingRouteMap ? (
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                              <p className="text-sm text-muted-foreground">Upload route map image</p>
                              <p className="text-xs text-muted-foreground mt-1">AI will extract waypoints to render on Google Maps</p>
                            </>
                          )}
                        </div>
                        <input type="file" accept="image/*" className="hidden" onChange={handleRouteMapUpload} disabled={uploadingRouteMap} />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Scenic Photos - only when editing */}
            {editingEvent && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4" /> Scenic Photos Along the Route
                </p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {scenicPhotos.map(photo => (
                    <div key={photo.id} className={`relative group ${photo.is_default ? 'ring-2 ring-primary rounded-md' : ''}`}>
                      <img src={photo.image_url} alt={photo.caption || "Scenic"} className="rounded-md border h-20 w-full object-cover" />
                      {photo.is_default && (
                        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                          <Star className="h-2.5 w-2.5" /> Hero
                        </span>
                      )}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant={photo.is_default ? "default" : "secondary"}
                          className="h-5 w-5"
                          onClick={() => toggleDefaultPhoto(photo.id)}
                          type="button"
                          title={photo.is_default ? "Remove as hero" : "Set as hero image"}
                        >
                          <Star className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          className="h-5 w-5"
                          onClick={() => deleteScenicPhoto(photo.id)}
                          type="button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {uploadingScenicPhoto ? (
                  <div className="flex items-center justify-center p-3 border-2 border-dashed rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin mr-2 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <ImageUploadWithCrop
                    label="Add Scenic Photo"
                    imagePreview={scenicPhotoPreview}
                    onImageChange={handleScenicPhotoSelected}
                    aspectRatio="16:9"
                    allowAspectRatioChange={true}
                    maxSizeMB={20}
                  />
                )}
              </div>
            )}
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
