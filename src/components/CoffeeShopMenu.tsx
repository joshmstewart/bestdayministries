import { Coffee } from "lucide-react";

const CoffeeShopMenu = () => {
  return (
    <section className="py-16 bg-gradient-card">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Menu Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-primary via-accent to-secondary">
              <Coffee className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-foreground">
              Our Menu
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Welcome! You are being served today by our "Besties", people with special abilities. 
              We hope we can help you have the best day ever!
            </p>
          </div>

          {/* Coffee Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground text-center">Coffee</h3>
            <p className="text-muted-foreground text-center">Handcrafted coffee drinks made with care and love</p>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-3 px-4 font-bold">Drink</th>
                    <th className="text-center py-3 px-4 font-bold">Hot 12oz</th>
                    <th className="text-center py-3 px-4 font-bold">Hot 16oz</th>
                    <th className="text-center py-3 px-4 font-bold">Iced 16oz</th>
                    <th className="text-center py-3 px-4 font-bold">Iced 24oz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="py-2 px-4">Drip Coffee</td><td className="text-center">$2.50</td><td className="text-center">$3.00</td><td className="text-center">-</td><td className="text-center">-</td></tr>
                  <tr><td className="py-2 px-4">Latte</td><td className="text-center">$4.00</td><td className="text-center">$4.50</td><td className="text-center">$4.50</td><td className="text-center">$5.00</td></tr>
                  <tr><td className="py-2 px-4">Flavored Latte</td><td className="text-center">$4.75</td><td className="text-center">$5.25</td><td className="text-center">$5.25</td><td className="text-center">$5.75</td></tr>
                  <tr><td className="py-2 px-4">Americano</td><td className="text-center">$3.25</td><td className="text-center">$4.00</td><td className="text-center">$4.00</td><td className="text-center">$4.50</td></tr>
                  <tr><td className="py-2 px-4">Mocha</td><td className="text-center">$5.00</td><td className="text-center">$6.00</td><td className="text-center">$6.00</td><td className="text-center">$6.75</td></tr>
                  <tr><td className="py-2 px-4">White Mocha</td><td className="text-center">$5.00</td><td className="text-center">$6.00</td><td className="text-center">$6.00</td><td className="text-center">$6.75</td></tr>
                  <tr><td className="py-2 px-4">Caramel Macchiato</td><td className="text-center">$4.50</td><td className="text-center">$5.75</td><td className="text-center">$5.75</td><td className="text-center">$6.50</td></tr>
                  <tr><td className="py-2 px-4">Matcha Latte</td><td className="text-center">$5.25</td><td className="text-center">$5.75</td><td className="text-center">$5.75</td><td className="text-center">$7.50</td></tr>
                  <tr><td className="py-2 px-4">Chai Latte (Regular, Vanilla or Spicy)</td><td className="text-center">$5.00</td><td className="text-center">$6.25</td><td className="text-center">$6.25</td><td className="text-center">$7.00</td></tr>
                  <tr><td className="py-2 px-4">Nitro</td><td className="text-center">-</td><td className="text-center">-</td><td className="text-center">$3.50</td><td className="text-center">$4.00</td></tr>
                  <tr><td className="py-2 px-4">Cold Brew</td><td className="text-center">-</td><td className="text-center">-</td><td className="text-center">$3.00</td><td className="text-center">$3.50</td></tr>
                </tbody>
              </table>
            </div>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>Add Espresso Shot: $1.00</p>
              <p>Milk Substitutes (Skim, Half & Half, Oat, Soy, Almond): $0.75</p>
            </div>
          </div>

          {/* Specialty Drinks */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground text-center">Specialty Drinks</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Frappuccinos</h4>
                <p className="text-sm">Chocolate and White Chocolate Caramel</p>
                <p className="text-muted-foreground">16oz: $5.75 | 24oz: $6.50</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Smoothies</h4>
                <p className="text-sm">Strawberry, Mango, Banana, Green Harvest, Aloha Pineapple, Blooming Berry, Peach</p>
                <p className="text-muted-foreground">16oz: $6.50 | 24oz: $7.75</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Refreshers</h4>
                <p className="text-sm">Lemonade, Strawberry, Mango-Passion, Kiwi-Mint-Lemongrass, Dragonfruit-Elderberry, Watermelon-Cucumber-Mint</p>
                <p className="text-muted-foreground">16oz: $6.00 | 24oz: $6.75</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Hot Chocolate</h4>
                <p className="text-muted-foreground">12oz: $3.50 | 16oz: $4.00</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Tea</h4>
                <p className="text-sm">Green Mint, Earl Gray, Hibiscus, Japanese Black</p>
                <p className="text-muted-foreground">Hot or Iced - 12oz: $3.00 | 16oz: $3.50 | 24oz: $3.50</p>
              </div>
              <div className="space-y-3">
                <h4 className="font-bold text-lg">Affogato</h4>
                <p className="text-sm">1 scoop ice cream with 2 shots espresso</p>
                <p className="text-muted-foreground">$5.00</p>
              </div>
            </div>
          </div>

          {/* Crepes Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground text-center">Crepes</h3>
            <p className="text-muted-foreground text-center">Sweet and savory crepes made with love</p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Sweet Crepes */}
              <div className="space-y-4">
                <h4 className="font-bold text-xl text-center">Sweet Crepes</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">Sweet</p>
                    <p className="text-sm text-muted-foreground">Nutella, Banana OR Strawberry with whipped cream and chocolate sauce</p>
                    <p className="text-sm">Small: $7.00 | Large: $9.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Banana Split</p>
                    <p className="text-sm text-muted-foreground">Nutella, Banana AND Strawberry with whipped cream and chocolate sauce</p>
                    <p className="text-sm">Small: $8.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Chocolate Strawberry</p>
                    <p className="text-sm text-muted-foreground">Chocolate crepe with strawberry cream cheese, topped with strawberries</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Turtle</p>
                    <p className="text-sm text-muted-foreground">Chocolate crepe with caramel, whipped cream, and chopped pecans</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Cinnamon Roll</p>
                    <p className="text-sm text-muted-foreground">Butter, brown sugar, cinnamon, with cream cheese frosting</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Caramel Apple Pie à la mode</p>
                    <p className="text-sm text-muted-foreground">Apple pie filling with brown sugar, cinnamon, ice cream and caramel</p>
                    <p className="text-sm">Small: $8.00 | Large: $10.00</p>
                  </div>
                </div>
              </div>

              {/* Savory Crepes */}
              <div className="space-y-4">
                <h4 className="font-bold text-xl text-center">Savory Crepes</h4>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold">Breakfast</p>
                    <p className="text-sm text-muted-foreground">Scrambled eggs, cheese, bacon/sausage/chorizo, topped with salsa</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Ham and Cheese</p>
                    <p className="text-sm text-muted-foreground">Diced ham and Swiss/Gruyere with Dijon mayo sauce</p>
                    <p className="text-sm">Small: $7.00 | Large: $9.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">BBQ</p>
                    <p className="text-sm text-muted-foreground">Pulled pork or chicken with BBQ sauce and coleslaw</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Taco</p>
                    <p className="text-sm text-muted-foreground">Taco meat and cheese with lettuce, sour cream and salsa</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Hawaiian</p>
                    <p className="text-sm text-muted-foreground">Pizza sauce, mozzarella, Canadian bacon, and crushed pineapple</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                  <div>
                    <p className="font-semibold">Caprese</p>
                    <p className="text-sm text-muted-foreground">Basil pesto, mozzarella, balsamic dressing and grape tomatoes</p>
                    <p className="text-sm">Small: $7.00 | Large: $10.00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ice Cream Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground text-center">Howdy Homemade Ice Cream</h3>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto">
              We're proud to partner with Howdy Homemade Ice Cream, another business dedicated to creating 
              meaningful employment opportunities for individuals with disabilities. Every scoop supports our shared mission.
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="text-center space-y-2">
                <p className="font-bold">1 Scoop</p>
                <p className="text-2xl text-primary">$4.95</p>
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold">2 Scoops</p>
                <p className="text-2xl text-primary">$5.95</p>
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold">Add-ons</p>
                <p className="text-sm">Milkshake (16oz): $7.50</p>
                <p className="text-sm">Malt (16oz): $8.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoffeeShopMenu;
