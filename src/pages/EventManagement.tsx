import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UnifiedHeader } from "@/components/UnifiedHeader";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Upload, X, Trash2, Edit, MapPin, Clock, ArrowLeft, Mic, Info, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import AudioRecorder from "@/components/AudioRecorder";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";
import { LocationLink } from "@/components/LocationLink";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface EventDate {
  id: string;
  event_date: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  audio_url: string | null;
  event_date: string;
  location: string | null;
  max_attendees: number | null;
  expires_after_date: boolean;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  is_public: boolean;
  is_active: boolean;
  visible_to_roles?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  event_dates?: EventDate[];
  link_url?: string | null;
  link_label?: string | null;
}

interface SavedLocation {
  id: string;
  name: string;
  address: string;
  is_active: boolean;
  created_at: string;
}

export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date>();
  const [eventTime, setEventTime] = useState("12:00");
  const [location, setLocation] = useState("");
  const [expiresAfterDate, setExpiresAfterDate] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("daily");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>();
  const [additionalDates, setAdditionalDates] = useState<Date[]>([]);
  const [showAdditionalDatePicker, setShowAdditionalDatePicker] = useState(false);
  const [visibleToRoles, setVisibleToRoles] = useState<string[]>(['caregiver', 'bestie', 'supporter']);
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('9:16');
  const [eventStatus, setEventStatus] = useState<'draft' | 'published'>('draft');
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("Learn More");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    // Fetch role from user_roles table (security requirement)
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    // Check for admin-level access (owner role automatically has admin access)
    if (!roleData || (roleData.role !== "admin" && roleData.role !== "owner")) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    loadEvents();
  };

  const loadEvents = async () => {
    setLoading(true);
    
    // Load both events and saved locations in parallel
    const [eventsResult, locationsResult] = await Promise.all([
      supabase
        .from("events")
        .select(`
          *,
          event_dates(id, event_date)
        `)
        .order("event_date", { ascending: false }),
      supabase
        .from("saved_locations")
        .select("*")
        .eq("is_active", true)
    ]);

    if (eventsResult.error) {
      toast.error("Failed to load events");
      console.error(eventsResult.error);
    } else {
      setEvents(eventsResult.data || []);
    }

    if (locationsResult.error) {
      console.error("Failed to load saved locations:", locationsResult.error);
    } else {
      setSavedLocations(locationsResult.data || []);
    }
    
    setLoading(false);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageUrl(reader.result as string);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCroppedImage = (blob: Blob) => {
    const file = new File([blob], "cropped-image.jpg", { type: "image/jpeg" });
    setSelectedImage(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(blob);
    
    toast.success("Image cropped successfully");
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept common audio formats including iPhone voice memos
    const validAudioTypes = [
      'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 
      'audio/x-m4a', 'audio/m4a', 'audio/webm', 'audio/ogg'
    ];
    const validExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg'];
    
    const isValidType = file.type.startsWith("audio/") || validAudioTypes.includes(file.type);
    const isValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType && !isValidExtension) {
      toast.error("Please select a valid audio file (MP3, WAV, M4A, MP4, WebM, or OGG)");
      return;
    }

    setSelectedAudio(file);
    toast.success(`Selected: ${file.name}`);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate(undefined);
    setEventTime("12:00");
    setLocation("");
    setExpiresAfterDate(true);
    setIsPublic(true);
    setVisibleToRoles(['caregiver', 'bestie', 'supporter']);
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedAudio(null);
    setAudioBlob(null);
    setShowAudioRecorder(false);
    setIsRecurring(false);
    setRecurrenceType("daily");
    setRecurrenceInterval(1);
    setRecurrenceEndDate(undefined);
    setAdditionalDates([]);
    setShowAdditionalDatePicker(false);
    setAspectRatioKey('9:16');
    setEventStatus('draft');
    setLinkUrl("");
    setLinkLabel("Learn More");
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!title || !description || !eventDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const newStatus = saveAsDraft ? 'draft' : 'published';
    
    // Confirm publish action for new events (sends notifications)
    if (!saveAsDraft && !editingEvent) {
      const confirmPublish = confirm(
        "Publishing this event will immediately notify all users who have event notifications enabled.\n\n" +
        "• In-app notifications will be created\n" +
        "• Email notifications will be sent\n\n" +
        "Are you sure you want to publish now?\n\n" +
        "Click 'Cancel' to save as draft instead."
      );
      if (!confirmPublish) return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Combine date and time
      const [hours, minutes] = eventTime.split(":");
      const combinedDate = new Date(eventDate);
      combinedDate.setHours(parseInt(hours), parseInt(minutes));

      let imageUrl = editingEvent?.image_url || null;
      let audioUrl = editingEvent?.audio_url || null;

      // Upload image if selected
      if (selectedImage) {
        const compressedImage = await compressImage(selectedImage, 4.5);
        const fileName = `${user.id}/${Date.now()}_${selectedImage.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-images")
          .upload(fileName, compressedImage);

        if (uploadError) {
          console.error("Image upload error:", uploadError);
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Upload audio if selected (either file or recorded)
      const audioToUpload = audioBlob || selectedAudio;
      if (audioToUpload) {
        const fileName = `${user.id}/${Date.now()}_event_audio.${audioBlob ? 'webm' : selectedAudio!.name.split('.').pop()}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-audio")
          .upload(fileName, audioToUpload);

        if (uploadError) {
          console.error("Audio upload error:", uploadError);
          throw new Error(`Failed to upload audio: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from("event-audio")
          .getPublicUrl(fileName);
        
        audioUrl = publicUrl;
      }

      // Ensure admin and owner are always included
      const finalVisibleRoles = [...new Set([...visibleToRoles, 'admin', 'owner'])] as any;
      
      // Check if there are any future dates (main date or additional dates)
      const now = new Date();
      const hasFutureDates = combinedDate > now || additionalDates.some(date => date > now);
      
      const eventData = {
        title,
        description,
        event_date: combinedDate.toISOString(),
        location: location?.trim() || null,
        expires_after_date: expiresAfterDate,
        is_public: isPublic,
        visible_to_roles: finalVisibleRoles,
        image_url: imageUrl,
        audio_url: audioUrl,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : null,
        aspect_ratio: aspectRatioKey,
        created_by: user.id,
        is_active: hasFutureDates ? true : (editingEvent?.is_active ?? true),
        status: newStatus,
        link_url: linkUrl?.trim() || null,
        link_label: linkLabel?.trim() || 'Learn More',
      };

      let eventId = editingEvent?.id;

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        
        // Delete existing additional dates
        await supabase
          .from("event_dates")
          .delete()
          .eq("event_id", editingEvent.id);
        
        // Process event update notification emails (the database trigger already populated the queue)
        setTimeout(() => {
          supabase.functions.invoke("process-event-update-email-queue", {});
        }, 500);
          
        toast.success(`Event updated successfully${location ? ' with location: ' + location : ''}`);
      } else {
        const { data: newEvent, error } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        eventId = newEvent.id;
        
        // Process event notification emails only if published (the database trigger already created in-app notifications)
        if (isPublic && newStatus === 'published') {
          setTimeout(() => {
            supabase.functions.invoke("process-event-email-queue", {});
          }, 500); // Small delay to ensure the trigger has populated the queue
        }
        
        toast.success(newStatus === 'draft' ? "Event saved as draft" : "Event published successfully");
      }

      // Insert additional dates
      if (additionalDates.length > 0 && eventId) {
        const datesToInsert = additionalDates.map(date => {
          const [hours, minutes] = eventTime.split(":");
          const dateWithTime = new Date(date);
          dateWithTime.setHours(parseInt(hours), parseInt(minutes));
          
          return {
            event_id: eventId,
            event_date: dateWithTime.toISOString()
          };
        });

        const { error: datesError } = await supabase
          .from("event_dates")
          .insert(datesToInsert);

        if (datesError) {
          console.error("Error saving additional dates:", datesError);
          toast.error("Event saved but failed to add some dates");
        }
      }

      await loadEvents();
      resetForm();
      
      // Scroll to see the updated events list
      if (editingEvent) {
        setTimeout(() => {
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100);
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast.error(error.message || "Failed to save event");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (event: Event) => {
    // First, ensure the form is visible and reset to editing mode
    setShowForm(true);
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    
    const date = new Date(event.event_date);
    setEventDate(date);
    setEventTime(format(date, "HH:mm"));
    setLocation(event.location || "");
    setExpiresAfterDate(event.expires_after_date);
    setIsPublic(event.is_public ?? true);
    setVisibleToRoles(event.visible_to_roles?.filter(r => !['admin', 'owner'].includes(r)) || ['caregiver', 'bestie', 'supporter']);
    setIsRecurring(event.is_recurring);
    setRecurrenceType(event.recurrence_type || "daily");
    setRecurrenceInterval(event.recurrence_interval || 1);
    if (event.recurrence_end_date) {
      setRecurrenceEndDate(new Date(event.recurrence_end_date));
    } else {
      setRecurrenceEndDate(null);
    }
    setAspectRatioKey((event as any).aspect_ratio || '9:16');
    setEventStatus((event as any).status || 'published');
    setLinkUrl((event as any).link_url || "");
    setLinkLabel((event as any).link_label || "Learn More");
    setImagePreview(event.image_url);
    setSelectedImage(null);
    setRawImageUrl(null);
    setAudioBlob(null);
    setSelectedAudio(null);
    setShowAudioRecorder(false);
    
    // Load additional dates
    const { data: eventDates } = await supabase
      .from("event_dates")
      .select("event_date")
      .eq("event_id", event.id);
    
    if (eventDates) {
      setAdditionalDates(eventDates.map(d => new Date(d.event_date)));
    } else {
      setAdditionalDates([]);
    }
    
    // Scroll to the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to delete event");
      console.error(error);
    } else {
      toast.success("Event deleted successfully");
      loadEvents();
    }
  };

  const handleToggleVisibility = async (eventId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("events")
      .update({ is_active: isActive })
      .eq("id", eventId);

    if (error) {
      toast.error("Failed to update event visibility");
      console.error(error);
    } else {
      toast.success(isActive ? "Event is now visible" : "Event is now hidden");
      loadEvents();
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-primary via-accent to-secondary animate-pulse" />
          <p className="text-muted-foreground">Loading event management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <UnifiedHeader />
      <main className="flex-1 container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin')}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>

          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Event Management</h1>
            <Button onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                resetForm(); // Reset form to ensure it's empty
                setShowForm(true);
              }
            }}>
              {showForm ? "Cancel" : "Add New Event"}
            </Button>
          </div>

          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>{editingEvent ? "Edit Event" : "Create New Event"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Event title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Event description (URLs will be automatically clickable)"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: Any URLs you include will be automatically clickable for users.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="linkUrl">Event Link (optional)</Label>
                    <Input
                      id="linkUrl"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com/register"
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a link for registration, tickets, or more info
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkLabel">Link Button Text</Label>
                    <Input
                      id="linkLabel"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      placeholder="Learn More"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !eventDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={eventDate}
                          onSelect={setEventDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Event Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                    />
                  </div>
                </div>

                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="Search for event location"
                />

                <div className="flex items-center justify-between">
                  <Label htmlFor="expires">Expires only after all event dates pass</Label>
                  <Switch
                    id="expires"
                    checked={expiresAfterDate}
                    onCheckedChange={setExpiresAfterDate}
                  />
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="space-y-4">
                    <Label>Additional Custom Dates</Label>
                    <p className="text-sm text-muted-foreground">
                      Add specific dates when this event occurs (uses the same time as the main event date)
                    </p>
                    
                    {additionalDates.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {additionalDates.map((date, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full"
                          >
                            <span className="text-sm">{format(date, "PPP")}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 rounded-full"
                              onClick={() => {
                                setAdditionalDates(additionalDates.filter((_, i) => i !== index));
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <Popover open={showAdditionalDatePicker} onOpenChange={setShowAdditionalDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          Add Another Date
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          onSelect={(date) => {
                            if (date && !additionalDates.some(d => d.getTime() === date.getTime())) {
                              setAdditionalDates([...additionalDates, date]);
                              setShowAdditionalDatePicker(false);
                            }
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="recurring">Recurring Event</Label>
                    <Switch
                      id="recurring"
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                  </div>

                  {isRecurring && (
                    <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="recurrence-type">Repeat</Label>
                          <select
                            id="recurrence-type"
                            value={recurrenceType}
                            onChange={(e) => setRecurrenceType(e.target.value)}
                            className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="interval">Every</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="interval"
                              type="number"
                              min="1"
                              value={recurrenceInterval}
                              onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                              className="w-20"
                            />
                            <span className="text-sm text-muted-foreground">
                              {recurrenceType === "daily" ? "day(s)" : 
                               recurrenceType === "weekly" ? "week(s)" : 
                               recurrenceType === "monthly" ? "month(s)" : "interval(s)"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>End Date (optional)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !recurrenceEndDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : <span>No end date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={recurrenceEndDate}
                              onSelect={setRecurrenceEndDate}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Event Image</Label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Label className="text-sm">Aspect Ratio:</Label>
                      <div className="flex flex-wrap gap-2">
                        {['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3'].map((ratio) => (
                          <Button
                            key={ratio}
                            type="button"
                            variant={aspectRatioKey === ratio ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAspectRatioKey(ratio)}
                          >
                            {ratio}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can also change the aspect ratio while cropping
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                        id="image-upload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById("image-upload")?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {selectedImage ? "Change Image" : "Upload Image"}
                      </Button>
                      {selectedImage && <span className="text-sm">{selectedImage.name}</span>}
                    </div>
                  </div>
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
                      <div className="absolute top-2 right-2 flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="icon"
                          onClick={() => {
                            setShowCropDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => {
                            setSelectedImage(null);
                            setImagePreview(null);
                            setRawImageUrl(null);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Event Audio (for Besties)</Label>
                  
                  {!showAudioRecorder ? (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="audio/*,.m4a,.mp3,.wav,.mp4,.webm,.ogg"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const validAudioTypes = [
                              'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/mp4', 
                              'audio/x-m4a', 'audio/m4a', 'audio/webm', 'audio/ogg'
                            ];
                            const validExtensions = ['.mp3', '.wav', '.m4a', '.mp4', '.webm', '.ogg'];
                            
                            const isValidType = file.type.startsWith("audio/") || validAudioTypes.includes(file.type);
                            const isValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
                          
                            if (isValidType || isValidExtension) {
                              setSelectedAudio(file);
                              setAudioBlob(null);
                              toast.success(`Selected: ${file.name}`);
                            } else {
                              toast.error("Please select a valid audio file");
                            }
                          }
                        }}
                        className="hidden"
                        id="audio-upload"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById("audio-upload")?.click()}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          {selectedAudio ? "Change Audio File" : "Upload Audio File"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowAudioRecorder(true)}
                        >
                          <Mic className="w-5 h-5 mr-2 text-red-500" strokeWidth={2.5} />
                          Record Audio
                        </Button>
                      </div>
                      {selectedAudio && <span className="text-sm">{selectedAudio.name}</span>}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {!audioBlob ? (
                        <>
                          <AudioRecorder
                            onRecordingComplete={(blob) => {
                              setAudioBlob(blob);
                              setSelectedAudio(null);
                            }}
                            onRecordingCancel={() => {
                              setShowAudioRecorder(false);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAudioRecorder(false)}
                            className="w-full"
                          >
                            Back to File Upload
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="p-4 border rounded-lg bg-muted/50">
                            <p className="text-sm font-medium mb-2">Recorded audio ready:</p>
                            <audio controls className="w-full">
                              <source src={URL.createObjectURL(audioBlob)} type="audio/webm" />
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setAudioBlob(null)}
                            >
                              Re-record
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setAudioBlob(null);
                                setShowAudioRecorder(false);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isPublic"
                      checked={isPublic}
                      onCheckedChange={setIsPublic}
                    />
                    <Label htmlFor="isPublic" className="cursor-pointer font-medium">
                      {isPublic ? "Public Event" : "Private Event"}
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p><strong>Public:</strong> Visible on landing page and community page</p>
                          <p className="mt-1"><strong>Private:</strong> Only visible on community page (logged-in users)</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <Label>Visible To (Admin & Owner always included)</Label>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-caregiver"
                        checked={visibleToRoles.includes('caregiver')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'caregiver']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'caregiver'));
                          }
                        }}
                      />
                      <label htmlFor="role-caregiver" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Guardians
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-bestie"
                        checked={visibleToRoles.includes('bestie')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'bestie']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'bestie'));
                          }
                        }}
                      />
                      <label htmlFor="role-bestie" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Besties
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="role-supporter"
                        checked={visibleToRoles.includes('supporter')}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setVisibleToRoles([...visibleToRoles, 'supporter']);
                          } else {
                            setVisibleToRoles(visibleToRoles.filter(r => r !== 'supporter'));
                          }
                        }}
                      />
                      <label htmlFor="role-supporter" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Supporters
                      </label>
                    </div>
                  </div>
                </div>

                {/* Warning box about publishing */}
                {!editingEvent && (
                  <div className="p-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>📢 Heads up:</strong> Publishing an event will immediately send notifications to all users who have event alerts enabled. 
                      Save as draft first if you want to review before sharing.
                    </p>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSubmit(true)} 
                    disabled={uploading}
                  >
                    {uploading ? "Saving..." : editingEvent ? "Save as Draft" : "Save as Draft"}
                  </Button>
                  <Button 
                    onClick={() => handleSubmit(false)} 
                    disabled={uploading}
                  >
                    {uploading ? "Publishing..." : editingEvent ? "Update & Publish" : "Publish Event"}
                  </Button>
                  <Button variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <p>Loading events...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => {
                // Check if ALL dates (main + additional) are past
                const allDates = [
                  new Date(event.event_date),
                  ...(event.event_dates || []).map(d => new Date(d.event_date))
                ];
                const allDatesPast = allDates.every(date => date < new Date());
                const isExpired = allDatesPast && event.expires_after_date;

                return (
                  <Card key={event.id} className={cn(
                    isExpired && "opacity-60",
                    !event.is_active && "opacity-50 border-dashed"
                  )}>
                    {event.image_url && (
                      <AspectRatio 
                        ratio={(() => {
                          const ratio = (event as any).aspect_ratio || '9:16';
                          const [w, h] = ratio.split(':').map(Number);
                          return w / h;
                        })()} 
                        className="w-full overflow-hidden rounded-t-lg"
                      >
                        <img
                          src={event.image_url}
                          alt={event.title}
                          className="w-full h-full object-cover"
                        />
                      </AspectRatio>
                    )}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            {(event as any).status === 'draft' && (
                              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                                Draft
                              </span>
                            )}
                            {!event.is_active && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                Hidden
                              </span>
                            )}
                          </div>
                          {event.is_recurring && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Recurring {event.recurrence_type === "custom" ? `every ${event.recurrence_interval}` : event.recurrence_type}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleToggleVisibility(event.id, !event.is_active)}
                            title={event.is_active ? "Hide event" : "Show event"}
                            className={event.is_active ? "bg-green-100 hover:bg-green-200 border-green-300" : "bg-red-100 hover:bg-red-200 border-red-300"}
                          >
                            {event.is_active ? (
                              <Eye className="w-4 h-4 text-green-700" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-red-700" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(event.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {isExpired && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                          Event Passed
                        </span>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>

                      <div className="space-y-2">
                        <div className="font-semibold text-xs">Event Dates:</div>
                        {event.event_dates && event.event_dates.length > 0 ? (
                          <div className="space-y-1">
                            {/* Main date */}
                            <div className={cn(
                              "text-xs p-1.5 rounded flex items-center gap-1",
                              new Date(event.event_date) < new Date() 
                                ? "bg-muted/50 opacity-60" 
                                : "bg-primary/10"
                            )}>
                              <CalendarIcon className="w-3 h-3" />
                              <span className={new Date(event.event_date) < new Date() ? "line-through" : ""}>
                                {format(new Date(event.event_date), "PPP")} at {format(new Date(event.event_date), "p")}
                              </span>
                            </div>
                            {/* Additional dates */}
                            {event.event_dates.map((ed) => {
                              const isPast = new Date(ed.event_date) < new Date();
                              return (
                                <div key={ed.id} className={cn(
                                  "text-xs p-1.5 rounded flex items-center gap-1",
                                  isPast ? "bg-muted/50 opacity-60" : "bg-primary/10"
                                )}>
                                  <CalendarIcon className="w-3 h-3" />
                                  <span className={isPast ? "line-through" : ""}>
                                    {format(new Date(ed.event_date), "PPP")} at {format(new Date(ed.event_date), "p")}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              {format(new Date(event.event_date), "PPP")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {format(new Date(event.event_date), "p")}
                            </div>
                          </div>
                        )}
                        {event.location && (
                          <div className="text-sm pt-1 border-t">
                            {(() => {
                              // Normalize addresses for comparison (trim and lowercase)
                              const normalizeAddress = (addr: string) => 
                                addr.trim().toLowerCase().replace(/\s+/g, ' ');
                              
                              const matchingLocation = savedLocations.find(
                                loc => normalizeAddress(loc.address) === normalizeAddress(event.location || '')
                              );
                              
                              if (matchingLocation) {
                                return (
                                  <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-sm">{matchingLocation.name}</div>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-muted-foreground hover:text-primary hover:underline break-words"
                                      >
                                        {event.location}
                                      </a>
                                    </div>
                                  </div>
                                );
                              }
                              
                              return <LocationLink location={event.location} className="text-sm" />;
                            })()}
                          </div>
                        )}
                      </div>

                      {event.audio_url && (
                        <audio controls className="w-full mt-2">
                          <source src={event.audio_url} />
                        </audio>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      
      {(rawImageUrl || imagePreview) && (
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={setShowCropDialog}
          imageUrl={rawImageUrl || imagePreview || ""}
          onCropComplete={handleCroppedImage}
          title="Crop Event Image"
          description="Adjust the crop area and try different aspect ratios"
          allowAspectRatioChange={true}
          selectedRatioKey={aspectRatioKey as any}
          onAspectRatioKeyChange={(key) => setAspectRatioKey(key)}
        />
      )}
    </div>
  );
}
