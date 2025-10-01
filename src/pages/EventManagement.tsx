import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Upload, X, Trash2, Edit, MapPin, Clock, ArrowLeft, Mic } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";
import AudioRecorder from "@/components/AudioRecorder";

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
  created_by: string;
  created_at: string;
  updated_at: string;
  event_dates?: EventDate[];
}

export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    loadEvents();
  };

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select(`
        *,
        event_dates(id, event_date)
      `)
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("Failed to load events");
      console.error(error);
    } else {
      setEvents(data || []);
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

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
    setEditingEvent(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!title || !description || !eventDate) {
      toast.error("Please fill in all required fields");
      return;
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

      const eventData = {
        title,
        description,
        event_date: combinedDate.toISOString(),
        location: location || null,
        expires_after_date: expiresAfterDate,
        image_url: imageUrl,
        audio_url: audioUrl,
        is_recurring: isRecurring,
        recurrence_type: isRecurring ? recurrenceType : null,
        recurrence_interval: isRecurring ? recurrenceInterval : null,
        recurrence_end_date: isRecurring && recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : null,
        created_by: user.id,
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
          
        toast.success("Event updated successfully");
      } else {
        const { data: newEvent, error } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        eventId = newEvent.id;
        toast.success("Event created successfully");
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

      resetForm();
      loadEvents();
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast.error(error.message || "Failed to save event");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    
    const date = new Date(event.event_date);
    setEventDate(date);
    setEventTime(format(date, "HH:mm"));
    setLocation(event.location || "");
    setExpiresAfterDate(event.expires_after_date);
    setIsRecurring(event.is_recurring);
    setRecurrenceType(event.recurrence_type || "daily");
    setRecurrenceInterval(event.recurrence_interval || 1);
    if (event.recurrence_end_date) {
      setRecurrenceEndDate(new Date(event.recurrence_end_date));
    }
    setImagePreview(event.image_url);
    
    // Load additional dates
    const { data: eventDates } = await supabase
      .from("event_dates")
      .select("event_date")
      .eq("event_id", event.id);
    
    if (eventDates) {
      setAdditionalDates(eventDates.map(d => new Date(d.event_date)));
    }
    
    setShowForm(true);
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
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8 pt-28">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate("/community")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Community
              </Button>
              <h1 className="text-3xl font-bold">Event Management</h1>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
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
                    placeholder="Event description"
                    rows={4}
                  />
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

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Event location"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="expires">Expires after event date</Label>
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
                  {imagePreview && (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview" className="max-w-xs rounded-lg" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setSelectedImage(null);
                          setImagePreview(null);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
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
                          <Mic className="w-4 h-4 mr-2" />
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

                <div className="flex gap-2">
                  <Button onClick={handleSubmit} disabled={uploading}>
                    {uploading ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
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
                  <Card key={event.id} className={isExpired ? "opacity-60" : ""}>
                    {event.image_url && (
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    )}
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          {event.is_recurring && (
                            <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Recurring {event.recurrence_type === "custom" ? `every ${event.recurrence_interval}` : event.recurrence_type}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
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
                          <div className="flex items-center gap-2 text-sm pt-1 border-t">
                            <MapPin className="w-4 h-4" />
                            {event.location}
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
    </div>
  );
}
