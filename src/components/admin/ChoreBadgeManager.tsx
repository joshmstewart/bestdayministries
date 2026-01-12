import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { BadgeEarnedDialog } from "@/components/chores/BadgeEarnedDialog";
import { BadgeImageWithZoom } from "@/components/chores/BadgeLightbox";
import { BADGE_DEFINITIONS, BadgeDefinition } from "@/lib/choreBadgeDefinitions";

export function ChoreBadgeManager() {
  const [testBadge, setTestBadge] = useState<BadgeDefinition | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const streakBadges = BADGE_DEFINITIONS.filter(b => b.category === 'streak');
  const totalBadges = BADGE_DEFINITIONS.filter(b => b.category === 'total');

  const handleTestBadge = (badge: BadgeDefinition) => {
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
                  <TableHead className="w-20">Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Requirement</TableHead>
                  <TableHead className="w-24">Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {streakBadges.map((badge) => (
                  <TableRow key={badge.type}>
                    <TableCell>
                      <BadgeImageWithZoom badge={badge} isEarned={true} size="sm" />
                    </TableCell>
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
                  <TableHead className="w-20">Badge</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-32">Requirement</TableHead>
                  <TableHead className="w-24">Test</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalBadges.map((badge) => (
                  <TableRow key={badge.type}>
                    <TableCell>
                      <BadgeImageWithZoom badge={badge} isEarned={true} size="sm" />
                    </TableCell>
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
