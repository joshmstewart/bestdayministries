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
import { Calendar as CalendarIcon, Upload, X, Trash2, Edit, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/imageUtils";

interface Event {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  audio_url: string | null;
  event_date: string;
  location: string | null;
  expires_after_date: boolean;
  created_at: string;
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
  const [uploading, setUploading] = useState(false);

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
      .select("*")
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

    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file");
      return;
    }

    setSelectedAudio(file);
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

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("event-images")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Upload audio if selected
      if (selectedAudio) {
        const fileName = `${user.id}/${Date.now()}_${selectedAudio.name}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-audio")
          .upload(fileName, selectedAudio);

        if (uploadError) throw uploadError;

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
        created_by: user.id,
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);

        if (error) throw error;
        toast.success("Event updated successfully");
      } else {
        const { error } = await supabase
          .from("events")
          .insert(eventData);

        if (error) throw error;
        toast.success("Event created successfully");
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

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    
    const date = new Date(event.event_date);
    setEventDate(date);
    setEventTime(format(date, "HH:mm"));
    setLocation(event.location || "");
    setExpiresAfterDate(event.expires_after_date);
    setImagePreview(event.image_url);
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

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Event Management</h1>
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
                  <Label>Event Audio</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioSelect}
                      className="hidden"
                      id="audio-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("audio-upload")?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedAudio ? "Change Audio" : "Upload Audio"}
                    </Button>
                    {selectedAudio && <span className="text-sm">{selectedAudio.name}</span>}
                  </div>
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
                const isPast = new Date(event.event_date) < new Date();
                const isExpired = isPast && event.expires_after_date;

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
                        <h3 className="font-semibold text-lg">{event.title}</h3>
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

                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          {format(new Date(event.event_date), "PPP")}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {format(new Date(event.event_date), "p")}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
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
