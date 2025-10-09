import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Volume2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface TTSVoice {
  id: string;
  voice_name: string;
  voice_label: string;
  voice_id: string;
  description: string | null;
  category: 'standard' | 'fun';
  display_order: number;
  is_active: boolean;
}

export const TTSVoiceManager = () => {
  const { toast } = useToast();
  const [voices, setVoices] = useState<TTSVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVoice, setEditingVoice] = useState<TTSVoice | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    voice_name: '',
    voice_label: '',
    voice_id: '',
    description: '',
    category: 'fun' as 'standard' | 'fun',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      const { data, error } = await supabase
        .from('tts_voices')
        .select('*')
        .order('category')
        .order('display_order');

      if (error) throw error;
      setVoices((data || []) as TTSVoice[]);
    } catch (error: any) {
      toast({
        title: "Error loading voices",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.voice_name || !formData.voice_label || !formData.voice_id) {
        toast({
          title: "Validation error",
          description: "Voice name, label, and ID are required",
          variant: "destructive",
        });
        return;
      }

      if (editingVoice) {
        const { error } = await supabase
          .from('tts_voices')
          .update(formData)
          .eq('id', editingVoice.id);

        if (error) throw error;

        toast({
          title: "Voice updated",
          description: "TTS voice has been updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('tts_voices')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Voice added",
          description: "New TTS voice has been added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingVoice(null);
      setFormData({
        voice_name: '',
        voice_label: '',
        voice_id: '',
        description: '',
        category: 'fun',
        display_order: 0,
        is_active: true,
      });
      loadVoices();
    } catch (error: any) {
      toast({
        title: "Error saving voice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (voice: TTSVoice) => {
    setEditingVoice(voice);
    setFormData({
      voice_name: voice.voice_name,
      voice_label: voice.voice_label,
      voice_id: voice.voice_id,
      description: voice.description || '',
      category: voice.category,
      display_order: voice.display_order,
      is_active: voice.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice?')) return;

    try {
      const { error } = await supabase
        .from('tts_voices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Voice deleted",
        description: "TTS voice has been deleted successfully",
      });
      loadVoices();
    } catch (error: any) {
      toast({
        title: "Error deleting voice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (voice: TTSVoice) => {
    try {
      const { error } = await supabase
        .from('tts_voices')
        .update({ is_active: !voice.is_active })
        .eq('id', voice.id);

      if (error) throw error;

      toast({
        title: voice.is_active ? "Voice hidden" : "Voice shown",
        description: `Voice is now ${voice.is_active ? 'hidden from' : 'visible to'} users`,
      });
      loadVoices();
    } catch (error: any) {
      toast({
        title: "Error updating voice",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const testVoice = async (voiceName: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text: "Hello! This is how I sound. I hope you like my voice!",
          voice: voiceName
        }
      });

      if (error) throw error;
      if (!data?.audioContent) throw new Error("No audio content received");

      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();

      toast({
        title: "Playing voice sample",
        description: "Listen to how this voice sounds",
      });
    } catch (error: any) {
      console.error('Error testing voice:', error);
      toast({
        title: "Error testing voice",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading voices...</div>;
  }

  const standardVoices = voices.filter(v => v.category === 'standard');
  const funVoices = voices.filter(v => v.category === 'fun');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Text-to-Speech Voices</CardTitle>
        <CardDescription>Manage available TTS voices for users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingVoice(null);
                setFormData({
                  voice_name: '',
                  voice_label: '',
                  voice_id: '',
                  description: '',
                  category: 'fun',
                  display_order: 0,
                  is_active: true,
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Voice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingVoice ? 'Edit' : 'Add'} TTS Voice</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Voice Name (ID) *</Label>
                    <Input
                      value={formData.voice_name}
                      onChange={(e) => setFormData({ ...formData, voice_name: e.target.value })}
                      placeholder="e.g., elmo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Display Label *</Label>
                    <Input
                      value={formData.voice_label}
                      onChange={(e) => setFormData({ ...formData, voice_label: e.target.value })}
                      placeholder="e.g., Elmo"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>ElevenLabs Voice ID *</Label>
                  <Input
                    value={formData.voice_id}
                    onChange={(e) => setFormData({ ...formData, voice_id: e.target.value })}
                    placeholder="e.g., UgiuqbgD8Q7KVV5lzpSJ"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Fun and playful voice"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: 'standard' | 'fun') => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="fun">Fun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Display Order</Label>
                    <Input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label>Active (visible to users)</Label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingVoice ? 'Update' : 'Add'} Voice
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Standard Voices</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standardVoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No standard voices found
                    </TableCell>
                  </TableRow>
                ) : (
                  standardVoices.map((voice) => (
                    <TableRow key={voice.id}>
                      <TableCell className="font-medium">{voice.voice_label}</TableCell>
                      <TableCell className="text-muted-foreground">{voice.voice_name}</TableCell>
                      <TableCell>{voice.description}</TableCell>
                      <TableCell>{voice.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={voice.is_active ? "default" : "secondary"}>
                          {voice.is_active ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testVoice(voice.voice_name)}
                            title="Test voice"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(voice)}
                            title={voice.is_active ? "Hide voice" : "Show voice"}
                          >
                            {voice.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(voice)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voice.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Fun Voices</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funVoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No fun voices found
                    </TableCell>
                  </TableRow>
                ) : (
                  funVoices.map((voice) => (
                    <TableRow key={voice.id}>
                      <TableCell className="font-medium">{voice.voice_label}</TableCell>
                      <TableCell className="text-muted-foreground">{voice.voice_name}</TableCell>
                      <TableCell>{voice.description}</TableCell>
                      <TableCell>{voice.display_order}</TableCell>
                      <TableCell>
                        <Badge variant={voice.is_active ? "default" : "secondary"}>
                          {voice.is_active ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => testVoice(voice.voice_name)}
                            title="Test voice"
                          >
                            <Volume2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleActive(voice)}
                            title={voice.is_active ? "Hide voice" : "Show voice"}
                          >
                            {voice.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(voice)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(voice.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};