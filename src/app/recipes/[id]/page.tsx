import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
import { allRecipes, recipeById } from "@/data/recipes";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Every built-in recipe is prerendered, so the pages are precached and work
// offline. Unknown ids are a 404 (required for `output: 'export'`).
export const dynamicParams = false;

export function generateStaticParams() {
  return allRecipes.map((recipe) => ({ id: recipe.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const recipe = recipeById.get(id);
  return recipe ? { title: recipe.name, description: recipe.description } : {};
}

export default async function RecipePage({ params }: PageProps) {
  const { id } = await params;
  const recipe = recipeById.get(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}
