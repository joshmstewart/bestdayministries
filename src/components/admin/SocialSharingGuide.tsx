import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function SocialSharingGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Why Your Updates Don't Show When Sharing Links
          </CardTitle>
          <CardDescription>
            Understanding social media link previews and how to update them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Social media platforms (Facebook, Twitter, LinkedIn) use web crawlers that <strong>do not execute JavaScript</strong>. 
              They only read the initial HTML, which means the SEO settings you update in the admin panel 
              only work for browsers, not for social media sharing previews.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">The Problem:</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✅ Your SEO updates work in browsers (title, meta tags visible in browser)</p>
              <p>❌ Social media crawlers see only the default static HTML tags</p>
              <p>❌ Updates to images/descriptions don't appear in shared links</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Solution: Clear Social Media Cache
            </h3>
            <p className="text-sm text-muted-foreground">
              After updating your SEO settings, you must manually tell social media platforms to refresh their cache:
            </p>

            <div className="grid gap-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Facebook Sharing Debugger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clear Facebook's cache to show updated previews
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href="https://developers.facebook.com/tools/debug/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Facebook Debugger
                    </a>
                  </Button>
                  <ol className="text-xs text-muted-foreground space-y-1 mt-2 list-decimal list-inside">
                    <li>Enter your website URL</li>
                    <li>Click "Scrape Again"</li>
                    <li>See the updated preview</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Twitter Card Validator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clear Twitter's cache to show updated previews
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href="https://cards-dev.twitter.com/validator" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Twitter Validator
                    </a>
                  </Button>
                  <ol className="text-xs text-muted-foreground space-y-1 mt-2 list-decimal list-inside">
                    <li>Enter your website URL</li>
                    <li>Click "Preview card"</li>
                    <li>See the updated preview</li>
                  </ol>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">LinkedIn Post Inspector</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Clear LinkedIn's cache to show updated previews
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a 
                      href="https://www.linkedin.com/post-inspector/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open LinkedIn Inspector
                    </a>
                  </Button>
                  <ol className="text-xs text-muted-foreground space-y-1 mt-2 list-decimal list-inside">
                    <li>Enter your website URL</li>
                    <li>Click "Inspect"</li>
                    <li>See the updated preview</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Tips:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[120px]">Cache Duration:</span>
                <span className="text-muted-foreground">Social platforms cache for 7-30 days, but you can force refresh anytime</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[120px]">Image Size:</span>
                <span className="text-muted-foreground">Facebook: 1200x630px | Twitter: 800x418px | LinkedIn: 1200x627px</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[120px]">Testing:</span>
                <span className="text-muted-foreground">Always test in the debugger tools before sharing publicly</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-semibold min-w-[120px]">Force Update:</span>
                <span className="text-muted-foreground">Add "?v=2" to your URL to force a new cache (e.g., yoursite.com?v=2)</span>
              </div>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>Important:</strong> The SEO settings in "App Settings" control what appears in search engines and browser tabs. 
              For social media sharing, you need to use the cache clearing tools above after each update.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Default Meta Tags</CardTitle>
          <CardDescription>
            These are the static tags that social media crawlers see
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-2">
            <div><span className="text-blue-600">Title:</span> Joy House Community | Spreading Joy Through Special Needs Community</div>
            <div><span className="text-blue-600">Description:</span> Building a supportive community for adults with special needs through creativity and unique gifts.</div>
            <div><span className="text-blue-600">Image:</span> https://lovable.dev/opengraph-image-p98pqg.png</div>
          </div>
          
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              To permanently change these default tags, contact your developer. They need to update the <code>index.html</code> file.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}