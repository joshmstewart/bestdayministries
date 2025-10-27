import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Zap, Wifi, Home, Smartphone, Check, Share, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

export default function InstallApp() {
  const { platform, isStandalone, promptInstall, canInstall } = usePWAInstall();

  if (isStandalone) {
    return (
      <>
        <SEOHead
          title="App Already Installed"
          description="You've already installed our app. Start using it now!"
        />
        <div className="min-h-screen flex items-center justify-center p-4 pt-24">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">App Already Installed!</h1>
              <p className="text-muted-foreground">
                You've already installed our app. You can access it from your home screen.
              </p>
              <Button asChild className="w-full">
                <Link to="/">Go to Home</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="Install Our App"
        description="Install our app for a better experience - works offline, loads faster, and gives you quick access from your home screen."
      />
      
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
        <main className="container max-w-4xl mx-auto px-4 py-24 space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-lg">
              <Download className="h-10 w-10 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold">Install Our App</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get the best experience with our installable app - faster, offline-ready, and always accessible
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Wifi className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Works Offline</h3>
                <p className="text-muted-foreground">
                  Access content even without an internet connection
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Faster Loading</h3>
                <p className="text-muted-foreground">
                  Optimized performance for lightning-fast access
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Home className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Home Screen Access</h3>
                <p className="text-muted-foreground">
                  Launch directly from your device like any other app
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Full-Screen Experience</h3>
                <p className="text-muted-foreground">
                  Immersive app experience without browser UI
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Platform-Specific Instructions */}
          <Card>
            <CardContent className="pt-6 space-y-6">
              <h2 className="text-2xl font-bold text-center">How to Install</h2>

              {/* iOS Instructions */}
              {platform === 'ios' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    📱 iOS / Safari
                  </h3>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          <Share className="h-4 w-4" />
                          Tap the Share button
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Located in the Safari toolbar at the bottom of your screen
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Scroll and tap "Add to Home Screen"
                        </p>
                        <p className="text-sm text-muted-foreground">
                          You may need to scroll down in the menu to find this option
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          Tap "Add" to confirm
                        </p>
                        <p className="text-sm text-muted-foreground">
                          The app will appear on your home screen
                        </p>
                      </div>
                    </li>
                  </ol>
                </div>
              )}

              {/* Android/Chrome Instructions */}
              {(platform === 'android' || platform === 'desktop') && canInstall && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {platform === 'android' ? '🤖 Android / Chrome' : '💻 Desktop Chrome/Edge'}
                  </h3>
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      Click the button below to install the app directly:
                    </p>
                    <Button onClick={promptInstall} size="lg" className="w-full">
                      <Download className="h-5 w-5 mr-2" />
                      Install App Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Fallback for unsupported browsers */}
              {!canInstall && platform !== 'ios' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">🌐 Other Browsers</h3>
                  <p className="text-muted-foreground">
                    Your browser doesn't support app installation yet. For the best experience, try opening this site in Chrome, Safari, or Edge.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="text-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
