import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { BadgeEarnedDialog } from "@/components/chores/BadgeEarnedDialog";

// Badge definitions - same as in useChoreStreaks
const BADGE_DEFINITIONS = [
  { type: 'streak_3', name: '3 Day Streak', description: 'Complete all chores 3 days in a row!', icon: '🔥', threshold: 3, category: 'streak' },
  { type: 'streak_7', name: 'Week Warrior', description: 'Complete all chores 7 days in a row!', icon: '⭐', threshold: 7, category: 'streak' },
  { type: 'streak_14', name: 'Two Week Champion', description: 'Complete all chores 14 days in a row!', icon: '🌟', threshold: 14, category: 'streak' },
  { type: 'streak_30', name: 'Monthly Master', description: 'Complete all chores 30 days in a row!', icon: '👑', threshold: 30, category: 'streak' },
  { type: 'total_7', name: 'Getting Started', description: 'Complete all chores on 7 different days!', icon: '🎯', threshold: 7, category: 'total' },
  { type: 'total_30', name: 'Dedicated Helper', description: 'Complete all chores on 30 different days!', icon: '💪', threshold: 30, category: 'total' },
  { type: 'total_100', name: 'Chore Champion', description: 'Complete all chores on 100 different days!', icon: '🏆', threshold: 100, category: 'total' },
  { type: 'total_365', name: 'Year of Excellence', description: 'Complete all chores on 365 different days!', icon: '🎖️', threshold: 365, category: 'total' },
];

export function ChoreBadgeManager() {
  const [testBadge, setTestBadge] = useState<typeof BADGE_DEFINITIONS[0] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const totalBadges = BADGE_DEFINITIONS.filter(b => b.category === 'total');

  const handleTestBadge = (badge: typeof BADGE_DEFINITIONS[0]) => {
    setTestBadge(badge);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Streak Badges</CardTitle>
            <CardDescription>
              Badges earned for completing all daily chores multiple days in a row
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Requirement</TableHead>
                  <TableHead className="w-24">Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streakBadges.map((badge) => (
                  <TableRow key={badge.type}>
                    <TableCell className="text-2xl">{badge.icon}</TableCell>
                    <TableCell className="font-medium">{badge.name}</TableCell>
                    <TableCell className="text-muted-foreground">{badge.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{badge.threshold} days</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestBadge(badge)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Completion Badges</CardTitle>
            <CardDescription>
              Badges earned for total number of days with all chores completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Icon</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Requirement</TableHead>
                  <TableHead className="w-24">Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalBadges.map((badge) => (
                  <TableRow key={badge.type}>
                    <TableCell className="text-2xl">{badge.icon}</TableCell>
                    <TableCell className="font-medium">{badge.name}</TableCell>
                    <TableCell className="text-muted-foreground">{badge.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{badge.threshold} days</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestBadge(badge)}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <BadgeEarnedDialog
        badge={testBadge}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
