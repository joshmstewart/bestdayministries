# Recipe Pal System - Complete Documentation

## Overview

Recipe Pal is an AI-powered cooking assistant game designed for adults with intellectual disabilities. It helps users discover recipes based on ingredients and tools they have, generate step-by-step cooking instructions, save recipes to a personal cookbook, and share creations with the community.

## Routes

| Route | Purpose |
|-------|---------|
| `/games/recipe-gallery` | Main Recipe Pal page with 3 tabs |
| `/games/recipe-gallery?tab=maker` | Recipe Maker tab (default) |
| `/games/recipe-gallery?tab=community` | Community Recipes tab |
| `/games/recipe-gallery?tab=cookbook` | My Cookbook tab |
| `/games/recipe-maker` | Redirect → `/games/recipe-gallery?tab=maker` |

## Database Schema

### Core Tables

```
public_recipes
├── id: UUID (PK)
├── creator_id: UUID (FK → auth.users)
├── title: TEXT
├── description: TEXT
├── ingredients: TEXT[] (array)
├── steps: TEXT[] (array)
├── tips: TEXT[] (array)
├── tools: TEXT[] (array, nullable)
├── image_url: TEXT (nullable)
├── is_active: BOOLEAN (default: true)
├── likes_count: INTEGER (default: 0)
├── saves_count: INTEGER (default: 0)
└── created_at: TIMESTAMPTZ

saved_recipes
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users)
├── title: TEXT
├── description: TEXT
├── ingredients: TEXT[] (array)
├── steps: TEXT[] (array)
├── tips: TEXT[] (array)
├── tools: TEXT[] (array)
├── image_url: TEXT (nullable)
├── source_recipe_id: UUID (nullable, FK → public_recipes)
├── times_made: INTEGER (default: 0)
├── is_favorite: BOOLEAN (default: false)
├── last_made_at: TIMESTAMPTZ (nullable)
└── created_at: TIMESTAMPTZ

public_recipe_likes
├── id: UUID (PK)
├── recipe_id: UUID (FK → public_recipes)
├── user_id: UUID (FK → auth.users)
└── created_at: TIMESTAMPTZ
```

## Likes

- A “like” is stored as a row in `public_recipe_likes`.
- `public_recipes.likes_count` is updated when likes are toggled.
- Community Feed recipe items use the same tables, so likes are consistent across Recipe Pal and the main feed.

### Ingredient & Tool Inventory

```
recipe_ingredients
├── id: UUID (PK)
├── name: TEXT
├── category: TEXT (protein|dairy|grains|fruits|vegetables|condiments|pantry)
├── description: TEXT (nullable)
├── image_url: TEXT (nullable, AI-generated icons)
├── display_order: INTEGER
├── is_active: BOOLEAN
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

recipe_tools
├── id: UUID (PK)
├── name: TEXT
├── category: TEXT (appliances|cookware|utensils)
├── description: TEXT (nullable)
├── icon: TEXT (nullable, emoji fallback)
├── image_url: TEXT (nullable, AI-generated icons)
├── display_order: INTEGER
├── is_active: BOOLEAN
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

user_recipe_ingredients
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users)
├── ingredients: TEXT[] (array of ingredient names)
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

user_recipe_tools
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users)
├── tools: TEXT[] (array of tool names)
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ
```

### Shopping & Tips

```
recipe_shopping_list
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users)
├── item_name: TEXT
├── item_type: TEXT (ingredient|tool)
├── emoji: TEXT
├── reason: TEXT
├── estimated_cost: TEXT (nullable, for tools)
├── is_purchased: BOOLEAN (default: false)
└── created_at: TIMESTAMPTZ

saved_shopping_tips
├── id: UUID (PK)
├── user_id: UUID (FK → auth.users, UNIQUE)
├── ingredient_tips: JSONB (array of IngredientTip)
├── tool_tips: JSONB (array of ToolTip)
├── dismissed_ingredients: TEXT[] (array)
├── dismissed_tools: TEXT[] (array)
├── last_generated_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ
```

## Components

### Page Components

| Component | File | Purpose |
|-----------|------|---------|
| `RecipeGallery` | `src/pages/RecipeGallery.tsx` | Main unified page with 3 tabs |
| `RecipeMaker` | `src/pages/RecipeMaker.tsx` | Redirect stub to RecipeGallery |

### Recipe Maker Components (src/components/recipe-maker/)

| Component | Purpose |
|-----------|---------|
| `RecipeMakerWizard` | Multi-step wizard: select ingredients/tools → suggestions → full recipe |
| `RecipeIngredientSelector` | Visual grid of ingredients with category grouping, lazy-loaded images |
| `RecipeToolsSelector` | Visual grid of tools with category grouping, lazy-loaded images |
| `RecipeSuggestions` | Displays AI-generated recipe suggestions as tappable cards |
| `RecipeDisplay` | Shows full recipe with step tracking, confetti celebration, safety notes |
| `RecipeDetailDialog` | Modal for viewing recipe details with ingredient/tool matching |
| `RecipeActions` | Save to cookbook, share to community, mark as made |
| `RecipeExpansionTips` | AI-powered shopping tips with add-to-inventory/shopping-list actions |
| `CollapsibleShoppingTips` | Collapsible wrapper for RecipeExpansionTips |
| `IngredientInput` | Text input for manual ingredient entry |
| `InventorySummaryBar` | Shows selected items summary |

### Admin Components

| Component | File | Purpose |
|-----------|------|---------|
| `RecipeIngredientsManager` | `src/components/admin/RecipeIngredientsManager.tsx` | CRUD for ingredients, icon generation |
| `RecipeToolsManager` | `src/components/admin/RecipeToolsManager.tsx` | CRUD for tools, icon generation, smart suggestions |

## Edge Functions

### AI Recipe Generation

| Function | Purpose | Auth |
|----------|---------|------|
| `generate-recipe-suggestions` | Generate 3-5 recipe ideas from ingredients/tools | Auth |
| `generate-full-recipe` | Generate complete recipe with steps, tips, image | Auth |
| `generate-recipe-expansion-tips` | Suggest ingredients/tools to expand cooking options | Auth |
| `regenerate-recipe-image` | Regenerate AI image for existing recipe | Auth |

### Icon Generation (Admin)

| Function | Purpose | Auth |
|----------|---------|------|
| `generate-recipe-ingredient-icon` | Generate realistic ingredient icon | Admin |
| `generate-recipe-tool-icon` | Generate kitchen tool icon | Admin |
| `backfill-recipe-tools` | Infer tools from recipe steps and backfill | Admin |

## Workflows

### Recipe Creation Flow

```
1. User selects ingredients from grid (auto-saved to user_recipe_ingredients)
2. User selects tools from grid (auto-saved to user_recipe_tools)
3. Click "Get Recipe Ideas" → invoke generate-recipe-suggestions
4. AI returns 3-5 suggestions with name, description, difficulty, time
5. User taps suggestion → invoke generate-full-recipe
6. AI returns complete recipe with:
   - Title, description
   - Ingredients with quantities
   - Step-by-step instructions
   - Safety notes (hot stove, sharp knife, etc.)
   - Helpful tips
   - AI-generated image
7. User follows steps (tap to complete, with confetti celebration)
8. User can save to cookbook (private) or save & share (public)
```

### Community Recipe Flow

```
1. Browse Community tab → see public_recipes
2. Sort by: Best Match (ingredient/tool overlap), Most Saved, Newest
3. View recipe detail → see ingredient/tool match status (green ✓ / orange ✗)
4. Add to Cookbook → copies to saved_recipes, increments saves_count
5. Admin/creator can regenerate recipe image
```

### Shopping Tips Flow

```
1. As user selects ingredients/tools, tips auto-generate (debounced 2s)
2. AI suggests new items that would expand cooking options
3. For each tip:
   - [+] Add to inventory → adds to user's ingredients/tools
   - [🛒] Add to shopping list → creates recipe_shopping_list entry
   - [×] Dismiss → hides tip, saved to dismissed_ingredients/tools
4. Tips are cached in saved_shopping_tips
```

## AI Prompts

### Recipe Suggestions Prompt

```
You are a friendly cooking teacher for adults with intellectual disabilities.
Create SIMPLE, step-by-step recipes that are:
- Easy to follow with SHORT, CLEAR steps
- Uses simple words (no cooking jargon)
- Safe for people who may need extra help in the kitchen
- Only uses the specific ingredients and tools provided
```

### Full Recipe Generation Prompt

Generates JSON with:
- `title`, `description`
- `ingredients[]` with quantities
- `steps[]` (5-8 maximum, one action per step)
- `tips[]` (helpful hints)
- `safetyNotes[]` (tasks needing extra care: "Using sharp knife", "Hot stove")
- `tools[]` (all kitchen tools needed)

### Shopping Tips Prompt

Analyzes user's current inventory and suggests:
- **Ingredients**: affordable items that unlock many recipes
- **Tools**: budget-friendly equipment with estimated costs
- Each with `name`, `reason`, `emoji`, `unlockedRecipes[]`

## Ingredient/Tool Categories

### Ingredient Categories

| Category | Emoji | Examples |
|----------|-------|----------|
| protein | 🥩 | Eggs, Chicken, Ground Beef, Bacon, Tuna |
| dairy | 🧀 | Cheese, Milk, Butter, Yogurt, Cream Cheese |
| grains | 🍞 | Bread, Pasta, Rice, Tortillas, Oatmeal |
| fruits | 🍎 | Apples, Bananas, Oranges, Strawberries |
| vegetables | 🥕 | Tomatoes, Lettuce, Onions, Potatoes, Carrots |
| condiments | 🍯 | Ketchup, Mustard, Mayo, Ranch, Salsa |
| pantry | 🧂 | Salt, Pepper, Sugar, Flour, Olive Oil |

### Tool Categories

| Category | Emoji | Examples |
|----------|-------|----------|
| appliances | 🔌 | Oven, Stove, Microwave, Toaster, Blender |
| cookware | 🍳 | Frying Pan, Pot, Baking Sheet, Dutch Oven |
| utensils | 🥄 | Spatula, Whisk, Knife, Cutting Board, Tongs |

## UI Patterns

### Lazy Loading Images

Both ingredient and tool grids use `IntersectionObserver` with 50px rootMargin for lazy loading images. Blur placeholder shown until loaded.

### Selection State

- Selected items: `border-primary shadow-md ring-2 ring-primary/50`
- Checkmark badge: absolute top-right, green bg, white check icon
- Sticky summary bar at bottom with selected count and save status

### Save Status Indicator

- Saving: `<Loader2>` spinner + "Saving..."
- Saved: `<Check>` green + "Saved"
- Auto-save with 1s debounce

### Recipe Step Tracking

- Tap step to mark complete
- Completed: green bg, strikethrough, checkmark
- Current: highlighted border + shadow
- Auto-advance to next step
- Confetti celebration on all steps complete

## Admin Features

### Recipe Ingredients Manager

Location: Admin → Settings → Games → Recipe Ingredients tab

Features:
- View all ingredients by category
- Add new ingredient with category selection
- Generate missing AI icons (batch of 5)
- Regenerate individual icons
- Delete ingredients

### Recipe Tools Manager

Location: Admin → Settings → Games → Recipe Tools tab

Features:
- View all tools by category
- Add new tool with smart suggestions (autocomplete from comprehensive list)
- Auto-categorize from suggestions
- Generate missing AI icons (batch of 5)
- Regenerate individual icons
- Delete tools
- Copy generation errors to clipboard

## Statistics

Current data as of documentation:
- Public Recipes: 4
- Saved Recipes: 5
- Recipe Ingredients: 119
- Recipe Tools: 52

## Files Reference

### Pages
- `src/pages/RecipeGallery.tsx` - Main unified page
- `src/pages/RecipeMaker.tsx` - Redirect stub

### Components
- `src/components/recipe-maker/RecipeMakerWizard.tsx`
- `src/components/recipe-maker/RecipeIngredientSelector.tsx`
- `src/components/recipe-maker/RecipeToolsSelector.tsx`
- `src/components/recipe-maker/RecipeSuggestions.tsx`
- `src/components/recipe-maker/RecipeDisplay.tsx`
- `src/components/recipe-maker/RecipeDetailDialog.tsx`
- `src/components/recipe-maker/RecipeActions.tsx`
- `src/components/recipe-maker/RecipeExpansionTips.tsx`
- `src/components/recipe-maker/CollapsibleShoppingTips.tsx`
- `src/components/recipe-maker/IngredientInput.tsx`
- `src/components/recipe-maker/InventorySummaryBar.tsx`
- `src/components/admin/RecipeIngredientsManager.tsx`
- `src/components/admin/RecipeToolsManager.tsx`

### Edge Functions
- `supabase/functions/generate-recipe-suggestions/index.ts`
- `supabase/functions/generate-full-recipe/index.ts`
- `supabase/functions/generate-recipe-expansion-tips/index.ts`
- `supabase/functions/regenerate-recipe-image/index.ts`
- `supabase/functions/generate-recipe-ingredient-icon/index.ts`
- `supabase/functions/generate-recipe-tool-icon/index.ts`
- `supabase/functions/backfill-recipe-tools/index.ts`

## Related Systems

- **Drink Creator**: Similar game with vibe selection and AI drink generation
- **Community Section**: Games accessible via /community quick links
- **Lovable AI**: Used for all AI generation (gemini-2.5-flash model)
