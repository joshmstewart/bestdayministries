import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PICTURE_PASSWORD_IMAGES } from "@/lib/picturePasswordImages";

export const PicturePasswordImagesViewer = () => {
  const categories = [
    { name: "Animals", items: PICTURE_PASSWORD_IMAGES.slice(0, 6) },
    { name: "Food", items: PICTURE_PASSWORD_IMAGES.slice(6, 12) },
    { name: "Nature", items: PICTURE_PASSWORD_IMAGES.slice(12, 18) },
    { name: "Objects", items: PICTURE_PASSWORD_IMAGES.slice(18, 24) },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        These 24 images are used for Picture Password login. Users get a randomly generated 4-picture sequence (duplicates allowed = 331,776 combinations).
      </p>
      
      {categories.map((category) => (
        <Card key={category.name}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {category.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-12 h-12 flex items-center justify-center">
                      <IconComponent className={`w-10 h-10 ${item.color}`} />
                    </div>
                    <span className="text-xs font-medium text-center">{item.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.id}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
